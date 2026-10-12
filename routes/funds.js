/**
 * FC TNT - Team Funds & Member Wallet Router (routes/funds.js)
 * Bộ điều phối trung tâm (Facade Pattern) hợp nhất các submodule từ thư mục routes/funds/:
 * - funds-balances.js: Xem danh sách số dư quỹ thành viên chính thức
 * - funds-transactions.js: Lịch sử biến động, điều chỉnh số dư và hoàn tác giao dịch
 * - funds-operations.js: Nạp quỹ hàng loạt và trừ tiền sân sau trận
 * Bảo vệ bởi middleware requireTreasurer độc lập tuyệt đối với Admin PIN
 */

const express = require('express');
const { registerBalanceRoutes } = require('./funds/funds-balances');
const { registerTransactionRoutes } = require('./funds/funds-transactions');
const { registerOperationRoutes } = require('./funds/funds-operations');

function createFundsRouter(context) {
  const router = express.Router();

  // Đăng ký các submodule chuyên biệt theo miền nghiệp vụ
  registerBalanceRoutes(router, context);
  registerTransactionRoutes(router, context);
  registerOperationRoutes(router, context);

  return router;
}

module.exports = {
  createFundsRouter
};
