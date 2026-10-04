/**
 * FC TNT - Payments & Casso Auto-Reconcile Webhook Router (routes/payments.js)
 * Tự động đối soát giao dịch ngân hàng qua Casso.vn (Gói Free), tự động tick xanh nộp tiền sân và phát Realtime Socket.IO
 */

const express = require('express');
const crypto = require('crypto');
const Match = require('../models/Match');
const Player = require('../models/Player');
const { paymentWebhookLimiter } = require('../utils/rateLimiter');

// Bộ nhớ đệm lưu tối đa 500 Transaction ID gần nhất để chống xử lý trùng lặp (FIFO Idempotency)
const MAX_PROCESSED_IDS = 500;
const processedTransactionIds = new Set();

function markTransactionProcessed(transId) {
  if (!transId) return;
  if (processedTransactionIds.size >= MAX_PROCESSED_IDS) {
    const oldest = processedTransactionIds.values().next().value;
    if (oldest) processedTransactionIds.delete(oldest);
  }
  processedTransactionIds.add(transId);
}

function createPaymentsRouter({ isMongoConnected, fallbackData, broadcastDataUpdate, io, requireAdmin }) {
  const router = express.Router();

  // GET /api/payments/config (Chỉ Quản trị viên mới được xem cấu hình webhook)
  router.get('/config', requireAdmin, (req, res) => {
    const configured = Boolean(process.env.CASSO_WEBHOOK_TOKEN);
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const webhookUrl = `${protocol}://${host}/api/payments/casso-webhook`;

    res.json({
      configured,
      webhookUrl,
      service: 'Casso.vn (Open Banking Free)',
      tokenHint: configured ? 'Đã thiết lập CASSO_WEBHOOK_TOKEN trong .env' : 'Chưa thiết lập CASSO_WEBHOOK_TOKEN'
    });
  });

  // POST /api/payments/casso-webhook (Nhận webhook biến động số dư từ Casso.vn, có Rate Limiting)
  router.post('/casso-webhook', paymentWebhookLimiter, async (req, res) => {
    try {
      // 1. Xác thực bảo mật Secure-Token (Chống bypass khi chưa cấu hình token)
      const configuredToken = process.env.CASSO_WEBHOOK_TOKEN;
      if (!configuredToken) {
        console.warn('[PaymentsWebhook] Từ chối request do hệ thống chưa kích hoạt CASSO_WEBHOOK_TOKEN');
        return res.status(503).json({ error: 503, message: 'Dịch vụ Casso Webhook chưa được kích hoạt trên hệ thống' });
      }

      const incomingToken = req.headers['secure-token'] || req.headers['x-casso-token'] || '';
      const tokenMatch = incomingToken && incomingToken.length === configuredToken.length &&
        crypto.timingSafeEqual(Buffer.from(incomingToken), Buffer.from(configuredToken));

      if (!tokenMatch) {
        console.warn('[PaymentsWebhook] Từ chối request do sai Secure-Token từ Casso');
        return res.status(401).json({ error: 401, message: 'Sai Secure-Token xác thực' });
      }

      const body = req.body;
      if (!body) {
        return res.status(400).json({ error: 400, message: 'Body rỗng' });
      }

      // Casso gửi payload dạng: { error: 0, data: [ { id, tid, description, amount, when, ... } ] }
      const transactions = Array.isArray(body.data) ? body.data : (body.data ? [body.data] : []);
      if (transactions.length === 0) {
        return res.json({ error: 0, message: 'Không có giao dịch nào cần xử lý' });
      }

      const connected = (typeof isMongoConnected === 'function' ? isMongoConnected() : true);
      const results = [];

      for (const trans of transactions) {
        const transId = String(trans.tid || trans.id || '');
        const amount = parseInt(trans.amount, 10) || 0;
        const description = String(trans.description || '').trim();

        if (amount <= 0 || !description) continue;

        // Chống xử lý trùng lặp giao dịch
        if (transId && processedTransactionIds.has(transId)) {
          console.log(`[PaymentsWebhook] Bỏ qua giao dịch đã xử lý trước đó: ${transId}`);
          continue;
        }

        // Bóc tách cú pháp: tìm từ khóa TNT, mã trận đấu và mã cầu thủ
        const parsed = parsePaymentDescription(description);
        if (!parsed || !parsed.isTNT) {
          console.log(`[PaymentsWebhook] Giao dịch không mang cú pháp TNT: "${description}"`);
          continue;
        }

        // Tìm trận đấu và cầu thủ tương ứng
        const matchResult = await reconcileMatchPayment({
          parsed,
          amount,
          trans,
          connected,
          fallbackData,
          broadcastDataUpdate,
          io
        });

        if (matchResult && matchResult.success) {
          if (transId) markTransactionProcessed(transId);
          results.push(matchResult);
        }
      }

      return res.json({
        error: 0,
        message: `Đã đối soát thành công ${results.length} khoản nộp tiền sân!`,
        results
      });
    } catch (err) {
      console.error('[PaymentsWebhook] Lỗi xử lý Casso Webhook:', err.message);
      return res.status(500).json({ error: 500, message: err.message });
    }
  });



  return router;
}

/**
 * Bóc tách nội dung chuyển khoản tìm mã trận và mã cầu thủ
 * Hỗ trợ các cú pháp linh hoạt:
 * - TNT M15 P8 (Trận 15, Cầu thủ 8)
 * - TNT M_15 P_8
 * - TNT TRAN15 GIANGNT
 * - TNT 8 (Chỉ ghi số áo hoặc ID, tự động tìm trận gần nhất)
 */
function parsePaymentDescription(desc) {
  if (!desc || typeof desc !== 'string') return null;

  // Chuẩn hóa chuỗi: Bỏ dấu tiếng Việt, viết hoa, gom khoảng trắng
  const clean = desc
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toUpperCase();

  if (!clean.includes('TNT')) {
    return null;
  }

  // Regex 1: Khớp cú pháp đầy đủ TNT + Trận + Cầu thủ
  // Ví dụ: TNT M15 P8, TNT TRAN1 M_1, TNT M_15 GIANGNT
  const matchFull = clean.match(/TNT\s+(?:M|TRAN|MATCH)?\s*([0-9a-zA-Z_-]+)\s+(?:P|CAUTHU|SO)?\s*([0-9a-zA-Z_-]+)/);
  if (matchFull) {
    return {
      isTNT: true,
      rawMatch: matchFull[1],
      rawPlayer: matchFull[2]
    };
  }

  // Regex 2: Khớp TNT + Cầu thủ (không có mã trận, sẽ tìm trận mới nhất)
  // Ví dụ: TNT P8, TNT GIANGNT, TNT P_8
  const matchPlayerOnly = clean.match(/TNT\s+(?:P|CAUTHU|SO)?\s*([0-9a-zA-Z_-]+)/);
  if (matchPlayerOnly) {
    return {
      isTNT: true,
      rawMatch: null,
      rawPlayer: matchPlayerOnly[1]
    };
  }

  return { isTNT: true, rawMatch: null, rawPlayer: null };
}

/**
 * Đối soát và gạch nợ tiền sân cho cầu thủ trong trận đấu
 */
async function reconcileMatchPayment({ parsed, amount, trans, connected, fallbackData, broadcastDataUpdate, io }) {
  // 1. Lấy danh sách cầu thủ để map ID / Số áo / Tên
  let allPlayers = [];
  if (connected) {
    allPlayers = await Player.find();
  } else if (fallbackData && Array.isArray(fallbackData.players)) {
    allPlayers = fallbackData.players;
  }

  // Nhận diện cầu thủ
  let matchedPlayer = null;
  if (parsed.rawPlayer) {
    const rawP = String(parsed.rawPlayer).toLowerCase();
    matchedPlayer = allPlayers.find(p => {
      const pId = String(p.id || '').toLowerCase();
      const pNum = String(p.number !== undefined ? p.number : '');
      const pUser = String(p.username || '').toLowerCase();
      return pId === rawP || pId === `p_${rawP}` || pNum === rawP || pUser === rawP;
    });
  }

  // 2. Tìm trận đấu phù hợp
  let targetMatch = null;
  if (connected) {
    if (parsed.rawMatch) {
      const rawM = String(parsed.rawMatch).toLowerCase();
      targetMatch = await Match.findOne({
        $or: [
          { id: rawM },
          { id: `match_${rawM}` },
          { id: `m_${rawM}` }
        ]
      });
    }

    // Nếu không ghi mã trận hoặc không tìm thấy theo mã: Lấy trận gần nhất có khoản chưa nộp của cầu thủ này
    if (!targetMatch) {
      const matches = await Match.find().sort({ date: -1, createdAt: -1 }).limit(5);
      if (matchedPlayer) {
        targetMatch = matches.find(m =>
          m.finance && Array.isArray(m.finance.payments) &&
          m.finance.payments.some(p => p.playerId === matchedPlayer.id && !p.isPaid)
        ) || matches[0];
      } else {
        targetMatch = matches[0];
      }
    }
  } else if (fallbackData && Array.isArray(fallbackData.matches)) {
    if (parsed.rawMatch) {
      const rawM = String(parsed.rawMatch).toLowerCase();
      targetMatch = fallbackData.matches.find(m => {
        const mId = String(m.id || '').toLowerCase();
        return mId === rawM || mId === `match_${rawM}` || mId === `m_${rawM}`;
      });
    }
    if (!targetMatch && fallbackData.matches.length > 0) {
      targetMatch = fallbackData.matches[0];
    }
  }

  if (!targetMatch || !targetMatch.finance || !Array.isArray(targetMatch.finance.payments)) {
    return { success: false, message: 'Không tìm thấy dữ liệu tài chính trận đấu' };
  }

  // Nếu chưa nhận diện được cầu thủ từ cú pháp, thử tìm trong mô tả tên người chuyển
  if (!matchedPlayer && trans.description) {
    const descClean = trans.description.toLowerCase();
    matchedPlayer = allPlayers.find(p => {
      const pName = (p.name || '').trim().toLowerCase();
      const pNick = (p.nickname || '').trim().toLowerCase();
      const matchName = pName.length >= 3 && descClean.includes(pName);
      const matchNick = pNick.length >= 3 && descClean.includes(pNick);
      return matchName || matchNick;
    });
  }

  if (!matchedPlayer) {
    return { success: false, message: 'Không thể nhận diện cầu thủ từ nội dung chuyển khoản' };
  }

  // 3. Cập nhật trạng thái nộp tiền trong checklist
  const payments = targetMatch.finance.payments;
  let paymentItem = payments.find(p => p.playerId === matchedPlayer.id);

  if (!paymentItem) {
    // Nếu cầu thủ chưa có trong checklist (vd đi phát sinh), tự động thêm vào
    paymentItem = {
      playerId: matchedPlayer.id,
      playerName: matchedPlayer.name,
      amount: targetMatch.finance.splitAmountPerPerson || amount,
      isPaid: true,
      paidAt: new Date(trans.when || Date.now()),
      note: `Auto Casso (+${amount.toLocaleString('vi-VN')}đ)`
    };
    payments.push(paymentItem);
  } else {
    paymentItem.isPaid = true;
    paymentItem.paidAt = new Date(trans.when || Date.now());
    const refText = trans.tid ? `TID: ${trans.tid}` : 'Casso Bank';
    paymentItem.note = paymentItem.note ? `${paymentItem.note} • Auto ${refText}` : `Auto ${refText}`;
  }

  if (connected && typeof targetMatch.save === 'function') {
    await targetMatch.save();
  }

  // 4. Bắn sự kiện Realtime Socket.IO & Broadcast thông báo
  const eventPayload = {
    matchId: targetMatch.id,
    playerId: matchedPlayer.id,
    playerName: matchedPlayer.name,
    amount,
    tid: trans.tid || trans.id,
    timestamp: new Date().toISOString()
  };

  if (io && typeof io.emit === 'function') {
    io.emit('payment_received', eventPayload);
  }

  if (typeof broadcastDataUpdate === 'function') {
    broadcastDataUpdate('matches', `💰 Cầu thủ "${matchedPlayer.name}" vừa nộp tiền sân (${amount.toLocaleString('vi-VN')}đ)!`, eventPayload);
  }

  console.log(`[AutoReconcile] ✅ Đã tự động gạch nợ tiền sân cho "${matchedPlayer.name}" trận ${targetMatch.id}!`);

  return {
    success: true,
    matchId: targetMatch.id,
    playerId: matchedPlayer.id,
    playerName: matchedPlayer.name,
    amount,
    message: `Đã tự động xác nhận nộp tiền cho "${matchedPlayer.name}"`
  };
}

module.exports = {
  createPaymentsRouter,
  parsePaymentDescription
};
