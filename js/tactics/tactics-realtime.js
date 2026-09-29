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
