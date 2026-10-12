/**
 * FC TNT - Funds Balances Submodule (routes/funds/funds-balances.js)
 * Quản lý tra cứu danh sách số dư quỹ thành viên chính thức
 */

const Player = require('../../models/Player');
const { isGuestPlayer } = require('../../utils/guestJersey');

function registerBalanceRoutes(router, { isMongoConnected, fallbackData }) {
  // =========================================================================
  // GET /api/funds/balances (Xem danh sách số dư quỹ thành viên - Công khai)
  // =========================================================================
  router.get('/balances', async (req, res) => {
    try {
      const connected = (typeof isMongoConnected === 'function' ? isMongoConnected() : false);
      let players = [];

      if (connected) {
        players = await Player.find({ isGuest: { $ne: true } })
          .select('id name nickname number position avatar fundBalance isGuest invitedBy jerseyColor note')
          .sort({ number: 1 });
      } else if (fallbackData && Array.isArray(fallbackData.players)) {
        players = fallbackData.players
          .filter(p => !p.isGuest)
          .map(p => ({
            id: p.id, name: p.name, nickname: p.nickname, number: p.number, position: p.position, avatar: p.avatar, fundBalance: p.fundBalance || 0,
            isGuest: p.isGuest, invitedBy: p.invitedBy, jerseyColor: p.jerseyColor, note: p.note
          }));
      }

      // Đảm bảo loại bỏ hoàn toàn viện binh / khách mời nếu có dữ liệu cũ chưa gắn cờ isGuest
      players = players.filter(p => !p.isGuest && !p.invitedBy && !isGuestPlayer(p));

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
}

module.exports = {
  registerBalanceRoutes
};
