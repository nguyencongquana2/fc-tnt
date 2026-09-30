/**
 * FC TNT Moments - Feed Submodule (js/moments/moments-feed.js)
 * Quản lý kết xuất bảng tin khoảnh khắc, thư viện ảnh/video Facebook grid và thả cảm xúc
 */

window.momentsModule = window.momentsModule || {};

Object.assign(window.momentsModule, {
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

    const moments = window.stateManager ? window.stateManager.getMoments(this.currentCategory) : [];
    const currentPlayer = window.stateManager ? window.stateManager.currentPlayer : null;
    const isAdmin = window.stateManager ? window.stateManager.isAdmin : false;
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
      const avatarUrl = this.escapeHtml(currentPlayer.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80');
      const numBadge = currentPlayer.number ? `<span class="comment-user-num">#${this.escapeHtml(currentPlayer.number)}</span>` : '';
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
      const taggedPlayers = (m.taggedPlayerIds || []).map(id => window.stateManager ? window.stateManager.getPlayerById(id) : null).filter(Boolean);
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
                <span>📅 ${this.escapeHtml(m.date)}</span>
                ${m.location ? `<span>• 📍 ${this.escapeHtml(m.location)}</span>` : ''}
              </div>
            </div>

            <div class="moment-header-right">
              ${window.stateManager && window.stateManager.isAdmin ? `
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
                  <div class="tagged-player-chip" title="${this.escapeHtml(p.name)} (#${this.escapeHtml(p.number || '')})">
                    <img src="${this.escapeHtml(p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80')}" alt="${this.escapeHtml(p.name)}">
                    <span>${this.escapeHtml(p.name)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Mixed Media Gallery -->
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
                  <img src="${this.escapeHtml(item.thumbnail)}" alt="Video thumbnail" loading="lazy">
                ` : `
                  <video src="${this.escapeHtml(item.url)}#t=0.5" muted playsinline preload="metadata"></video>
                `}
                <div class="media-video-overlay">
                  <div class="media-play-circle">
                    <span class="media-play-triangle">▶</span>
                  </div>
                  ${item.duration ? `<span class="media-video-duration">${this.escapeHtml(item.duration)}</span>` : ''}
                </div>
              ` : `
                <img src="${this.escapeHtml(item.url)}" alt="Ảnh kỷ niệm FC TNT" loading="lazy">
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

    const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `
        <div class="moment-video-container">
          <iframe src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0&modestbranding=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        </div>
      `;
    }

    if (trimmed.includes('facebook.com') && (trimmed.includes('/videos/') || trimmed.includes('/watch/') || trimmed.includes('/reel/'))) {
      const encodedFbUrl = encodeURIComponent(trimmed);
      return `
        <div class="moment-video-container">
          <iframe src="https://www.facebook.com/plugins/video.php?href=${encodedFbUrl}&show_text=0" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe>
        </div>
      `;
    }

    const gdriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (gdriveMatch && gdriveMatch[1]) {
      return `
        <div class="moment-video-container">
          <iframe src="https://drive.google.com/file/d/${gdriveMatch[1]}/preview" allow="autoplay" allowfullscreen></iframe>
        </div>
      `;
    }

    const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch && vimeoMatch[1]) {
      return `
        <div class="moment-video-container">
          <iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
        </div>
      `;
    }

    return `
      <div class="moment-feed-video-wrap">
        <video controls preload="metadata" playsinline class="moment-feed-video">
          <source src="${this.escapeHtml(trimmed)}">
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

  async handleReaction(momentId, reactionType, e = null) {
    const currentPlayer = window.stateManager ? window.stateManager.currentPlayer : null;
    let userKey = (currentPlayer && currentPlayer.id) ? currentPlayer.id : (localStorage.getItem('fc_user_guid') || '');
    if (!userKey) {
      userKey = 'viewer_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('fc_user_guid', userKey);
    }

    if (e && e.target && window.tntEffects && window.tntEffects.spawnFloatingReaction) {
      const btn = e.target.closest('.reaction-btn') || e.target;
      window.tntEffects.spawnFloatingReaction(btn, reactionType);
    }

    if (window.stateManager && window.stateManager.toggleReaction) {
      const updatedReactions = await window.stateManager.toggleReaction(momentId, reactionType, userKey);
      if (updatedReactions) {
        const group = document.getElementById(`reaction-group-${momentId}`);
        if (group) {
          group.innerHTML = this.renderReactionButtonsHtml(momentId, updatedReactions, userKey);
        }
        if (window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(50);
        }
      }
    }
  },

  async deleteMoment(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa khoảnh khắc kỷ niệm này?')) return;
    if (window.stateManager && window.stateManager.deleteMoment) {
      await window.stateManager.deleteMoment(id);
    }
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
});
