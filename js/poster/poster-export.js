/**
 * FC TNT - Poster Export Submodule (js/poster/poster-export.js)
 * Quản lý xuất file ảnh HD, sao chép ảnh vào Clipboard bộ nhớ tạm & chia sẻ qua Web Share API
 */

(function (root) {
  'use strict';

  function showToast(msg, type = 'info') {
    if (root.TNT && root.TNT.ui && typeof root.TNT.ui.showToast === 'function') {
      root.TNT.ui.showToast(msg, type);
    } else if (typeof root.showToast === 'function') {
      root.showToast(msg, type);
    }
  }

  const PosterExportMixin = {
    downloadPoster() {
      const canvas = document.getElementById('poster-canvas');
      if (!canvas) return;

      const match = window.stateManager ? window.stateManager.getMatchById(this.currentMatchId) : null;
      const dateStr = match ? (match.date || 'match').replace(/[\/\\]/g, '-') : 'match';
      const oppName = match ? (match.opponent || 'opponent').replace(/\s+/g, '_') : 'opponent';
      const ratioStr = (this.aspectRatio || '1:1').replace(':', 'x');
      const filename = `FC_TNT_Poster_${dateStr}_vs_${oppName}_${ratioStr}.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();

      showToast('🎉 Đã tải ảnh Poster HD về máy thành công!', 'success');
    },

    async copyPosterToClipboard() {
      const canvas = document.getElementById('poster-canvas');
      if (!canvas) return;

      try {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            throw new Error('Không thể tạo blob ảnh');
          }
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            showToast('📋 Đã sao chép ảnh Poster! Dán trực tiếp vào Zalo/Facebook ngay.', 'success');
          } else {
            // Fallback download if clipboard API is not available
            this.downloadPoster();
          }
        }, 'image/png');
      } catch (err) {
        console.warn('[Poster] Clipboard write failed, falling back to download:', err);
        this.downloadPoster();
      }
    },

    async sharePoster() {
      const canvas = document.getElementById('poster-canvas');
      if (!canvas) return;

      if (navigator.share) {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], 'fctnt-match-poster.png', { type: 'image/png' });
          try {
            await navigator.share({
              title: 'FC TNT Matchday Poster',
              text: 'Ảnh tổng kết trận đấu FC TNT!',
              files: [file]
            });
          } catch (e) {
            console.log('[Poster] Share canceled or not supported:', e);
          }
        });
      } else {
        this.copyPosterToClipboard();
      }
    }
  };

  root.TNTPosterMixins = root.TNTPosterMixins || {};
  root.TNTPosterMixins.export = PosterExportMixin;

})(typeof window !== 'undefined' ? window : this);
