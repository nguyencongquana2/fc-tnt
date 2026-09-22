/**
 * FC TNT - Auth & Admin Permissions Router
 * Quản lý mã PIN quản trị viên, xác thực token và phân quyền thao tác
 */

const express = require('express');
const Team = require('../models/Team');

const ADMIN_STATIC_TOKEN = 'fc_tnt_admin_authenticated';

// Lấy mã PIN Quản trị viên hiện tại (ưu tiên biến môi trường ADMIN_PIN trên Render / .env)
async function getValidAdminPins(isMongoConnected) {
  const pins = new Set();

  // 1. Mã từ biến môi trường Render / .env (Ưu tiên tuyệt đối)
  if (process.env.ADMIN_PIN && String(process.env.ADMIN_PIN).trim()) {
    pins.add(String(process.env.ADMIN_PIN).trim());
    return Array.from(pins);
  }

  // 2. Mã từ MongoDB Database (nếu có và khác 123456)
  if (isMongoConnected && isMongoConnected()) {
    try {
      const team = await Team.findOne();
      if (team && team.adminPin && team.adminPin !== '123456') {
        pins.add(String(team.adminPin).trim());
      }
    } catch (e) {}
  }

  return Array.from(pins);
}

// Middleware xác thực quyền Admin cho các thao tác thêm / sửa / xóa dữ liệu
const requireAdmin = (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (token && (token === ADMIN_STATIC_TOKEN || token.startsWith('fc_tnt_admin_'))) {
    return next();
  }
  return res.status(401).json({
    error: 'Yêu cầu quyền Quản trị viên! Vui lòng đăng nhập mã PIN để thực hiện thao tác này.',
    requireAuth: true
  });
};

function createAuthRouter({ isMongoConnected }) {
  const router = express.Router();

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập mã PIN!' });
    }

    const inputPin = String(pin).trim();
    const validPins = await getValidAdminPins(isMongoConnected);

    if (validPins.includes(inputPin)) {
      return res.json({
        success: true,
        token: 'fc_tnt_admin_' + Buffer.from(inputPin).toString('base64'),
        message: 'Đăng nhập Quản trị viên thành công!'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Mã PIN không chính xác! Vui lòng kiểm tra lại.'
    });
  });

  // POST /api/auth/change-pin
  router.post('/change-pin', requireAdmin, async (req, res) => {
    try {
      const { newPin } = req.body;
      if (!newPin || String(newPin).trim().length < 4) {
        return res.status(400).json({ success: false, error: 'Mã PIN mới phải có ít nhất 4 ký tự!' });
      }

      const cleanPin = String(newPin).trim();
      if (isMongoConnected()) {
        let team = await Team.findOne();
        if (!team) {
          team = await Team.create({ adminPin: cleanPin });
        } else {
          team.adminPin = cleanPin;
          await team.save();
        }
      }

      process.env.ADMIN_PIN = cleanPin;

      return res.json({
        success: true,
        message: `Đã đổi mã PIN Quản trị thành công sang: ${cleanPin}`
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/auth/check
  router.get('/check', (req, res) => {
    const token = req.headers['x-admin-token'];
    const isValid = token && (token === ADMIN_STATIC_TOKEN || token.startsWith('fc_tnt_admin_'));
    res.json({ isAdmin: isValid });
  });

  return router;
}

module.exports = {
  createAuthRouter,
  requireAdmin,
  getValidAdminPins
};
