/**
 * FC TNT - Core Application Registry & Event Bus (Service Locator & Mediator Pattern)
 * Giải quyết vấn đề Tight Coupling (window.*) & Ô nhiễm Global Namespace
 * Cung cấp Namespace tập trung window.TNT và Event Hub giữa các module
 */

(function (root) {
  const TNT = {
    version: '4.7',
    modules: {},

    /**
     * Đăng ký một module dịch vụ vào Application Container
     * @param {string} name - Tên định danh module (vd: 'state', 'players', 'matches')
     * @param {object} instance - Thể hiện của module
     * @returns {object} Thể hiện đã đăng ký
     */
    register(name, instance) {
      if (!name) return instance;
      this.modules[name] = instance;
      this[name] = instance; // Truy cập nhanh: TNT.state, TNT.matches,...
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
       * @param {string} event - Tên sự kiện (vd: 'state:updated', 'tab:changed')
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
    }
  };

  root.TNT = TNT;
})(typeof self !== 'undefined' ? self : this);
