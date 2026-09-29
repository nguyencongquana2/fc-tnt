/**
 * FC TNT - Tactics Module: Realtime Socket.IO Coordinator
 * Quản lý đồng bộ phòng họp chiến thuật trực tiếp đa thiết bị qua WebSocket
 */

window.tacticsModule = window.tacticsModule || {};

Object.assign(window.tacticsModule, {
  initSocketEvents() {
    if (window.stateManager && window.stateManager.socket) {
      this.socket = window.stateManager.socket;
      if (this._socketEventsBound) return;
      this._socketEventsBound = true;

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

      // Nhận Snapshot sa bàn tức thời khi vừa tham gia phòng
      this.socket.on('tactics_room_snapshot', (snapshot) => {
        if (!snapshot) return;
        let hasChange = false;
        if (Array.isArray(snapshot.pieces) && snapshot.pieces.length > 0) {
          this.pieces = JSON.parse(JSON.stringify(snapshot.pieces));
          this.renderPieces();
          hasChange = true;
        }
        if (Array.isArray(snapshot.drawings) && snapshot.drawings.length > 0) {
          this.drawings = JSON.parse(JSON.stringify(snapshot.drawings));
          this.redoHistory = [];
          this.redrawCanvas();
          hasChange = true;
        }
        if (hasChange && window.showToast) {
          window.showToast('📡 Đã đồng bộ sa bàn trực tiếp từ phòng chiến thuật!', 'info');
        }
      });

      this.socket.on('tactics_draw_undone', () => {
        if (this.drawings.length > 0) {
          const popped = this.drawings.pop();
          this.redoHistory.push(popped);
          this.redrawCanvas();
        }
      });

      this.socket.on('tactics_draw_redone', (shape) => {
        if (shape) {
          this.drawings.push(shape);
          this.redrawCanvas();
        }
      });

      this.socket.on('tactics_draw_cleared', () => {
        this.drawings = [];
        this.redoHistory = [];
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

  joinTacticsRoom() {
    if (this.socket) {
      this.socket.emit('join_tactics_room');
    }
  },

  leaveTacticsRoom() {
    if (this.socket) {
      this.socket.emit('leave_tactics_room');
    }
  }
});
