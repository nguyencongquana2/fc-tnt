/**
 * FC TNT - Team Funds & Member Wallet Router
 * Quản lý ví số dư thành viên, nạp quỹ đơn lẻ / hàng loạt, trừ tiền sân và nhật ký giao dịch
 * Bảo vệ bởi middleware requireTreasurer độc lập tuyệt đối với Admin PIN
 */

const express = require('express');
const crypto = require('crypto');
const Player = require('../models/Player');
const Match = require('../models/Match');
const FundTransaction = require('../models/FundTransaction');
const { requireTreasurer } = require('./auth');

function createFundsRouter({ isMongoConnected, fallbackData, broadcastDataUpdate }) {
  const router = express.Router();

  // In-memory fallback transactions if MongoDB is not connected
  if (!fallbackData.fundTransactions) {
    fallbackData.fundTransactions = [];
  }

  // =========================================================================
  // GET /api/funds/balances (Xem danh sách số dư quỹ thành viên - Công khai)
  // =========================================================================
  router.get('/balances', async (req, res) => {
    try {
      const connected = (typeof isMongoConnected === 'function' ? isMongoConnected() : false);
      let players = [];

      if (connected) {
        players = await Player.find().select('id name nickname number position avatar fundBalance').sort({ number: 1 });
      } else if (fallbackData && Array.isArray(fallbackData.players)) {
        players = fallbackData.players.map(p => ({
          id: p.id, name: p.name, nickname: p.nickname, number: p.number, position: p.position, avatar: p.avatar, fundBalance: p.fundBalance || 0
        }));
      }

      let totalFund = 0, positiveFund = 0, negativeFund = 0;
      players.forEach(p => {
        const bal = Number(p.fundBalance) || 0;
        if (bal >= 0) positiveFund += bal; else negativeFund += Math.abs(bal);
        totalFund += bal;
      });

      return res.json({
        success: true,
        summary: { totalFund, positiveFund, negativeFund, playerCount: players.length },
        players
      });
    } catch (err) {
      console.warn('[Funds] Lấy danh sách số dư quỹ thất bại:', err.message);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy số dư quỹ!' });
    }
  });

  // =========================================================================
  // GET /api/funds/transactions (Xem nhật ký biến động số dư quỹ)
  // =========================================================================
  router.get('/transactions', async (req, res) => {
    try {
      const { playerId, type, limit = 50 } = req.query;
      const connected = (typeof isMongoConnected === 'function' ? isMongoConnected() : false);
      const queryLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

      const validTypes = ['TOPUP', 'MATCH_DEDUCT', 'ADJUSTMENT', 'REFUND'];

      if (connected) {
        const filter = {};
        // Chống NoSQL Injection: Kiểm tra nghiêm ngặt kiểu string
        if (playerId && typeof playerId === 'string') {
          filter.playerId = String(playerId).trim();
        }
        if (type && typeof type === 'string' && validTypes.includes(type.trim())) {
          filter.type = type.trim();
        }

        const transactions = await FundTransaction.find(filter)
          .sort({ createdAt: -1 })
          .limit(queryLimit);

        return res.json({ success: true, transactions });
      }

      let list = [...(fallbackData.fundTransactions || [])];
      if (playerId && typeof playerId === 'string') {
        const cleanId = String(playerId).trim();
        list = list.filter(t => t.playerId === cleanId);
      }
      if (type && typeof type === 'string' && validTypes.includes(type.trim())) {
        list = list.filter(t => t.type === type.trim());
      }
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return res.json({ success: true, transactions: list.slice(0, queryLimit) });
    } catch (err) {
      console.warn('[Funds] Lấy lịch sử giao dịch thất bại:', err.message);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy lịch sử giao dịch quỹ!' });
    }
  });

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
      const createdTransactions = [];
      const updatedPlayers = [];

      for (const pId of participantIds) {
        const cleanPId = (typeof pId === 'string') ? pId.trim() : null;
        if (!cleanPId) continue;

        let balanceBefore = 0;
        let balanceAfter = 0;
        let playerName = '';

        if (connected) {
          // Thao tác nguyên tử (Atomic Update $inc) chống Race Condition
          const updatedPlayer = await Player.findOneAndUpdate(
            { id: cleanPId },
            { $inc: { fundBalance: -amountToDeduct } },
            { new: true }
          );

          if (!updatedPlayer) continue;

          balanceAfter = Number(updatedPlayer.fundBalance) || 0;
          balanceBefore = balanceAfter + amountToDeduct;
          playerName = updatedPlayer.name;
        } else if (fallbackData && Array.isArray(fallbackData.players)) {
          const player = fallbackData.players.find(p => p.id === cleanPId);
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
          playerId: cleanPId, playerName, amount: -amountToDeduct, balanceBefore, balanceAfter,
          type: 'MATCH_DEDUCT', matchId: (typeof matchId === 'string' ? matchId.trim() : ''),
          matchOpponent: (typeof matchOpponent === 'string' ? matchOpponent.trim().slice(0, 100) : ''),
          note: noteText, createdBy: 'Thủ quỹ', createdAt: new Date()
        };
        const savedTx = connected ? await FundTransaction.create(txDoc) : (fallbackData.fundTransactions.unshift(txDoc), txDoc);
        createdTransactions.push(savedTx);
        updatedPlayers.push({ playerId: cleanPId, name: playerName, deducted: amountToDeduct, balanceAfter });
      }

      // Tự động cập nhật trạng thái đã nộp tiền trong trận đấu nếu có matchId (kiểm tra kiểu string an toàn)
      const cleanMatchId = (typeof matchId === 'string' && matchId.trim()) ? matchId.trim() : null;
      if (cleanMatchId) {
        if (connected) {
          const match = await Match.findOne({ id: cleanMatchId });
          if (match && match.finance && Array.isArray(match.finance.payments)) {
            match.finance.payments.forEach(payment => {
              if (participantIds.includes(payment.playerId)) {
                payment.isPaid = true;
                payment.paidAt = new Date().toISOString();
                payment.note = 'Trừ vào ví quỹ đội';
              }
            });
            match.markModified('finance');
            await match.save();
          }
        } else if (fallbackData && Array.isArray(fallbackData.matches)) {
          const match = fallbackData.matches.find(m => m.id === cleanMatchId);
          if (match && match.finance && Array.isArray(match.finance.payments)) {
            match.finance.payments.forEach(payment => {
              if (participantIds.includes(payment.playerId)) {
                payment.isPaid = true;
                payment.paidAt = new Date().toISOString();
                payment.note = 'Trừ vào ví quỹ đội';
              }
            });
          }
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

  // =========================================================================
  // POST /api/funds/adjust (Điều chỉnh số dư cá nhân thủ công - Yêu cầu Thủ Quỹ)
  // =========================================================================
  router.post('/adjust', requireTreasurer, async (req, res) => {
    try {
      const { playerId, newBalance, reason } = req.body;
      const cleanPId = (typeof playerId === 'string') ? playerId.trim() : null;
      const targetBalance = Number(newBalance);

      // Kiểm tra kiểu và miền giá trị hợp lý (từ -20.000.000đ đến 50.000.000đ)
      if (!cleanPId || !Number.isInteger(targetBalance) || targetBalance < -20000000 || targetBalance > 50000000) {
        return res.status(400).json({
          success: false,
          error: 'Thông tin điều chỉnh không hợp lệ (số dư phải là số nguyên từ -20.000.000đ đến +50.000.000đ)!'
        });
      }

      const connected = (typeof isMongoConnected === 'function' ? isMongoConnected() : false);
      let player = null;

      if (connected) {
        player = await Player.findOne({ id: cleanPId });
      } else if (fallbackData && Array.isArray(fallbackData.players)) {
        player = fallbackData.players.find(p => p.id === cleanPId);
      }

      if (!player) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy cầu thủ!' });
      }

      const balanceBefore = Number(player.fundBalance) || 0;
      const diff = targetBalance - balanceBefore;

      if (diff === 0) {
        return res.json({ success: true, message: 'Số dư không thay đổi.', player });
      }

      player.fundBalance = targetBalance;
      if (connected) {
        await player.save();
      }

      const cleanReason = String(reason || 'Điều chỉnh số dư thủ công').trim().slice(0, 200);

      const txDoc = {
        id: `ft_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        playerId: player.id,
        playerName: player.name,
        amount: diff,
        balanceBefore,
        balanceAfter: targetBalance,
        type: 'ADJUSTMENT',
        note: cleanReason,
        createdBy: 'Thủ quỹ',
        createdAt: new Date()
      };

      if (connected) {
        await FundTransaction.create(txDoc);
      } else {
        fallbackData.fundTransactions.unshift(txDoc);
      }

      if (typeof broadcastDataUpdate === 'function') {
        broadcastDataUpdate('funds', `⚖️ Số dư quỹ của "${player.name}" vừa được điều chỉnh!`);
      }

      return res.json({
        success: true,
        message: `Đã cập nhật số dư của ${player.name} thành ${targetBalance.toLocaleString('vi-VN')}đ`,
        balanceBefore,
        balanceAfter: targetBalance,
        diff
      });
    } catch (err) {
      console.warn('[Funds] Lỗi điều chỉnh số dư:', err.message);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi điều chỉnh: ' + err.message });
    }
  });

  // =========================================================================
  // DELETE /api/funds/transaction/:id (Xóa & Hoàn tác giao dịch - Yêu cầu Thủ Quỹ)
  // =========================================================================
  router.delete('/transaction/:id', requireTreasurer, async (req, res) => {
    try {
      const { id } = req.params;
      const connected = (typeof isMongoConnected === 'function' ? isMongoConnected() : false);
      let tx = null;

      if (connected) {
        tx = await FundTransaction.findOne({ id });
      } else {
        const idx = (fallbackData.fundTransactions || []).findIndex(t => t.id === id);
        if (idx !== -1) tx = fallbackData.fundTransactions[idx];
      }

      if (!tx) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy giao dịch!' });
      }

      const pId = tx.playerId;
      const txAmount = Number(tx.amount) || 0;
      let newBalance = 0;

      // 1. Hoàn tác số dư của cầu thủ
      if (connected) {
        const updateQuery = (tx.type === 'ADJUSTMENT')
          ? { $set: { fundBalance: tx.balanceBefore } }
          : { $inc: { fundBalance: -txAmount } };
        const updated = await Player.findOneAndUpdate({ id: pId }, updateQuery, { new: true });
        newBalance = updated ? updated.fundBalance : 0;
      } else if (fallbackData && Array.isArray(fallbackData.players)) {
        const player = fallbackData.players.find(p => p.id === pId);
        if (player) {
          player.fundBalance = (tx.type === 'ADJUSTMENT') ? tx.balanceBefore : (Number(player.fundBalance) || 0) - txAmount;
          newBalance = player.fundBalance;
        }
      }

      // 2. Nếu là MATCH_DEDUCT, hoàn tác trạng thái đã nộp trong trận đấu
      if (tx.type === 'MATCH_DEDUCT' && tx.matchId) {
        if (connected) {
          const match = await Match.findOne({ id: tx.matchId });
          if (match && match.finance && Array.isArray(match.finance.payments)) {
            const p = match.finance.payments.find(pay => pay.playerId === pId);
            if (p) {
              p.isPaid = false;
              p.paidAt = null;
              p.note = '';
              match.markModified('finance');
              await match.save();
            }
          }
        } else if (fallbackData && Array.isArray(fallbackData.matches)) {
          const match = fallbackData.matches.find(m => m.id === tx.matchId);
          if (match && match.finance && Array.isArray(match.finance.payments)) {
            const p = match.finance.payments.find(pay => pay.playerId === pId);
            if (p) {
              p.isPaid = false;
              p.paidAt = null;
              p.note = '';
            }
          }
        }
      }

      // 3. Xóa giao dịch khỏi cơ sở dữ liệu
      if (connected) {
        await FundTransaction.deleteOne({ id });
      } else {
        fallbackData.fundTransactions = fallbackData.fundTransactions.filter(t => t.id !== id);
      }

      if (typeof broadcastDataUpdate === 'function') {
        broadcastDataUpdate('funds', `🗑️ Đã hoàn tác & xóa giao dịch của ${tx.playerName || 'thành viên'}!`);
      }

      return res.json({
        success: true,
        message: `Đã hoàn tác và xóa giao dịch thành công! Số dư hiện tại của ${tx.playerName || 'cầu thủ'}: ${newBalance.toLocaleString('vi-VN')}đ`,
        newBalance,
        deletedTransactionId: id
      });
    } catch (err) {
      console.warn('[Funds] Lỗi xóa giao dịch:', err.message);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi xóa: ' + err.message });
    }
  });

  return router;
}

module.exports = {
  createFundsRouter
};
