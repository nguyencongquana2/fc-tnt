/**
 * FC TNT Moments - Modal & Media Upload Submodule (js/moments/moments-modal.js)
 * Quản lý form tạo/sửa bài, nén ảnh client-side bằng Canvas, trích xuất metadata video và upload Cloudinary
 */

window.momentsModule = window.momentsModule || {};

Object.assign(window.momentsModule, {
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
      console.warn('[MomentsModal] Cannot fetch upload config:', e.message);
    }
  },

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

  async uploadMediaItemToCloudinary(item) {
    if (!item.file) return item;

    try {
      if (this.cloudinaryConfig && this.cloudinaryConfig.configured) {
        const formData = new FormData();
        formData.append('file', item.file);

        let uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudinaryConfig.cloudName}/auto/upload`;

        if (this.cloudinaryConfig.hasPreset && this.cloudinaryConfig.uploadPreset) {
          formData.append('upload_preset', this.cloudinaryConfig.uploadPreset);
        } else {
          const sigHeaders = { 'Content-Type': 'application/json' };
          const adminTok = window.stateManager && window.stateManager.getAdminToken ? window.stateManager.getAdminToken() : '';
          const playerTok = window.stateManager && window.stateManager.getPlayerToken ? window.stateManager.getPlayerToken() : '';
          if (adminTok) sigHeaders['x-admin-token'] = adminTok;
          if (playerTok) sigHeaders['x-player-token'] = playerTok;

          const sigRes = await fetch('/api/upload/signature', {
            method: 'POST',
            headers: sigHeaders
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
          console.warn('[MomentsModal] Fallback video conversion error:', e.message);
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
