/**
 * FC TNT Moments - Lightbox Submodule (js/moments/moments-lightbox.js)
 * Trình xem ảnh và phát video toàn màn hình (Modal Lightbox) với điều hướng phím mũi tên & Touch
 */

window.momentsModule = window.momentsModule || {};

Object.assign(window.momentsModule, {
  openMomentLightbox(momentId, index = 0) {
    const m = window.stateManager ? window.stateManager.getMomentById(momentId) : null;
    if (!m) return;
    const media = this.getNormalizedMedia(m);
    this.openLightbox(media, index);
  },

  openLightboxFromEnc(encJson, index) {
    try {
      const media = JSON.parse(decodeURIComponent(encJson));
      this.openLightbox(media, index);
    } catch (e) {
      console.warn('[MomentsLightbox] Lỗi parse media JSON:', e.message);
    }
  },

  openLightbox(media, startIndex = 0) {
    if (!media || media.length === 0) return;
    this.currentLightboxMedia = media;
    this.currentLightboxIndex = startIndex;

    const modal = document.getElementById('moment-lightbox-modal');
    if (!modal) return;

    modal.classList.add('active');
    this.updateLightboxView();
  },

  closeLightbox() {
    const modal = document.getElementById('moment-lightbox-modal');
    if (modal) modal.classList.remove('active');

    const videoPlayer = document.getElementById('lightbox-current-video');
    if (videoPlayer) {
      videoPlayer.pause();
      videoPlayer.src = '';
    }
    const iframePlayer = document.getElementById('lightbox-current-iframe');
    if (iframePlayer) {
      iframePlayer.src = '';
    }
  },

  prevLightbox() {
    if (this.currentLightboxIndex > 0) {
      this.currentLightboxIndex--;
    } else {
      this.currentLightboxIndex = this.currentLightboxMedia.length - 1;
    }
    this.updateLightboxView();
  },

  nextLightbox() {
    if (this.currentLightboxIndex < this.currentLightboxMedia.length - 1) {
      this.currentLightboxIndex++;
    } else {
      this.currentLightboxIndex = 0;
    }
    this.updateLightboxView();
  },

  updateLightboxView() {
    if (!this.currentLightboxMedia || this.currentLightboxMedia.length === 0) return;
    const item = this.currentLightboxMedia[this.currentLightboxIndex];
    const img = document.getElementById('lightbox-current-img');
    const videoWrap = document.getElementById('lightbox-video-wrap');
    const videoPlayer = document.getElementById('lightbox-current-video');
    const iframeWrap = document.getElementById('lightbox-iframe-wrap');
    const iframePlayer = document.getElementById('lightbox-current-iframe');
    const counter = document.getElementById('lightbox-counter');

    if (counter) {
      counter.innerText = `${this.currentLightboxIndex + 1} / ${this.currentLightboxMedia.length}`;
    }

    if (videoPlayer) {
      videoPlayer.pause();
      videoPlayer.src = '';
    }
    if (iframePlayer) {
      iframePlayer.src = '';
    }
    if (img) img.style.display = 'none';
    if (videoWrap) videoWrap.style.display = 'none';
    if (iframeWrap) iframeWrap.style.display = 'none';

    const mediaObj = typeof item === 'string' ? { type: 'image', url: item } : item;

    if (mediaObj.type === 'video') {
      const embedUrl = this.getEmbedUrl(mediaObj.url);
      if (embedUrl && iframeWrap && iframePlayer) {
        iframePlayer.src = embedUrl;
        iframeWrap.style.display = 'flex';
      } else if (videoWrap && videoPlayer) {
        videoPlayer.src = mediaObj.url;
        videoWrap.style.display = 'flex';
        videoPlayer.play().catch(e => console.warn('[MomentsLightbox] Autoplay prevented:', e.message));
      }
    } else {
      if (img) {
        img.src = mediaObj.url;
        img.style.display = 'block';
      }
    }
  }
});
