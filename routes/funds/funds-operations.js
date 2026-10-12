/**
 * FC TNT - Funds Operations Submodule (routes/funds/funds-operations.js)
 * Quản lý các tác vụ nạp quỹ hàng loạt và trừ tiền sân sau trận đấu
 */

const crypto = require('crypto');
const Player = require('../../models/Player');
const Match = require('../../models/Match');
const FundTransaction = require('../../models/FundTransaction');
const { requireTreasurer } = require('../auth');
const { isGuestPlayer } = require('../../utils/guestJersey');

function registerOperationRoutes(router, { isMongoConnected, fallbackData, broadcastDataUpdate }) {
  // =========================================================================
  // POST /api/funds/topup (Nạp quỹ đơn lẻ hoặc hàng loạt - Yêu cầu quyền Thủ Quỹ)
  // =========================================================================
  router.post('/topup', requireTreasurer, async (req, res) => {
    try {
      const { items, bulkNote } = req.body;
      // Chống DoS: Giới hạn tối đa 100 thành viên/lần
      if (!items || !Array.isArray(items) || items.length === 0 || items.length > 100) {
        return res.status(400).json({ success: false, error: 'Danh sách nạp quỹ không hợp lệ (tối đa 100 người/lần)!' });
      }

      const connected = (typeof isMongoConnected === 'function' ? isMongoConnected() : false);
      const createdTransactions = [];
      const updatedPlayers = [];

      for (const item of items) {
        const pId = (item.playerId && typeof item.playerId === 'string') ? item.playerId.trim() : null;
        const amount = Number(item.amount);

        // Kiểm tra chặt chẽ: Số nguyên dương từ 1.000đ đến 50.000.000đ (chống Infinity, NaN, số âm, số thực)
        if (!pId || !Number.isInteger(amount) || amount < 1000 || amount > 50000000) continue;

        let balanceBefore = 0;
        let balanceAfter = 0;
        let playerName = '';

        if (connected) {
          // Thao tác nguyên tử (Atomic Update $inc) triệt tiêu hoàn toàn Race Condition
          const updatedPlayer = await Player.findOneAndUpdate(
            { id: pId },
            { $inc: { fundBalance: amount } },
            { new: true }
          );

          if (!updatedPlayer) continue;

          balanceAfter = Number(updatedPlayer.fundBalance) || 0;
          balanceBefore = balanceAfter - amount;
          playerName = updatedPlayer.name;
        } else if (fallbackData && Array.isArray(fallbackData.players)) {
          const player = fallbackData.players.find(p => p.id === pId);
          if (!player) continue;

          balanceBefore = Number(player.fundBalance) || 0;
          balanceAfter = balanceBefore + amount;
          player.fundBalance = balanceAfter;
          playerName = player.name;
        } else {
          continue;
        }

        const rawNote = (item.note && String(item.note).trim()) || (bulkNote && String(bulkNote).trim()) || 'Nạp quỹ đội bóng';
        const noteText = rawNote.slice(0, 200);

        const txDoc = {
          id: `ft_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          playerId: pId, playerName, amount, balanceBefore, balanceAfter,
          type: 'TOPUP', note: noteText, createdBy: 'Thủ quỹ', createdAt: new Date()
        };
        const savedTx = connected ? await FundTransaction.create(txDoc) : (fallbackData.fundTransactions.unshift(txDoc), txDoc);
        createdTransactions.push(savedTx);
        updatedPlayers.push({ playerId: pId, name: playerName, amount, balanceAfter });
      }

      if (updatedPlayers.length === 0) {
        return res.status(400).json({ success: false, error: 'Không có thành viên hợp lệ nào để nạp quỹ!' });
      }

      if (typeof broadcastDataUpdate === 'function') {
        broadcastDataUpdate('funds', `💰 Đã nạp quỹ cho ${updatedPlayers.length} thành viên!`, {
          count: updatedPlayers.length
        });
      }

      return res.json({
        success: true,
        message: `Đã nạp quỹ thành công cho ${updatedPlayers.length} thành viên!`,
        updatedCount: updatedPlayers.length,
        updatedPlayers,
        transactions: createdTransactions
      });
    } catch (err) {
      console.warn('[Funds] Lỗi nạp quỹ:', err.message);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi nạp quỹ: ' + err.message });
    }
  });

  // =========================================================================
  // POST /api/funds/deduct-match (Trừ tiền sân sau trận - Yêu cầu quyền Thủ Quỹ)
  // =========================================================================
  router.post('/deduct-match', requireTreasurer, async (req, res) => {
    try {
      const { matchId, splitAmount, participantIds, matchOpponent, note } = req.body;

      if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0 || participantIds.length > 100) {
        return res.status(400).json({ success: false, error: 'Danh sách cầu thủ trừ tiền không được để trống (tối đa 100 người)!' });
      }

      const amountToDeduct = Number(splitAmount);
      // Kiểm tra chặt chẽ: Số nguyên dương từ 1.000đ đến 50.000.000đ
      if (!Number.isInteger(amountToDeduct) || amountToDeduct < 1000 || amountToDeduct > 50000000) {
        return res.status(400).json({ success: false, error: 'Số tiền chia mỗi người phải là số nguyên từ 1.000đ đến 50.000.000đ!' });
      }

      const connected = (typeof isMongoConnected === 'function' ? isMongoConnected() : false);
      const cleanMatchId = (typeof matchId === 'string' && matchId.trim()) ? matchId.trim() : null;
      let targetMatch = null;
      let effectiveParticipantIds = participantIds.map(p => (typeof p === 'string' ? p.trim() : '')).filter(Boolean);

      if (cleanMatchId) {
        if (connected) {
          targetMatch = await Match.findOne({ id: cleanMatchId });
        } else if (fallbackData && Array.isArray(fallbackData.matches)) {
          targetMatch = fallbackData.matches.find(m => m.id === cleanMatchId);
        }

        if (targetMatch && targetMatch.finance && Array.isArray(targetMatch.finance.payments)) {
          const payerId = targetMatch.finance.payerPlayerId;
          effectiveParticipantIds = effectiveParticipantIds.filter(pId => {
            if (payerId && pId === payerId) return false;
            const rec = targetMatch.finance.payments.find(p => p.playerId === pId);
            return !rec || !rec.isPaid;
          });
        }
      }

      // Khách mời / viện binh không có ví quỹ đội, tuyệt đối không trừ số dư ví
      let officialPlayers = [];
      if (connected) {
        const found = await Player.find({ id: { $in: effectiveParticipantIds }, isGuest: { $ne: true } });
        officialPlayers = found.filter(p => !isGuestPlayer(p));
      } else if (fallbackData && Array.isArray(fallbackData.players)) {
        officialPlayers = fallbackData.players.filter(p => 
          effectiveParticipantIds.includes(p.id) && !p.isGuest && !isGuestPlayer(p)
        );
      }
      const officialIdsSet = new Set(officialPlayers.map(p => p.id));
      effectiveParticipantIds = effectiveParticipantIds.filter(id => officialIdsSet.has(id));

      if (effectiveParticipantIds.length === 0) {
        return res.json({
          success: true,
          message: 'Không có thành viên chính thức nào cần trừ ví (tất cả đã nộp hoặc danh sách chỉ có khách mời)!',
          count: 0,
          updatedPlayers: [],
          transactions: []
        });
      }

      const createdTransactions = [];
      const updatedPlayers = [];

      for (const pId of effectiveParticipantIds) {
        let balanceBefore = 0;
        let balanceAfter = 0;
        let playerName = '';

        if (connected) {
          // Thao tác nguyên tử (Atomic Update $inc) chống Race Condition
          const updatedPlayer = await Player.findOneAndUpdate(
            { id: pId },
            { $inc: { fundBalance: -amountToDeduct } },
            { new: true }
          );

          if (!updatedPlayer) continue;

          balanceAfter = Number(updatedPlayer.fundBalance) || 0;
          balanceBefore = balanceAfter + amountToDeduct;
          playerName = updatedPlayer.name;
        } else if (fallbackData && Array.isArray(fallbackData.players)) {
          const player = fallbackData.players.find(p => p.id === pId);
          if (!player) continue;

          balanceBefore = Number(player.fundBalance) || 0;
          balanceAfter = balanceBefore - amountToDeduct;
          player.fundBalance = balanceAfter;
          playerName = player.name;
        } else {
          continue;
        }

        const noteText = String(note || `Tiền sân trận vs ${matchOpponent || 'đối thủ'}`).trim().slice(0, 200);
        const txDoc = {
          id: `ft_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          playerId: pId, playerName, amount: -amountToDeduct, balanceBefore, balanceAfter,
          type: 'MATCH_DEDUCT', matchId: (cleanMatchId || ''),
          matchOpponent: (typeof matchOpponent === 'string' ? matchOpponent.trim().slice(0, 100) : ''),
          note: noteText, createdBy: 'Thủ quỹ', createdAt: new Date()
        };
        const savedTx = connected ? await FundTransaction.create(txDoc) : (fallbackData.fundTransactions.unshift(txDoc), txDoc);
        createdTransactions.push(savedTx);
        updatedPlayers.push({ playerId: pId, name: playerName, deducted: amountToDeduct, balanceAfter });
      }

      // Tự động cập nhật trạng thái đã nộp tiền trong trận đấu nếu có (CHỈ cho thành viên chính thức được trừ ví)
      if (targetMatch && targetMatch.finance && Array.isArray(targetMatch.finance.payments)) {
        const updatedIdsSet = new Set(updatedPlayers.map(u => u.playerId));
        targetMatch.finance.payments.forEach(payment => {
          if (updatedIdsSet.has(payment.playerId)) {
            payment.isPaid = true;
            payment.paidAt = new Date().toISOString();
            payment.note = 'Trừ vào ví quỹ đội';
          }
        });
        if (connected) {
          targetMatch.markModified('finance');
          await targetMatch.save();
        }
      }

      if (typeof broadcastDataUpdate === 'function') {
        broadcastDataUpdate('funds', `⚽ Đã trừ tiền sân vào ví quỹ cho ${updatedPlayers.length} cầu thủ!`, {
          count: updatedPlayers.length,
          matchId: cleanMatchId
        });
      }

      return res.json({
        success: true,
        message: `Đã trừ tiền sân vào ví quỹ thành công cho ${updatedPlayers.length} cầu thủ!`,
        count: updatedPlayers.length,
        updatedPlayers,
        transactions: createdTransactions
      });
    } catch (err) {
      console.warn('[Funds] Lỗi trừ tiền sân vào ví:', err.message);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi trừ tiền sân: ' + err.message });
    }
  });
}

module.exports = {
  registerOperationRoutes
};
