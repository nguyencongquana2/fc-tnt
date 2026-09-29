/**
 * FC TNT - Tactics & Playbook Module (Sa Bàn Chiến Thuật Sân 7)
 * Bộ điều phối trung tâm (Facade Pattern) hợp nhất các submodule từ thư mục js/tactics/:
 * - tactics-canvas.js: HTML5 Canvas vector drawing engine, math uốn cong & rAF 60fps
 * - tactics-pieces.js: Quản lý 14 quân cờ, sơ đồ (3-1-2, 2-3-1, 3-2-1), kéo thả cảm ứng Touch
 * - tactics-playbook.js: Kho bài tập mẫu, bộ lọc danh mục, thảo luận & modal lưu kịch bản
 * - tactics-export.js: Xuất ảnh sân bóng 1600x900 chất lượng cao & copy Zalo clipboard
 * - tactics-screen.js: Chế độ xem toàn màn hình (Fullscreen) & tự động xoay ngang 90° trên Mobile
 * - tactics-realtime.js: Điều phối phòng họp Socket.IO realtime
 */

window.tacticsModule = window.tacticsModule || {};

Object.assign(window.tacticsModule, {
  activeTacticId: null,
  currentMode: 'select', // 'select' | 'arrow' | 'curve' | 'pass' | 'zone' | 'text'
  currentColor: '#10b981',
  isDrawing: false,
  drawStartPoint: null,
  currentDrawingPoints: [],
  drawings: [],
  drawingHistory: [], // For Undo
  redoHistory: [],    // For Redo
  pieces: [],
  isDraggingPiece: false,
  draggedPieceId: null,
  editingPieceId: null,
  socket: null,
  filterCategory: 'all',

  init() {
    this.resetBoardState();
    this.bindEvents();
    this.initSocketEvents();
    this.renderPlaybookList();
    this.renderPieces();
    this.initCanvas();
  },

  resetBoardState() {
    this.activeTacticId = null;
    this.pieces = [
      ...JSON.parse(JSON.stringify(this.defaultHomePieces || [])),
      ...JSON.parse(JSON.stringify(this.defaultAwayPieces || [])),
      JSON.parse(JSON.stringify(this.defaultBall || {}))
    ];
    this.drawings = [];
    this.drawingHistory = [];
    this.redoHistory = [];
  },

  bindEvents() {
    // Tự động vào/rời phòng socket khi chuyển đổi tab giao diện (Tiết kiệm pin & 4G)
    window.addEventListener('tabChanged', (e) => {
      if (e.detail && e.detail.tab === 'tactics') {
        this.joinTacticsRoom();
      } else {
        this.leaveTacticsRoom();
      }
    });

    // Bộ lọc danh mục bài tập mẫu (Playbook Category Filter Tabs)
    const filterTabs = document.querySelectorAll('.playbook-filter-btn');
    filterTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        filterTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterCategory = btn.getAttribute('data-filter') || 'all';
        this.renderPlaybookList();
      });
    });

    // Chuyển đổi công cụ vẽ
    document.querySelectorAll('.tactics-tool-btn[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        this.setMode(mode);
      });
    });

    // Chọn màu nét vẽ
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        this.currentColor = dot.getAttribute('data-color') || '#10b981';
      });
    });

    // Chọn sơ đồ chiến thuật nhanh (Formation Switchers)
    const homeFormSelect = document.getElementById('tactics-home-formation');
    if (homeFormSelect) {
      homeFormSelect.addEventListener('change', (e) => {
        this.applyFormation('home', e.target.value);
      });
    }

    const awayFormSelect = document.getElementById('tactics-away-formation');
    if (awayFormSelect) {
      awayFormSelect.addEventListener('change', (e) => {
        this.applyFormation('away', e.target.value);
      });
    }

    // Form gửi thảo luận góp ý
    const commentForm = document.getElementById('tactic-comment-form');
    if (commentForm) {
      commentForm.addEventListener('submit', (e) => this.handleCommentSubmit(e));
    }

    // Modal Lưu Kịch Bản
    const saveForm = document.getElementById('save-tactic-form');
    if (saveForm) {
      saveForm.addEventListener('submit', (e) => this.handleSaveTacticSubmit(e));
    }

    // Modal Chỉnh Sửa Quân Cờ (Đổi tên / số áo)
    const editPieceForm = document.getElementById('edit-piece-form');
    if (editPieceForm) {
      editPieceForm.addEventListener('submit', (e) => this.handleEditPieceSubmit(e));
    }

    const squadSelect = document.getElementById('edit-piece-squad-select');
    if (squadSelect) {
      squadSelect.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        if (!selectedId) return;
        const players = window.stateManager ? window.stateManager.getPlayers() : [];
        const found = players.find(p => p.id === selectedId);
        if (found) {
          const numInput = document.getElementById('edit-piece-number');
          const nameInput = document.getElementById('edit-piece-name');
          if (numInput) numInput.value = found.number || '';
          if (nameInput) nameInput.value = found.nickname || found.name || '';
        }
      });
    }

    // Co giãn canvas tự động khi thay đổi kích thước cửa sổ
    window.addEventListener('resize', () => {
      this.initCanvas();
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.initCanvas(), 250);
    });

    // Bắt phím Esc để tự động thoát fullscreen trên desktop/tablet
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isFullscreen) {
        this.toggleFullscreen(false);
      }
    });

    // Lắng nghe sự kiện thoát Fullscreen của trình duyệt
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && this.isFullscreen) {
        this.toggleFullscreen(false);
      }
    });
  },

  setMode(mode) {
    this.currentMode = mode;
    document.querySelectorAll('.tactics-tool-btn[data-mode]').forEach(btn => {
      if (btn.getAttribute('data-mode') === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const canvasOverlay = document.getElementById('tactics-canvas-overlay');
    const piecesContainer = document.getElementById('tactics-pieces-container');
    if (!canvasOverlay || !piecesContainer) return;

    if (mode === 'select') {
      canvasOverlay.classList.remove('drawing-mode');
      piecesContainer.style.pointerEvents = 'auto';
    } else {
      canvasOverlay.classList.add('drawing-mode');
      piecesContainer.style.pointerEvents = 'none';
    }
  },

  resetBoard() {
    if (confirm('Bạn có muốn đặt lại vị trí toàn bộ cầu thủ và xóa nét vẽ về mặc định không?')) {
      this.resetBoardState();
      this.renderPieces();
      this.redrawCanvas();
      this.renderPlaybookList();
      this.renderComments(null);

      const titleEl = document.getElementById('active-tactic-title-display');
      const descEl = document.getElementById('active-tactic-desc-display');
      if (titleEl) titleEl.innerText = '📋 Bảng Sa Bàn Chiến Thuật Sân 7 & Thảo Luận Thực Chiến';
      if (descEl) descEl.innerText = 'Kéo thả vị trí 14 cầu thủ + bóng, vẽ mũi tên chạy chỗ, đường chuyền và thống nhất bài đánh trước trận.';

      if (this.socket) {
        this.socket.emit('tactics_board_reset');
      }
      window.showToast('🔄 Đã đặt lại sa bàn sân 7 về vị trí xuất phát!');
    }
  }
});

// Đăng ký vào Application Container (Service Locator Pattern)
if (window.TNT && window.TNT.register) {
  window.TNT.register('tactics', window.tacticsModule);
}
