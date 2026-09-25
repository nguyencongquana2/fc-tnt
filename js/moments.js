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

    // Lightbox keyboard navigation
    window.addEventListener('keydown', (e) => {
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

    const moments = window.stateManager.getMoments(this.currentCategory);
    const userKey = localStorage.getItem('fc_user_guid') || '';
    const allPlayers = window.stateManager.getPlayers();
    const savedPlayerId = localStorage.getItem('fc_commenter_player_id') || '';
    const savedCommenterName = localStorage.getItem('fc_commenter_name') || '';

    if (moments.length === 0) {
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

    container.innerHTML = moments.map(m => {
      const catMeta = this.getCategoryMeta(m.category);
      const taggedPlayers = (m.taggedPlayerIds || []).map(id => window.stateManager.getPlayerById(id)).filter(Boolean);
      const images = m.images || [];
      const reactions = m.reactions || { heart: 0, football: 0, beer: 0, fire: 0, userReactions: [] };
      const userReactions = reactions.userReactions || [];
      const comments = m.comments || [];

      // Check if this browser already reacted
      const hasHeart = userReactions.some(ur => ur.userKey === userKey && ur.reactionType === 'heart');
      const hasFootball = userReactions.some(ur => ur.userKey === userKey && ur.reactionType === 'football');
      const hasBeer = userReactions.some(ur => ur.userKey === userKey && ur.reactionType === 'beer');
      const hasFire = userReactions.some(ur => ur.userKey === userKey && ur.reactionType === 'fire');

      // Member options list
      const playerOptionsHtml = allPlayers.map(p => {
        const isSelected = (savedPlayerId && savedPlayerId === p.id) || (!savedPlayerId && savedCommenterName && (savedCommenterName.toLowerCase() === p.name.toLowerCase() || (p.nickname && savedCommenterName.toLowerCase() === p.nickname.toLowerCase())));
        const numPrefix = p.number ? `#${p.number} - ` : '';
        const nickSuffix = p.nickname ? ` (${p.nickname})` : '';
        return `<option value="${p.id}" ${isSelected ? 'selected' : ''}>${numPrefix}${this.escapeHtml(p.name)}${nickSuffix}</option>`;
      }).join('');
      const isGuestSelected = savedPlayerId === 'guest' || savedCommenterName === 'Khách / CĐV';

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
                <select class="form-control comment-author-select" id="comment-author-${m.id}" required>
                  <option value="" disabled ${!savedPlayerId && !savedCommenterName ? 'selected' : ''}>-- Chọn người gửi --</option>
                  ${playerOptionsHtml}
                  <option value="guest" ${isGuestSelected ? 'selected' : ''}>🌟 Khách / CĐV FC TNT</option>
                </select>
                <input type="text" class="form-control comment-content-input" id="comment-content-${m.id}" placeholder="Viết bình luận, chém gió..." required autocomplete="off">
                <button type="submit" class="btn btn-primary btn-sm comment-submit-btn">Gửi 💬</button>
              </div>
            </form>
          </div>
        </article>
      `;
    }).join('');
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
    const hasHeart = userReactions.some(ur => ur.userKey === userKey && ur.reactionType === 'heart');
    const hasFootball = userReactions.some(ur => ur.userKey === userKey && ur.reactionType === 'football');
    const hasBeer = userReactions.some(ur => ur.userKey === userKey && ur.reactionType === 'beer');
    const hasFire = userReactions.some(ur => ur.userKey === userKey && ur.reactionType === 'fire');

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
    return `
      <div class="moment-comment-item" id="comment-${c.id}">
        <img class="comment-avatar" src="${c.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}" alt="${c.authorName}">
        <div class="comment-bubble">
          <div class="comment-bubble-header">
            <span class="comment-author">${this.escapeHtml(c.authorName)}</span>
            <span class="comment-time">${this.formatRelativeTime(c.createdAt)}</span>
            ${window.stateManager.isAdmin ? `
              <button class="comment-delete-btn" onclick="window.momentsModule.deleteComment('${momentId}', '${c.id}')" title="Xóa bình luận">&times;</button>
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
    const userKey = localStorage.getItem('fc_user_guid') || 'user_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('fc_user_guid', userKey);

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
    const authorSelect = document.getElementById(`comment-author-${momentId}`);
    const contentInput = document.getElementById(`comment-content-${momentId}`);

    if (!authorSelect || !contentInput) return;
    const selectedValue = authorSelect.value;
    const content = contentInput.value.trim();

    if (!selectedValue || !content) {
      if (window.appModule && window.appModule.showToast) {
        window.appModule.showToast('Vui lòng chọn người gửi bình luận!', 'warning');
      }
      return;
    }

    let authorName = 'Thành viên FC TNT';
    let avatar = '';

    if (selectedValue === 'guest') {
      authorName = 'Khách / CĐV';
      avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
      localStorage.setItem('fc_commenter_player_id', 'guest');
      localStorage.setItem('fc_commenter_name', authorName);
    } else {
      const allPlayers = window.stateManager.getPlayers();
      const player = allPlayers.find(p => p.id === selectedValue);
      if (player) {
        authorName = player.name;
        avatar = player.avatar || '';
        localStorage.setItem('fc_commenter_player_id', player.id);
        localStorage.setItem('fc_commenter_name', player.name);
      }
    }

    const newComment = await window.stateManager.addComment(momentId, authorName, content, avatar);
    contentInput.value = '';

    // Append directly to DOM
    const listEl = document.getElementById(`comments-list-${momentId}`);
    if (listEl && newComment) {
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
  },

  async deleteComment(momentId, commentId) {
    if (!confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;
    await window.stateManager.deleteComment(momentId, commentId);
    
    const commentEl = document.getElementById(`comment-${commentId}`);
    if (commentEl) commentEl.remove();

    const listEl = document.getElementById(`comments-list-${momentId}`);
    if (listEl && listEl.children.length === 0) {
      listEl.innerHTML = '<div class="no-comments-text">Chưa có bình luận nào. Hãy là người đầu tiên "chém gió"! 👇</div>';
    }
    this.updateCommentCount(momentId);
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

  handleImageFiles(fileList) {
    if (!fileList || fileList.length === 0) return;

    Array.from(fileList).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedImages.push(e.target.result);
        this.renderModalImagesPreview();
      };
      reader.readAsDataURL(file);
    });
  },

  handleVideoFile(file) {
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      if (window.appModule && window.appModule.showToast) {
        window.appModule.showToast('Vui lòng chọn file định dạng video (.mp4, .mov, .webm)!', 'warning');
      }
      return;
    }

    if (file.size > 48 * 1024 * 1024) {
      if (window.appModule && window.appModule.showToast) {
        window.appModule.showToast('⚠️ Dung lượng video quá lớn (>48MB). Bạn nên dùng link YouTube hoặc nén nhỏ lại nhé!', 'warning');
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

