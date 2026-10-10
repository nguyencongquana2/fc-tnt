/**
 * FC TNT - Moments & Memories Module
 * Bộ điều phối trung tâm (Facade Pattern) hợp nhất các submodule từ thư mục js/moments/:
 * - moments-feed.js: Hiển thị bảng tin, thư viện ảnh/video Facebook grid & thả cảm xúc
 * - moments-comments.js: Quản lý gửi/xóa bình luận an toàn & realtime Socket.IO
 * - moments-lightbox.js: Xem ảnh/video toàn màn hình (Modal Lightbox)
 * - moments-upload.js: Trích xuất metadata video, nén ảnh canvas & tải lên Cloudinary CDN
 * - moments-modal.js: Form đăng khoảnh khắc, quản lý danh sách media & submit bài viết
 */

window.momentsModule = window.momentsModule || {};

Object.assign(window.momentsModule, {
  currentCategory: 'all',
  currentEditMomentId: null,
  uploadedMedia: [],
  cloudinaryConfig: null,
  currentLightboxMedia: [],
  currentLightboxIndex: 0,
  pendingDeleteComment: null,

  init() {
    this.bindEvents();
    if (this.fetchUploadConfig) this.fetchUploadConfig();
    if (this.renderMoments) this.renderMoments();
  },

  bindEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;

    // Category filter pills
    document.querySelectorAll('.moment-category-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.moment-category-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCategory = btn.getAttribute('data-category') || 'all';
        if (this.renderMoments) this.renderMoments();
      });
    });

    // Moment Form Submit
    const form = document.getElementById('moment-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (this.handleFormSubmit) this.handleFormSubmit();
      });
    }

    // Unified Media (Photos & Videos) File Input in Modal
    const mediaFileInput = document.getElementById('moment-media-file-input');
    if (mediaFileInput) {
      mediaFileInput.addEventListener('change', (e) => {
        if (this.handleMediaFiles) this.handleMediaFiles(e.target.files);
      });
    }

    // Confirm delete comment modal backdrop click
    const confirmDelModal = document.getElementById('comment-delete-confirm-modal');
    if (confirmDelModal) {
      confirmDelModal.addEventListener('click', (e) => {
        if (e.target === confirmDelModal && this.closeDeleteCommentModal) {
          this.closeDeleteCommentModal();
        }
      });
    }

    // Keyboard navigation (Lightbox & Delete Confirm)
    window.addEventListener('keydown', (e) => {
      const confirmModal = document.getElementById('comment-delete-confirm-modal');
      if (confirmModal && confirmModal.classList.contains('active') && e.key === 'Escape') {
        if (this.closeDeleteCommentModal) this.closeDeleteCommentModal();
        return;
      }

      const modal = document.getElementById('moment-lightbox-modal');
      if (modal && modal.classList.contains('active')) {
        if (e.key === 'Escape' && this.closeLightbox) this.closeLightbox();
        else if (e.key === 'ArrowLeft' && this.prevLightbox) this.prevLightbox();
        else if (e.key === 'ArrowRight' && this.nextLightbox) this.nextLightbox();
      }
    });
  }
});

// Đăng ký tập trung qua Service Locator TNT
if (window.TNT) {
  window.TNT.register('moments', window.momentsModule);
}
