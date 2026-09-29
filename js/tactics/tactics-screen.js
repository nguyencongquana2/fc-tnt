/**
 * FC TNT - Tactics Module: Screen & Fullscreen Controller
 * Quản lý chế độ xem toàn màn hình (Fullscreen) và tự động xoay ngang 90° trên điện thoại
 */

window.tacticsModule = window.tacticsModule || {};

Object.assign(window.tacticsModule, {
  isFullscreen: false,
  isRotated: false,
  _pitchPlaceholder: null,

  toggleFullscreen(forceState) {
    const container = document.getElementById('tactics-pitch-container');
    if (!container) return;

    this.isFullscreen = typeof forceState === 'boolean' ? forceState : !this.isFullscreen;

    if (this.isFullscreen) {
      // Đưa container ra trực tiếp document.body để chiếm trọn 100vw x 100vh thực sự
      if (!this._pitchPlaceholder) {
        this._pitchPlaceholder = document.createElement('div');
        this._pitchPlaceholder.id = 'tactics-pitch-placeholder';
        this._pitchPlaceholder.style.display = 'none';
      }
      if (container.parentNode && container.parentNode !== document.body) {
        container.parentNode.insertBefore(this._pitchPlaceholder, container);
        document.body.appendChild(container);
      }

      container.classList.add('is-fullscreen');
      document.body.classList.add('no-scroll');

      // Kích hoạt HTML5 Native Fullscreen nếu có (ẩn thanh URL trình duyệt & taskbar máy tính)
      try {
        if (!document.fullscreenElement && container.requestFullscreen) {
          container.requestFullscreen().catch(() => {});
        }
      } catch (e) {
        console.warn('[Tactics] requestFullscreen failed:', e.message);
      }

      // Tự động xoay sang landscape trên thiết bị hỗ trợ Screen Orientation API
      try {
        if (screen.orientation && typeof screen.orientation.lock === 'function') {
          screen.orientation.lock('landscape').catch(() => {});
        }
      } catch (e) {
        console.warn('[Tactics] orientation.lock not supported or blocked');
      }
    } else {
      // Thoát Native Fullscreen nếu đang bật
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (e) {
        console.warn('[Tactics] exitFullscreen failed:', e.message);
      }

      container.classList.remove('is-fullscreen');
      document.body.classList.remove('no-scroll');

      // Khôi phục container về lại đúng vị trí ban đầu trong giao diện
      if (this._pitchPlaceholder && this._pitchPlaceholder.parentNode) {
        this._pitchPlaceholder.parentNode.insertBefore(container, this._pitchPlaceholder);
        this._pitchPlaceholder.remove();
        this._pitchPlaceholder = null;
      }

      try {
        if (screen.orientation && typeof screen.orientation.unlock === 'function') {
          screen.orientation.unlock();
        }
      } catch (e) {
        console.warn('[Tactics] orientation.unlock error');
      }
    }

    // Cập nhật text nút ngoài toolbar nếu có
    const fsBtn = document.querySelector('.tactics-fullscreen-btn span');
    if (fsBtn) {
      fsBtn.textContent = this.isFullscreen ? 'Thu Nhỏ' : 'Toàn Màn Hình';
    }

    // Đồng bộ lại kích thước canvas để tọa độ nét vẽ & quân cờ luôn chính xác
    setTimeout(() => {
      this.initCanvas();
    }, 100);
    setTimeout(() => {
      this.initCanvas();
    }, 300);
  },

  openMobileLandscape() {
    this.toggleFullscreen(true);
  }
});
