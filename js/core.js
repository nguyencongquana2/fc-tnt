/**
 * FC TNT - Core Application Registry, Event Bus & Shared Utilities (js/core.js)
 * Cung cấp Service Locator (window.TNT), Event Hub (TNT.bus), Tiện ích dùng chung (TNT.utils) và Hệ thống UI Toast (TNT.ui)
 * Giải quyết triệt để vấn đề Tight Coupling và ô nhiễm biến toàn cục
 */

(function (root) {
  'use strict';

  const TNT = {
    version: '5.0',
    modules: {},

    /**
     * Đăng ký một module dịch vụ vào Application Container
     * @param {string} name - Tên định danh module (vd: 'state', 'players', 'matches', 'funds')
     * @param {object} instance - Thể hiện của module
     * @returns {object} Thể hiện đã đăng ký
     */
    register(name, instance) {
      if (!name) return instance;
      this.modules[name] = instance;
      this[name] = instance; // Truy cập nhanh: TNT.state, TNT.matches, TNT.funds...
      return instance;
    },

    /**
     * Lấy module đã đăng ký với kiểm tra an toàn
     * @param {string} name 
     * @returns {object|null}
     */
    get(name) {
      return this.modules[name] || null;
    },

    /**
     * Event Bus nội bộ giúp các module giao tiếp lỏng (Loose Coupling)
     * Tránh việc module A gọi cứng trực tiếp các hàm của module B
     */
    events: {
      _listeners: {},

      /**
       * Đăng ký lắng nghe sự kiện
       * @param {string} event - Tên sự kiện (vd: 'state:updated', 'funds:updated', 'toast:show')
       * @param {Function} handler - Hàm xử lý
       */
      on(event, handler) {
        if (!event || typeof handler !== 'function') return;
        (this._listeners[event] = this._listeners[event] || []).push(handler);
      },

      /**
       * Hủy đăng ký lắng nghe
       */
      off(event, handler) {
        if (!this._listeners[event]) return;
        this._listeners[event] = this._listeners[event].filter(h => h !== handler);
      },

      /**
       * Phát sự kiện tới tất cả các subscriber
       */
      emit(event, payload) {
        if (!this._listeners[event]) return;
        this._listeners[event].forEach(handler => {
          try {
            handler(payload);
          } catch (err) {
            console.error(`[TNT Event: ${event}] Lỗi xử lý callback:`, err);
          }
        });
      }
    },

    /**
     * Tiện ích dùng chung chuẩn hóa toàn hệ thống (Single Source of Truth)
     */
    utils: {
      /**
       * Escape HTML an toàn chống Cross-Site Scripting (XSS)
       */
      escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      },

      /**
       * Format tiền tệ Việt Nam Đồng (VND) thống nhất
       * @param {number|string} amount 
       * @returns {string} vd: "100.000đ"
       */
      formatMoney(amount) {
        const num = Number(amount) || 0;
        return num.toLocaleString('vi-VN') + 'đ';
      },

      /**
       * Format ngày giờ chuẩn Việt Nam
       * @param {Date|string|number} date 
       * @param {object} options 
       * @returns {string} vd: "10/10/2026, 14:30"
       */
      formatDate(date, options = {}) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        const defaultOpts = {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        };
        return d.toLocaleString('vi-VN', { ...defaultOpts, ...options });
      },

      /**
       * Sao chép nội dung vào Clipboard an toàn kèm thông báo Toast
       * @param {string} text 
       * @param {string} successMsg 
       */
      copyToClipboard(text, successMsg = '📋 Đã sao chép vào bộ nhớ tạm!') {
        if (!text) return Promise.reject(new Error('Nội dung sao chép trống!'));
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          return navigator.clipboard.writeText(text).then(() => {
            TNT.ui.showToast(successMsg, 'success');
            return true;
          }).catch(err => {
            console.warn('[TNT.utils] Lỗi clipboard API:', err.message);
            TNT.ui.showToast('Không thể tự động sao chép. Vui lòng copy thủ công!', 'error');
            throw err;
          });
        }
        return Promise.reject(new Error('Clipboard API không được hỗ trợ trên trình duyệt này'));
      }
    },

    /**
     * Hệ thống Giao diện & Toast Notifications tập trung
     */
    ui: {
      /**
       * Hiển thị thông báo Toast nổi góc màn hình
       * @param {string} msg - Nội dung thông báo
       * @param {string} type - 'success' | 'error' | 'info' | 'warning'
       */
      showToast(msg, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) {
          console.log(`[Toast ${type}]: ${msg}`);
          return;
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        const cleanMsg = TNT.utils.escapeHtml(msg);

        if (type === 'error') {
          toast.style.borderColor = '#ef4444';
          toast.innerHTML = `⚠️ <span>${cleanMsg}</span>`;
        } else if (type === 'info') {
          toast.style.borderColor = '#06b6d4';
          toast.innerHTML = `ℹ️ <span>${cleanMsg}</span>`;
        } else if (type === 'warning') {
          toast.style.borderColor = '#f59e0b';
          toast.innerHTML = `🔔 <span>${cleanMsg}</span>`;
        } else {
          toast.innerHTML = `✨ <span>${cleanMsg}</span>`;
        }

        container.appendChild(toast);

        setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transform = 'translateX(100%)';
          toast.style.transition = 'all 0.3s ease';
          setTimeout(() => toast.remove(), 300);
        }, 3200);
      }
    }
  };

  // Alias chuẩn Event Bus theo quy chuẩn coding-standards.md (TNT.bus.emit / TNT.bus.on)
  TNT.bus = TNT.events;

  // Lắng nghe sự kiện phát sinh Toast từ Event Bus
  TNT.bus.on('toast:show', (payload) => {
    if (typeof payload === 'string') TNT.ui.showToast(payload);
    else if (payload && payload.msg) TNT.ui.showToast(payload.msg, payload.type || 'success');
  });
  TNT.bus.on('toast:error', (msg) => TNT.ui.showToast(msg, 'error'));
  TNT.bus.on('toast:success', (msg) => TNT.ui.showToast(msg, 'success'));
  TNT.bus.on('toast:info', (msg) => TNT.ui.showToast(msg, 'info'));

  // Đăng ký các alias tương thích ngược 100% cho mã nguồn cũ
  root.TNT = TNT;
  root.escapeHtml = TNT.utils.escapeHtml;
  root.formatMoney = TNT.utils.formatMoney;
  root.showToast = TNT.ui.showToast;

})(typeof self !== 'undefined' ? self : this);
