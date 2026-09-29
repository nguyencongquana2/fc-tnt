/**
 * FC TNT - Tactics Module: High-Definition Canvas Exporter
 * Xuất ảnh sa bàn 1600x900 nét cao, gắn Watermark FC TNT & Copy trực tiếp vào Clipboard
 */

window.tacticsModule = window.tacticsModule || {};

Object.assign(window.tacticsModule, {
  async exportTacticImage() {
    try {
      const offCanvas = document.createElement('canvas');
      const w = 1600;
      const h = 900;
      offCanvas.width = w;
      offCanvas.height = h;
      const ctx = offCanvas.getContext('2d');

      // 1. Nền cỏ sọc chân thực
      const stripeWidth = w / 10;
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#13653f' : '#0f5434';
        ctx.fillRect(i * stripeWidth, 0, stripeWidth, h);
      }

      // 2. Viền vạch sơn trắng sân 7
      const pad = 40;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 4;
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

      // Đường giữa sân
      ctx.beginPath();
      ctx.moveTo(w / 2, pad);
      ctx.lineTo(w / 2, h - pad);
      ctx.stroke();

      // Vòng tròn trung tâm
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 120, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      // Vòng cấm trái & phải
      ctx.strokeRect(pad, h * 0.2, (w - pad * 2) * 0.16, h * 0.6);
      ctx.strokeRect((w - pad) - (w - pad * 2) * 0.16, h * 0.2, (w - pad * 2) * 0.16, h * 0.6);

      // Chấm phạt đền
      ctx.beginPath();
      ctx.arc(pad + (w - pad * 2) * 0.11, h / 2, 6, 0, Math.PI * 2);
      ctx.arc((w - pad) - (w - pad * 2) * 0.11, h / 2, 6, 0, Math.PI * 2);
      ctx.fill();

      // Khung thành
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(pad - 16, h * 0.36, 16, h * 0.28);
      ctx.fillRect(w - pad, h * 0.36, 16, h * 0.28);

      // 3. Vẽ toàn bộ các nét vẽ mũi tên & zone
      this.drawings.forEach(shape => {
        this.drawStoredShape(ctx, shape, w, h);
      });

      // 4. Vẽ các quân cờ
      this.pieces.forEach(p => {
        const cx = (p.x / 100) * w;
        const cy = (p.y / 100) * h;
        const r = p.team === 'ball' ? 18 : 26;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 12;

        if (p.team === 'ball') {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#000';
          ctx.stroke();

          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚽', cx, cy);
        } else {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = p.team === 'home' ? '#059669' : '#dc2626';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = p.team === 'home' ? '#a7f3d0' : '#fecaca';
          ctx.stroke();

          ctx.fillStyle = '#fff';
          ctx.font = 'bold 18px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(p.number), cx, cy);

          // Nhãn tên cầu thủ bên dưới
          ctx.font = 'bold 13px "Segoe UI", sans-serif';
          const nameMetrics = ctx.measureText(p.name);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.roundRect(cx - nameMetrics.width / 2 - 6, cy + r + 4, nameMetrics.width + 12, 20, 4);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillText(p.name, cx, cy + r + 14);
        }

        ctx.restore();
      });

      // 5. Header Banner Watermark
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(pad, pad, w - pad * 2, 70);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 24px "Segoe UI", sans-serif';
      ctx.fillText('⚽ FC TNT • SA BÀN CHIẾN THUẬT SÂN 7', pad + 25, pad + 34);

      const activeTactic = window.stateManager ? window.stateManager.getTacticById(this.activeTacticId) : null;
      const title = activeTactic ? activeTactic.title : 'Kịch Bản Chiến Thuật Thực Chiến';
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillText(`📋 ${title}`, pad + 25, pad + 56);

      // Xuất thành link download file ảnh
      const imageURL = offCanvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = imageURL;
      downloadLink.download = `FC_TNT_Tactics_${Date.now()}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // Thử sao chép ảnh vào Clipboard để dán nhanh vào Zalo
      if (offCanvas.toBlob) {
        offCanvas.toBlob(blob => {
          if (blob && navigator.clipboard && window.ClipboardItem) {
            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => {
              window.showToast('📋 Đã tải ảnh xuống & copy vào Clipboard! Bạn có thể dán (Ctrl+V) vào Zalo ngay.');
            }).catch(() => {
              window.showToast('📸 Đã xuất và tải file ảnh chiến thuật thành công!');
            });
          }
        });
      } else {
        window.showToast('📸 Đã xuất và tải file ảnh chiến thuật thành công!');
      }
    } catch (err) {
      console.warn('[Tactics] Export image error:', err.message);
      window.showToast('Lỗi khi xuất ảnh sa bàn!', 'error');
    }
  }
});
