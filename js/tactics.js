/**
 * FC TNT - Tactics & Playbook Module (Sa Bàn Chiến Thuật Sân 7)
 * Kiến trúc tương tác HTML5 Canvas, Drag & Drop quân cờ cảm ứng và Socket.IO Realtime
 */

window.tacticsModule = {
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
  isFullscreen: false,
  isRotated: false,

  // Sơ đồ chuẩn sân 7 vị trí (Formations Matrix)
  formations: {
    home: {
      '3-1-2': [
        { id: 'home_gk', x: 6, y: 50 },
        { id: 'home_df_l', x: 26, y: 18 },
        { id: 'home_df_c', x: 22, y: 50 },
        { id: 'home_df_r', x: 26, y: 82 },
        { id: 'home_mf', x: 42, y: 50 },
        { id: 'home_fw_l', x: 65, y: 32 },
        { id: 'home_fw_r', x: 65, y: 68 }
      ],
      '2-3-1': [
        { id: 'home_gk', x: 6, y: 50 },
        { id: 'home_df_l', x: 22, y: 32 },
        { id: 'home_df_c', x: 38, y: 18 },
        { id: 'home_df_r', x: 22, y: 68 },
        { id: 'home_mf', x: 36, y: 50 },
        { id: 'home_fw_l', x: 38, y: 82 },
        { id: 'home_fw_r', x: 66, y: 50 }
      ],
      '3-2-1': [
        { id: 'home_gk', x: 6, y: 50 },
        { id: 'home_df_l', x: 24, y: 20 },
        { id: 'home_df_c', x: 20, y: 50 },
        { id: 'home_df_r', x: 24, y: 80 },
        { id: 'home_mf', x: 42, y: 35 },
        { id: 'home_fw_l', x: 42, y: 65 },
        { id: 'home_fw_r', x: 66, y: 50 }
      ]
    },
    away: {
      '3-2-1': [
        { id: 'away_gk', x: 94, y: 50 },
        { id: 'away_df_l', x: 74, y: 22 },
        { id: 'away_df_c', x: 78, y: 50 },
        { id: 'away_df_r', x: 74, y: 78 },
        { id: 'away_mf', x: 58, y: 50 },
        { id: 'away_fw_l', x: 35, y: 32 },
        { id: 'away_fw_r', x: 35, y: 68 }
      ],
      '2-3-1': [
        { id: 'away_gk', x: 94, y: 50 },
        { id: 'away_df_l', x: 78, y: 32 },
        { id: 'away_df_c', x: 62, y: 18 },
        { id: 'away_df_r', x: 78, y: 68 },
        { id: 'away_mf', x: 64, y: 50 },
        { id: 'away_fw_l', x: 62, y: 82 },
        { id: 'away_fw_r', x: 34, y: 50 }
      ],
      '3-1-2': [
        { id: 'away_gk', x: 94, y: 50 },
        { id: 'away_df_l', x: 74, y: 18 },
        { id: 'away_df_c', x: 78, y: 50 },
        { id: 'away_df_r', x: 74, y: 82 },
        { id: 'away_mf', x: 58, y: 50 },
        { id: 'away_fw_l', x: 35, y: 32 },
        { id: 'away_fw_r', x: 35, y: 68 }
      ]
    }
  },

  defaultHomePieces: [
    { id: 'home_gk', team: 'home', number: 8, name: 'Giang', role: 'GK', x: 6, y: 50 },
    { id: 'home_df_l', team: 'home', number: 6, name: 'Vinh', role: 'DF', x: 26, y: 18 },
    { id: 'home_df_c', team: 'home', number: 5, name: 'Quân', role: 'DF', x: 22, y: 50 },
    { id: 'home_df_r', team: 'home', number: 10, name: 'Hùng', role: 'DF', x: 26, y: 82 },
    { id: 'home_mf', team: 'home', number: 88, name: 'Thành Nam', role: 'MF', x: 42, y: 50 },
    { id: 'home_fw_l', team: 'home', number: 7, name: 'Tài', role: 'FW', x: 65, y: 32 },
    { id: 'home_fw_r', team: 'home', number: 24, name: 'Tố', role: 'FW', x: 65, y: 68 }
  ],

  defaultAwayPieces: [
    { id: 'away_gk', team: 'away', number: 'GK', name: 'GK Bạn', role: 'GK', x: 94, y: 50 },
    { id: 'away_df_l', team: 'away', number: 2, name: 'HV Bạn 1', role: 'DF', x: 74, y: 22 },
    { id: 'away_df_c', team: 'away', number: 4, name: 'Thòng Bạn', role: 'DF', x: 78, y: 50 },
    { id: 'away_df_r', team: 'away', number: 3, name: 'HV Bạn 2', role: 'DF', x: 74, y: 78 },
    { id: 'away_mf', team: 'away', number: 6, name: 'TV Bạn', role: 'MF', x: 58, y: 50 },
    { id: 'away_fw_l', team: 'away', number: 9, name: 'TĐ Bạn 1', role: 'FW', x: 35, y: 32 },
    { id: 'away_fw_r', team: 'away', number: 11, name: 'TĐ Bạn 2', role: 'FW', x: 35, y: 68 }
  ],

  defaultBall: { id: 'ball', team: 'ball', number: '⚽', name: 'Bóng', role: 'ball', x: 50, y: 50 },

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
      ...JSON.parse(JSON.stringify(this.defaultHomePieces)),
      ...JSON.parse(JSON.stringify(this.defaultAwayPieces)),
      JSON.parse(JSON.stringify(this.defaultBall))
    ];
    this.drawings = [];
    this.drawingHistory = [];
    this.redoHistory = [];
  },

  initSocketEvents() {
    if (window.stateManager && window.stateManager.socket) {
      this.socket = window.stateManager.socket;
      this.socket.emit('join_tactics_room');

      this.socket.on('tactics_piece_moved', (data) => {
        if (!data || !data.id) return;
        const p = this.pieces.find(item => item.id === data.id);
        if (p) {
          p.x = data.x;
          p.y = data.y;
          this.updatePieceElementPosition(p);
        }
      });

      this.socket.on('tactics_draw_added', (drawing) => {
        if (!drawing) return;
        this.drawings.push(drawing);
        this.redrawCanvas();
      });

      this.socket.on('tactics_board_resetted', (remoteData) => {
        if (remoteData && remoteData.pieces) {
          this.pieces = remoteData.pieces;
          this.drawings = remoteData.drawings || [];
        } else {
          this.resetBoardState();
        }
        this.renderPieces();
        this.redrawCanvas();
      });

      this.socket.on('tactics_comment_added', (data) => {
        if (!data || data.tacticId !== this.activeTacticId) return;
        const tactic = window.stateManager ? window.stateManager.getTacticById(this.activeTacticId) : null;
        if (tactic) {
          if (!tactic.comments) tactic.comments = [];
          if (!tactic.comments.some(c => c.id === data.comment.id)) {
            tactic.comments.push(data.comment);
          }
          this.renderComments(tactic);
        }
      });

      this.socket.on('tactics_comment_deleted', (data) => {
        if (!data || data.tacticId !== this.activeTacticId) return;
        const tactic = window.stateManager ? window.stateManager.getTacticById(this.activeTacticId) : null;
        if (tactic && Array.isArray(tactic.comments)) {
          tactic.comments = tactic.comments.filter(c => c.id !== data.commentId);
          this.renderComments(tactic);
        }
      });

      this.socket.on('tactics_piece_edited', (data) => {
        if (!data || !data.id) return;
        const p = this.pieces.find(item => item.id === data.id);
        if (p) {
          p.name = data.name;
          p.number = data.number;
          this.updatePieceElementContent(p);
        }
      });
    }
  },

  bindEvents() {
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

    // Co giãn canvas tự động
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

    if (mode === 'select') {
      canvasOverlay.classList.remove('drawing-mode');
      piecesContainer.style.pointerEvents = 'auto';
    } else {
      canvasOverlay.classList.add('drawing-mode');
      piecesContainer.style.pointerEvents = 'none';
    }
  },

  applyFormation(team, formationName) {
    const matrix = this.formations[team] && this.formations[team][formationName];
    if (!matrix) return;

    matrix.forEach(target => {
      const p = this.pieces.find(item => item.id === target.id);
      if (p) {
        p.x = target.x;
        p.y = target.y;
        const el = document.getElementById(`piece-${p.id}`);
        if (el) {
          el.classList.add('animating');
          el.style.left = `${p.x}%`;
          el.style.top = `${p.y}%`;
          setTimeout(() => el.classList.remove('animating'), 450);
        }
      }
    });

    if (this.socket) {
      this.socket.emit('tactics_board_reset', {
        pieces: this.pieces,
        drawings: this.drawings
      });
    }

    // Giữ đồng bộ cả thanh công cụ chính và floating HUD
    const mainSelect = document.getElementById(team === 'home' ? 'tactics-home-formation' : 'tactics-away-formation');
    if (mainSelect && mainSelect.value !== formationName) mainSelect.value = formationName;
    const fsSelect = document.getElementById(team === 'home' ? 'tactics-fs-home-formation' : 'tactics-fs-away-formation');
    if (fsSelect && fsSelect.value !== formationName) fsSelect.value = formationName;

    window.showToast(`⚡ Đã chuyển sơ đồ ${team === 'home' ? 'Đội Nhà' : 'Đội Bạn'} sang ${formationName}`);
  },

  // =========================================================================
  // PHÓNG TO / THU NHỎ TOÀN MÀN HÌNH (FULLSCREEN CONTROLLER)
  // =========================================================================

  toggleFullscreen(forceState) {
    const container = document.getElementById('tactics-pitch-container');
    if (!container) return;

    this.isFullscreen = typeof forceState === 'boolean' ? forceState : !this.isFullscreen;

    if (this.isFullscreen) {
      // Đưa container ra trực tiếp document.body để chiếm trọn 100vw x 100vh thực sự
      if (!this._pitchPlaceholder) {
        this._pitchPlaceholder = document.createElement('div');
        this._pitchPlaceholder.id = 'tactics-pitch-placeholder';
        this._pitchPlaceholder.style.display = 'none';
      }
      if (container.parentNode && container.parentNode !== document.body) {
        container.parentNode.insertBefore(this._pitchPlaceholder, container);
        document.body.appendChild(container);
      }

      container.classList.add('is-fullscreen');
      document.body.classList.add('no-scroll');

      // Kích hoạt HTML5 Native Fullscreen nếu có (ẩn thanh URL trình duyệt & taskbar máy tính)
      try {
        if (!document.fullscreenElement && container.requestFullscreen) {
          container.requestFullscreen().catch(() => {});
        }
      } catch (e) {
        console.warn('[Tactics] requestFullscreen failed:', e.message);
      }

      // Tự động xoay sang landscape trên thiết bị hỗ trợ Screen Orientation API
      try {
        if (screen.orientation && typeof screen.orientation.lock === 'function') {
          screen.orientation.lock('landscape').catch(() => {});
        }
      } catch (e) {
        console.warn('[Tactics] orientation.lock not supported or blocked');
      }
    } else {
      // Thoát Native Fullscreen nếu đang bật
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (e) {
        console.warn('[Tactics] exitFullscreen failed:', e.message);
      }

      container.classList.remove('is-fullscreen');
      document.body.classList.remove('no-scroll');

      // Khôi phục container về lại đúng vị trí ban đầu trong giao diện
      if (this._pitchPlaceholder && this._pitchPlaceholder.parentNode) {
        this._pitchPlaceholder.parentNode.insertBefore(container, this._pitchPlaceholder);
        this._pitchPlaceholder.remove();
        this._pitchPlaceholder = null;
      }

      try {
        if (screen.orientation && typeof screen.orientation.unlock === 'function') {
          screen.orientation.unlock();
        }
      } catch (e) {
        console.warn('[Tactics] orientation.unlock error');
      }
    }

    // Cập nhật text nút ngoài toolbar nếu có
    const fsBtn = document.querySelector('.tactics-fullscreen-btn span');
    if (fsBtn) {
      fsBtn.textContent = this.isFullscreen ? 'Thu Nhỏ' : 'Toàn Màn Hình';
    }

    // Đồng bộ lại kích thước canvas để tọa độ nét vẽ & quân cờ luôn chính xác
    setTimeout(() => {
      this.initCanvas();
    }, 100);
    setTimeout(() => {
      this.initCanvas();
    }, 300);
  },

  openMobileLandscape() {
    this.toggleFullscreen(true);
  },

  // =========================================================================
  // PIECES RENDERING & DRAG-AND-DROP (MOUSE & TOUCH SUPPORT)
  // =========================================================================

  renderPieces() {
    const container = document.getElementById('tactics-pieces-container');
    if (!container) return;
    container.innerHTML = '';

    this.pieces.forEach(p => {
      const el = document.createElement('div');
      el.className = `tactic-piece ${p.team}`;
      el.id = `piece-${p.id}`;
      el.style.left = `${p.x}%`;
      el.style.top = `${p.y}%`;

      if (p.team === 'ball') {
        el.innerHTML = `⚽`;
      } else {
        el.innerHTML = `
          <span>${window.escapeHtml(String(p.number))}</span>
          <span class="tactic-piece-label">${window.escapeHtml(p.name)}</span>
        `;
        el.title = `${p.name} (#${p.number}) - Chạm đúp để đổi tên/số áo`;

        el.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          this.openEditPieceModal(p.id);
        });

        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.openEditPieceModal(p.id);
        });

        let touchTimer = null;
        el.addEventListener('touchstart', () => {
          touchTimer = setTimeout(() => {
            this.openEditPieceModal(p.id);
          }, 650);
        }, { passive: true });
        el.addEventListener('touchmove', () => {
          if (touchTimer) clearTimeout(touchTimer);
        }, { passive: true });
        el.addEventListener('touchend', () => {
          if (touchTimer) clearTimeout(touchTimer);
        }, { passive: true });
      }

      this.bindPieceDragEvents(el, p);
      container.appendChild(el);
    });
  },

  updatePieceElementContent(p) {
    const el = document.getElementById(`piece-${p.id}`);
    if (el && p.team !== 'ball') {
      el.innerHTML = `
        <span>${window.escapeHtml(String(p.number))}</span>
        <span class="tactic-piece-label">${window.escapeHtml(p.name)}</span>
      `;
      el.title = `${p.name} (#${p.number}) - Chạm đúp để đổi tên/số áo`;
    }
  },

  updatePieceElementPosition(p) {
    const el = document.getElementById(`piece-${p.id}`);
    if (el) {
      el.style.left = `${p.x}%`;
      el.style.top = `${p.y}%`;
    }
  },

  bindPieceDragEvents(element, piece) {
    let isDragging = false;
    let lastSocketEmitTime = 0;
    const pitchWrapper = document.getElementById('tactics-pitch-wrapper');

    const onPointerDown = (e) => {
      if (this.currentMode !== 'select') return;
      isDragging = true;
      element.classList.add('dragging');

      const onPointerMove = (moveEvent) => {
        if (!isDragging) return;
        if (moveEvent.cancelable) {
          moveEvent.preventDefault();
        }

        const currentX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0].clientX);
        const currentY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0].clientY);
        if (currentX === undefined || currentY === undefined) return;

        const rect = pitchWrapper.getBoundingClientRect();
        let pctX = ((currentX - rect.left) / rect.width) * 100;
        let pctY = ((currentY - rect.top) / rect.height) * 100;

        // Giới hạn trong sân cỏ
        pctX = Math.max(3, Math.min(97, pctX));
        pctY = Math.max(4, Math.min(96, pctY));

        piece.x = Math.round(pctX * 10) / 10;
        piece.y = Math.round(pctY * 10) / 10;
        element.style.left = `${piece.x}%`;
        element.style.top = `${piece.y}%`;

        // Gửi tọa độ thời gian thực cho phòng Socket.IO (Throttled 40ms ~ 25fps)
        if (this.socket) {
          const now = Date.now();
          if (now - lastSocketEmitTime >= 40) {
            lastSocketEmitTime = now;
            this.socket.emit('tactics_piece_move', {
              id: piece.id,
              x: piece.x,
              y: piece.y
            });
          }
        }
      };

      const onPointerUp = () => {
        if (!isDragging) return;
        isDragging = false;
        element.classList.remove('dragging');
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('mouseup', onPointerUp);
        window.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('touchend', onPointerUp);

        // Gửi tọa độ chốt chặn cuối cùng khi buông tay
        if (this.socket) {
          this.socket.emit('tactics_piece_move', {
            id: piece.id,
            x: piece.x,
            y: piece.y
          });
        }
      };

      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
      window.addEventListener('touchmove', onPointerMove, { passive: false });
      window.addEventListener('touchend', onPointerUp);
    };

    element.addEventListener('mousedown', onPointerDown);
    element.addEventListener('touchstart', onPointerDown, { passive: false });
  },

  // =========================================================================
  // CANVAS DRAWING ENGINE (HIGH-DPI & ARROW ENGINE)
  // =========================================================================

  initCanvas() {
    const canvas = document.getElementById('tactics-canvas-overlay');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    this.redrawCanvas();

    // Gắn sự kiện vẽ
    canvas.onmousedown = (e) => this.startDrawing(e);
    canvas.onmousemove = (e) => this.drawMove(e);
    canvas.onmouseup = (e) => this.endDrawing(e);

    canvas.ontouchstart = (e) => this.startDrawing(e);
    canvas.ontouchmove = (e) => this.drawMove(e);
    canvas.ontouchend = (e) => this.endDrawing(e);
  },

  getCanvasPoint(e) {
    const canvas = document.getElementById('tactics-canvas-overlay');
    if (!canvas) return { x: 50, y: 50 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  },

  startDrawing(e) {
    if (this.currentMode === 'select') return;
    e.preventDefault();

    const pt = this.getCanvasPoint(e);

    // Chế độ gắn nhãn chữ chú thích (Text Annotation)
    if (this.currentMode === 'text') {
      const text = prompt('Nhập chữ chú thích chiến thuật trên sân (VD: Cắt mặt, Pressing, Dứt điểm):');
      if (text && text.trim()) {
        const shape = {
          id: 'text_' + Date.now(),
          type: 'text',
          text: text.trim(),
          points: [pt],
          color: this.currentColor
        };
        this.drawings.push(shape);
        this.drawingHistory.push({ action: 'add', shape });
        this.redoHistory = [];
        this.redrawCanvas();
        if (this.socket) this.socket.emit('tactics_draw_add', shape);
      }
      return;
    }

    this.isDrawing = true;
    this.drawStartPoint = pt;
    this.currentDrawingPoints = [pt];
  },

  drawMove(e) {
    if (!this.isDrawing) return;
    e.preventDefault();
    const pt = this.getCanvasPoint(e);

    this.currentDrawingPoints = [this.drawStartPoint, pt];
    this.redrawCanvas();
    this.drawTempShape(this.currentMode, this.currentDrawingPoints, this.currentColor);
  },

  endDrawing(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;

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

      // Vẽ nền đen mờ bo tròn
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.beginPath();
      ctx.roundRect(p.x - textWidth / 2 - 8, p.y - 12, textWidth + 16, 24, 6);
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
    window.showToast('↪️ Đã khôi phục lại nét vẽ');
  },

  clearDrawings() {
    if (this.drawings.length === 0) return;
    this.drawings = [];
    this.redoHistory = [];
    this.redrawCanvas();
    window.showToast('🧽 Đã làm sạch toàn bộ nét vẽ');
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
  },

  // =========================================================================
  // XUẤT ẢNH SA BÀN CHẤT LƯỢNG CAO (HIGH-DEF CANVAS EXPORT)
  // =========================================================================

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
  },

  // =========================================================================
  // PLAYBOOK & SCENARIOS LIBRARY
  // =========================================================================

  renderPlaybookList() {
    const container = document.getElementById('tactics-playbook-list');
    if (!container) return;

    const allTactics = window.stateManager ? window.stateManager.getTactics() : [];
    const filter = this.filterCategory || 'all';
    const tactics = filter === 'all'
      ? allTactics
      : allTactics.filter(t => t.category === filter);

    if (tactics.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.85rem;">
          Chưa có bài chiến thuật nào trong danh mục này.
        </div>
      `;
      return;
    }

    const currentUserId = window.stateManager?.currentPlayer?.id;
    const isAdmin = window.stateManager?.isAdmin;

    container.innerHTML = tactics.map(t => {
      const isActive = this.activeTacticId === t.id;
      const categoryLabel = {
        corner: 'Phạt Góc',
        throw_in: 'Ném Biên',
        pressing_escape: 'Thoát Press',
        freekick: 'Đá Phạt',
        defense: 'Phòng Ngự',
        attack: 'Tấn Công',
        custom: 'Chiến Thuật'
      }[t.category] || 'Chiến Thuật';

      const canDelete = (isAdmin || (currentUserId && t.author && t.author.id === currentUserId)) && !t.isPreset;
      const isLiked = currentUserId && Array.isArray(t.likes) && t.likes.includes(currentUserId);

      return `
        <div class="playbook-item ${isActive ? 'active' : ''}" onclick="window.tacticsModule.loadTactic('${t.id}')">
          <div class="playbook-item-header">
            <span class="playbook-item-title">${window.escapeHtml(t.title)}</span>
            <div style="display: flex; gap: 0.35rem; align-items: center;">
              <span class="playbook-category-tag tag-${t.category || 'custom'}">${categoryLabel}</span>
              ${canDelete ? `<button type="button" class="tactic-item-del-btn" onclick="event.stopPropagation(); window.tacticsModule.deleteTactic('${t.id}')" title="Xóa bài chiến thuật">✕</button>` : ''}
            </div>
          </div>
          <div class="playbook-item-desc">${window.escapeHtml(t.description || 'Chưa có mô tả chi tiết')}</div>
          <div class="playbook-item-footer">
            <span>👤 ${window.escapeHtml(t.author ? t.author.name : 'FC TNT')}</span>
            <div style="display: flex; gap: 0.6rem; align-items: center;">
              <span>💬 ${t.comments ? t.comments.length : 0}</span>
              <button type="button" class="tactic-like-btn ${isLiked ? 'liked' : ''}" onclick="event.stopPropagation(); window.tacticsModule.toggleLike('${t.id}')" title="Yêu thích bài này">
                ❤️ <span>${t.likes ? t.likes.length : 0}</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  loadTactic(id) {
    const tactic = window.stateManager.getTacticById(id);
    if (!tactic) return;

    this.activeTacticId = id;
    if (Array.isArray(tactic.pieces) && tactic.pieces.length > 0) {
      this.pieces = JSON.parse(JSON.stringify(tactic.pieces));
      this.renderPieces();
    }

    if (Array.isArray(tactic.drawings)) {
      this.drawings = JSON.parse(JSON.stringify(tactic.drawings));
      this.redoHistory = [];
      this.redrawCanvas();
    }

    // Hiển thị thông tin tiêu đề và khu vực thảo luận
    const titleEl = document.getElementById('active-tactic-title-display');
    const descEl = document.getElementById('active-tactic-desc-display');
    if (titleEl) titleEl.innerText = tactic.title;
    if (descEl) descEl.innerText = tactic.description || 'Kịch bản bài tập thực chiến FC TNT.';

    this.renderPlaybookList();
    this.renderComments(tactic);

    // Cập nhật thông tin thẻ Launcher trên Mobile
    const launcherTitle = document.getElementById('mobile-launcher-title');
    if (launcherTitle) launcherTitle.textContent = tactic.title;
    const launcherDesc = document.getElementById('mobile-launcher-desc');
    if (launcherDesc && tactic.description) launcherDesc.textContent = tactic.description;

    // Trên điện thoại, tự động mở sa bàn xoay ngang toàn màn hình khi người dùng chọn bài tập
    if (window.innerWidth <= 768) {
      this.openMobileLandscape();
    }

    window.showToast(`📋 Đã mở chiến thuật: "${tactic.title}"`);
  },

  renderComments(tactic) {
    const container = document.getElementById('tactic-comments-container');
    const countEl = document.getElementById('tactic-comments-count');
    if (!container) return;

    const comments = tactic ? (tactic.comments || []) : [];
    if (countEl) countEl.innerText = `(${comments.length})`;

    if (comments.length === 0) {
      container.innerHTML = `
        <p style="color: var(--text-muted); font-size: 0.8rem; text-align: center; padding: 1rem;">
          Chưa có ý kiến góp ý nào. Hãy là người đầu tiên trao đổi về bài chiến thuật này!
        </p>
      `;
      return;
    }

    const currentUserId = window.stateManager?.currentPlayer?.id;
    const isAdmin = window.stateManager?.isAdmin;

    container.innerHTML = comments.map(c => {
      const canDelete = isAdmin || (currentUserId && c.playerId === currentUserId);
      const timeStr = c.createdAt ? new Date(c.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';

      return `
        <div class="tactic-comment-bubble" id="tactic-comment-${c.id}">
          <div class="tactic-comment-header">
            <span class="tactic-comment-author">⚽ ${window.escapeHtml(c.authorName)}</span>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <span class="tactic-comment-time">${timeStr}</span>
              ${canDelete ? `<button type="button" class="tactic-comment-del-btn" onclick="window.tacticsModule.deleteComment('${tactic.id}', '${c.id}')" title="Xóa góp ý">✕</button>` : ''}
            </div>
          </div>
          <div class="tactic-comment-content">${window.escapeHtml(c.content)}</div>
        </div>
      `;
    }).join('');
  },

  async deleteComment(tacticId, commentId) {
    if (!confirm('Bạn có chắc muốn xóa ý kiến này?')) return;
    const res = await window.stateManager.deleteTacticComment(tacticId, commentId);
    if (res.success) {
      const tactic = window.stateManager.getTacticById(tacticId);
      this.renderComments(tactic);
      this.renderPlaybookList();
      window.showToast('🗑️ Đã xóa ý kiến thảo luận!');
    } else {
      window.showToast(res.error || 'Không thể xóa ý kiến!', 'error');
    }
  },

  async toggleLike(tacticId) {
    const res = await window.stateManager.toggleTacticLike(tacticId);
    if (res.success) {
      this.renderPlaybookList();
    }
  },

  async deleteTactic(tacticId) {
    if (!confirm('Bạn có chắc chắn muốn xóa bài chiến thuật này khỏi kho?')) return;
    const res = await window.stateManager.deleteTactic(tacticId);
    if (res.success) {
      if (this.activeTacticId === tacticId) {
        this.resetBoardState();
        this.renderPieces();
        this.redrawCanvas();
        this.renderComments(null);
      }
      this.renderPlaybookList();
      window.showToast('🗑️ Đã xóa bài chiến thuật thành công!');
    } else {
      window.showToast(res.error || 'Không thể xóa bài chiến thuật!', 'error');
    }
  },

  async handleCommentSubmit(e) {
    e.preventDefault();
    if (!this.activeTacticId) {
      window.showToast('Vui lòng chọn hoặc lưu một bài chiến thuật trước khi bình luận!', 'warning');
      return;
    }

    const input = document.getElementById('tactic-comment-input');
    const content = input ? input.value.trim() : '';
    if (!content) return;

    const res = await window.stateManager.addTacticComment(this.activeTacticId, content);
    if (res.success) {
      input.value = '';
      const tactic = window.stateManager.getTacticById(this.activeTacticId);
      this.renderComments(tactic);
      window.showToast('💬 Đã gửi góp ý chiến thuật thành công!');
    } else {
      window.showToast(res.error || 'Không thể gửi bình luận!', 'error');
    }
  },

  openSaveModal() {
    const isMemberOrAdmin = window.stateManager.isAdmin || window.stateManager.playerToken;
    if (!isMemberOrAdmin) {
      window.showToast('Vui lòng đăng nhập Thành viên hoặc Quản trị viên để lưu kịch bản chiến thuật!', 'warning');
      if (window.appModule && window.appModule.openPlayerLoginModal) {
        window.appModule.openPlayerLoginModal();
      }
      return;
    }

    const modal = document.getElementById('save-tactic-modal');
    if (modal) modal.classList.add('active');
  },

  closeSaveModal() {
    const modal = document.getElementById('save-tactic-modal');
    if (modal) modal.classList.remove('active');
  },

  async handleSaveTacticSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('save-tactic-title')?.value.trim();
    const category = document.getElementById('save-tactic-category')?.value || 'custom';
    const description = document.getElementById('save-tactic-desc')?.value.trim();

    if (!title) {
      window.showToast('Vui lòng nhập tên bài chiến thuật!', 'error');
      return;
    }

    const payload = {
      title,
      category,
      description,
      pieces: this.pieces,
      drawings: this.drawings
    };

    const res = await window.stateManager.saveTactic(payload);
    if (res.success) {
      this.activeTacticId = res.tactic.id;
      this.closeSaveModal();
      this.renderPlaybookList();
      window.showToast(`🎉 Đã lưu bài chiến thuật "${title}" thành công!`);
    } else {
      window.showToast(res.error || 'Lỗi khi lưu chiến thuật!', 'error');
    }
  },

  // =========================================================================
  // EDIT PIECE (TÊN & SỐ ÁO CẦU THỦ TRỰC TIẾP TRÊN SA BÀN)
  // =========================================================================

  openEditPieceModal(pieceId) {
    const piece = this.pieces.find(p => p.id === pieceId);
    if (!piece || piece.team === 'ball') return;

    this.editingPieceId = pieceId;

    const modal = document.getElementById('edit-piece-modal');
    const titleEl = document.getElementById('edit-piece-modal-title');
    const numInput = document.getElementById('edit-piece-number');
    const nameInput = document.getElementById('edit-piece-name');
    const squadSelect = document.getElementById('edit-piece-squad-select');
    const squadGroup = document.getElementById('quick-pick-squad-group');

    if (titleEl) {
      titleEl.innerText = piece.team === 'home'
        ? `🟢 Đổi Tên Cầu Thủ FC TNT (#${piece.number})`
        : `🔴 Đổi Tên Cầu Thủ Đội Bạn (#${piece.number})`;
    }

    if (numInput) numInput.value = piece.number;
    if (nameInput) nameInput.value = piece.name;

    if (squadSelect) {
      if (piece.team === 'home') {
        if (squadGroup) squadGroup.style.display = 'block';
        const players = window.stateManager ? window.stateManager.getPlayers() : [];
        squadSelect.innerHTML = `
          <option value="">-- Chọn cầu thủ FC TNT --</option>
          ${players.map(pl => `
            <option value="${pl.id}">#${pl.number} ${pl.nickname || pl.name} (${pl.position || 'Cầu thủ'})</option>
          `).join('')}
        `;
      } else {
        if (squadGroup) squadGroup.style.display = 'none';
      }
    }

    if (modal) modal.classList.add('active');
  },

  closeEditPieceModal() {
    const modal = document.getElementById('edit-piece-modal');
    if (modal) modal.classList.remove('active');
    this.editingPieceId = null;
  },

  handleEditPieceSubmit(e) {
    e.preventDefault();
    if (!this.editingPieceId) return;

    const piece = this.pieces.find(p => p.id === this.editingPieceId);
    if (!piece) return;

    const numInput = document.getElementById('edit-piece-number');
    const nameInput = document.getElementById('edit-piece-name');

    const newNumber = numInput ? numInput.value.trim() : piece.number;
    const newName = nameInput ? nameInput.value.trim() : piece.name;

    if (!newName) {
      window.showToast('Vui lòng nhập tên cầu thủ!', 'error');
      return;
    }

    piece.number = newNumber;
    piece.name = newName;

    this.updatePieceElementContent(piece);
    this.closeEditPieceModal();

    if (this.socket) {
      this.socket.emit('tactics_piece_edit', {
        id: piece.id,
        number: piece.number,
        name: piece.name
      });
    }

    window.showToast(`✓ Đã đổi thành: #${piece.number} ${piece.name}`);
  }
};
