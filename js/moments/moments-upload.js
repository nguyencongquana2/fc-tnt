/**
 * FC TNT Moments - Media Upload Submodule (js/moments/moments-upload.js)
 * Quản lý nén ảnh client-side bằng Canvas, trích xuất metadata video & tải lên Cloudinary CDN
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.momentsModule = root.momentsModule || {};
    Object.assign(root.momentsModule, factory());
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    async fetchUploadConfig() {
      try {
        const res = await fetch('/api/upload/config');
        if (res.ok) {
          this.cloudinaryConfig = await res.json();
          const badge = document.getElementById('media-cloud-badge');
          const statusText = document.getElementById('media-cloud-status');
          if (badge && statusText) {
            if (this.cloudinaryConfig && this.cloudinaryConfig.configured) {
              badge.classList.add('connected');
              statusText.textContent = `Cloudinary Ready (${this.cloudinaryConfig.cloudName || 'CDN'})`;
            } else {
              badge.classList.remove('connected');
              statusText.textContent = 'Lưu trữ Đám Mây (Auto)';
            }
          }
        }
      } catch (e) {
        console.warn('[MomentsUpload] Cannot fetch upload config:', e.message);
      }
    },

    compressImage(file, maxWidth = 1600, maxHeight = 1600, quality = 0.85) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
              if (width > height) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          };
          img.onerror = () => reject(new Error('Lỗi load ảnh'));
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Lỗi đọc file'));
        reader.readAsDataURL(file);
      });
    },

    extractVideoMeta(file, blobUrl) {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = blobUrl;
        video.muted = true;
        video.playsInline = true;

        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve({ thumbnail: '', duration: '' });
          }
        }, 4000);

        video.onloadedmetadata = () => {
          const durationSec = video.duration;
          video.currentTime = Math.min(1, durationSec / 2 || 0.5);
        };

        video.onseeked = () => {
          if (resolved) return;
          try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(640, video.videoWidth || 480);
            canvas.height = Math.min(480, video.videoHeight || 360);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
            resolved = true;
            clearTimeout(timeout);
            resolve({ thumbnail, duration: this.formatSeconds(video.duration) });
          } catch (e) {
            resolved = true;
            clearTimeout(timeout);
            resolve({ thumbnail: '', duration: this.formatSeconds(video.duration) });
          }
        };

        video.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve({ thumbnail: '', duration: '' });
          }
        };
      });
    },

    formatSeconds(seconds) {
      if (!seconds || isNaN(seconds)) return '';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    },

    isVideoUrl(url) {
      if (!url) return false;
      const trimmed = url.toLowerCase();
      return (
        trimmed.includes('youtube.com') ||
        trimmed.includes('youtu.be') ||
        trimmed.includes('facebook.com') ||
        trimmed.includes('tiktok.com') ||
        trimmed.includes('drive.google.com') ||
        trimmed.endsWith('.mp4') ||
        trimmed.endsWith('.webm') ||
        trimmed.endsWith('.mov') ||
        trimmed.startsWith('data:video/')
      );
    },

    async uploadMediaItemToCloudinary(item) {
      if (!item.file) return item;

      try {
        if (this.cloudinaryConfig && this.cloudinaryConfig.configured) {
          const formData = new FormData();
          formData.append('file', item.file);

          let uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudinaryConfig.cloudName}/auto/upload`;

          if (this.cloudinaryConfig.hasPreset && this.cloudinaryConfig.uploadPreset) {
            formData.append('upload_preset', this.cloudinaryConfig.uploadPreset);
          } else {
            const sigHeaders = { 'Content-Type': 'application/json' };
            const adminTok = window.stateManager && window.stateManager.getAdminToken ? window.stateManager.getAdminToken() : '';
            const playerTok = window.stateManager && window.stateManager.getPlayerToken ? window.stateManager.getPlayerToken() : '';
            if (adminTok) sigHeaders['x-admin-token'] = adminTok;
            if (playerTok) sigHeaders['x-player-token'] = playerTok;

            const sigRes = await fetch('/api/upload/signature', {
              method: 'POST',
              headers: sigHeaders
            });
            const sigData = await sigRes.json();
            if (sigData.success) {
              formData.append('api_key', sigData.apiKey);
              formData.append('timestamp', sigData.timestamp);
              formData.append('folder', sigData.folder);
              formData.append('signature', sigData.signature);
              uploadUrl = sigData.uploadUrl;
            }
          }

          const cldRes = await fetch(uploadUrl, {
            method: 'POST',
            body: formData
          });
          const cldData = await cldRes.json();

          if (cldRes.ok && cldData.secure_url) {
            const isVideo = cldData.resource_type === 'video' || item.type === 'video';
            return {
              type: isVideo ? 'video' : 'image',
              url: cldData.secure_url,
              thumbnail: isVideo ? cldData.secure_url.replace(/\.[^/.]+$/, '.jpg') : (item.thumbnail || ''),
              duration: cldData.duration ? this.formatSeconds(cldData.duration) : (item.duration || '')
            };
          }
        }
      } catch (err) {
        console.warn('[CloudinaryUpload] Direct upload failed, falling back:', err.message);
      }

      let finalUrl = item.url;
      if (item.type === 'video' && item.file && typeof item.url === 'string' && item.url.startsWith('blob:')) {
        if (item.file.size <= 10 * 1024 * 1024) {
          try {
            finalUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.onerror = (e) => reject(e);
              reader.readAsDataURL(item.file);
            });
          } catch (e) {
            console.warn('[MomentsUpload] Fallback video conversion error:', e.message);
          }
        } else {
          if (window.appModule && window.appModule.showToast) {
            window.appModule.showToast(`Video "${item.name || 'tệp'}" > 10MB. Vui lòng cấu hình Cloudinary trong .env để tải video dung lượng lớn!`, 'warning');
          }
        }
      }

      return {
        type: item.type,
        url: finalUrl,
        thumbnail: item.thumbnail || '',
        duration: item.duration || ''
      };
    }
  };
});
