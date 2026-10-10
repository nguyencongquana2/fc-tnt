/**
 * FC TNT - Poster Core Submodule (js/poster/poster-core.js)
 * Quản lý trạng thái poster (tỉ lệ 1:1 / 9:16, 4 themes, options),
 * mở/đóng Modal (#poster-generator-modal), tiền tải ảnh và điều phối render
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

  const PosterCoreMixin = {
    currentMatchId: null,
    aspectRatio: '1:1', // '1:1' (1080x1080) | '9:16' (1080x1920)
    theme: 'cyber',     // 'cyber' | 'gold' | 'emerald' | 'fire'
    options: {
      showMotm: true,
      showScorers: true,
      showAssists: true,
      showLineup: true,
      showSlogan: true
    },
    cachedImages: new Map(),

    bindEvents() {
      // Ratio buttons
      document.querySelectorAll('.poster-ratio-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.poster-ratio-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.aspectRatio = btn.getAttribute('data-ratio') || '1:1';
          this.renderPoster();
        });
      });

      // Theme buttons
      document.querySelectorAll('.poster-theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.poster-theme-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.theme = btn.getAttribute('data-theme') || 'cyber';
          this.renderPoster();
        });
      });

      // Option checkboxes
      const optionKeys = ['showMotm', 'showScorers', 'showAssists', 'showLineup', 'showSlogan'];
      optionKeys.forEach(key => {
        const el = document.getElementById(`poster-opt-${key}`);
        if (el) {
          el.addEventListener('change', (e) => {
            this.options[key] = e.target.checked;
            this.renderPoster();
          });
        }
      });
    },

    openPosterModal(matchId) {
      this.currentMatchId = matchId;
      const match = window.stateManager ? window.stateManager.getMatchById(matchId) : null;
      if (!match) {
        showToast('Không tìm thấy dữ liệu trận đấu!', 'error');
        return;
      }

      const modal = document.getElementById('poster-generator-modal');
      if (modal) {
        modal.classList.add('active');
        // Đồng bộ trạng thái controls
        document.querySelectorAll('.poster-ratio-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-ratio') === this.aspectRatio);
        });
        document.querySelectorAll('.poster-theme-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-theme') === this.theme);
        });
        
        const optionKeys = ['showMotm', 'showScorers', 'showAssists', 'showLineup', 'showSlogan'];
        optionKeys.forEach(key => {
          const el = document.getElementById(`poster-opt-${key}`);
          if (el) el.checked = Boolean(this.options[key]);
        });

        this.renderPoster();
      }
    },

    closePosterModal() {
      const modal = document.getElementById('poster-generator-modal');
      if (modal) modal.classList.remove('active');
    },

    async preloadImage(url) {
      if (!url) return null;
      if (this.cachedImages.has(url)) return this.cachedImages.get(url);

      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          this.cachedImages.set(url, img);
          resolve(img);
        };
        img.onerror = () => {
          resolve(null);
        };
        img.src = url;
      });
    },

    async renderPoster() {
      const canvas = document.getElementById('poster-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      const match = window.stateManager ? window.stateManager.getMatchById(this.currentMatchId) : null;
      if (!match) return;

      const teamInfo = (window.stateManager && window.stateManager.data && window.stateManager.data.teamInfo) 
        ? window.stateManager.data.teamInfo 
        : { name: 'FC TNT', slogan: 'Đá hết mình - Thắng cùng mừng, Thua cùng uống' };
      const playerStats = match.playerStats || [];

      // Kích thước chuẩn HD
      const isSquare = this.aspectRatio === '1:1';
      const width = 1080;
      const height = isSquare ? 1080 : 1920;

      canvas.width = width;
      canvas.height = height;

      // Tìm MVP / MOTM
      let motm = null;
      let highestRating = -1;
      playerStats.forEach(ps => {
        const r = Number(ps.rating) || 0;
        if (r > highestRating) {
          highestRating = r;
          const playerObj = window.stateManager ? window.stateManager.getPlayerById(ps.playerId) : {};
          motm = { ...playerObj, rating: r, stat: ps };
        }
      });

      // Tiền tải avatar MVP nếu có
      let motmImg = null;
      if (motm && motm.avatar) {
        motmImg = await this.preloadImage(motm.avatar);
      }

      // 1. VẼ HÌNH NỀN THEO THEME
      this.drawBackground(ctx, width, height, this.theme);

      // 2. VẼ HEADER (LOGO & GIẢI ĐẤU/LỊCH TRẬN)
      const headerY = isSquare ? 70 : 120;
      this.drawHeader(ctx, width, headerY, match, teamInfo);

      // 3. VẼ SCOREBOARD BẢNG ĐIỂM
      const scoreY = isSquare ? 230 : 380;
      this.drawScoreboard(ctx, width, scoreY, match, teamInfo);

      // 4. VẼ MOTM / CẦU THỦ XUẤT SẮC NHẤT
      let currentY = isSquare ? 470 : 700;
      if (this.options.showMotm && motm && highestRating > 0) {
        const motmHeight = isSquare ? 170 : 250;
        this.drawMotmCard(ctx, width, currentY, motm, motmImg, isSquare);
        currentY += motmHeight + (isSquare ? 25 : 45);
      }

      // 5. VẼ BÀN THẮNG & KIẾN TẠO
      if ((this.options.showScorers || this.options.showAssists) && playerStats.length > 0) {
        const statsY = currentY;
        const statsHeight = this.drawMatchEvents(ctx, width, statsY, playerStats, isSquare);
        currentY += statsHeight + (isSquare ? 25 : 45);
      }

      // 6. VẼ DANH SÁCH ĐỘI HÌNH NẾU LÀ DÒNG STORY (9:16)
      if (!isSquare && this.options.showLineup && playerStats.length > 0) {
        this.drawLineupSection(ctx, width, currentY, playerStats);
      }

      // 7. VẼ FOOTER & WATERMARK
      this.drawFooter(ctx, width, height, teamInfo);
    }
  };

  root.TNTPosterMixins = root.TNTPosterMixins || {};
  root.TNTPosterMixins.core = PosterCoreMixin;

})(typeof window !== 'undefined' ? window : this);
