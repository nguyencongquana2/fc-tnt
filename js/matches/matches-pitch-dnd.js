/**
 * Matches Module - Pitch Drag & Drop Engine
 * js/matches/matches-pitch-dnd.js
 * 
 * Quản lý tương tác kéo-thả vị trí và thay người trên sa bàn sân 7:
 * - Kéo-thả (Drag & Drop) hoán đổi vị trí cầu thủ trên sân
 * - Kéo cầu thủ vào băng ghế dự bị hoặc thay người trực tiếp
 */

(function (root) {
  'use strict';

  root.matchesModule = root.matchesModule || {};

  function showToast(msg, type = 'info') {
    if (root.TNT && root.TNT.ui && typeof root.TNT.ui.showToast === 'function') {
      root.TNT.ui.showToast(msg, type);
    } else if (typeof root.showToast === 'function') {
      root.showToast(msg, type);
    }
  }

  Object.assign(root.matchesModule, {
    dragState: {
      playerId: null,
      fromSlot: null,
      isDragging: false
    },

    handleDragStart(e, playerId, fromSlot) {
      if (!window.stateManager || !window.stateManager.isAdmin) {
        if (e.preventDefault) e.preventDefault();
        showToast('🔒 Bạn đang ở Chế Độ Xem. Hãy đăng nhập Quản trị viên để thay đổi đội hình!', 'info');
        return false;
      }

      this.dragState.playerId = playerId;
      this.dragState.fromSlot = fromSlot;
      this.dragState.isDragging = true;

      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({ playerId, fromSlot }));
      }

      const node = e.currentTarget;
      if (node) {
        node.classList.add('dragging');
      }

      // Hiển thị visual gợi ý kéo vào băng ghế dự bị
      const bench = document.getElementById('substitutes-bench-zone');
      if (bench && fromSlot !== 'BENCH') {
        bench.classList.add('bench-drag-target');
      }
    },

    handleDragEnd(e) {
      if (e.currentTarget) {
        e.currentTarget.classList.remove('dragging');
      }

      // Xóa tất cả các class hover drag-over
      document.querySelectorAll('.drag-over, .bench-drag-target').forEach(el => {
        el.classList.remove('drag-over');
        el.classList.remove('bench-drag-target');
      });

      setTimeout(() => {
        this.dragState.isDragging = false;
        this.dragState.playerId = null;
        this.dragState.fromSlot = null;
      }, 150);
    },

    handleSlotDragOver(e) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      const targetNode = e.currentTarget;
      if (targetNode && !targetNode.classList.contains('dragging')) {
        targetNode.classList.add('drag-over');
      }
    },

    handleSlotDragLeave(e) {
      if (e.currentTarget) {
        e.currentTarget.classList.remove('drag-over');
      }
    },

    handleSlotDrop(e, targetSlotId, targetPlayerId = null) {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget) e.currentTarget.classList.remove('drag-over');

      const sourcePlayerId = this.dragState.playerId;
      const sourceSlot = this.dragState.fromSlot;

      if (!sourcePlayerId || sourcePlayerId === targetPlayerId) return;

      const m = window.stateManager ? window.stateManager.getMatchById(this.currentMatchId) : null;
      if (!m) return;

      const stats = m.playerStats || [];
      const sourcePs = stats.find(s => s.playerId === sourcePlayerId);
      if (!sourcePs) return;

      const sourcePlayer = window.stateManager.getPlayerById(sourcePlayerId);

      if (targetPlayerId) {
        // Đã có cầu thủ ở vị trí đích
        const targetPs = stats.find(s => s.playerId === targetPlayerId);
        const targetPlayer = window.stateManager.getPlayerById(targetPlayerId);

        if (sourceSlot === 'BENCH') {
          // Thay người: Cầu thủ dự bị vào sân, cầu thủ đá chính ra ngoài
          sourcePs.isStarter = true;
          sourcePs.pitchSlot = targetSlotId;

          if (targetPs) {
            targetPs.isStarter = false;
            targetPs.pitchSlot = null;
          }

          showToast(`🔄 Thay người: ${sourcePlayer?.name || 'Cầu thủ'} vào sân thế chỗ ${targetPlayer?.name || 'đồng đội'}`);
        } else {
          // Đổi vị trí giữa 2 cầu thủ đang trên sân
          sourcePs.pitchSlot = targetSlotId;
          if (targetPs) {
            targetPs.pitchSlot = sourceSlot;
          }
          showToast(`🔄 Đã hoán đổi vị trí: ${sourcePlayer?.name || ''} ⇄ ${targetPlayer?.name || ''}`);
        }
      } else {
        // Kéo vào một vị trí còn trống trên sân
        sourcePs.isStarter = true;
        sourcePs.pitchSlot = targetSlotId;
        showToast(`⚽ Đã xếp ${sourcePlayer?.name || 'cầu thủ'} vào vị trí trên sân`);
      }

      window.stateManager.updateMatch(this.currentMatchId, { playerStats: stats });
      if (typeof this.renderDetailBody === 'function') this.renderDetailBody();
    },

    handleBenchDragOver(e) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      const bench = document.getElementById('substitutes-bench-zone');
      if (bench && this.dragState.fromSlot !== 'BENCH') {
        bench.classList.add('drag-over');
      }
    },

    handleBenchDragLeave(e) {
      const bench = document.getElementById('substitutes-bench-zone');
      if (bench) {
        bench.classList.remove('drag-over');
      }
    },

    handleBenchDrop(e) {
      e.preventDefault();
      e.stopPropagation();
      const bench = document.getElementById('substitutes-bench-zone');
      if (bench) {
        bench.classList.remove('drag-over');
        bench.classList.remove('bench-drag-target');
      }

      const sourcePlayerId = this.dragState.playerId;
      const sourceSlot = this.dragState.fromSlot;

      if (!sourcePlayerId || sourceSlot === 'BENCH') return;

      const m = window.stateManager ? window.stateManager.getMatchById(this.currentMatchId) : null;
      if (!m) return;

      const stats = m.playerStats || [];
      const sourcePs = stats.find(s => s.playerId === sourcePlayerId);
      if (!sourcePs) return;

      const sourcePlayer = window.stateManager.getPlayerById(sourcePlayerId);

      // Chuyển cầu thủ ra băng ghế dự bị
      sourcePs.isStarter = false;
      sourcePs.pitchSlot = null;

      window.stateManager.updateMatch(this.currentMatchId, { playerStats: stats });
      showToast(`🔄 Đã chuyển ${sourcePlayer?.name || 'cầu thủ'} ra băng ghế dự bị`);
      if (typeof this.renderDetailBody === 'function') this.renderDetailBody();
    },

    handleSubCardDragOver(e) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      if (e.currentTarget) e.currentTarget.classList.add('drag-over');
    },

    handleSubCardDragLeave(e) {
      if (e.currentTarget) e.currentTarget.classList.remove('drag-over');
    },

    handleSubCardDrop(e, targetSubPlayerId) {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget) e.currentTarget.classList.remove('drag-over');

      const sourcePlayerId = this.dragState.playerId;
      const sourceSlot = this.dragState.fromSlot;

      if (!sourcePlayerId || sourcePlayerId === targetSubPlayerId) return;

      const m = window.stateManager ? window.stateManager.getMatchById(this.currentMatchId) : null;
      if (!m) return;

      const stats = m.playerStats || [];
      const sourcePs = stats.find(s => s.playerId === sourcePlayerId);
      const targetPs = stats.find(s => s.playerId === targetSubPlayerId);
      if (!sourcePs || !targetPs) return;

      const sourcePlayer = window.stateManager.getPlayerById(sourcePlayerId);
      const targetPlayer = window.stateManager.getPlayerById(targetSubPlayerId);

      if (sourceSlot !== 'BENCH') {
        // Đổi cầu thủ trên sân với cầu thủ dự bị này
        sourcePs.isStarter = false;
        const prevSlot = sourcePs.pitchSlot;
        sourcePs.pitchSlot = null;

        targetPs.isStarter = true;
        targetPs.pitchSlot = prevSlot;

        showToast(`🔄 Thay người: ${targetPlayer?.name || ''} vào sân thế chỗ ${sourcePlayer?.name || ''}`);
        window.stateManager.updateMatch(this.currentMatchId, { playerStats: stats });
        if (typeof this.renderDetailBody === 'function') this.renderDetailBody();
      }
    }
  });

})(typeof window !== 'undefined' ? window : this);
