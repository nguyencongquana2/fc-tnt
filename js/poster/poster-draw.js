/**
 * FC TNT - Poster Canvas Layout & Backdrop (js/poster/poster-draw.js)
 * Chuyên trách kết xuất đồ họa khung viền, nền gradient đa theme, header, footer và hình khối bo góc
 */

(function (root) {
  'use strict';

  const PosterDrawMixin = {
    drawBackground(ctx, width, height, theme) {
      // Gradient nền chính
      let bgGrad = ctx.createLinearGradient(0, 0, width, height);
      if (theme === 'gold') {
        bgGrad.addColorStop(0, '#0a0b10');
        bgGrad.addColorStop(0.5, '#1e190d');
        bgGrad.addColorStop(1, '#0c0a06');
      } else if (theme === 'emerald') {
        bgGrad.addColorStop(0, '#06120d');
        bgGrad.addColorStop(0.5, '#0d251a');
        bgGrad.addColorStop(1, '#040b08');
      } else if (theme === 'fire') {
        bgGrad.addColorStop(0, '#150608');
        bgGrad.addColorStop(0.5, '#280c10');
        bgGrad.addColorStop(1, '#0e0405');
      } else {
        // Cyber Neon Stadium
        bgGrad.addColorStop(0, '#0a0f1d');
        bgGrad.addColorStop(0.4, '#0f172a');
        bgGrad.addColorStop(0.8, '#1e1b4b');
        bgGrad.addColorStop(1, '#090d16');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Vẽ họa tiết sân bóng & ánh đèn pha Neon Glow
      ctx.save();
      
      // Đèn pha đỉnh
      const topGlow = ctx.createRadialGradient(width / 2, 0, 50, width / 2, 0, width * 0.7);
      if (theme === 'gold') {
        topGlow.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
      } else if (theme === 'emerald') {
        topGlow.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
      } else if (theme === 'fire') {
        topGlow.addColorStop(0, 'rgba(244, 63, 94, 0.3)');
      } else {
        topGlow.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
      }
      topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, width, height * 0.6);

      // Đường line sân bóng mờ nghệ thuật
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 2;
      // Vòng tròn trung tâm
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width * 0.32, 0, Math.PI * 2);
      ctx.stroke();
      // Vạch giữa sân
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Họa tiết góc khung viền thể thao
      const borderPadding = 30;
      const cornerSize = 40;
      ctx.strokeStyle = theme === 'gold' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)';
      ctx.lineWidth = 3;

      // Top Left
      ctx.beginPath();
      ctx.moveTo(borderPadding, borderPadding + cornerSize);
      ctx.lineTo(borderPadding, borderPadding);
      ctx.lineTo(borderPadding + cornerSize, borderPadding);
      ctx.stroke();

      // Top Right
      ctx.beginPath();
      ctx.moveTo(width - borderPadding - cornerSize, borderPadding);
      ctx.lineTo(width - borderPadding, borderPadding);
      ctx.lineTo(width - borderPadding, borderPadding + cornerSize);
      ctx.stroke();

      // Bottom Left
      ctx.beginPath();
      ctx.moveTo(borderPadding, height - borderPadding - cornerSize);
      ctx.lineTo(borderPadding, height - borderPadding);
      ctx.lineTo(borderPadding + cornerSize, height - borderPadding);
      ctx.stroke();

      // Bottom Right
      ctx.beginPath();
      ctx.moveTo(width - borderPadding - cornerSize, height - borderPadding);
      ctx.lineTo(width - borderPadding, height - borderPadding);
      ctx.lineTo(width - borderPadding, height - borderPadding - cornerSize);
      ctx.stroke();

      ctx.restore();
    },

    drawHeader(ctx, width, y, match, teamInfo) {
      ctx.save();
      ctx.textAlign = 'center';

      // Badge nhỏ trên đỉnh
      const tagText = '⚽ FC TNT MATCHDAY POSTER ⚽';
      ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(tagText, width / 2, y);

      // Ngày đấu & Địa điểm
      ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillStyle = '#94a3b8';
      const venueText = match.venue ? ` • 📍 ${match.venue}` : '';
      ctx.fillText(`📅 ${match.date} ${match.time ? `(${match.time})` : ''}${venueText}`, width / 2, y + 36);

      ctx.restore();
    },

    drawFooter(ctx, width, height, teamInfo) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      const footerY = height - 40;

      if (this.options && this.options.showSlogan && teamInfo.slogan) {
        ctx.font = 'italic 500 17px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(`"${teamInfo.slogan}"`, width / 2, footerY - 26);
      }

      ctx.font = '800 14px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillStyle = '#10b981';
      ctx.fillText('FC TNT • SOFASCORE PITCH RATING SYSTEM', width / 2, footerY);

      ctx.restore();
    },

    roundRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }
  };

  root.TNTPosterMixins = root.TNTPosterMixins || {};
  root.TNTPosterMixins.draw = PosterDrawMixin;

})(typeof window !== 'undefined' ? window : this);
