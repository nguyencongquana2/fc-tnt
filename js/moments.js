/**
 * FC TNT Moments & Memories Module
 * Quản lý Khoảnh Khắc, Dòng thời gian, Album ảnh & Tương tác thả cảm xúc / bình luận
 */

window.momentsModule = {
  currentCategory: 'all',
  currentEditMomentId: null,
  uploadedMedia: [],
  cloudinaryConfig: null,
  currentLightboxMedia: [],
  currentLightboxIndex: 0,
  pendingDeleteComment: null,

  init() {
    this.bindEvents();
    this.fetchUploadConfig();
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

    // Unified Media (Photos & Videos) File Input in Modal
    const mediaFileInput = document.getElementById('moment-media-file-input');
    if (mediaFileInput) {
      mediaFileInput.addEventListener('change', (e) => {
        this.handleMediaFiles(e.target.files);
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

          <!-- Mixed Media Gallery (Facebook Style Grid with Photos & Videos) -->
          ${this.renderMediaGallery(m.id, m)}

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

  // Chuẩn hóa danh sách media hỗn hợp (Ảnh + Video) từ bài đăng
  getNormalizedMedia(moment) {
    if (Array.isArray(moment.media) && moment.media.length > 0) {
      return moment.media;
    }
    const list = [];
    if (Array.isArray(moment.images)) {
      moment.images.forEach(img => {
        if (img) list.push({ type: 'image', url: img });
      });
    }
    if (moment.videoUrl || moment.video) {
      const vUrl = moment.videoUrl || moment.video;
      list.push({
        type: 'video',
        url: vUrl,
        thumbnail: '',
        duration: ''
      });
    }
    return list;
  },

  renderMediaGallery(momentId, moment) {
    const media = this.getNormalizedMedia(moment);
    if (!media || media.length === 0) return '';

    // Nếu chỉ có đúng 1 video dạng Embed (YouTube / Facebook / TikTok / Drive) thì hiển thị khung iframe trực tiếp
    if (media.length === 1 && media[0].type === 'video') {
      const embedUrl = this.getEmbedUrl(media[0].url);
      if (embedUrl) {
        return this.renderVideoEmbed(media[0].url);
      }
    }

    return this.renderMediaGrid(momentId, media);
  },

  renderMediaGrid(momentId, media) {
    const count = media.length;
    let gridClass = 'photo-grid-1';
    if (count === 2) gridClass = 'photo-grid-2';
    else if (count === 3) gridClass = 'photo-grid-3';
    else if (count === 4) gridClass = 'photo-grid-4';
    else if (count >= 5) gridClass = 'photo-grid-5';

    return `
      <div class="moment-photo-gallery ${gridClass}">
        ${media.slice(0, 5).map((item, index) => {
          const isFifthOverlay = count > 5 && index === 4;
          const isVideo = item.type === 'video';

          return `
            <div class="moment-photo-item ${isVideo ? 'is-video-item' : ''}" onclick="window.momentsModule.openMomentLightbox('${momentId}', ${index})">
              ${isVideo ? `
                ${item.thumbnail ? `
                  <img src="${item.thumbnail}" alt="Video thumbnail" loading="lazy">
                ` : `
                  <video src="${item.url}#t=0.5" muted playsinline preload="metadata"></video>
                `}
                <div class="media-video-overlay">
                  <div class="media-play-circle">
                    <span class="media-play-triangle">▶</span>
                  </div>
                  ${item.duration ? `<span class="media-video-duration">${item.duration}</span>` : ''}
                </div>
              ` : `
                <img src="${item.url}" alt="Ảnh kỷ niệm FC TNT" loading="lazy">
              `}

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

  getEmbedUrl(url) {
    if (!url) return null;
    const trimmed = url.trim();
    const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`;
    }
    if (trimmed.includes('facebook.com') && (trimmed.includes('/videos/') || trimmed.includes('/watch/') || trimmed.includes('/reel/'))) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&show_text=0&autoplay=1`;
    }
    const gdriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (gdriveMatch && gdriveMatch[1]) {
      return `https://drive.google.com/file/d/${gdriveMatch[1]}/preview`;
    }
    const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    }
    return null;
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

  // Open / Close Lightbox (Hỗ trợ cả Ảnh & Video)
  openMomentLightbox(momentId, index = 0) {
    const m = window.stateManager.getMomentById(momentId);
    if (!m) return;
    const media = this.getNormalizedMedia(m);
    this.openLightbox(media, index);
  },

  openLightboxFromEnc(encJson, index) {
    try {
      const media = JSON.parse(decodeURIComponent(encJson));
      this.openLightbox(media, index);
    } catch (e) {
      console.error(e);
    }
  },

  openLightbox(media, startIndex = 0) {
    if (!media || media.length === 0) return;
    this.currentLightboxMedia = media;
    this.currentLightboxIndex = startIndex;

    const modal = document.getElementById('moment-lightbox-modal');
    if (!modal) return;

    modal.classList.add('active');
    this.updateLightboxView();
  },

  closeLightbox() {
    const modal = document.getElementById('moment-lightbox-modal');
    if (modal) modal.classList.remove('active');

    const videoPlayer = document.getElementById('lightbox-current-video');
    if (videoPlayer) {
      videoPlayer.pause();
      videoPlayer.src = '';
    }
    const iframePlayer = document.getElementById('lightbox-current-iframe');
    if (iframePlayer) {
      iframePlayer.src = '';
    }
  },

  prevLightbox() {
    if (this.currentLightboxIndex > 0) {
      this.currentLightboxIndex--;
    } else {
      this.currentLightboxIndex = this.currentLightboxMedia.length - 1;
    }
    this.updateLightboxView();
  },

  nextLightbox() {
    if (this.currentLightboxIndex < this.currentLightboxMedia.length - 1) {
      this.currentLightboxIndex++;
    } else {
      this.currentLightboxIndex = 0;
    }
    this.updateLightboxView();
  },

  updateLightboxView() {
    if (!this.currentLightboxMedia || this.currentLightboxMedia.length === 0) return;
    const item = this.currentLightboxMedia[this.currentLightboxIndex];
    const img = document.getElementById('lightbox-current-img');
    const videoWrap = document.getElementById('lightbox-video-wrap');
    const videoPlayer = document.getElementById('lightbox-current-video');
    const iframeWrap = document.getElementById('lightbox-iframe-wrap');
    const iframePlayer = document.getElementById('lightbox-current-iframe');
    const counter = document.getElementById('lightbox-counter');

    if (counter) {
      counter.innerText = `${this.currentLightboxIndex + 1} / ${this.currentLightboxMedia.length}`;
    }

    // Reset previous playback
    if (videoPlayer) {
      videoPlayer.pause();
      videoPlayer.src = '';
    }
    if (iframePlayer) {
      iframePlayer.src = '';
    }
    if (img) img.style.display = 'none';
    if (videoWrap) videoWrap.style.display = 'none';
    if (iframeWrap) iframeWrap.style.display = 'none';

    // Chuẩn hóa item
    const mediaObj = typeof item === 'string' ? { type: 'image', url: item } : item;

    if (mediaObj.type === 'video') {
      const embedUrl = this.getEmbedUrl(mediaObj.url);
      if (embedUrl && iframeWrap && iframePlayer) {
        iframePlayer.src = embedUrl;
        iframeWrap.style.display = 'flex';
      } else if (videoWrap && videoPlayer) {
        videoPlayer.src = mediaObj.url;
        videoWrap.style.display = 'flex';
        videoPlayer.play().catch(e => console.log('Autoplay prevented:', e));
      }
    } else {
      if (img) {
        img.src = mediaObj.url;
        img.style.display = 'block';
      }
    }
  },

  // Modal Create / Edit Moment
  async fetchUploadConfig() {
    try {
      const res = await fetch('/api/upload/config');
      if (res.ok) {
        this.cloudinaryConfig = await res.json();
        const badge = document.getElementById('media-cloud-badge');
        const statusText = document.getElementById('media-cloud-status');
        if (badge && statusText) {
          if (this.cloudinaryConfig && this.cloudinaryConfig.configured) {
            badge.classList.add('connected');
            statusText.textContent = `Cloudinary Ready (${this.cloudinaryConfig.cloudName || 'CDN'})`;
          } else {
            badge.classList.remove('connected');
            statusText.textContent = 'Lưu trữ Đám Mây (Auto)';
          }
        }
      }
    } catch (e) {
      console.warn('Cannot fetch upload config:', e);
    }
  },

  openCreateMomentModal(editId = null) {
    this.currentEditMomentId = editId;
    const modal = document.getElementById('moment-form-modal');
    const title = document.getElementById('moment-form-title');
    const form = document.getElementById('moment-form');
    form.reset();
    this.uploadedMedia = [];

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

    if (editId) {
      title.innerText = '✏️ Chỉnh Sửa Khoảnh Khắc';
      const m = window.stateManager.getMomentById(editId);
      if (m) {
        document.getElementById('moment-input-title').value = m.title || '';
        document.getElementById('moment-input-date').value = m.date || '';
        document.getElementById('moment-input-location').value = m.location || '';
        document.getElementById('moment-input-category').value = m.category || 'party';
        document.getElementById('moment-input-description').value = m.description || '';

        // Nạp media hiện có
        this.uploadedMedia = this.getNormalizedMedia(m).map(item => ({ ...item, file: null }));

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

    this.renderMediaQueuePreview();
    modal.classList.add('active');
  },

  closeCreateMomentModal() {
    const modal = document.getElementById('moment-form-modal');
    if (modal) modal.classList.remove('active');
    if (Array.isArray(this.uploadedMedia)) {
      this.uploadedMedia.forEach(item => {
        if (item && item.url && typeof item.url === 'string' && item.url.startsWith('blob:')) {
          try { URL.revokeObjectURL(item.url); } catch (e) { /* ignore */ }
        }
      });
    }
    this.uploadedMedia = [];
  },

  compressImage(file, maxWidth = 1600, maxHeight = 1600, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

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

  async handleMediaFiles(fileList) {
    if (!fileList || fileList.length === 0) return;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type.startsWith('image/')) {
        try {
          const compressedDataUrl = await this.compressImage(file, 1600, 1600, 0.85);
          this.uploadedMedia.push({
            type: 'image',
            url: compressedDataUrl,
            file,
            thumbnail: '',
            name: file.name
          });
        } catch (e) {
          console.warn('Lỗi nén ảnh:', e);
        }
      } else if (file.type.startsWith('video/')) {
        const blobUrl = URL.createObjectURL(file);
        const meta = await this.extractVideoMeta(file, blobUrl);
        this.uploadedMedia.push({
          type: 'video',
          url: blobUrl,
          file,
          thumbnail: meta.thumbnail,
          duration: meta.duration,
          name: file.name
        });
      }
    }

    const fileInput = document.getElementById('moment-media-file-input');
    if (fileInput) fileInput.value = '';

    this.renderMediaQueuePreview();
  },

  extractVideoMeta(file, blobUrl) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = blobUrl;
      video.muted = true;
      video.playsInline = true;

      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ thumbnail: '', duration: '' });
        }
      }, 4000);

      video.onloadedmetadata = () => {
        const durationSec = video.duration;
        video.currentTime = Math.min(1, durationSec / 2 || 0.5);
      };

      video.onseeked = () => {
        if (resolved) return;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(640, video.videoWidth || 480);
          canvas.height = Math.min(480, video.videoHeight || 360);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
          resolved = true;
          clearTimeout(timeout);
          resolve({ thumbnail, duration: this.formatSeconds(video.duration) });
        } catch (e) {
          resolved = true;
          clearTimeout(timeout);
          resolve({ thumbnail: '', duration: this.formatSeconds(video.duration) });
        }
      };

      video.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({ thumbnail: '', duration: '' });
        }
      };
    });
  },

  formatSeconds(seconds) {
    if (!seconds || isNaN(seconds)) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  },

  addMediaUrlManual() {
    const input = document.getElementById('moment-media-url-input');
    if (!input || !input.value.trim()) return;
    const url = input.value.trim();

    const isVideo = this.isVideoUrl(url);

    this.uploadedMedia.push({
      type: isVideo ? 'video' : 'image',
      url,
      file: null,
      thumbnail: '',
      duration: ''
    });

    input.value = '';
    this.renderMediaQueuePreview();
  },

  isVideoUrl(url) {
    if (!url) return false;
    const trimmed = url.toLowerCase();
    return (
      trimmed.includes('youtube.com') ||
      trimmed.includes('youtu.be') ||
      trimmed.includes('facebook.com') ||
      trimmed.includes('tiktok.com') ||
      trimmed.includes('drive.google.com') ||
      trimmed.endsWith('.mp4') ||
      trimmed.endsWith('.webm') ||
      trimmed.endsWith('.mov') ||
      trimmed.startsWith('data:video/')
    );
  },

  removeMediaItem(index) {
    if (index >= 0 && index < this.uploadedMedia.length) {
      const item = this.uploadedMedia[index];
      if (item && item.url && typeof item.url === 'string' && item.url.startsWith('blob:')) {
        try { URL.revokeObjectURL(item.url); } catch (e) { /* ignore */ }
      }
      this.uploadedMedia.splice(index, 1);
      this.renderMediaQueuePreview();
    }
  },

  moveMediaItem(index, direction) {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < this.uploadedMedia.length) {
      const item = this.uploadedMedia.splice(index, 1)[0];
      this.uploadedMedia.splice(newIndex, 0, item);
      this.renderMediaQueuePreview();
    }
  },

  renderMediaQueuePreview() {
    const container = document.getElementById('moment-media-preview-queue');
    if (!container) return;

    if (this.uploadedMedia.length === 0) {
      container.innerHTML = `
        <div class="media-queue-empty-placeholder" id="media-queue-empty">
          Chưa có ảnh hoặc video nào. Hãy bấm "+ Thêm Ảnh / Video" để chọn tệp!
        </div>
      `;
      return;
    }

    container.innerHTML = this.uploadedMedia.map((item, idx) => {
      const isVideo = item.type === 'video';
      return `
        <div class="media-preview-card" id="media-preview-${idx}">
          ${isVideo ? `
            ${item.thumbnail ? `
              <img src="${item.thumbnail}" alt="Thumbnail">
            ` : `
              <video src="${item.url}#t=0.5" muted preload="metadata"></video>
            `}
            <span class="media-type-badge video">🎬 Video ${item.duration ? `(${item.duration})` : ''}</span>
          ` : `
            <img src="${item.url}" alt="Ảnh xem trước">
            <span class="media-type-badge">📸 Ảnh</span>
          `}
          <div class="media-preview-actions">
            ${idx > 0 ? `<button type="button" class="media-action-btn" onclick="window.momentsModule.moveMediaItem(${idx}, -1)" title="Chuyển sang trái">◀</button>` : ''}
            ${idx < this.uploadedMedia.length - 1 ? `<button type="button" class="media-action-btn" onclick="window.momentsModule.moveMediaItem(${idx}, 1)" title="Chuyển sang phải">▶</button>` : ''}
            <button type="button" class="media-action-btn del" onclick="window.momentsModule.removeMediaItem(${idx})" title="Xóa tệp này">&times;</button>
          </div>
        </div>
      `;
    }).join('');
  },

  async uploadMediaItemToCloudinary(item) {
    if (!item.file) return item; // Already an online URL

    try {
      if (this.cloudinaryConfig && this.cloudinaryConfig.configured) {
        const formData = new FormData();
        formData.append('file', item.file);

        let uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudinaryConfig.cloudName}/auto/upload`;

        if (this.cloudinaryConfig.hasPreset && this.cloudinaryConfig.uploadPreset) {
          formData.append('upload_preset', this.cloudinaryConfig.uploadPreset);
        } else {
          const sigRes = await fetch('/api/upload/signature', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-token': window.stateManager.getAdminToken()
            }
          });
          const sigData = await sigRes.json();
          if (sigData.success) {
            formData.append('api_key', sigData.apiKey);
            formData.append('timestamp', sigData.timestamp);
            formData.append('folder', sigData.folder);
            formData.append('signature', sigData.signature);
            uploadUrl = sigData.uploadUrl;
          }
        }

        const cldRes = await fetch(uploadUrl, {
          method: 'POST',
          body: formData
        });
        const cldData = await cldRes.json();

        if (cldRes.ok && cldData.secure_url) {
          const isVideo = cldData.resource_type === 'video' || item.type === 'video';
          return {
            type: isVideo ? 'video' : 'image',
            url: cldData.secure_url,
            thumbnail: isVideo ? cldData.secure_url.replace(/\.[^/.]+$/, '.jpg') : (item.thumbnail || ''),
            duration: cldData.duration ? this.formatSeconds(cldData.duration) : (item.duration || '')
          };
        }
      }
    } catch (err) {
      console.warn('[CloudinaryUpload] Direct upload failed, falling back:', err.message);
    }

    // Fallback nếu Cloudinary chưa cấu hình hoặc lỗi mạng
    let finalUrl = item.url;
    if (item.type === 'video' && item.file && typeof item.url === 'string' && item.url.startsWith('blob:')) {
      if (item.file.size <= 10 * 1024 * 1024) {
        try {
          finalUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(item.file);
          });
        } catch (e) {
          console.warn('[Moments] Fallback video conversion error:', e);
        }
      } else {
        if (window.appModule && window.appModule.showToast) {
          window.appModule.showToast(`Video "${item.name || 'tệp'}" > 10MB. Vui lòng cấu hình Cloudinary trong .env để tải video dung lượng lớn!`, 'warning');
        }
      }
    }

    return {
      type: item.type,
      url: finalUrl,
      thumbnail: item.thumbnail || '',
      duration: item.duration || ''
    };
  },

  async handleFormSubmit() {
    const submitBtn = document.getElementById('moment-submit-btn');
    const title = document.getElementById('moment-input-title').value.trim();
    const date = document.getElementById('moment-input-date').value;
    const location = document.getElementById('moment-input-location').value.trim();
    const category = document.getElementById('moment-input-category').value;
    const description = document.getElementById('moment-input-description').value.trim();

    const taggedCheckboxes = document.querySelectorAll('#moment-tagged-players-select input[type="checkbox"]:checked');
    const taggedPlayerIds = Array.from(taggedCheckboxes).map(cb => cb.value);

    if (!title || !date) {
      if (window.appModule && window.appModule.showToast) {
        window.appModule.showToast('Vui lòng nhập tiêu đề và ngày diễn ra kỷ niệm!', 'warning');
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Đang xử lý tải lên...';
    }

    const progressWrap = document.getElementById('moment-upload-progress');
    const progressBar = document.getElementById('moment-upload-progress-bar');
    const progressLabel = document.getElementById('moment-upload-progress-label');
    const progressPct = document.getElementById('moment-upload-progress-pct');

    const totalMedia = this.uploadedMedia.length;
    const finalMediaList = [];

    if (progressWrap && totalMedia > 0) {
      progressWrap.style.display = 'block';
    }

    try {
      for (let i = 0; i < totalMedia; i++) {
        const item = this.uploadedMedia[i];
        if (progressLabel && progressPct && progressBar) {
          const pct = Math.round(((i + 1) / totalMedia) * 100);
          progressLabel.textContent = `Đang tải tệp ${i + 1}/${totalMedia} lên đám mây...`;
          progressPct.textContent = `${pct}%`;
          progressBar.style.width = `${pct}%`;
        }

        const uploadedItem = await this.uploadMediaItemToCloudinary(item);
        finalMediaList.push(uploadedItem);
      }

      if (progressWrap) {
        progressWrap.style.display = 'none';
      }

      const payload = {
        title,
        date,
        location,
        category,
        description,
        media: finalMediaList,
        images: finalMediaList.filter(m => m.type === 'image').map(m => m.url),
        videoUrl: (finalMediaList.find(m => m.type === 'video') || {}).url || '',
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
    } catch (err) {
      console.error('Submit moment error:', err);
      if (window.appModule && window.appModule.showToast) {
        window.appModule.showToast('Lỗi khi lưu khoảnh khắc: ' + err.message, 'error');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '📸 Lưu & Đăng Khoảnh Khắc';
      }
      if (progressWrap) {
        progressWrap.style.display = 'none';
      }
    }
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

