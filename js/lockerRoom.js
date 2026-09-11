/**
 * 3D Locker Room & Official Kit Video Showcase Module - FC TNT
 * Trình chiếu video 3D xoay 360 độ chân thực của bộ trang phục thi đấu chính thức.
 */

window.lockerRoomModule = {
  activeKitId: 'kit_home',
  currentSpeedIndex: 1,
  speeds: [0.75, 1.0, 1.25, 1.5],
  currentEditKitId: null,

  init() {
    this.bindEvents();
    this.renderKitSelector();
    this.render3DStage();
  },

  bindEvents() {
    // Modal form submit
    const kitForm = document.getElementById('kit-edit-form');
    if (kitForm) {
      kitForm.addEventListener('submit', (e) => this.handleSaveKit(e));
    }

    // Video file upload preview
    const videoFileInput = document.getElementById('kit-video-file');
    if (videoFileInput) {
      videoFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const b64 = await this.fileToBase64(file);
          document.getElementById('kit-video-url').value = b64;
          window.showToast('🎬 Đã tải video 3D mới lên bộ nhớ tạm!');
        }
      });
    }
  },

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  getActiveKit() {
    const kits = window.stateManager.getKits();
    return kits.find(k => k.id === this.activeKitId) || kits[0] || {
      id: 'kit_home',
      name: 'Áo Sân Nhà (Home Kit - 3D Showcase)',
      type: 'home',
      season: '2025 - 2026',
      primaryColor: '#0a0e17',
      secondaryColor: '#38bdf8',
      videoUrl: '/assets/videos/kit_3d_home.mp4',
      sponsor: 'FC NTN',
      description: 'Trang phục thi đấu sân nhà hoa văn hoàng gia 3D xoay 360 độ chính thức'
    };
  },

  switchKit(kitId) {
    this.activeKitId = kitId;
    this.renderKitSelector();
    this.render3DStage();
    window.showToast(`👕 Đang xem: ${this.getActiveKit()?.name || 'Mẫu áo'}`);
  },

  renderKitSelector() {
    const container = document.getElementById('locker-kit-selector');
    if (!container) return;

    const kits = window.stateManager.getKits();
    const isAdmin = window.stateManager.isAdmin;

    container.innerHTML = `
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
        ${kits.map(k => {
          const isActive = k.id === this.activeKitId;
          return `
            <button class="kit-tab-pill ${isActive ? 'active' : ''}" onclick="window.lockerRoomModule.switchKit('${k.id}')">
              <span class="kit-color-dot" style="background: ${k.primaryColor}; border: 1.5px solid ${k.secondaryColor};"></span>
              <span style="font-weight: 700;">${k.name}</span>
              ${k.type === 'home' ? '<span class="kit-badge-tag home">Sân Nhà</span>' : '<span class="kit-badge-tag away">Sân Khách</span>'}
            </button>
          `;
        }).join('')}

        ${isAdmin ? `
          <button class="btn btn-secondary btn-sm" onclick="window.lockerRoomModule.openKitModal('${this.activeKitId}')" style="margin-left: auto;">
            ⚙️ Tùy Chỉnh / Tải Video Áo
          </button>
        ` : ''}
      </div>
    `;
  },

  render3DStage() {
    const videoEl = document.getElementById('locker-3d-video');
    const kit = this.getActiveKit();
    const videoSrc = kit.videoUrl || '/assets/videos/kit_3d_home.mp4';

    if (videoEl) {
      if (videoEl.src !== videoSrc && !videoEl.src.endsWith(videoSrc)) {
        videoEl.src = videoSrc;
        videoEl.load();
        videoEl.play().catch(() => {
          // Autoplay policy fallback: mute and play
          videoEl.muted = true;
          videoEl.play().catch(e => console.log('Video play deferred:', e));
        });
      }
    }

    // Cập nhật thẻ thông tin chi tiết áo đấu
    const descEl = document.getElementById('locker-kit-info-desc');
    if (descEl) {
      descEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="kit-color-dot" style="background: ${kit.primaryColor}; border: 2px solid ${kit.secondaryColor}; width: 14px; height: 14px;"></span>
              <h3 style="color: #fff; font-size: 1.25rem; font-weight: 800; margin: 0;">${kit.name}</h3>
              <span style="background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; color: #38bdf8; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 12px;">3D SHOWCASE</span>
            </div>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.2rem;">
              Mùa giải: <strong style="color: #fff;">${kit.season || '2025 - 2026'}</strong> • Nhà tài trợ: <strong style="color: var(--accent-emerald);">${kit.sponsor || 'FC TNT'}</strong>
            </p>
            <p style="color: var(--text-dim); font-size: 0.82rem; margin-top: 0.25rem;">${kit.description || 'Bộ trang phục thi đấu chính thức chất liệu cao cấp thoáng khí'}</p>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <a href="${videoSrc}" download="FC_TNT_Official_Kit_3D.mp4" class="btn btn-secondary btn-sm" style="font-size: 0.8rem;">
              📥 Tải Video 3D Về Máy
            </a>
          </div>
        </div>
      `;
    }
  },

  // Video Playback Controls
  togglePlayPause() {
    const video = document.getElementById('locker-3d-video');
    const btn = document.getElementById('video-play-btn');
    if (!video || !btn) return;

    if (video.paused) {
      video.play();
      btn.innerHTML = '⏸️ Tạm Dừng';
      window.showToast('▶️ Đang phát video 3D');
    } else {
      video.pause();
      btn.innerHTML = '▶️ Tiếp Tục';
      window.showToast('⏸️ Đã tạm dừng video 3D');
    }
  },

  toggleSound() {
    const video = document.getElementById('locker-3d-video');
    const btn = document.getElementById('video-sound-btn');
    if (!video || !btn) return;

    video.muted = !video.muted;
    if (video.muted) {
      btn.innerHTML = '🔇 Tắt Tiếng';
      window.showToast('🔇 Đã tắt tiếng');
    } else {
      btn.innerHTML = '🔊 Bật Tiếng';
      window.showToast('🔊 Đã bật âm thanh');
    }
  },

  changeSpeed() {
    const video = document.getElementById('locker-3d-video');
    const label = document.getElementById('video-speed-label');
    if (!video || !label) return;

    this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speeds.length;
    const speed = this.speeds[this.currentSpeedIndex];
    video.playbackRate = speed;
    label.innerText = `${speed.toFixed(1)}x`;
    window.showToast(`⚡ Tốc độ xoay video: ${speed.toFixed(1)}x`);
  },

  restartVideo() {
    const video = document.getElementById('locker-3d-video');
    if (!video) return;
    video.currentTime = 0;
    video.play();
    window.showToast('🔄 Bắt đầu lại video từ đầu');
  },

  toggleFullscreen() {
    const box = document.getElementById('locker-video-box');
    const video = document.getElementById('locker-3d-video');
    const target = box || video;
    if (!target) return;

    if (!document.fullscreenElement) {
      if (target.requestFullscreen) {
        target.requestFullscreen();
      } else if (target.webkitRequestFullscreen) {
        target.webkitRequestFullscreen();
      }
      window.showToast('⛶ Đã mở chế độ toàn màn hình');
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  },

  // Modal Management
  openKitModal(kitId) {
    if (!window.stateManager.isAdmin) {
      window.showToast('Vui lòng đăng nhập Quản trị viên để chỉnh sửa áo đấu!', 'error');
      if (window.appModule) window.appModule.openAdminModal();
      return;
    }

    this.currentEditKitId = kitId;
    const kit = window.stateManager.getKitById(kitId) || this.getActiveKit();
    const modal = document.getElementById('kit-edit-modal');
    if (!modal) return;

    document.getElementById('kit-name-input').value = kit.name || '';
    document.getElementById('kit-type-select').value = kit.type || 'home';
    document.getElementById('kit-season-input').value = kit.season || '2025 - 2026';
    document.getElementById('kit-sponsor-input').value = kit.sponsor || 'FC NTN';
    document.getElementById('kit-primary-color').value = kit.primaryColor || '#0a0e17';
    document.getElementById('kit-secondary-color').value = kit.secondaryColor || '#38bdf8';
    document.getElementById('kit-video-url').value = kit.videoUrl || '/assets/videos/kit_3d_home.mp4';
    document.getElementById('kit-desc-input').value = kit.description || '';

    const videoFileInput = document.getElementById('kit-video-file');
    if (videoFileInput) videoFileInput.value = '';

    modal.classList.add('active');
  },

  clearVideo() {
    const input = document.getElementById('kit-video-url');
    if (input) input.value = '';
    const file = document.getElementById('kit-video-file');
    if (file) file.value = '';
    window.showToast('🗑️ Đã xóa liên kết video');
  },

  closeKitModal() {
    const modal = document.getElementById('kit-edit-modal');
    if (modal) modal.classList.remove('active');
    this.currentEditKitId = null;
  },

  async handleSaveKit(e) {
    e.preventDefault();
    if (!window.stateManager.isAdmin) {
      window.showToast('Cần quyền Quản trị viên!', 'error');
      return;
    }

    const kitId = this.currentEditKitId || this.activeKitId;
    const kitData = {
      name: document.getElementById('kit-name-input').value.trim() || 'Áo Đấu',
      type: document.getElementById('kit-type-select').value,
      season: document.getElementById('kit-season-input').value.trim() || '2025 - 2026',
      sponsor: document.getElementById('kit-sponsor-input').value.trim() || 'FC NTN',
      primaryColor: document.getElementById('kit-primary-color').value,
      secondaryColor: document.getElementById('kit-secondary-color').value,
      videoUrl: document.getElementById('kit-video-url').value.trim() || '/assets/videos/kit_3d_home.mp4',
      description: document.getElementById('kit-desc-input').value.trim()
    };

    await window.stateManager.updateKit(kitId, kitData);
    window.showToast(`✅ Đã lưu cấu hình áo đấu: ${kitData.name}`);
    this.closeKitModal();
    this.renderKitSelector();
    this.render3DStage();
  }
};

