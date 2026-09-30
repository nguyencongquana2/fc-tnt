/**
 * FC TNT Moments & Memories Module
 * Quản lý Khoảnh Khắc, Dòng thời gian, Album ảnh & Tương tác thả cảm xúc / bình luận
 */

window.momentsModule = {
  currentCategory: 'all',
  currentEditMomentId: null,
  uploadedImages: [],
  uploadedVideoData: null,
  currentLightboxImages: [],
  currentLightboxIndex: 0,
  pendingDeleteComment: null,

  init() {
    this.bindEvents();
    this.renderMoments();
  },

  bindEvents() {
    // Category filter pills
    document.querySelectorAll('.moment-category-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.moment-category-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCategory = btn.getAttribute('data-category') || 'all';
        this.renderMoments();
      });
    });

    // Moment Form Submit
    const form = document.getElementById('moment-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    // Image Upload Input in Modal
    const imgFileInput = document.getElementById('moment-img-file-input');
    if (imgFileInput) {
      imgFileInput.addEventListener('change', (e) => {
        this.handleImageFiles(e.target.files);
      });
    }

    // Video Upload Input in Modal
    const videoFileInput = document.getElementById('moment-video-file-input');
    if (videoFileInput) {
      videoFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleVideoFile(e.target.files[0]);
        }
      });
    }

    // Manual video URL input listener
    const videoUrlInput = document.getElementById('moment-input-video');
    if (videoUrlInput) {
      videoUrlInput.addEventListener('input', (e) => {
        if (e.target.value.trim() && !this.uploadedVideoData) {
          const status = document.getElementById('moment-video-status');
          if (status) status.innerText = '🔗 Đã nhập link video';
        }
      });
    }

    // Confirm delete comment modal backdrop click
    const confirmDelModal = document.getElementById('comment-delete-confirm-modal');
    if (confirmDelModal) {
      confirmDelModal.addEventListener('click', (e) => {
        if (e.target === confirmDelModal) this.closeDeleteCommentModal();
      });
    }

    // Keyboard navigation (Lightbox & Delete Confirm)
    window.addEventListener('keydown', (e) => {
      const confirmModal = document.getElementById('comment-delete-confirm-modal');
      if (confirmModal && confirmModal.classList.contains('active') && e.key === 'Escape') {
        this.closeDeleteCommentModal();
        return;
      }

      const modal = document.getElementById('moment-lightbox-modal');
      if (modal && modal.classList.contains('active')) {
        if (e.key === 'Escape') this.closeLightbox();
        else if (e.key === 'ArrowLeft') this.prevLightbox();
        else if (e.key === 'ArrowRight') this.nextLightbox();
      }
    });
  },

  getCategoryMeta(cat) {
    switch (cat) {
      case 'party':
        return { label: 'Ăn Nhậu / Liên Hoan', emoji: '🍻', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'match':
        return { label: 'Sau Trận Đấu', emoji: '⚽', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'trip':
        return { label: 'Du Đấu / Du Lịch', emoji: '🚗', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' };
      case 'jersey':
        return { label: 'Áo Đấu Mới', emoji: '👕', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' };
      case 'birthday':
        return { label: 'Sinh Nhật Thành Viên', emoji: '🎂', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' };
      default:
        return { label: 'Kỷ Niệm Đội Bóng', emoji: '🌟', color: '#cbd5e1', bg: 'rgba(255, 255, 255, 0.1)' };
    }
  },

  renderMoments() {
    const container = document.getElementById('moments-feed-container');
    if (!container) return;

    // Tránh gián đoạn nếu đang có video đang phát trực tiếp trong feed
    const activeVideo = container.querySelector('video');
    if (activeVideo && !activeVideo.paused && !activeVideo.ended && activeVideo.currentTime > 0) {
      return;
    }

    const moments = window.stateManager.getMoments(this.currentCategory);
    const currentPlayer = window.stateManager.currentPlayer;
    const isAdmin = window.stateManager.isAdmin;
    const userKey = (currentPlayer && currentPlayer.id) ? currentPlayer.id : (localStorage.getItem('fc_user_guid') || '');

    if (moments.length === 0) {
      container.removeAttribute('data-rendered-cat');
      container.removeAttribute('data-user-key');
      container.innerHTML = `
        <div class="empty-feed-card">
          <div style="font-size: 3.5rem; margin-bottom: 0.75rem;">📸</div>
          <h3 style="font-size: 1.25rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem;">Chưa có khoảnh khắc nào trong mục này</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 420px; margin: 0 auto 1.25rem;">
            Hãy lưu lại những hình ảnh ăn uống, liên hoan, du đấu và kỷ niệm tuyệt vời của FC TNT ngay bây giờ!
          </p>
          <button class="btn btn-primary" onclick="window.momentsModule.openCreateMomentModal()">
            📸 + Đăng Khoảnh Khắc Đầu Tiên
          </button>
        </div>
      `;
      return;
    }

    // Kiểm tra cấu trúc DOM feed hiện tại để tránh giật/lag/rebuild vô ích khi gửi/xóa comment hoặc thả reaction
    const existingCards = container.querySelectorAll('.moment-card');
    const isCategorySame = container.getAttribute('data-rendered-cat') === String(this.currentCategory);
    const isUserSame = container.getAttribute('data-user-key') === String(userKey);
    const isStructureSame = isUserSame && isCategorySame && existingCards.length === moments.length && moments.every((m, idx) => {
      const card = existingCards[idx];
      return card && card.id === `moment-card-${m.id}`;
    });

    if (isStructureSame) {
      // Cấu trúc feed đã có sẵn, KHÔNG wipe container.innerHTML để chống giật lag và giữ nguyên input/video/vị trí cuộn!
      // Chỉ đồng bộ nhẹ các giá trị động (cảm xúc reactions, số lượng bình luận)
      moments.forEach(m => {
        const reactionGroup = document.getElementById(`reaction-group-${m.id}`);
        if (reactionGroup) {
          reactionGroup.innerHTML = this.renderReactionButtonsHtml(m.id, m.reactions || {}, userKey);
        }
        const toggleBtn = document.getElementById(`toggle-comments-btn-${m.id}`);
        if (toggleBtn) {
          const span = toggleBtn.querySelector('span');
          const count = (m.comments || []).length;
          if (span) span.textContent = `${count} bình luận`;
        }
        const listEl = document.getElementById(`comments-list-${m.id}`);
        if (listEl) {
          const currentCommentEls = listEl.querySelectorAll('.moment-comment-item');
          const comments = m.comments || [];
          const commentsSame = currentCommentEls.length === comments.length && comments.every((c, idx) => {
            const el = currentCommentEls[idx];
            return el && el.id === `comment-${c.id}`;
          });
          if (!commentsSame) {
            if (comments.length === 0) {
              listEl.innerHTML = '<div class="no-comments-text">Chưa có bình luận nào. Hãy là người đầu tiên "chém gió"! 👇</div>';
            } else {
              listEl.innerHTML = comments.map(c => this.renderSingleCommentHtml(m.id, c)).join('');
            }
          }
        }
      });
      return;
    }

    // Build comment author UI based on login identity
    let commentAuthorBadgeHtml = '';
    let commentPlaceholder = 'Viết bình luận, chém gió...';

    if (currentPlayer) {
      const playerName = this.escapeHtml(currentPlayer.nickname || currentPlayer.name);
      const avatarUrl = currentPlayer.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
      const numBadge = currentPlayer.number ? `<span class="comment-user-num">#${currentPlayer.number}</span>` : '';
      commentPlaceholder = `Bình luận với tư cách ${playerName}...`;
      commentAuthorBadgeHtml = `
        <div class="comment-user-badge player-badge" title="Đang bình luận với tư cách: ${playerName}">
          <img src="${avatarUrl}" class="comment-user-avatar" alt="${playerName}">
          <div class="comment-user-info">
            <span class="comment-user-name">${playerName}</span>
            ${numBadge}
          </div>
        </div>
      `;
    } else if (isAdmin) {
      commentPlaceholder = 'Bình luận với tư cách Ban Quản Trị...';
      commentAuthorBadgeHtml = `
        <div class="comment-user-badge admin-badge" title="Đang bình luận với tư cách: Ban Quản Trị">
          <span class="admin-icon-chip">🛡️</span>
          <div class="comment-user-info">
            <span class="comment-user-name">Ban Quản Trị</span>
            <span class="comment-user-role">Admin</span>
          </div>
        </div>
      `;
    } else {
      commentPlaceholder = 'Viết bình luận với tư cách CĐV FC TNT...';
      commentAuthorBadgeHtml = `
        <div class="comment-user-badge guest-badge" title="Bạn đang ở chế độ CĐV / Khách vãng lai">
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" class="comment-user-avatar guest" alt="Khách">
          <div class="comment-user-info">
            <span class="comment-user-name">Khách / CĐV</span>
            <button type="button" class="btn-prompt-login" onclick="window.appModule && window.appModule.openPlayerLoginModal ? window.appModule.openPlayerLoginModal() : null" title="Đăng nhập để hiện tên và số áo">Đăng nhập ⚽</button>
          </div>
        </div>
      `;
    }

    container.innerHTML = moments.map(m => {
      const catMeta = this.getCategoryMeta(m.category);
      const taggedPlayers = (m.taggedPlayerIds || []).map(id => window.stateManager.getPlayerById(id)).filter(Boolean);
      const images = m.images || [];
      const reactions = m.reactions || { heart: 0, football: 0, beer: 0, fire: 0, userReactions: [] };
      const comments = m.comments || [];

      return `
        <article class="moment-card" id="moment-card-${m.id}">
          <!-- Card Header -->
          <div class="moment-card-header">
            <div class="moment-header-left">
              <span class="moment-cat-badge" style="color: ${catMeta.color}; background: ${catMeta.bg}; border-color: ${catMeta.color}33;">
                ${catMeta.emoji} ${catMeta.label}
              </span>
              <h2 class="moment-title">${this.escapeHtml(m.title)}</h2>
              <div class="moment-meta">
                <span>📅 ${m.date}</span>
                ${m.location ? `<span>• 📍 ${this.escapeHtml(m.location)}</span>` : ''}
              </div>
            </div>

            <div class="moment-header-right">
              ${window.stateManager.isAdmin ? `
                <div class="moment-action-menu">
                  <button class="btn btn-secondary btn-sm" onclick="window.momentsModule.openCreateMomentModal('${m.id}')" title="Sửa bài viết">
                    ✏️ Sửa
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="window.momentsModule.deleteMoment('${m.id}')" title="Xóa bài viết">
                    🗑️ Xóa
                  </button>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Description Text -->
          ${m.description ? `
            <div class="moment-description">
              ${this.escapeHtml(m.description).replace(/\n/g, '<br>')}
            </div>
          ` : ''}

          <!-- Tagged Players -->
          ${taggedPlayers.length > 0 ? `
            <div class="moment-tagged-players">
              <span class="tagged-label">👥 Cùng tham gia:</span>
              <div class="tagged-chips-wrap">
                ${taggedPlayers.map(p => `
                  <div class="tagged-player-chip" title="${p.name} (#${p.number})">
                    <img src="${p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}" alt="${p.name}">
                    <span>${p.name}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Photo Gallery (Facebook Style Grid) -->
          ${images.length > 0 ? this.renderPhotoGrid(m.id, images) : ''}

          <!-- Video Embed if any -->
          ${m.videoUrl ? this.renderVideoEmbed(m.videoUrl) : ''}

          <!-- Reactions & Interaction Bar -->
          <div class="moment-interaction-bar">
            <div class="reaction-buttons-group" id="reaction-group-${m.id}">
              ${this.renderReactionButtonsHtml(m.id, reactions, userKey)}
            </div>

            <button class="toggle-comments-btn" id="toggle-comments-btn-${m.id}" onclick="window.momentsModule.toggleComments('${m.id}')">
              💬 <span>${comments.length} bình luận</span>
            </button>
          </div>

          <!-- Comments Section -->
          <div class="moment-comments-section" id="comments-section-${m.id}">
            <!-- Comments List -->
            <div class="moment-comments-list" id="comments-list-${m.id}">
              ${comments.length === 0 ? `
                <div class="no-comments-text">Chưa có bình luận nào. Hãy là người đầu tiên "chém gió"! 👇</div>
              ` : comments.map(c => this.renderSingleCommentHtml(m.id, c)).join('')}
            </div>

            <!-- Comment Input Box -->
            <form class="moment-comment-form" onsubmit="window.momentsModule.handleCommentSubmit(event, '${m.id}')">
              <div class="comment-inputs-row">
                ${commentAuthorBadgeHtml}
                <input type="text" class="form-control comment-content-input" id="comment-content-${m.id}" placeholder="${commentPlaceholder}" required autocomplete="off">
                <button type="submit" class="btn btn-primary btn-sm comment-submit-btn">Gửi 💬</button>
              </div>
            </form>
          </div>
        </article>
      `;
    }).join('');

    container.setAttribute('data-rendered-cat', String(this.currentCategory));
    container.setAttribute('data-user-key', String(userKey));
  },

  renderPhotoGrid(momentId, images) {
    const count = images.length;
    let gridClass = 'photo-grid-1';
    if (count === 2) gridClass = 'photo-grid-2';
    else if (count === 3) gridClass = 'photo-grid-3';
    else if (count === 4) gridClass = 'photo-grid-4';
    else if (count >= 5) gridClass = 'photo-grid-5';

    // JSON encoded images for lightbox
    const safeImagesJson = encodeURIComponent(JSON.stringify(images));

    return `
      <div class="moment-photo-gallery ${gridClass}">
        ${images.slice(0, 5).map((imgUrl, index) => {
          const isFifthOverlay = count > 5 && index === 4;
          return `
            <div class="moment-photo-item" onclick="window.momentsModule.openLightboxFromEnc('${safeImagesJson}', ${index})">
              <img src="${imgUrl}" alt="Ảnh kỷ niệm FC TNT" loading="lazy">
              ${isFifthOverlay ? `
                <div class="photo-overlay-more">
                  <span>+${count - 4}</span>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderVideoEmbed(url) {
    if (!url) return '';
    const trimmed = url.trim();

    // YouTube embed (watch, youtu.be, shorts, live)
    const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `
        <div class="moment-video-container">
          <iframe src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0&modestbranding=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        </div>
      `;
    }

    // Facebook Video / Reels iframe embed
    if (trimmed.includes('facebook.com') && (trimmed.includes('/videos/') || trimmed.includes('/watch/') || trimmed.includes('/reel/'))) {
      const encodedFbUrl = encodeURIComponent(trimmed);
      return `
        <div class="moment-video-container">
          <iframe src="https://www.facebook.com/plugins/video.php?href=${encodedFbUrl}&show_text=0" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe>
        </div>
      `;
    }

    // Google Drive video preview embed
    const gdriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (gdriveMatch && gdriveMatch[1]) {
      return `
        <div class="moment-video-container">
          <iframe src="https://drive.google.com/file/d/${gdriveMatch[1]}/preview" allow="autoplay" allowfullscreen></iframe>
        </div>
      `;
    }

    // Vimeo embed
    const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch && vimeoMatch[1]) {
      return `
        <div class="moment-video-container">
          <iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
        </div>
      `;
    }

    // Direct Video Player for Uploaded Videos (Base64 data:video/...), blob:, or ANY direct video URL (.mp4, .mov, .webm, stream)
    return `
      <div class="moment-feed-video-wrap">
        <video controls preload="metadata" playsinline class="moment-feed-video">
          <source src="${trimmed}">
          Trình duyệt không hỗ trợ phát video trực tiếp.
        </video>
      </div>
    `;
  },

  renderReactionButtonsHtml(momentId, reactions, userKey) {
    const userReactions = reactions.userReactions || [];
    const legacyGuid = localStorage.getItem('fc_user_guid') || '';
    const isReacted = (type) => userReactions.some(ur => (ur.userKey === userKey || (legacyGuid && ur.userKey === legacyGuid)) && ur.reactionType === type);

    const hasHeart = isReacted('heart');
    const hasFootball = isReacted('football');
    const hasBeer = isReacted('beer');
    const hasFire = isReacted('fire');

    return `
      <button class="reaction-btn ${hasBeer ? 'active' : ''}" onclick="window.momentsModule.handleReaction('${momentId}', 'beer', event)" title="Cạn ly bia">
        🍻 <span class="reaction-count">${reactions.beer || 0}</span>
      </button>
      <button class="reaction-btn ${hasHeart ? 'active' : ''}" onclick="window.momentsModule.handleReaction('${momentId}', 'heart', event)" title="Thả tim">
        ❤️ <span class="reaction-count">${reactions.heart || 0}</span>
      </button>
      <button class="reaction-btn ${hasFootball ? 'active' : ''}" onclick="window.momentsModule.handleReaction('${momentId}', 'football', event)" title="Đam mê bóng đá">
        ⚽ <span class="reaction-count">${reactions.football || 0}</span>
      </button>
      <button class="reaction-btn ${hasFire ? 'active' : ''}" onclick="window.momentsModule.handleReaction('${momentId}', 'fire', event)" title="Rực lửa">
        🔥 <span class="reaction-count">${reactions.fire || 0}</span>
      </button>
    `;
  },

  renderSingleCommentHtml(momentId, c) {
    const currentPlayer = window.stateManager.currentPlayer;
    const isAdmin = window.stateManager.isAdmin;
    const cAuthorId = c.authorId ? String(c.authorId) : '';
    const myId = currentPlayer && currentPlayer.id ? String(currentPlayer.id) : '';
    const myName = currentPlayer ? (currentPlayer.name || '').trim().toLowerCase() : '';
    const myNick = currentPlayer ? (currentPlayer.nickname || '').trim().toLowerCase() : '';
    const cAuthorName = (c.authorName || '').trim().toLowerCase();

    const isOwner = Boolean(
      currentPlayer && (
        (cAuthorId && myId && cAuthorId === myId) ||
        (cAuthorName && (cAuthorName === myName || cAuthorName === myNick))
      )
    );
    const canDelete = isAdmin || isOwner;

    return `
      <div class="moment-comment-item ${isOwner ? 'own-comment' : ''}" id="comment-${c.id}">
        <img class="comment-avatar" src="${c.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}" alt="${this.escapeHtml(c.authorName)}">
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
    const moment = window.stateManager.getMomentById(momentId);
    const count = (moment && moment.comments) ? moment.comments.length : 0;
    const btn = document.getElementById(`toggle-comments-btn-${momentId}`);
    if (btn) {
      btn.innerHTML = `💬 <span>${count} bình luận</span>`;
    }
  },

  // Reaction Handler (Cập nhật DOM cục bộ để không gián đoạn video đang phát)
  async handleReaction(momentId, reactionType, e = null) {
    const currentPlayer = window.stateManager.currentPlayer;
    let userKey = (currentPlayer && currentPlayer.id) ? currentPlayer.id : (localStorage.getItem('fc_user_guid') || '');
    if (!userKey) {
      userKey = 'viewer_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('fc_user_guid', userKey);
    }

    if (e && e.target && window.tntEffects && window.tntEffects.spawnFloatingReaction) {
      const btn = e.target.closest('.reaction-btn') || e.target;
      window.tntEffects.spawnFloatingReaction(btn, reactionType);
    }

    const updatedReactions = await window.stateManager.toggleReaction(momentId, reactionType, userKey);
    if (updatedReactions) {
      const group = document.getElementById(`reaction-group-${momentId}`);
      if (group) {
        group.innerHTML = this.renderReactionButtonsHtml(momentId, updatedReactions, userKey);
      }
      // Add fun burst effect sound/haptic if possible
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }
  },

  // Toggle comments
  toggleComments(momentId) {
    const sec = document.getElementById(`comments-section-${momentId}`);
    if (sec) {
      sec.classList.toggle('active');
    }
  },

  // Comment submission (Thêm trực tiếp vào danh sách không reload bài viết)
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

    const currentPlayer = window.stateManager.currentPlayer;
    const isAdmin = window.stateManager.isAdmin;

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
      const newComment = await window.stateManager.addComment(momentId, authorName, content, avatar);
      contentInput.value = '';

      // Append directly to DOM if not already present
      const listEl = document.getElementById(`comments-list-${momentId}`);
      if (listEl && newComment && !document.getElementById(`comment-${newComment.id}`)) {
        const noCommentsText = listEl.querySelector('.no-comments-text');
        if (noCommentsText) noCommentsText.remove();
        listEl.insertAdjacentHTML('beforeend', this.renderSingleCommentHtml(momentId, newComment));
        listEl.scrollTop = listEl.scrollHeight;
      }

      this.updateCommentCount(momentId);

      // Ensure comments section is active
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
      // Fallback nếu modal không có trong DOM
      this.executeDeleteComment(momentId, commentId);
      return;
    }

    const moment = window.stateManager.getMomentById(momentId);
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

  // Giữ alias tương thích
  async deleteComment(momentId, commentId) {
    this.promptDeleteComment(momentId, commentId);
  },

  async executeDeleteComment(momentId, commentId) {
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

  // Đồng bộ thời gian thực mượt mà qua WebSocket mà không wipe feed
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
  },

  // Open / Close Lightbox
  openLightboxFromEnc(encJson, index) {
    try {
      const images = JSON.parse(decodeURIComponent(encJson));
      this.openLightbox(images, index);
    } catch (e) {
      console.error(e);
    }
  },

  openLightbox(images, startIndex = 0) {
    if (!images || images.length === 0) return;
    this.currentLightboxImages = images;
    this.currentLightboxIndex = startIndex;

    const modal = document.getElementById('moment-lightbox-modal');
    if (!modal) return;

    modal.classList.add('active');
    this.updateLightboxView();
  },

  closeLightbox() {
    const modal = document.getElementById('moment-lightbox-modal');
    if (modal) modal.classList.remove('active');
  },

  prevLightbox() {
    if (this.currentLightboxIndex > 0) {
      this.currentLightboxIndex--;
      this.updateLightboxView();
    } else {
      this.currentLightboxIndex = this.currentLightboxImages.length - 1;
      this.updateLightboxView();
    }
  },

  nextLightbox() {
    if (this.currentLightboxIndex < this.currentLightboxImages.length - 1) {
      this.currentLightboxIndex++;
      this.updateLightboxView();
    } else {
      this.currentLightboxIndex = 0;
      this.updateLightboxView();
    }
  },

  updateLightboxView() {
    const img = document.getElementById('lightbox-current-img');
    const counter = document.getElementById('lightbox-counter');
    if (!img) return;

    img.src = this.currentLightboxImages[this.currentLightboxIndex];
    if (counter) {
      counter.innerText = `${this.currentLightboxIndex + 1} / ${this.currentLightboxImages.length}`;
    }
  },

  // Modal Create / Edit Moment
  openCreateMomentModal(editId = null) {
    this.currentEditMomentId = editId;
    const modal = document.getElementById('moment-form-modal');
    const title = document.getElementById('moment-form-title');
    const form = document.getElementById('moment-form');
    form.reset();
    this.uploadedImages = [];
    this.uploadedVideoData = null;

    const tagsContainer = document.getElementById('moment-tagged-players-select');
    const allPlayers = window.stateManager.getPlayers();

    if (tagsContainer) {
      tagsContainer.innerHTML = allPlayers.map(p => `
        <label class="tag-player-checkbox-label">
          <input type="checkbox" name="tagged_player" value="${p.id}">
          <img src="${p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}" alt="${p.name}">
          <span>${p.name} (#${p.number})</span>
        </label>
      `).join('');
    }

    const videoPreviewBox = document.getElementById('moment-video-preview-box');
    const videoStatus = document.getElementById('moment-video-status');
    if (videoPreviewBox) videoPreviewBox.style.display = 'none';
    if (videoStatus) videoStatus.innerText = '';

    if (editId) {
      title.innerText = '✏️ Chỉnh Sửa Khoảnh Khắc';
      const m = window.stateManager.getMomentById(editId);
      if (m) {
        document.getElementById('moment-input-title').value = m.title || '';
        document.getElementById('moment-input-date').value = m.date || '';
        document.getElementById('moment-input-location').value = m.location || '';
        document.getElementById('moment-input-category').value = m.category || 'party';
        document.getElementById('moment-input-description').value = m.description || '';

        if (m.videoUrl) {
          if (m.videoUrl.startsWith('data:video/') || m.videoUrl.endsWith('.mp4') || m.videoUrl.endsWith('.webm')) {
            this.uploadedVideoData = m.videoUrl;
            const player = document.getElementById('moment-video-preview-player');
            if (player) player.src = m.videoUrl;
            if (videoPreviewBox) videoPreviewBox.style.display = 'block';
            if (videoStatus) videoStatus.innerText = '✅ Đã có video';
          } else {
            document.getElementById('moment-input-video').value = m.videoUrl;
          }
        }

        this.uploadedImages = [...(m.images || [])];

        // Check tagged
        if (tagsContainer && m.taggedPlayerIds) {
          tagsContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = m.taggedPlayerIds.includes(cb.value);
          });
        }
      }
    } else {
      title.innerText = '📸 Đăng Khoảnh Khắc / Kỷ Niệm Mới';
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      document.getElementById('moment-input-date').value = todayStr;
    }

    this.renderModalImagesPreview();
    modal.classList.add('active');
  },

  closeCreateMomentModal() {
    const modal = document.getElementById('moment-form-modal');
    if (modal) modal.classList.remove('active');
    this.uploadedVideoData = null;
    const player = document.getElementById('moment-video-preview-player');
    if (player) player.src = '';
  },

  compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Giữ tỷ lệ và scale về tối đa 1200x1200px
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Lỗi load ảnh'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Lỗi đọc file'));
      reader.readAsDataURL(file);
    });
  },

  async handleImageFiles(fileList) {
    if (!fileList || fileList.length === 0) return;

    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressedBase64 = await this.compressImage(file, 1200, 1200, 0.8);
        this.uploadedImages.push(compressedBase64);
        this.renderModalImagesPreview();
      } catch (err) {
        console.warn('[Moments] Không thể nén ảnh, sử dụng ảnh gốc:', err.message);
        const reader = new FileReader();
        reader.onload = (e) => {
          this.uploadedImages.push(e.target.result);
          this.renderModalImagesPreview();
        };
        reader.readAsDataURL(file);
      }
    }
  },

  handleVideoFile(file) {
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      if (window.appModule && window.appModule.showToast) {
        window.appModule.showToast('Vui lòng chọn file định dạng video (.mp4, .mov, .webm)!', 'warning');
      }
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      if (window.appModule && window.appModule.showToast) {
        window.appModule.showToast('⚠️ Dung lượng video quá lớn (>8MB). Để đảm bảo tốc độ tải mượt mà, bạn vui lòng dán link YouTube/Drive hoặc nén video dưới 8MB nhé!', 'warning');
      }
      return;
    }

    const status = document.getElementById('moment-video-status');
    if (status) status.innerText = '⏳ Đang tải video...';

    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedVideoData = e.target.result;
      document.getElementById('moment-input-video').value = '';

      const previewBox = document.getElementById('moment-video-preview-box');
      const player = document.getElementById('moment-video-preview-player');

      if (player) player.src = this.uploadedVideoData;
      if (previewBox) previewBox.style.display = 'block';
      if (status) status.innerText = `✅ Đã chọn video (${(file.size / (1024 * 1024)).toFixed(1)}MB)`;

      if (window.appModule && window.appModule.showToast) {
        window.appModule.showToast('🎬 Đã tải video lên thành công!', 'success');
      }
    };
    reader.readAsDataURL(file);
  },

  removeVideo() {
    this.uploadedVideoData = null;
    document.getElementById('moment-input-video').value = '';
    const fileInput = document.getElementById('moment-video-file-input');
    if (fileInput) fileInput.value = '';

    const previewBox = document.getElementById('moment-video-preview-box');
    const player = document.getElementById('moment-video-preview-player');
    const status = document.getElementById('moment-video-status');

    if (player) player.src = '';
    if (previewBox) previewBox.style.display = 'none';
    if (status) status.innerText = '';
  },

  addImageUrlManual() {
    const input = document.getElementById('moment-img-url-input');
    if (!input || !input.value.trim()) return;
    this.uploadedImages.push(input.value.trim());
    input.value = '';
    this.renderModalImagesPreview();
  },

  removeUploadedImage(index) {
    this.uploadedImages.splice(index, 1);
    this.renderModalImagesPreview();
  },

  renderModalImagesPreview() {
    const container = document.getElementById('moment-images-preview-list');
    if (!container) return;

    if (this.uploadedImages.length === 0) {
      container.innerHTML = '<div style="color: var(--text-dim); font-size: 0.85rem; font-style: italic;">Chưa có ảnh nào được thêm.</div>';
      return;
    }

    container.innerHTML = this.uploadedImages.map((img, idx) => `
      <div class="modal-img-preview-chip">
        <img src="${img}" alt="Preview">
        <button type="button" class="remove-img-btn" onclick="window.momentsModule.removeUploadedImage(${idx})">&times;</button>
      </div>
    `).join('');
  },

  async handleFormSubmit() {
    const title = document.getElementById('moment-input-title').value.trim();
    const date = document.getElementById('moment-input-date').value;
    const location = document.getElementById('moment-input-location').value.trim();
    const category = document.getElementById('moment-input-category').value;
    const description = document.getElementById('moment-input-description').value.trim();
    const manualVideoUrl = document.getElementById('moment-input-video').value.trim();
    const videoUrl = this.uploadedVideoData || manualVideoUrl;

    const taggedCheckboxes = document.querySelectorAll('#moment-tagged-players-select input[type="checkbox"]:checked');
    const taggedPlayerIds = Array.from(taggedCheckboxes).map(cb => cb.value);

    if (!title || !date) {
      if (window.appModule && window.appModule.showToast) {
        window.appModule.showToast('Vui lòng nhập tiêu đề và ngày diễn ra kỷ niệm!', 'warning');
      }
      return;
    }

    const payload = {
      title,
      date,
      location,
      category,
      description,
      videoUrl,
      images: this.uploadedImages,
      taggedPlayerIds
    };

    if (this.currentEditMomentId) {
      await window.stateManager.updateMoment(this.currentEditMomentId, payload);
      if (window.appModule && window.appModule.showToast) {
        window.appModule.showToast('✅ Cập nhật khoảnh khắc thành công!', 'success');
      }
    } else {
      await window.stateManager.addMoment(payload);
      if (window.appModule && window.appModule.showToast) {
        window.appModule.showToast('🎉 Đăng khoảnh khắc kỷ niệm mới thành công!', 'success');
      }
    }

    this.closeCreateMomentModal();
    this.renderMoments();
  },

  async deleteMoment(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa khoảnh khắc kỷ niệm này?')) return;
    await window.stateManager.deleteMoment(id);
    if (window.appModule && window.appModule.showToast) {
      window.appModule.showToast('🗑️ Đã xóa khoảnh khắc!', 'info');
    }
    this.renderMoments();
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  formatRelativeTime(dateInput) {
    if (!dateInput) return 'Vừa xong';
    const date = new Date(dateInput);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Vừa xong';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} ngày trước`;
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }
};

if (window.TNT) {
  window.TNT.register('moments', window.momentsModule);
}

