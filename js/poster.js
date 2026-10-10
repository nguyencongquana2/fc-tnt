/**
 * FC TNT - Poster Module Facade & Coordinator (js/poster.js)
 * Bộ điều phối trung tâm (Facade Pattern) hợp nhất các sub-module từ thư mục js/poster/:
 * - js/poster/poster-core.js: Quản lý trạng thái, modal, controls tỉ lệ/giao diện & điều phối render
 * - js/poster/poster-draw.js: Engine vẽ Canvas layout (background, header, footer, roundRect)
 * - js/poster/poster-elements.js: Engine vẽ các khối nội dung (scoreboard, MOTM, events, lineup)
 * - js/poster/poster-export.js: Xuất file ảnh HD, sao chép ảnh vào Clipboard & Web Share API
 *
 * Đăng ký qua Service Locator: window.TNT.poster & tương thích ngược window.posterModule
 */

(function (root) {
  'use strict';

  // Khởi tạo instance đối tượng Poster Module trung tâm
  const posterModule = root.posterModule || {};

  // Hợp nhất các submodule mixins
  if (root.TNTPosterMixins) {
    if (root.TNTPosterMixins.core) {
      Object.assign(posterModule, root.TNTPosterMixins.core);
    }
    if (root.TNTPosterMixins.draw) {
      Object.assign(posterModule, root.TNTPosterMixins.draw);
    }
    if (root.TNTPosterMixins.elements) {
      Object.assign(posterModule, root.TNTPosterMixins.elements);
    }
    if (root.TNTPosterMixins.export) {
      Object.assign(posterModule, root.TNTPosterMixins.export);
    }
  }

  // Khởi tạo module
  posterModule.init = function () {
    if (typeof this.bindEvents === 'function') {
      this.bindEvents();
    }
  };

  // Đăng ký qua Service Locator window.TNT
  if (root.TNT && typeof root.TNT.register === 'function') {
    root.TNT.register('poster', posterModule);
  }

  // Tương thích ngược toàn cục
  root.posterModule = posterModule;

})(typeof window !== 'undefined' ? window : this);
