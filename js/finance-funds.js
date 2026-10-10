/**
 * FC TNT - Funds Module Facade & Coordinator (js/finance-funds.js)
 * Bộ điều phối trung tâm (Facade Pattern) hợp nhất các submodule từ thư mục js/funds/:
 * - funds-core.js: Trạng thái ví, render bảng chính, điều chỉnh số dư, báo cáo Zalo
 * - funds-topup.js: Modal Nạp Quỹ / Thu tiền (#modal-funds-topup), bulk input & tính tổng
 * - funds-history.js: Modal Lịch Sử Biến Động (#modal-funds-history) & Filter Pills
 * Đăng ký qua Service Locator window.TNT.funds
 */

(function (root) {
  'use strict';

  // Lấy class FundsModule từ funds-core.js
  const FundsClass = root.FundsModule;

  if (!FundsClass) {
    console.error('[Funds] Lỗi nạp module: FundsModule chưa được nạp từ js/funds/funds-core.js!');
    return;
  }

  // Kết nối các mixin sub-modules vào prototype nếu chưa được merge
  if (root.TNTFundsMixins) {
    if (root.TNTFundsMixins.topup) {
      Object.assign(FundsClass.prototype, root.TNTFundsMixins.topup);
    }
    if (root.TNTFundsMixins.history) {
      Object.assign(FundsClass.prototype, root.TNTFundsMixins.history);
    }
  }

  // Khởi tạo instance duy nhất
  const fundsModule = new FundsClass();

  // Đăng ký qua Service Locator window.TNT
  if (root.TNT) {
    root.TNT.register('funds', fundsModule);
    root.TNT.funds = fundsModule;
  }
  root.fundsModule = fundsModule;

})(typeof window !== 'undefined' ? window : this);
