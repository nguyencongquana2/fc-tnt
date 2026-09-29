/**
 * FC TNT - Tactics Module: Playbook Library & Scenarios
 * Thư viện bài tập mẫu, bộ lọc danh mục, thảo luận góp ý, thả tim và modal lưu kịch bản chiến thuật
 */

window.tacticsModule = window.tacticsModule || {};

Object.assign(window.tacticsModule, {
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
    const tactic = window.stateManager ? window.stateManager.getTacticById(id) : null;
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
  }
});
