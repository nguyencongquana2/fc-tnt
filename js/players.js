/**
 * Players Module - FC TNT
 */

window.playersModule = {
  currentEditId: null,
  quickUploadPlayerId: null,

  init() {
    this.bindEvents();
    this.renderPlayers();
  },

  bindEvents() {
    const addBtn = document.getElementById('add-player-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openPlayerModal());
    }

    const form = document.getElementById('player-form');
    
    // Xử lý cấp tài khoản thành viên của Admin
    const provisionForm = document.getElementById('admin-provision-form');
    if (provisionForm) {
      provisionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const playerId = document.getElementById('provision-player-id')?.value;
        const username = document.getElementById('provision-username')?.value.trim();
        const tempPassword = document.getElementById('provision-password')?.value.trim();
        const errorEl = document.getElementById('provision-error');
        const resultCard = document.getElementById('provision-result-card');
        const shareTextarea = document.getElementById('provision-share-text');
        const submitBtn = document.getElementById('provision-submit-btn');

        if (errorEl) errorEl.innerText = '';
        if (resultCard) resultCard.style.display = 'none';

        if (!username || !tempPassword) {
          if (errorEl) errorEl.innerText = 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!';
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = '⏳ Đang cấp...';
        }

        const res = await window.stateManager.provisionPlayer(playerId, username, tempPassword);

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = '⚡ Cấp Tài Khoản';
        }

        if (res.success) {
          window.showToast('🎉 ' + res.message);
          if (resultCard && shareTextarea) {
            shareTextarea.value = res.shareText;
            resultCard.style.display = 'block';
          }
          this.renderPlayers();
          if (document.getElementById('player-profile-modal').classList.contains('active')) {
            this.viewPlayerProfile(playerId);
          }
        } else {
          if (errorEl) errorEl.innerText = res.error || 'Cấp tài khoản thất bại!';
        }
      });
    }
    if (form) {
      form.addEventListener('submit', (e) => this.handleSavePlayer(e));
    }

    // Xử lý upload ảnh từ máy tính / điện thoại trong form
    const avatarFileInput = document.getElementById('player-avatar-file-input');
    if (avatarFileInput) {
      avatarFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
          window.showToast('Vui lòng chọn ảnh dung lượng dưới 10MB!', 'warning');
          avatarFileInput.value = '';
          return;
        }

        try {
          const base64 = await this.processImageUpload(file);
          document.getElementById('player-avatar-preview').src = base64;
          document.getElementById('player-avatar-custom').value = base64;
          window.showToast('📸 Đã tải ảnh avatar lên thành công!');
        } catch (err) {
          console.error(err);
          window.showToast('Lỗi khi đọc file ảnh!', 'error');
        }
      });
    }

    // Xử lý upload ảnh toàn cục (nhanh từ hồ sơ cầu thủ)
    const globalFileInput = document.getElementById('global-player-avatar-file');
    if (globalFileInput) {
      globalFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file || !this.quickUploadPlayerId) return;

        if (file.size > 10 * 1024 * 1024) {
          window.showToast('Vui lòng chọn ảnh dung lượng dưới 10MB!', 'warning');
          globalFileInput.value = '';
          return;
        }

        try {
          const base64 = await this.processImageUpload(file);
          const p = window.stateManager.getPlayerById(this.quickUploadPlayerId);
          if (p) {
            await window.stateManager.updatePlayerAvatar(this.quickUploadPlayerId, base64);
            window.showToast(`📸 Đã cập nhật ảnh đại diện cho ${p.name}!`);
            
            // Re-render
            this.renderPlayers();
            if (document.getElementById('player-profile-modal').classList.contains('active')) {
              this.viewPlayerProfile(this.quickUploadPlayerId);
            }
            if (window.matchesModule && window.matchesModule.currentMatchId) {
              window.matchesModule.renderDetailBody();
            }
            if (window.awardsModule) window.awardsModule.renderAwards();
            if (window.appModule) window.appModule.renderDashboard();
          }
        } catch (err) {
          console.error(err);
          window.showToast('Lỗi khi tải ảnh!', 'error');
        } finally {
          this.quickUploadPlayerId = null;
          globalFileInput.value = '';
        }
      });
    }

    const avatarSelect = document.getElementById('player-avatar-preset');
    if (avatarSelect) {
      avatarSelect.addEventListener('change', (e) => {
        const customInput = document.getElementById('player-avatar-custom');
        if (e.target.value) {
          customInput.value = e.target.value;
          document.getElementById('player-avatar-preview').src = e.target.value;
        }
      });
    }

    const customAvatarInput = document.getElementById('player-avatar-custom');
    if (customAvatarInput) {
      customAvatarInput.addEventListener('input', (e) => {
        const preview = document.getElementById('player-avatar-preview');
        preview.src = e.target.value || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
      });
    }
  },

  processImageUpload(file, maxWidth = 300, maxHeight = 300, quality = 0.88) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('File không phải là hình ảnh'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Giữ tỷ lệ và scale về tối đa 300x300
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
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

  quickUploadAvatar(playerId, e = null) {
    if (e) e.stopPropagation();
    if (!window.stateManager.canEditPlayerAvatar(playerId)) {
      window.showToast('Bạn chỉ có thể đổi ảnh đại diện của chính mình hoặc cần quyền Quản trị viên!', 'warning');
      return;
    }
    this.quickUploadPlayerId = playerId;
    const fileInput = document.getElementById('global-player-avatar-file');
    if (fileInput) {
      fileInput.click();
    }
  },

  renderPlayers() {
    const container = document.getElementById('players-grid-container');
    if (!container) return;

    const isAdmin = window.stateManager.isAdmin;
    const players = window.stateManager.getPlayers();
    const statsList = window.stateManager.getPlayerOverallStats();
    const statsMap = {};
    statsList.forEach(s => statsMap[s.player.id] = s);

    if (players.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-xl);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🏃‍♂️</div>
          <h3>Chưa có cầu thủ nào trong đội</h3>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Hãy thêm các thành viên trong đội bóng của bạn để bắt đầu tính điểm và trao thưởng.</p>
          ${isAdmin ? `<button class="btn btn-primary" onclick="window.playersModule.openPlayerModal()">+ Thêm Cầu Thủ Đầu Tiên</button>` : ''}
        </div>
      `;
      return;
    }

    container.innerHTML = players.map(p => {
      const stats = statsMap[p.id] || { matchesPlayed: 0, avgRating: 0, totalGoals: 0, totalAssists: 0, motmCount: 0 };
      const canEditAvatar = window.stateManager.canEditPlayerAvatar(p.id);
      const posClass = `pos-${p.position.toLowerCase()}`;
      const primaryDisplayName = window.escapeHtml((p.nickname && p.nickname.trim()) ? p.nickname.trim() : p.name);
      const secondaryRealName = window.escapeHtml((p.name && p.name.trim() && p.name.trim().toLowerCase() !== primaryDisplayName.toLowerCase()) ? p.name.trim() : '');
      
      return `
        <div class="player-fifa-card" onclick="window.playersModule.viewPlayerProfile('${p.id}')">
          <div class="player-card-bg-number">${p.number || ''}</div>
          
          <div class="player-card-top">
            <div class="player-rating-badge">
              <span class="player-overall-num" style="color: ${this.getRatingColor(stats.avgRating)}">
                ${stats.matchesPlayed > 0 ? stats.avgRating : '--'}
              </span>
              <span class="pos-tag ${posClass}">${p.position}</span>
            </div>
            
            <div class="player-card-header-badge">
              <span class="player-card-club-tag">FC TNT</span>
            </div>

            ${canEditAvatar ? `
              <div style="position: relative; cursor: pointer;" onclick="window.playersModule.quickUploadAvatar('${p.id}', event)" title="Bấm để tải ảnh đại diện từ điện thoại/máy tính">
                <img class="player-avatar-large" src="${p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}" alt="${primaryDisplayName}" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'">
                <div style="position: absolute; bottom: -2px; right: -2px; background: var(--accent-emerald); color: #000; font-size: 0.65rem; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border: 2px solid #111; box-shadow: 0 2px 4px rgba(0,0,0,0.6);">
                  📷
                </div>
              </div>
            ` : `
              <div style="position: relative;">
                <img class="player-avatar-large" src="${p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}" alt="${primaryDisplayName}" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'">
              </div>
            `}
          </div>

          <div class="player-jersey-section">
            <div class="player-jersey-name" title="${primaryDisplayName}">${primaryDisplayName}</div>
            ${secondaryRealName ? `<div class="player-card-realname-sub" title="Họ và tên: ${secondaryRealName}">${secondaryRealName}</div>` : ''}
            <div class="player-jersey-number">${p.number !== undefined && p.number !== null ? p.number : '-'}</div>
          </div>

          <div class="player-mini-stats">
            <div class="mini-stat-item">
              <div class="mini-stat-label">Trận</div>
              <div class="mini-stat-val">${stats.matchesPlayed}</div>
            </div>
            <div class="mini-stat-item">
              <div class="mini-stat-label">Bàn</div>
              <div class="mini-stat-val" style="color: var(--accent-ruby);">${stats.totalGoals}</div>
            </div>
            <div class="mini-stat-item">
              <div class="mini-stat-label">Kiến tạo</div>
              <div class="mini-stat-val" style="color: var(--accent-cyan);">${stats.totalAssists}</div>
            </div>
          </div>

          ${isAdmin ? `
            <div class="player-card-footer" onclick="event.stopPropagation()">
              <button class="btn btn-secondary btn-sm" onclick="window.playersModule.quickUploadAvatar('${p.id}', event)" title="Tải ảnh đại diện mới từ máy" style="padding: 0.25rem 0.5rem; font-size: 0.78rem;">
                📷 Đổi Ảnh
              </button>
              <button class="btn btn-secondary btn-sm" onclick="window.playersModule.openProvisionModal('${p.id}')" title="${p.username ? 'Đổi mật khẩu / tài khoản' : 'Cấp tài khoản thành viên'}" style="padding: 0.25rem 0.5rem; font-size: 0.78rem; color: var(--accent-gold);">
                🔑 ${p.username ? 'Đổi MK' : 'Cấp TK'}
              </button>
              <button class="btn btn-secondary btn-sm" onclick="window.playersModule.openPlayerModal('${p.id}')" title="Chỉnh sửa thông tin" style="padding: 0.25rem 0.5rem; font-size: 0.78rem;">
                ✏️ Sửa
              </button>
              <button class="btn btn-danger btn-sm" onclick="window.playersModule.deletePlayer('${p.id}')" title="Xóa" style="padding: 0.25rem 0.5rem; font-size: 0.78rem;">
                🗑️
              </button>
            </div>
          ` : `
            <div class="player-card-footer" onclick="event.stopPropagation()">
              <button class="btn btn-secondary btn-sm" onclick="window.playersModule.quickUploadAvatar('${p.id}', event)" title="Tải ảnh đại diện mới từ máy" style="padding: 0.25rem 0.6rem; font-size: 0.78rem; flex: 1;">
                📷 Đổi Ảnh
              </button>
              <button class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.6rem; font-size: 0.78rem; flex: 1;" onclick="window.playersModule.viewPlayerProfile('${p.id}')">
                👁️ Chi Tiết
              </button>
            </div>
          `}
        </div>
      `;
    }).join('');
  },

  getRatingColor(rating) {
    if (!rating || rating === 0) return '#94a3b8';
    if (rating >= 8.5) return '#10b981'; // Green
    if (rating >= 7.5) return '#06b6d4'; // Cyan
    if (rating >= 6.5) return '#f59e0b'; // Gold
    return '#f43f5e'; // Red
  },

  openPlayerModal(id = null) {
    if (!window.stateManager.isAdmin) {
      window.showToast('Vui lòng đăng nhập Quản trị viên để thêm/sửa cầu thủ!', 'error');
      if (window.appModule && window.appModule.openAdminModal) {
        window.appModule.openAdminModal();
      }
      return;
    }
    this.currentEditId = id;
    const modal = document.getElementById('player-modal');
    const title = document.getElementById('player-modal-title');
    const form = document.getElementById('player-form');
    form.reset();

    if (id) {
      title.innerHTML = '✏️ Chỉnh Sửa Cầu Thủ';
      const player = window.stateManager.getPlayerById(id);
      if (player) {
        document.getElementById('player-name').value = player.name || '';
        document.getElementById('player-nickname').value = player.nickname || '';
        document.getElementById('player-number').value = player.number || '';
        document.getElementById('player-position').value = player.position || 'FW';
        document.getElementById('player-avatar-custom').value = player.avatar || '';
        document.getElementById('player-phone').value = player.phone || '';
        document.getElementById('player-note').value = player.note || '';
        document.getElementById('player-bank-code').value = player.bankCode || '';
        document.getElementById('player-bank-acc-number').value = player.bankAccountNumber || '';
        document.getElementById('player-bank-acc-name').value = player.bankAccountName || '';
        document.getElementById('player-avatar-preview').src = player.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
      }
    } else {
      title.innerHTML = '➕ Thêm Cầu Thủ Mới';
      const randomAvatars = [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
      ];
      const randomAv = randomAvatars[Math.floor(Math.random() * randomAvatars.length)];
      document.getElementById('player-avatar-custom').value = randomAv;
      document.getElementById('player-avatar-preview').src = randomAv;
      document.getElementById('player-bank-code').value = '';
      document.getElementById('player-bank-acc-number').value = '';
      document.getElementById('player-bank-acc-name').value = '';
    }

    modal.classList.add('active');
  },

  closePlayerModal() {
    const modal = document.getElementById('player-modal');
    modal.classList.remove('active');
    this.currentEditId = null;
  },

  handleSavePlayer(e) {
    e.preventDefault();
    if (!window.stateManager.isAdmin) {
      window.showToast('Vui lòng đăng nhập Quản trị viên để lưu thông tin!', 'error');
      return;
    }
    const name = document.getElementById('player-name').value.trim();
    if (!name) {
      window.showToast('Vui lòng nhập tên cầu thủ!', 'error');
      return;
    }

    const playerData = {
      name,
      nickname: document.getElementById('player-nickname').value.trim(),
      number: parseInt(document.getElementById('player-number').value) || 0,
      position: document.getElementById('player-position').value,
      avatar: document.getElementById('player-avatar-custom').value.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      phone: document.getElementById('player-phone').value.trim(),
      note: document.getElementById('player-note').value.trim(),
      bankCode: document.getElementById('player-bank-code')?.value || '',
      bankAccountNumber: document.getElementById('player-bank-acc-number')?.value.trim() || '',
      bankAccountName: document.getElementById('player-bank-acc-name')?.value.trim() || ''
    };

    if (this.currentEditId) {
      window.stateManager.updatePlayer(this.currentEditId, playerData);
      window.showToast(`Đã cập nhật cầu thủ: ${playerData.name}`);
    } else {
      window.stateManager.addPlayer(playerData);
      window.showToast(`Đã thêm cầu thủ mới: ${playerData.name}`);
    }

    this.closePlayerModal();
    this.renderPlayers();
    if (window.awardsModule) window.awardsModule.renderAwards();
    if (window.appModule) window.appModule.renderDashboard();
  },

  deletePlayer(id) {
    if (!window.stateManager.isAdmin) {
      window.showToast('Vui lòng đăng nhập Quản trị viên để xóa cầu thủ!', 'error');
      if (window.appModule && window.appModule.openAdminModal) {
        window.appModule.openAdminModal();
      }
      return;
    }

    const player = window.stateManager.getPlayerById(id);
    if (!player) return;

    if (confirm(`Bạn có chắc chắn muốn xóa cầu thủ "${player.name}" khỏi đội bóng không?`)) {
      window.stateManager.deletePlayer(id);
      window.showToast(`Đã xóa cầu thủ ${player.name}`, 'info');
      this.renderPlayers();
      if (window.awardsModule) window.awardsModule.renderAwards();
      if (window.appModule) window.appModule.renderDashboard();
    }
  },


  openProvisionModal(playerId) {
    const player = window.stateManager.getPlayerById(playerId);
    if (!player) return;

    const modal = document.getElementById('admin-provision-modal');
    const idInp = document.getElementById('provision-player-id');
    const nameEl = document.getElementById('provision-player-name');
    const avEl = document.getElementById('provision-player-avatar');
    const stEl = document.getElementById('provision-player-status');
    const userInp = document.getElementById('provision-username');
    const passInp = document.getElementById('provision-password');
    const errorEl = document.getElementById('provision-error');
    const resultCard = document.getElementById('provision-result-card');

    if (errorEl) errorEl.innerText = '';
    if (resultCard) resultCard.style.display = 'none';
    if (idInp) idInp.value = player.id;
    if (nameEl) nameEl.innerText = player.name + ' (#' + (player.number !== undefined ? player.number : '-') + ')';
    if (avEl) avEl.src = player.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
    if (stEl) {
      stEl.innerText = player.username ? ('Trạng thái: Đã có tài khoản (@' + player.username + ')') : 'Trạng thái: Chưa cấp tài khoản';
      stEl.style.color = player.username ? 'var(--accent-emerald)' : 'var(--text-muted)';
    }

    // Tự sinh username gợi ý nếu chưa có
    if (userInp) {
      if (player.username) {
        userInp.value = player.username;
      } else {
        userInp.value = this.suggestUsername(player.name);
      }
    }

    // Tự sinh mật khẩu khởi tạo ngẫu nhiên
    if (passInp) {
      passInp.value = 'TNT@' + Math.floor(1000 + Math.random() * 9000);
    }

    if (modal) {
      modal.classList.add('active');
    }
  },

  generateRandomPassword() {
    const passInp = document.getElementById('provision-password');
    if (passInp) {
      passInp.value = 'TNT@' + Math.floor(1000 + Math.random() * 9000);
    }
  },

  suggestUsername(fullName) {
    if (!fullName) return 'player' + Math.floor(100 + Math.random() * 900);
    const clean = fullName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return parts[0];
    const lastName = parts[parts.length - 1];
    const initials = parts.slice(0, parts.length - 1).map(p => p[0]).join('');
    return lastName + initials;
  },

  copyProvisionText() {
    const shareTextarea = document.getElementById('provision-share-text');
    const copyBtn = document.getElementById('provision-copy-btn');
    if (!shareTextarea) return;

    shareTextarea.select();
    navigator.clipboard.writeText(shareTextarea.value).then(() => {
      window.showToast('📋 Đã sao chép thông tin tài khoản! Giờ bạn có thể dán vào Zalo gửi cho anh em.');
      if (copyBtn) {
        const originalText = copyBtn.innerText;
        copyBtn.innerText = '✅ Đã Sao Chép!';
        setTimeout(() => copyBtn.innerText = originalText, 2500);
      }
    }).catch(() => {
      window.showToast('Không thể sao chép tự động, vui lòng chọn văn bản và bấm Copy.', 'warning');
    });
  },

  viewPlayerProfile(id) {
    const player = window.stateManager.getPlayerById(id);
    if (!player) return;

    const statsList = window.stateManager.getPlayerOverallStats();
    const stats = statsList.find(s => s.player.id === id) || {
      matchesPlayed: 0,
      avgRating: 0,
      totalGoals: 0,
      totalAssists: 0,
      motmCount: 0,
      matchHistory: []
    };

    const modal = document.getElementById('player-profile-modal');
    const content = document.getElementById('player-profile-content');
    const isAdmin = window.stateManager.isAdmin;
    const canEditProfileAvatar = window.stateManager.canEditPlayerAvatar(player.id);

    const primaryDisplayName = window.escapeHtml((player.nickname && player.nickname.trim()) ? player.nickname.trim() : player.name);
    const secondaryRealName = window.escapeHtml((player.name && player.name.trim() && player.name.trim().toLowerCase() !== primaryDisplayName.toLowerCase()) ? player.name.trim() : '');

    content.innerHTML = `
      <div style="display: flex; gap: 1.5rem; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap;">
        ${canEditProfileAvatar ? `
          <div style="position: relative; cursor: pointer;" onclick="window.playersModule.quickUploadAvatar('${player.id}')" title="Bấm để tải ảnh đại diện từ điện thoại/máy tính">
            <img src="${player.avatar}" style="width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent-emerald);">
            <div style="position: absolute; bottom: 0; right: 0; background: var(--accent-emerald); color: #000; font-size: 0.75rem; font-weight: 800; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.6);">
              📷
            </div>
          </div>
        ` : `
          <div style="position: relative;">
            <img src="${player.avatar}" style="width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent-emerald);">
          </div>
        `}
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <h2 style="font-family: var(--font-display); font-size: 1.6rem; color: #fff;">${primaryDisplayName}</h2>
            <span class="pos-tag pos-${player.position.toLowerCase()}">${player.position}</span>
            ${canEditProfileAvatar ? `
              <button class="btn btn-secondary btn-sm" onclick="window.playersModule.quickUploadAvatar('${player.id}')" style="font-size: 0.75rem; padding: 0.25rem 0.6rem; margin-left: 0.5rem;">
                📷 ${isAdmin ? 'Đổi Ảnh' : 'Đổi Ảnh Của Tôi'}
              </button>
            ` : ''}
            ${isAdmin ? `
              <button class="btn btn-secondary btn-sm" onclick="window.playersModule.openProvisionModal('${player.id}')" style="font-size: 0.75rem; padding: 0.25rem 0.6rem; color: var(--accent-gold);">
                🔑 ${player.username ? 'Đổi Mật Khẩu TK' : 'Cấp Tài Khoản'}
              </button>
              <button class="btn btn-secondary btn-sm" onclick="window.playersModule.closeProfileModal(); window.playersModule.openPlayerModal('${player.id}')" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">
                ✏️ Sửa Thông Tin
              </button>
              <button class="btn btn-danger btn-sm" onclick="window.playersModule.closeProfileModal(); window.playersModule.deletePlayer('${player.id}')" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">
                🗑️ Xóa Cầu Thủ
              </button>
            ` : ''}
          </div>
          <p style="color: var(--accent-emerald); font-weight: 600; font-size: 1rem;">#${player.number} ${secondaryRealName ? `• Họ tên: "${secondaryRealName}"` : ''}</p>
          <p style="color: var(--text-dim); font-size: 0.85rem; margin-top: 0.25rem;">${window.escapeHtml(player.note || 'Chưa có ghi chú đặc biệt')}</p>
          ${player.bankAccountNumber ? `
            <div style="display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 6px; padding: 3px 8px; margin-top: 0.4rem; font-size: 0.8rem; color: var(--accent-gold);">
              💳 <strong>${window.escapeHtml(player.bankCode || 'NH')}:</strong> ${window.escapeHtml(player.bankAccountNumber)} ${player.bankAccountName ? `(${window.escapeHtml(player.bankAccountName)})` : ''}
            </div>
          ` : ''}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem;">
        <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: var(--radius-md); text-align: center; border: 1px solid var(--border-subtle);">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Điểm TB</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: ${this.getRatingColor(stats.avgRating)}; font-family: var(--font-display);">${stats.avgRating || '--'}</div>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: var(--radius-md); text-align: center; border: 1px solid var(--border-subtle);">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Số Trận</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #fff; font-family: var(--font-display);">${stats.matchesPlayed}</div>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: var(--radius-md); text-align: center; border: 1px solid var(--border-subtle);">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Bàn Thắng</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: var(--accent-ruby); font-family: var(--font-display);">${stats.totalGoals}</div>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: var(--radius-md); text-align: center; border: 1px solid var(--border-subtle);">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Kiến Tạo</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: var(--accent-cyan); font-family: var(--font-display);">${stats.totalAssists}</div>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: var(--radius-md); text-align: center; border: 1px solid var(--border-subtle);">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Cầu thủ hay nhất</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: var(--accent-gold); font-family: var(--font-display);">${stats.motmCount} 🏆</div>
        </div>
      </div>

      <h4 style="font-family: var(--font-display); font-size: 1.1rem; margin-bottom: 0.85rem; color: #fff;">Lịch Sử Chấm Điểm Từng Trận</h4>
      <div style="display: flex; flex-direction: column; gap: 0.6rem; max-height: 260px; overflow-y: auto;">
        ${stats.matchHistory.length > 0 ? stats.matchHistory.map(mh => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: rgba(0,0,0,0.25); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <div>
              <div style="font-weight: 700; color: #fff;">vs ${window.escapeHtml(mh.opponent)} <span style="font-size: 0.8rem; color: var(--text-dim);">(${mh.score})</span></div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">${window.escapeHtml(mh.date)} • ${window.escapeHtml(mh.note || 'Thi đấu tròn vai')}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="font-size: 0.85rem;">
                ${mh.goals > 0 ? `<span style="color: var(--accent-ruby); font-weight: 700;">⚽ ${mh.goals}</span> ` : ''}
                ${mh.assists > 0 ? `<span style="color: var(--accent-cyan); font-weight: 700;">👟 ${mh.assists}</span>` : ''}
              </div>
              <div style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 900; color: ${this.getRatingColor(mh.rating)};">
                ${mh.rating}/10
              </div>
            </div>
          </div>
        `).join('') : '<p style="color: var(--text-dim); text-align: center; padding: 1.5rem;">Cầu thủ này chưa tham gia trận đấu nào.</p>'}
      </div>
    `;

    modal.classList.add('active');
  },

  closeProfileModal() {
    const modal = document.getElementById('player-profile-modal');
    modal.classList.remove('active');
  }
};

if (window.TNT) {
  window.TNT.register('players', window.playersModule);
}

