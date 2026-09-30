/**
 * FC TNT - Tactics Module: HTML5 Canvas Vector Drawing Engine
 * Xử lý vẽ nét mũi tên, đường chuyền, uốn lượn, khoanh vùng, nhãn chữ, Undo/Redo & rAF 60fps
 */

window.tacticsModule = window.tacticsModule || {};

Object.assign(window.tacticsModule, {
  _drawRafId: null,

  initCanvas() {
    const canvas = document.getElementById('tactics-canvas-overlay');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return; // Tránh gán kích thước 0 khi tab sa bàn đang ẩn
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    this.redrawCanvas();

    // Gắn sự kiện vẽ (Hỗ trợ cả Mouse và Touchscreen / Touchcancel)
    canvas.onmousedown = (e) => this.startDrawing(e);
    canvas.onmousemove = (e) => this.drawMove(e);
    canvas.onmouseup = (e) => this.endDrawing(e);

    canvas.ontouchstart = (e) => this.startDrawing(e);
    canvas.ontouchmove = (e) => this.drawMove(e);
    canvas.ontouchend = (e) => this.endDrawing(e);
    canvas.ontouchcancel = (e) => this.endDrawing(e);
  },

  getCanvasPoint(e) {
    const canvas = document.getElementById('tactics-canvas-overlay');
    if (!canvas) return { x: 50, y: 50 };
    const rect = canvas.getBoundingClientRect();
    const touchObj = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    const clientX = touchObj ? touchObj.clientX : e.clientX;
    const clientY = touchObj ? touchObj.clientY : e.clientY;

    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  },

  startDrawing(e) {
    if (this.currentMode === 'select') return;
    if (e.cancelable) e.preventDefault();

    const pt = this.getCanvasPoint(e);

    // Chế độ gắn nhãn chữ chú thích trực tiếp trên cỏ (Inline In-Place Note Editor)
    if (this.currentMode === 'text') {
      this.openInlineNoteEditor(pt);
      return;
    }

    this.isDrawing = true;
    this.drawStartPoint = pt;
    this.currentDrawingPoints = [pt];
  },

  drawMove(e) {
    if (!this.isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const pt = this.getCanvasPoint(e);

    this.currentDrawingPoints = [this.drawStartPoint, pt];

    // Lên lịch render đồng bộ qua requestAnimationFrame để tối ưu 60fps
    if (!this._drawRafId) {
      this._drawRafId = requestAnimationFrame(() => {
        this.redrawCanvas();
        this.drawTempShape(this.currentMode, this.currentDrawingPoints, this.currentColor);
        this._drawRafId = null;
      });
    }
  },

  endDrawing(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this._drawRafId) {
      cancelAnimationFrame(this._drawRafId);
      this._drawRafId = null;
    }

    if (this.currentDrawingPoints.length >= 2) {
      const p1 = this.currentDrawingPoints[0];
      const p2 = this.currentDrawingPoints[this.currentDrawingPoints.length - 1];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      // Bỏ qua nếu nhấp chuột tại chỗ
      if (dist > 2) {
        const shape = {
          id: 'draw_' + Date.now(),
          type: this.currentMode,
          points: [...this.currentDrawingPoints],
          color: this.currentColor,
          width: this.currentMode === 'arrow' ? 4 : 3
        };
        if (this.drawings.length >= 100) this.drawings.shift();
        if (this.drawingHistory.length >= 50) this.drawingHistory.shift();
        this.drawings.push(shape);
        this.drawingHistory.push({ action: 'add', shape });
        this.redoHistory = [];

        // Đồng bộ vẽ realtime qua Socket.IO
        if (this.socket) {
          this.socket.emit('tactics_draw_add', shape);
        }
      }
    }

    this.currentDrawingPoints = [];
    this.redrawCanvas();
  },

  redrawCanvas() {
    const canvas = document.getElementById('tactics-canvas-overlay');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Vẽ toàn bộ các nét vẽ đã lưu
    this.drawings.forEach(shape => {
      this.drawStoredShape(ctx, shape, rect.width, rect.height);
    });

    this.updateHistoryButtonsUI();
  },

  updateHistoryButtonsUI() {
    const hasDrawings = Boolean(this.drawings && this.drawings.length > 0);
    const hasRedo = Boolean(this.redoHistory && this.redoHistory.length > 0);

    const undoBtn = document.getElementById('tactics-side-undo-btn');
    const redoBtn = document.getElementById('tactics-side-redo-btn');
    const clearBtn = document.getElementById('tactics-side-clear-btn');

    if (undoBtn) undoBtn.classList.toggle('disabled', !hasDrawings);
    if (clearBtn) clearBtn.classList.toggle('disabled', !hasDrawings);
    if (redoBtn) redoBtn.classList.toggle('disabled', !hasRedo);
  },

  drawTempShape(mode, points, color) {
    const canvas = document.getElementById('tactics-canvas-overlay');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    this.drawStoredShape(ctx, { type: mode, points, color, width: mode === 'arrow' ? 4 : 3 }, rect.width, rect.height);
  },

  drawStoredShape(ctx, shape, w, h) {
    if (!shape.points || shape.points.length === 0) return;

    ctx.save();
    ctx.strokeStyle = shape.color || '#10b981';
    ctx.fillStyle = shape.color || '#10b981';
    ctx.lineWidth = shape.width || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Vẽ văn bản chú thích (Text label)
    if (shape.type === 'text') {
      const p = { x: (shape.points[0].x / 100) * w, y: (shape.points[0].y / 100) * h };
      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      const text = shape.text || '';
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;

      // Vẽ nền đen mờ bo tròn (có fallback cho trình duyệt cũ)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(p.x - textWidth / 2 - 8, p.y - 12, textWidth + 16, 24, 6);
      } else {
        ctx.rect(p.x - textWidth / 2 - 8, p.y - 12, textWidth + 16, 24);
      }
      ctx.fill();

      // Viền màu
      ctx.strokeStyle = shape.color || '#10b981';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Vẽ chữ
      ctx.fillStyle = shape.color || '#10b981';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, p.x, p.y);
      ctx.restore();
      return;
    }

    if (shape.points.length < 2) {
      ctx.restore();
      return;
    }

    const p1 = { x: (shape.points[0].x / 100) * w, y: (shape.points[0].y / 100) * h };
    const p2 = { x: (shape.points[1].x / 100) * w, y: (shape.points[1].y / 100) * h };

    if (shape.type === 'arrow') {
      // Mũi tên thẳng chạy chỗ
      this.drawArrowLine(ctx, p1.x, p1.y, p2.x, p2.y, false);
    } else if (shape.type === 'curve') {
      // Mũi tên uốn lượn (Curved arrow)
      this.drawCurvedArrow(ctx, p1.x, p1.y, p2.x, p2.y);
    } else if (shape.type === 'pass') {
      // Đường nét đứt chuyền bóng
      this.drawArrowLine(ctx, p1.x, p1.y, p2.x, p2.y, true);
    } else if (shape.type === 'zone') {
      // Khoanh vùng khu vực highlight
      const rx = Math.abs(p2.x - p1.x) / 2;
      const ry = Math.abs(p2.y - p1.y) / 2;
      const cx = Math.min(p1.x, p2.x) + rx;
      const cy = Math.min(p1.y, p2.y) + ry;

      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(15, rx), Math.max(15, ry), 0, 0, Math.PI * 2);
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
    }

    ctx.restore();
  },

  drawArrowLine(ctx, fromX, fromY, toX, toY, isDashed = false) {
    const headlen = 14;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    if (isDashed) {
      ctx.setLineDash([8, 6]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Đầu mũi tên
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  },

  drawCurvedArrow(ctx, fromX, fromY, toX, toY) {
    const headlen = 14;
    const dx = toX - fromX;
    const dy = toY - fromY;
    // Điểm uốn vuông góc tạo cung cong đẹp mắt
    const cx = (fromX + toX) / 2 - dy * 0.22;
    const cy = (fromY + toY) / 2 + dx * 0.22;

    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.moveTo(fromX, fromY);
    ctx.quadraticCurveTo(cx, cy, toX, toY);
    ctx.stroke();

    // Hướng tiếp tuyến tại điểm cuối
    const angle = Math.atan2(toY - cy, toX - cx);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  },

  undo() {
    if (this.drawings.length === 0) return;
    const popped = this.drawings.pop();
    this.redoHistory.push(popped);
    this.redrawCanvas();
    if (this.socket) {
      this.socket.emit('tactics_draw_undo');
    }
    window.showToast('↩️ Đã hoàn tác nét vẽ gần nhất');
  },

  redo() {
    if (this.redoHistory.length === 0) {
      window.showToast('Không có nét vẽ nào để làm lại!', 'info');
      return;
    }
    const restored = this.redoHistory.pop();
    this.drawings.push(restored);
    this.redrawCanvas();
    if (this.socket) {
      this.socket.emit('tactics_draw_redo', restored);
    }
    window.showToast('↪️ Đã khôi phục lại nét vẽ');
  },

  clearDrawings() {
    this.closeInlineNoteEditor();
    if (this.drawings.length === 0) return;
    this.drawings = [];
    this.redoHistory = [];
    this.redrawCanvas();
    if (this.socket) {
      this.socket.emit('tactics_draw_clear');
    }
    window.showToast('🧽 Đã làm sạch toàn bộ nét vẽ');
  },

  openInlineNoteEditor(pt) {
    this.closeInlineNoteEditor();

    const pitchWrapper = document.getElementById('tactics-pitch-wrapper');
    if (!pitchWrapper) return;

    const color = this.currentColor || '#10b981';

    const editor = document.createElement('div');
    editor.className = 'tactics-inline-note-editor';
    editor.id = 'tactics-inline-note-editor';

    // Đảm bảo editor luôn nằm gọn trong sân cỏ
    const clampedX = Math.max(14, Math.min(86, pt.x));
    const clampedY = Math.max(9, Math.min(91, pt.y));

    editor.style.left = `${clampedX}%`;
    editor.style.top = `${clampedY}%`;
    editor.style.borderColor = color;
    editor.style.boxShadow = `0 8px 24px rgba(0, 0, 0, 0.7), 0 0 14px ${color}55`;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tactics-inline-note-input';
    input.placeholder = 'Ghi chú...';
    input.maxLength = 30;
    input.autocomplete = 'off';
    input.style.color = color;

    const btnSubmit = document.createElement('button');
    btnSubmit.type = 'button';
    btnSubmit.className = 'tactics-inline-note-btn submit';
    btnSubmit.textContent = '✓';
    btnSubmit.title = 'Xác nhận ghi chú';
    btnSubmit.style.background = color;
    btnSubmit.style.color = color === '#ffffff' ? '#000000' : '#ffffff';

    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.className = 'tactics-inline-note-btn cancel';
    btnCancel.textContent = '✕';
    btnCancel.title = 'Hủy';

    editor.appendChild(input);
    editor.appendChild(btnSubmit);
    editor.appendChild(btnCancel);
    pitchWrapper.appendChild(editor);

    // Ngăn chặn sự kiện mousedown/touchstart lan truyền xuống canvas vẽ
    const stopPropagation = (ev) => ev.stopPropagation();
    editor.addEventListener('mousedown', stopPropagation);
    editor.addEventListener('touchstart', stopPropagation, { passive: true });
    editor.addEventListener('pointerdown', stopPropagation);

    let isCommitted = false;
    const commitNote = () => {
      if (isCommitted) return;
      isCommitted = true;
      const text = input.value.trim();
      if (text) {
        const shape = {
          id: 'text_' + Date.now(),
          type: 'text',
          text,
          points: [pt],
          color
        };
        this.drawings.push(shape);
        this.drawingHistory.push({ action: 'add', shape });
        this.redoHistory = [];
        this.redrawCanvas();
        if (this.socket) {
          this.socket.emit('tactics_draw_add', shape);
        }
        if (typeof window.showToast === 'function') {
          window.showToast('🏷️ Đã thêm ghi chú: ' + text);
        }
      }
      this.closeInlineNoteEditor();
    };

    const cancelNote = () => {
      if (isCommitted) return;
      isCommitted = true;
      this.closeInlineNoteEditor();
    };

    btnSubmit.onclick = (ev) => {
      ev.stopPropagation();
      commitNote();
    };

    btnCancel.onclick = (ev) => {
      ev.stopPropagation();
      cancelNote();
    };

    input.onkeydown = (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        commitNote();
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        cancelNote();
      }
    };

    // Tự động đóng/commit khi click ra ngoài editor
    const handleOutsideClick = (ev) => {
      if (!editor.contains(ev.target)) {
        document.removeEventListener('pointerdown', handleOutsideClick);
        commitNote();
      }
    };
    setTimeout(() => {
      document.addEventListener('pointerdown', handleOutsideClick);
    }, 100);

    // Đặt tiêu điểm vào ô nhập
    input.focus();
  },

  closeInlineNoteEditor() {
    const existing = document.getElementById('tactics-inline-note-editor');
    if (existing) {
      existing.remove();
    }
  }
});
