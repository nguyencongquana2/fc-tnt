/**
 * FC TNT - Tactics Module: Pieces & Formations Controller
 * Quản lý 14 quân cờ sân 7 + bóng, ma trận sơ đồ (3-1-2, 2-3-1, 3-2-1), kéo thả cảm ứng rAF & chỉnh sửa cầu thủ
 */

window.tacticsModule = window.tacticsModule || {};

Object.assign(window.tacticsModule, {
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

  defaultHomePieces: (typeof window !== 'undefined' && window.DEFAULT_TACTICS_PIECES)
    ? window.DEFAULT_TACTICS_PIECES.DEFAULT_HOME_PIECES
    : [
        { id: 'home_gk', team: 'home', number: 8, name: 'Giang', role: 'GK', x: 6, y: 50 },
        { id: 'home_df_l', team: 'home', number: 6, name: 'Vinh', role: 'DF', x: 26, y: 18 },
        { id: 'home_df_c', team: 'home', number: 5, name: 'Quân', role: 'DF', x: 22, y: 50 },
        { id: 'home_df_r', team: 'home', number: 10, name: 'Hùng', role: 'DF', x: 26, y: 82 },
        { id: 'home_mf', team: 'home', number: 88, name: 'Thành Nam', role: 'MF', x: 42, y: 50 },
        { id: 'home_fw_l', team: 'home', number: 7, name: 'Tài', role: 'FW', x: 65, y: 32 },
        { id: 'home_fw_r', team: 'home', number: 24, name: 'Tố', role: 'FW', x: 65, y: 68 }
      ],

  defaultAwayPieces: (typeof window !== 'undefined' && window.DEFAULT_TACTICS_PIECES)
    ? window.DEFAULT_TACTICS_PIECES.DEFAULT_AWAY_PIECES
    : [
        { id: 'away_gk', team: 'away', number: 'GK', name: 'GK Bạn', role: 'GK', x: 94, y: 50 },
        { id: 'away_df_l', team: 'away', number: 2, name: 'HV Bạn 1', role: 'DF', x: 74, y: 22 },
        { id: 'away_df_c', team: 'away', number: 4, name: 'Thòng Bạn', role: 'DF', x: 78, y: 50 },
        { id: 'away_df_r', team: 'away', number: 3, name: 'HV Bạn 2', role: 'DF', x: 74, y: 78 },
        { id: 'away_mf', team: 'away', number: 6, name: 'TV Bạn', role: 'MF', x: 58, y: 50 },
        { id: 'away_fw_l', team: 'away', number: 9, name: 'TĐ Bạn 1', role: 'FW', x: 35, y: 32 },
        { id: 'away_fw_r', team: 'away', number: 11, name: 'TĐ Bạn 2', role: 'FW', x: 35, y: 68 }
      ],

  defaultBall: (typeof window !== 'undefined' && window.DEFAULT_TACTICS_PIECES)
    ? window.DEFAULT_TACTICS_PIECES.DEFAULT_BALL
    : { id: 'ball', team: 'ball', number: '⚽', name: 'Bóng', role: 'ball', x: 50, y: 50 },

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
        el.addEventListener('touchcancel', () => {
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
    let dragRafId = null;
    const pitchWrapper = document.getElementById('tactics-pitch-wrapper');

    const updatePieceDom = () => {
      element.style.left = `${piece.x}%`;
      element.style.top = `${piece.y}%`;
      dragRafId = null;
    };

    const onPointerDown = (e) => {
      if (this.currentMode !== 'select') return;
      isDragging = true;
      element.classList.add('dragging');

      const onPointerMove = (moveEvent) => {
        if (!isDragging) return;
        if (moveEvent.cancelable) {
          moveEvent.preventDefault();
        }

        const touchObj = (moveEvent.touches && moveEvent.touches[0]) || (moveEvent.changedTouches && moveEvent.changedTouches[0]);
        const currentX = touchObj ? touchObj.clientX : moveEvent.clientX;
        const currentY = touchObj ? touchObj.clientY : moveEvent.clientY;
        if (currentX === undefined || currentY === undefined) return;

        const rect = pitchWrapper.getBoundingClientRect();
        let pctX = ((currentX - rect.left) / rect.width) * 100;
        let pctY = ((currentY - rect.top) / rect.height) * 100;

        // Giới hạn trong sân cỏ
        pctX = Math.max(3, Math.min(97, pctX));
        pctY = Math.max(4, Math.min(96, pctY));

        piece.x = Math.round(pctX * 10) / 10;
        piece.y = Math.round(pctY * 10) / 10;

        // Cập nhật DOM mượt mà qua requestAnimationFrame đồng bộ V-Sync
        if (!dragRafId) {
          dragRafId = requestAnimationFrame(updatePieceDom);
        }

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

        if (dragRafId) {
          cancelAnimationFrame(dragRafId);
          dragRafId = null;
        }
        element.style.left = `${piece.x}%`;
        element.style.top = `${piece.y}%`;

        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('mouseup', onPointerUp);
        window.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('touchend', onPointerUp);
        window.removeEventListener('touchcancel', onPointerUp);

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
      window.addEventListener('touchcancel', onPointerUp);
    };

    element.addEventListener('mousedown', onPointerDown);
    element.addEventListener('touchstart', onPointerDown, { passive: false });
  },

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
});
