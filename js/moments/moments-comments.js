/**
 * FC TNT Moments - Comments Submodule (js/moments/moments-comments.js)
 * Quản lý gửi bình luận, xóa bình luận an toàn và đồng bộ Socket.IO thời gian thực
 */

window.momentsModule = window.momentsModule || {};

Object.assign(window.momentsModule, {
  renderSingleCommentHtml(momentId, c) {
    const currentPlayer = window.stateManager ? window.stateManager.currentPlayer : null;
    const isAdmin = window.stateManager ? window.stateManager.isAdmin : false;
    const cAuthorId = c.authorId ? String(c.authorId) : '';
    const myId = currentPlayer && currentPlayer.id ? String(currentPlayer.id) : '';

    const isOwner = Boolean(
      currentPlayer && cAuthorId && myId && cAuthorId === myId
    );
    const canDelete = isAdmin || isOwner;

    const safeAvatar = (c.avatar && (c.avatar.startsWith('http://') || c.avatar.startsWith('https://') || c.avatar.startsWith('data:image/')))
      ? this.escapeHtml(c.avatar)
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    return `
      <div class="moment-comment-item ${isOwner ? 'own-comment' : ''}" id="comment-${c.id}">
        <img class="comment-avatar" src="${safeAvatar}" alt="${this.escapeHtml(c.authorName)}">
        <div class="comment-bubble">
          <div class="comment-bubble-header">
            <span class="comment-author">${this.escapeHtml(c.authorName)}</span>
            ${isOwner ? '<span class="comment-own-badge">Bạn</span>' : ''}
            <span class="comment-time">${this.formatRelativeTime(c.createdAt)}</span>
            ${canDelete ? `
              <button class="comment-delete-btn" onclick="window.momentsModule.promptDeleteComment('${momentId}', '${c.id}')" title="${isOwner ? 'Xóa bình luận của bạn' : 'Xóa bình luận (Admin)'}">✕ <span class="del-label">Xóa</span></button>
            ` : ''}
          </div>
          <div class="comment-text">${this.escapeHtml(c.content)}</div>
        </div>
      </div>
    `;
  },

  updateCommentCount(momentId) {
    const moment = window.stateManager ? window.stateManager.getMomentById(momentId) : null;
    const count = (moment && moment.comments) ? moment.comments.length : 0;
    const btn = document.getElementById(`toggle-comments-btn-${momentId}`);
    if (btn) {
      btn.innerHTML = `💬 <span>${count} bình luận</span>`;
    }
  },

  toggleComments(momentId) {
    const sec = document.getElementById(`comments-section-${momentId}`);
    if (sec) {
      sec.classList.toggle('active');
    }
  },

  async handleCommentSubmit(e, momentId) {
    e.preventDefault();
    const form = e.target;
    const contentInput = document.getElementById(`comment-content-${momentId}`);
    const submitBtn = form ? form.querySelector('.comment-submit-btn') : null;
    if (!contentInput) return;
    const content = contentInput.value.trim();

    if (!content) {
      if (window.showToast) {
        window.showToast('Vui lòng nhập nội dung bình luận!', 'warning');
      }
      return;
    }

    if (content.length > 1000) {
      if (window.showToast) {
        window.showToast('Nội dung bình luận tối đa 1.000 ký tự!', 'warning');
      }
      return;
    }

    const currentPlayer = window.stateManager ? window.stateManager.currentPlayer : null;
    const isAdmin = window.stateManager ? window.stateManager.isAdmin : false;

    let authorName = 'Khách / CĐV';
    let avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    if (currentPlayer) {
      authorName = currentPlayer.nickname || currentPlayer.name;
      avatar = currentPlayer.avatar || '';
    } else if (isAdmin) {
      authorName = 'Ban Quản Trị';
      avatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
    }

    // Khóa nút để chống double-click / spam
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Đang gửi...';
    }
    contentInput.disabled = true;

    try {
      if (!window.stateManager || !window.stateManager.addComment) {
        throw new Error('Hệ thống dữ liệu chưa sẵn sàng');
      }
      const newComment = await window.stateManager.addComment(momentId, authorName, content, avatar);
      contentInput.value = '';

      const listEl = document.getElementById(`comments-list-${momentId}`);
      if (listEl && newComment && !document.getElementById(`comment-${newComment.id}`)) {
        const noCommentsText = listEl.querySelector('.no-comments-text');
        if (noCommentsText) noCommentsText.remove();
        listEl.insertAdjacentHTML('beforeend', this.renderSingleCommentHtml(momentId, newComment));
        listEl.scrollTop = listEl.scrollHeight;
      }

      this.updateCommentCount(momentId);

      const sec = document.getElementById(`comments-section-${momentId}`);
      if (sec && !sec.classList.contains('active')) {
        sec.classList.add('active');
      }
    } catch (err) {
      console.warn('[Moments] Comment submission error:', err);
      if (window.showToast) {
        window.showToast('Không thể gửi bình luận, vui lòng thử lại!', 'error');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Gửi 💬';
      }
      contentInput.disabled = false;
      contentInput.focus();
    }
  },

  promptDeleteComment(momentId, commentId) {
    this.pendingDeleteComment = { momentId, commentId };
    const modal = document.getElementById('comment-delete-confirm-modal');
    if (!modal) {
      this.executeDeleteComment(momentId, commentId);
      return;
    }

    const moment = window.stateManager ? window.stateManager.getMomentById(momentId) : null;
    const comment = moment && moment.comments ? moment.comments.find(c => String(c.id) === String(commentId)) : null;

    const previewBox = document.getElementById('delete-comment-preview-box');
    const authorEl = document.getElementById('delete-comment-preview-author');
    const textEl = document.getElementById('delete-comment-preview-text');

    if (previewBox && authorEl && textEl && comment) {
      authorEl.textContent = comment.authorName || 'Bình luận';
      textEl.textContent = `"${comment.content}"`;
      previewBox.style.display = 'block';
    } else if (previewBox) {
      previewBox.style.display = 'none';
    }

    const executeBtn = document.getElementById('delete-comment-execute-btn');
    if (executeBtn) {
      executeBtn.disabled = false;
      executeBtn.innerHTML = '<span>Xóa vĩnh viễn</span>';
    }

    modal.classList.add('active');
  },

  closeDeleteCommentModal() {
    this.pendingDeleteComment = null;
    const modal = document.getElementById('comment-delete-confirm-modal');
    if (modal) modal.classList.remove('active');
  },

  async confirmExecuteDeleteComment() {
    if (!this.pendingDeleteComment) return;
    const { momentId, commentId } = this.pendingDeleteComment;
    const executeBtn = document.getElementById('delete-comment-execute-btn');
    if (executeBtn) {
      executeBtn.disabled = true;
      executeBtn.innerHTML = '<span>Đang xóa...</span>';
    }

    await this.executeDeleteComment(momentId, commentId);
    this.closeDeleteCommentModal();
  },

  async deleteComment(momentId, commentId) {
    this.promptDeleteComment(momentId, commentId);
  },

  async executeDeleteComment(momentId, commentId) {
    if (!window.stateManager || !window.stateManager.deleteComment) return;
    const res = await window.stateManager.deleteComment(momentId, commentId);
    if (res && res.success) {
      const commentEl = document.getElementById(`comment-${commentId}`);
      if (commentEl) commentEl.remove();

      const listEl = document.getElementById(`comments-list-${momentId}`);
      if (listEl && listEl.children.length === 0) {
        listEl.innerHTML = '<div class="no-comments-text">Chưa có bình luận nào. Hãy là người đầu tiên "chém gió"! 👇</div>';
      }
      this.updateCommentCount(momentId);
      if (window.showToast) {
        window.showToast('Đã xóa bình luận thành công.', 'success');
      }
    } else {
      if (window.showToast) {
        window.showToast((res && res.error) ? res.error : 'Không thể xóa bình luận!', 'error');
      }
    }
  },

  handleRemoteCommentUpdate(extra) {
    if (!extra || !extra.momentId) return;
    const { momentId, action, comment, commentId } = extra;

    if (action === 'add_comment' && comment) {
      const listEl = document.getElementById(`comments-list-${momentId}`);
      if (listEl && !document.getElementById(`comment-${comment.id}`)) {
        const noCommentsText = listEl.querySelector('.no-comments-text');
        if (noCommentsText) noCommentsText.remove();
        listEl.insertAdjacentHTML('beforeend', this.renderSingleCommentHtml(momentId, comment));
        listEl.scrollTop = listEl.scrollHeight;
        this.updateCommentCount(momentId);
      }
    } else if (action === 'delete_comment' && commentId) {
      const commentEl = document.getElementById(`comment-${commentId}`);
      if (commentEl) commentEl.remove();
      const listEl = document.getElementById(`comments-list-${momentId}`);
      if (listEl && listEl.children.length === 0) {
        listEl.innerHTML = '<div class="no-comments-text">Chưa có bình luận nào. Hãy là người đầu tiên "chém gió"! 👇</div>';
      }
      this.updateCommentCount(momentId);
    }
  }
});
