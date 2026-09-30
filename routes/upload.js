/**
 * FC TNT - Cloudinary & Media Upload Router (routes/upload.js)
 * Xử lý cấu hình, tạo chữ ký chữ ký số (Signature) và upload đa phương tiện (Ảnh & Video)
 * Tuân thủ quy tắc Zero-dependency: Sử dụng module 'crypto' & 'https' có sẵn của Node.js
 */

const express = require('express');
const crypto = require('crypto');

function createUploadRouter({ requireAdmin }) {
  const router = express.Router();

  // GET /api/upload/config
  // Kiểm tra trạng thái cấu hình Cloudinary (không bao giờ lộ Secret Key)
  router.get('/config', (req, res) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
    const apiKey = process.env.CLOUDINARY_API_KEY || '';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || '';

    const isConfigured = Boolean(cloudName && ((apiKey && apiSecret) || uploadPreset));

    res.json({
      configured: isConfigured,
      cloudName: cloudName || null,
      hasPreset: Boolean(uploadPreset),
      uploadPreset: uploadPreset || null,
      mode: uploadPreset ? 'unsigned' : (apiKey && apiSecret ? 'signed' : 'fallback')
    });
  });

  // POST /api/upload/signature
  // Tạo timestamp và signature bảo mật để Client tải trực tiếp lên Cloudinary CDN
  // Tránh tắc nghẽn băng thông và tràn RAM trên máy chủ Render Free
  router.post('/signature', requireAdmin, (req, res) => {
    try {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (!cloudName || !apiKey || !apiSecret) {
        return res.status(400).json({
          success: false,
          error: 'Chưa cấu hình đầy đủ biến môi trường Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) trong .env'
        });
      }

      const timestamp = Math.round(new Date().getTime() / 1000);
      const folder = 'fc_tnt_moments';

      // Tạo chuỗi tham số theo thứ tự alphabet theo chuẩn Cloudinary
      const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
      const signature = crypto
        .createHash('sha1')
        .update(paramsToSign + apiSecret)
        .digest('hex');

      res.json({
        success: true,
        cloudName,
        apiKey,
        timestamp,
        folder,
        signature,
        uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`
      });
    } catch (err) {
      console.error('[UploadRouter] Lỗi tạo signature:', err);
      res.status(500).json({ success: false, error: 'Không thể tạo chữ ký tải lên Cloudinary' });
    }
  });

  // POST /api/upload/direct
  // Dự phòng tải qua server (Base64 data URI)
  router.post('/direct', requireAdmin, async (req, res) => {
    try {
      const { fileData, mediaType } = req.body;
      if (!fileData) {
        return res.status(400).json({ success: false, error: 'Dữ liệu file không được để trống' });
      }

      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

      // Nếu Cloudinary đã cấu hình, đẩy tiếp lên Cloudinary qua REST API
      if (cloudName && ((apiKey && apiSecret) || uploadPreset)) {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const folder = 'fc_tnt_moments';
        const resourceType = mediaType === 'video' ? 'video' : 'auto';

        const postBody = {
          file: fileData,
          folder
        };

        if (uploadPreset) {
          postBody.upload_preset = uploadPreset;
        } else {
          const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
          postBody.timestamp = timestamp;
          postBody.api_key = apiKey;
          postBody.signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex');
        }

        const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postBody)
        });

        const cldData = await cldRes.json();
        if (cldRes.ok && cldData.secure_url) {
          const isVideo = cldData.resource_type === 'video';
          let thumbnail = '';
          if (isVideo) {
            // Cloudinary tự động sinh ảnh thumbnail định dạng jpg cho video
            thumbnail = cldData.secure_url.replace(/\.[^/.]+$/, '.jpg');
          }

          return res.json({
            success: true,
            url: cldData.secure_url,
            thumbnail,
            duration: cldData.duration ? formatDuration(cldData.duration) : '',
            width: cldData.width || null,
            height: cldData.height || null,
            type: isVideo ? 'video' : 'image'
          });
        }

        console.warn('[UploadRouter] Cloudinary API trả về lỗi:', cldData);
      }

      // Fallback cục bộ nếu chưa có Cloudinary
      const isVideo = mediaType === 'video' || (typeof fileData === 'string' && fileData.startsWith('data:video/'));
      return res.json({
        success: true,
        url: fileData,
        thumbnail: '',
        duration: '',
        type: isVideo ? 'video' : 'image',
        isFallback: true,
        message: 'Lưu trữ tạm thời (Chưa cấu hình Cloudinary)'
      });
    } catch (err) {
      console.error('[UploadRouter] Lỗi direct upload:', err);
      res.status(500).json({ success: false, error: err.message || 'Lỗi xử lý file tải lên' });
    }
  });

  return router;
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

module.exports = createUploadRouter;
