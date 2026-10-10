/**
 * FC TNT - Finance Module (js/finance.js - Facade Pattern)
 * Quản lý tiền sân, chia tiền đầu người, tự tạo mã VietQR và checklist đối soát
 * Phân tách thành các sub-module chuyên biệt theo chuẩn Clean Architecture:
 * - js/finance/finance-modal.js: Giao diện Modal, nhập liệu chi phí & tính toán chia tiền
 * - js/finance/finance-checklist.js: Bảng checklist nộp tiền, trừ ví số dư quỹ & xuất báo cáo Zalo
 * - js/finance/finance-qr.js: Tạo mã VietQR động, định danh chuyển khoản & Socket.IO realtime
 */

(function (root) {
  'use strict';

  class FinanceModule {
    constructor() {
      this.currentMatchId = null;
      this.currentFinanceData = null;
      this.selectedQrPlayerId = null;
      this._socketInitialized = false;

      if (typeof window !== 'undefined') {
        setTimeout(() => this.initSocketListeners(), 1200);
      }
    }
  }

  // Hợp nhất các mixins vào FinanceModule prototype (Facade Pattern)
  if (typeof window !== 'undefined' && window.TNTFinanceMixins) {
    Object.assign(
      FinanceModule.prototype,
      window.TNTFinanceMixins.modal,
      window.TNTFinanceMixins.checklist,
      window.TNTFinanceMixins.qr
    );
  }

  const financeModule = new FinanceModule();

  if (root.TNT) {
    root.TNT.register('finance', financeModule);
  }

  root.FinanceModule = FinanceModule;
  root.financeModule = financeModule;

})(typeof window !== 'undefined' ? window : this);
