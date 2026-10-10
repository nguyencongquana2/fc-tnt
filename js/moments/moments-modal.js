/**
 * FC TNT Moments - Modal Controller Submodule (js/moments/moments-modal.js)
 * Quản lý form tạo/sửa bài viết, hàng đợi tệp media và submit khoảnh khắc
 */

window.momentsModule = window.momentsModule || {};

Object.assign(window.momentsModule, {
  openCreateMomentModal(editId = null) {
    const isAdmin = window.stateManager ? window.stateManager.isAdmin : false;
    const isPlayer = window.stateManager && typeof window.stateManager.isPlayerLoggedIn === 'function'
      ? window.stateManager.isPlayerLoggedIn()
      : Boolean(window.stateManager && window.stateManager.currentPlayer);

    if (!isAdmin && !isPlayer) {
      if (window.showToast) {
        window.showToast('Vui lòng đăng nhập tài khoản Cầu thủ để đăng khoảnh khắc!', 'info');
      }
      if (window.appModule && window.appModule.openPlayerLoginModal) {
        window.appModule.openPlayerLoginModal();
      }
      return;
    }

    this.currentEditMomentId = editId;
    const modal = document.getElementById('moment-form-modal');
    const title = document.getElementById('moment-form-title');
    const form = document.getElementById('moment-form');
    if (form) form.reset();
    this.uploadedMedia = [];

    const tagsContainer = document.getElementById('moment-tagged-players-select');
    const allPlayers = window.stateManager ? window.stateManager.getPlayers() : [];

    if (tagsContainer) {
      tagsContainer.innerHTML = allPlayers.map(p => `
        <label class="tag-player-checkbox-label">
          <input type="checkbox" name="tagged_player" value="${this.escapeHtml(p.id)}">
          <img src="${this.escapeHtml(p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80')}" alt="${this.escapeHtml(p.name)}">
          <span>${this.escapeHtml(p.name)} (#${this.escapeHtml(p.number || '')})</span>
        </label>
      `).join('');
    }

    if (editId) {
      if (title) title.innerText = '✏️ Chỉnh Sửa Khoảnh Khắc';
      const m = window.stateManager ? window.stateManager.getMomentById(editId) : null;
      if (m) {
        document.getElementById('moment-input-title').value = m.title || '';
        document.getElementById('moment-input-date').value = m.date || '';
        document.getElementById('moment-input-location').value = m.location || '';
        document.getElementById('moment-input-category').value = m.category || 'party';
        document.getElementById('moment-input-description').value = m.description || '';

        this.uploadedMedia = this.getNormalizedMedia(m).map(item => ({ ...item, file: null }));

        if (tagsContainer && m.taggedPlayerIds) {
          tagsContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = m.taggedPlayerIds.includes(cb.value);
          });
        }
      }
    } else {
      if (title) title.innerText = '📸 Đăng Khoảnh Khắc / Kỷ Niệm Mới';
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const dateInput = document.getElementById('moment-input-date');
      if (dateInput) dateInput.value = todayStr;
    }

    this.renderMediaQueuePreview();
    if (modal) modal.classList.add('active');
  },

  closeCreateMomentModal() {
    const modal = document.getElementById('moment-form-modal');
    if (modal) modal.classList.remove('active');
    if (Array.isArray(this.uploadedMedia)) {
      this.uploadedMedia.forEach(item => {
        if (item && item.url && typeof item.url === 'string' && item.url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(item.url);
          } catch (e) {
            console.warn('[MomentsModal] Revoke URL error:', e.message);
          }
        }
      });
    }
    this.uploadedMedia = [];
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
          console.warn('[MomentsModal] Lỗi nén ảnh:', e.message);
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

  removeMediaItem(index) {
    if (index >= 0 && index < this.uploadedMedia.length) {
      const item = this.uploadedMedia[index];
      if (item && item.url && typeof item.url === 'string' && item.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(item.url);
        } catch (e) {
          console.warn('[MomentsModal] Revoke URL error:', e.message);
        }
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
              <img src="${this.escapeHtml(item.thumbnail)}" alt="Thumbnail">
            ` : `
              <video src="${this.escapeHtml(item.url)}#t=0.5" muted preload="metadata"></video>
            `}
            <span class="media-type-badge video">🎬 Video ${item.duration ? `(${this.escapeHtml(item.duration)})` : ''}</span>
          ` : `
            <img src="${this.escapeHtml(item.url)}" alt="Ảnh xem trước">
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

      if (!window.stateManager) throw new Error('State manager chưa sẵn sàng');

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
      console.error('[MomentsModal] Submit moment error:', err);
      const errMsg = err.message || 'Lỗi khi lưu khoảnh khắc';
      if (window.showToast) {
        window.showToast('❌ ' + errMsg, 'error');
      } else if (window.appModule && window.appModule.showToast) {
        window.appModule.showToast('❌ ' + errMsg, 'error');
      }
      if (errMsg.toLowerCase().includes('đăng nhập') && window.appModule && window.appModule.openPlayerLoginModal) {
        window.appModule.openPlayerLoginModal();
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
  }
});
