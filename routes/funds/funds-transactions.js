/**
 * FC TNT - Funds Transactions & Adjustments Submodule (routes/funds/funds-transactions.js)
 * Quản lý lịch sử giao dịch biến động số dư, điều chỉnh số dư thủ công và hoàn tác giao dịch
 */

const crypto = require('crypto');
const Player = require('../../models/Player');
const Match = require('../../models/Match');
const FundTransaction = require('../../models/FundTransaction');
const { requireTreasurer } = require('../auth');

function registerTransactionRoutes(router, { isMongoConnected, fallbackData, broadcastDataUpdate }) {
  // In-memory fallback transactions if MongoDB is not connected
  if (!fallbackData.fundTransactions) {
    fallbackData.fundTransactions = [];
  }

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
        // Chống NoSQL Injection: Ép kiểu nghiêm ngặt sang string nguyên thủy
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
  // POST /api/funds/adjust (Điều chỉnh số dư cá nhân thủ công - Yêu cầu Thủ Quỹ)
  // =========================================================================
  router.post('/adjust', requireTreasurer, async (req, res) => {
    try {
      const { playerId, newBalance, reason } = req.body;
      const cleanPId = (typeof playerId === 'string') ? String(playerId).trim() : null;
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

      if (connected) {
        await Player.findOneAndUpdate({ id: cleanPId }, { $set: { fundBalance: targetBalance } });
      } else {
        player.fundBalance = targetBalance;
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
      const cleanId = String(req.params.id || '').trim();
      if (!cleanId) {
        return res.status(400).json({ success: false, error: 'ID giao dịch không hợp lệ!' });
      }

      const connected = (typeof isMongoConnected === 'function' ? isMongoConnected() : false);
      let tx = null;

      if (connected) {
        tx = await FundTransaction.findOne({ id: cleanId });
      } else {
        const idx = (fallbackData.fundTransactions || []).findIndex(t => t.id === cleanId);
        if (idx !== -1) tx = fallbackData.fundTransactions[idx];
      }

      if (!tx) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy giao dịch!' });
      }

      const pId = String(tx.playerId || '').trim();
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
        const cleanMatchId = String(tx.matchId).trim();
        if (connected) {
          const match = await Match.findOne({ id: cleanMatchId });
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
          const match = fallbackData.matches.find(m => m.id === cleanMatchId);
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
        await FundTransaction.deleteOne({ id: cleanId });
      } else {
        fallbackData.fundTransactions = fallbackData.fundTransactions.filter(t => t.id !== cleanId);
      }

      if (typeof broadcastDataUpdate === 'function') {
        broadcastDataUpdate('funds', `🗑️ Đã hoàn tác & xóa giao dịch của ${tx.playerName || 'thành viên'}!`);
      }

      return res.json({
        success: true,
        message: `Đã hoàn tác và xóa giao dịch thành công! Số dư hiện tại của ${tx.playerName || 'cầu thủ'}: ${newBalance.toLocaleString('vi-VN')}đ`,
        newBalance,
        deletedTransactionId: cleanId
      });
    } catch (err) {
      console.warn('[Funds] Lỗi xóa giao dịch:', err.message);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi xóa: ' + err.message });
    }
  });
}

module.exports = {
  registerTransactionRoutes
};
