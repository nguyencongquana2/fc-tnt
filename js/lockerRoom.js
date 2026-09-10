/**
 * 3D Locker Room & Kit Viewer Module - FC NTN
 * Hỗ trợ xoay 360 độ tương tác, đổi áo Sân Nhà / Sân Khách,
 * in tên & số áo cầu thủ theo thời gian thực và lưu trữ MongoDB.
 */

window.lockerRoomModule = {
  activeKitId: 'kit_home',
  selectedPlayerId: 'p_1',
  rotationY: 0,
  rotationX: -5,
  isDragging: false,
  startX: 0,
  startY: 0,
  autoRotate: false,
  autoRotateInterval: null,
  currentEditKitId: null,

  init() {
    this.bindEvents();
    this.renderKitSelector();
    this.renderPlayerSelector();
    this.render3DStage();
  },

  bindEvents() {
    const stage = document.getElementById('locker-3d-stage');
    if (stage) {
      // Chuột trên PC
      stage.addEventListener('mousedown', (e) => this.onDragStart(e.clientX, e.clientY));
      window.addEventListener('mousemove', (e) => {
        if (this.isDragging) this.onDragMove(e.clientX, e.clientY);
      });
      window.addEventListener('mouseup', () => this.onDragEnd());

      // Cảm ứng vuốt trên Mobile / Tablet
      stage.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          this.onDragStart(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (this.isDragging && e.touches.length === 1) {
          this.onDragMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });

      window.addEventListener('touchend', () => this.onDragEnd());
    }

    // Modal form submit
    const kitForm = document.getElementById('kit-edit-form');
    if (kitForm) {
      kitForm.addEventListener('submit', (e) => this.handleSaveKit(e));
    }

    // File input preview for front and back images
    const frontFileInput = document.getElementById('kit-front-file');
    if (frontFileInput) {
      frontFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const b64 = await this.fileToBase64(file);
          document.getElementById('kit-front-image').value = b64;
          document.getElementById('kit-front-preview').src = b64;
        }
      });
    }

    const backFileInput = document.getElementById('kit-back-file');
    if (backFileInput) {
      backFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const b64 = await this.fileToBase64(file);
          document.getElementById('kit-back-image').value = b64;
          document.getElementById('kit-back-preview').src = b64;
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

  onDragStart(x, y) {
    this.isDragging = true;
    this.startX = x;
    this.startY = y;
    if (this.autoRotate) this.stopAutoRotate();
  },

  onDragMove(x, y) {
    const deltaX = x - this.startX;
    const deltaY = y - this.startY;

    this.rotationY += deltaX * 0.8;
    this.rotationX -= deltaY * 0.3;

    // Giới hạn góc nghiêng lên xuống để không bị lật ngược
    this.rotationX = Math.max(-25, Math.min(25, this.rotationX));

    this.startX = x;
    this.startY = y;

    this.apply3DRotation();
  },

  onDragEnd() {
    this.isDragging = false;
  },

  apply3DRotation() {
    const card = document.getElementById('locker-jersey-3d-card');
    if (card) {
      card.style.transform = `rotateX(${this.rotationX}deg) rotateY(${this.rotationY}deg)`;
    }
  },

  flipFront() {
    if (this.autoRotate) this.stopAutoRotate();
    this.rotationY = 0;
    this.rotationX = -5;
    this.apply3DRotation();
    window.showToast('👕 Đã lật xem Mặt Trước Áo Đấu', 'info');
  },

  flipBack() {
    if (this.autoRotate) this.stopAutoRotate();
    this.rotationY = 180;
    this.rotationX = -5;
    this.apply3DRotation();
    window.showToast('🔢 Đã lật xem Mặt Sau (Tên & Số Áo)', 'info');
  },

  toggleAutoRotate() {
    if (this.autoRotate) {
      this.stopAutoRotate();
    } else {
      this.startAutoRotate();
    }
  },

  startAutoRotate() {
    this.autoRotate = true;
    const btn = document.getElementById('locker-auto-spin-btn');
    if (btn) {
      btn.classList.add('active');
      btn.innerHTML = '⏸️ Dừng Xoay';
    }

    if (this.autoRotateInterval) clearInterval(this.autoRotateInterval);
    this.autoRotateInterval = setInterval(() => {
      this.rotationY = (this.rotationY + 1.2) % 360;
      this.apply3DRotation();
    }, 25);
  },

  stopAutoRotate() {
    this.autoRotate = false;
    const btn = document.getElementById('locker-auto-spin-btn');
    if (btn) {
      btn.classList.remove('active');
      btn.innerHTML = '🔄 Tự Động Xoay 360°';
    }
    if (this.autoRotateInterval) {
      clearInterval(this.autoRotateInterval);
      this.autoRotateInterval = null;
    }
  },

  switchKit(kitId) {
    this.activeKitId = kitId;
    this.renderKitSelector();
    this.render3DStage();
    window.showToast(`👕 Đã chuyển sang: ${this.getActiveKit()?.name || 'Mẫu áo'}`);
  },

  getActiveKit() {
    const kits = window.stateManager.getKits();
    return kits.find(k => k.id === this.activeKitId) || kits[0] || {
      id: 'kit_home',
      name: 'Áo Sân Nhà (Home Kit)',
      type: 'home',
      season: '2025 - 2026',
      primaryColor: '#dc2626',
      secondaryColor: '#ffffff',
      textColor: '#ffffff',
      numberColor: '#fbbf24',
      sponsor: 'FC NTN',
      description: 'Trang phục thi đấu sân nhà chính thức'
    };
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
            ⚙️ Tùy Chỉnh / Tải Ảnh Áo Này
          </button>
        ` : ''}
      </div>
    `;
  },

  renderPlayerSelector() {
    const select = document.getElementById('locker-player-select');
    if (!select) return;

    const players = window.stateManager.getPlayers();
    select.innerHTML = players.map(p => `
      <option value="${p.id}" ${p.id === this.selectedPlayerId ? 'selected' : ''}>
        #${p.number} ${p.name} ${p.nickname ? `("${p.nickname}")` : ''} - [${p.position}]
      </option>
    `).join('');

    select.onchange = (e) => {
      this.selectedPlayerId = e.target.value;
      this.render3DStage();
      const p = window.stateManager.getPlayerById(this.selectedPlayerId);
      if (p) {
        window.showToast(`👕 Đã in tên #${p.number} ${p.name.toUpperCase()} lên lưng áo!`);
      }
    };
  },

  render3DStage() {
    const card = document.getElementById('locker-jersey-3d-card');
    if (!card) return;

    const kit = this.getActiveKit();
    const player = window.stateManager.getPlayerById(this.selectedPlayerId) || {
      name: 'QUÂN KUN',
      number: 5,
      position: 'DF'
    };

    const teamInfo = window.stateManager.getTeamInfo();
    const teamName = teamInfo?.name || 'FC NTN';

    const playerName = (player.name || 'FC NTN').toUpperCase();
    const playerNumber = player.number !== undefined && player.number !== null ? player.number : 10;

    // Mặt trước
    const frontHTML = kit.frontImage ? `
      <div class="jersey-face jersey-front custom-image" style="background-image: url('${kit.frontImage}');">
        <div class="jersey-lighting-overlay"></div>
      </div>
    ` : `
      <div class="jersey-face jersey-front" style="background: linear-gradient(135deg, ${kit.primaryColor} 0%, ${kit.primaryColor} 75%, ${kit.secondaryColor} 100%);">
        <div class="jersey-collar" style="border-top: 14px solid ${kit.secondaryColor};"></div>
        <div class="jersey-shoulder-stripes">
          <div class="stripe" style="background: ${kit.secondaryColor};"></div>
          <div class="stripe" style="background: ${kit.secondaryColor};"></div>
          <div class="stripe" style="background: ${kit.secondaryColor};"></div>
        </div>
        <div class="jersey-chest-row">
          <div class="jersey-chest-logo">⚡</div>
          <div class="jersey-team-crest" style="border-color: ${kit.secondaryColor};">
            <span class="crest-icon">⚽</span>
            <span class="crest-text">${teamName}</span>
          </div>
        </div>
        <div class="jersey-sponsor-box">
          <div class="jersey-sponsor-logo">✦ ${kit.sponsor || teamName} ✦</div>
          <div class="jersey-sponsor-sub">OFFICIAL MATCH KIT • ${kit.season || '2025/2026'}</div>
        </div>
        <div class="jersey-bottom-tag">AUTHENTIC FOOTBALL GEAR</div>
        <div class="jersey-lighting-overlay"></div>
      </div>
    `;

    // Mặt sau
    const backHTML = kit.backImage ? `
      <div class="jersey-face jersey-back custom-image" style="background-image: url('${kit.backImage}');">
        <div class="jersey-back-print-overlay">
          <div class="jersey-back-name" style="color: ${kit.textColor};">${playerName}</div>
          <div class="jersey-back-number" style="color: ${kit.numberColor};">${playerNumber}</div>
        </div>
        <div class="jersey-lighting-overlay"></div>
      </div>
    ` : `
      <div class="jersey-face jersey-back" style="background: linear-gradient(135deg, ${kit.primaryColor} 0%, ${kit.primaryColor} 80%, ${kit.secondaryColor} 100%);">
        <div class="jersey-collar" style="border-top: 14px solid ${kit.secondaryColor};"></div>
        <div class="jersey-shoulder-stripes">
          <div class="stripe" style="background: ${kit.secondaryColor};"></div>
          <div class="stripe" style="background: ${kit.secondaryColor};"></div>
          <div class="stripe" style="background: ${kit.secondaryColor};"></div>
        </div>
        
        <div class="jersey-back-print-area">
          <div class="jersey-back-name" style="color: ${kit.textColor};">${playerName}</div>
          <div class="jersey-back-number" style="color: ${kit.numberColor};">${playerNumber}</div>
          <div class="jersey-back-team-slug" style="color: ${kit.textColor}; opacity: 0.85;">${teamName}</div>
        </div>

        <div class="jersey-bottom-tag">#${playerNumber} • ${player.position || 'FW'}</div>
        <div class="jersey-lighting-overlay"></div>
      </div>
    `;

    card.innerHTML = frontHTML + backHTML;
    this.apply3DRotation();

    // Cập nhật thông tin chi tiết dưới stage
    const descEl = document.getElementById('locker-kit-info-desc');
    if (descEl) {
      descEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h3 style="color: #fff; font-size: 1.25rem; font-weight: 800; margin-bottom: 0.25rem;">${kit.name}</h3>
            <p style="color: var(--text-muted); font-size: 0.85rem;">Mùa giải ${kit.season} • Nhà tài trợ: <strong style="color: var(--accent-emerald);">${kit.sponsor}</strong></p>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 0.8rem; color: var(--text-muted);">Đang in áo cho:</span>
            <span style="background: rgba(16, 185, 129, 0.15); border: 1px solid var(--accent-emerald); color: #34d399; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 20px; font-size: 0.85rem;">
              #${playerNumber} ${playerName}
            </span>
          </div>
        </div>
      `;
    }
  },

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
    document.getElementById('kit-primary-color').value = kit.primaryColor || '#dc2626';
    document.getElementById('kit-secondary-color').value = kit.secondaryColor || '#ffffff';
    document.getElementById('kit-text-color').value = kit.textColor || '#ffffff';
    document.getElementById('kit-number-color').value = kit.numberColor || '#fbbf24';

    document.getElementById('kit-front-image').value = kit.frontImage || '';
    document.getElementById('kit-front-preview').src = kit.frontImage || 'https://via.placeholder.com/200x240/162032/34d399?text=Mặt+Trước';

    document.getElementById('kit-back-image').value = kit.backImage || '';
    document.getElementById('kit-back-preview').src = kit.backImage || 'https://via.placeholder.com/200x240/162032/34d399?text=Mặt+Sau';

    modal.classList.add('active');
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
      textColor: document.getElementById('kit-text-color').value,
      numberColor: document.getElementById('kit-number-color').value,
      frontImage: document.getElementById('kit-front-image').value.trim(),
      backImage: document.getElementById('kit-back-image').value.trim()
    };

    await window.stateManager.updateKit(kitId, kitData);
    window.showToast(`✅ Đã lưu cấu hình áo đấu: ${kitData.name}`);
    this.closeKitModal();
    this.renderKitSelector();
    this.render3DStage();
  }
};
