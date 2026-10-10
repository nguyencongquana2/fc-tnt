/**
 * FC TNT - Players Module Facade & Coordinator (js/players.js)
 * Bộ điều phối trung tâm (Facade Pattern) hợp nhất các sub-module từ thư mục js/players/:
 * - js/players/players-list.js: Render danh sách thẻ cầu thủ phong cách FIFA & số dư ví quỹ
 * - js/players/players-form.js: Modal thêm/sửa (#player-modal), form submit & xóa cầu thủ
 * - js/players/players-provision.js: Modal cấp tài khoản & đặt lại mật khẩu Admin (#admin-provision-modal)
 * - js/players/players-profile.js: Modal chi tiết hồ sơ (#player-profile-modal) & Engine nén ảnh Canvas
 *
 * Đăng ký qua Service Locator: window.TNT.players & tương thích ngược window.playersModule
 */

(function (root) {
  'use strict';

  // Khởi tạo instance đối tượng Players Module trung tâm
  const playersModule = root.playersModule || {};

  // Hợp nhất các submodule mixins
  if (root.TNTPlayersMixins) {
    if (root.TNTPlayersMixins.list) {
      Object.assign(playersModule, root.TNTPlayersMixins.list);
    }
    if (root.TNTPlayersMixins.form) {
      Object.assign(playersModule, root.TNTPlayersMixins.form);
    }
    if (root.TNTPlayersMixins.provision) {
      Object.assign(playersModule, root.TNTPlayersMixins.provision);
    }
    if (root.TNTPlayersMixins.profile) {
      Object.assign(playersModule, root.TNTPlayersMixins.profile);
    }
  }

  // Khởi tạo và liên kết các sự kiện trung tâm
  playersModule.init = function () {
    this.bindEvents();
    if (typeof this.renderPlayers === 'function') {
      this.renderPlayers();
    }
  };

  playersModule.bindEvents = function () {
    if (typeof this.bindFormEvents === 'function') {
      this.bindFormEvents();
    }
    if (typeof this.bindProvisionEvents === 'function') {
      this.bindProvisionEvents();
    }
    if (typeof this.bindProfileEvents === 'function') {
      this.bindProfileEvents();
    }
  };

  // Đăng ký qua Service Locator window.TNT
  if (root.TNT && typeof root.TNT.register === 'function') {
    root.TNT.register('players', playersModule);
  }

  // Tương thích ngược toàn cục
  root.playersModule = playersModule;

})(typeof window !== 'undefined' ? window : this);
