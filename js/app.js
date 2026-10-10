/**
 * Main Application Orchestrator - FC TNT
 */

window.appModule = {
  currentTab: 'dashboard',

  init() {
    this.bindNavigation();
    this.bindBackupRestore();
    this.bindTeamSettings();
    this.bindAuth();
    this.updateAuthUI();
    this.renderDashboard();

    // Initial render of sub-modules
    if (window.playersModule) window.playersModule.init();
    if (window.matchesModule) window.matchesModule.init();
    if (window.awardsModule) window.awardsModule.init();
    if (window.posterModule) window.posterModule.init();
    if (window.momentsModule) window.momentsModule.init();
    if (window.weatherModule) window.weatherModule.init();
    if (window.tacticsModule) window.tacticsModule.init();

    // Re-render when state updates
    window.stateManager.subscribe(() => {
      this.updateAuthUI();
      this.renderDashboard();
      if (window.playersModule) window.playersModule.renderPlayers();
      if (window.matchesModule) window.matchesModule.renderMatches();
      if (window.awardsModule) window.awardsModule.renderAwards();
      if (window.momentsModule) window.momentsModule.renderMoments();
      if (window.weatherModule) window.weatherModule.renderDashboardWidget();
      if (window.tacticsModule) window.tacticsModule.renderPlaybookList();
    });
  },

  bindAuth() {
    const loginBtn = document.getElementById('auth-login-btn');
    const playerLoginBtn = document.getElementById('auth-player-login-btn');
    const logoutBtn = document.getElementById('auth-logout-btn');
    const pinForm = document.getElementById('admin-pin-form');
    const togglePinBtn = document.getElementById('toggle-pin-visibility-btn');
    const pinInput = document.getElementById('admin-pin-input');

    // Nút Đăng Nhập mở Modal Đăng Nhập Hợp Nhất (Cầu thủ ở trên + Mã PIN ở dưới)
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.openPlayerLoginModal());
    }

    if (playerLoginBtn) {
      playerLoginBtn.addEventListener('click', () => this.openPlayerLoginModal());
    }

    // Nút Sổ Quỹ Đội chuyển sang Tab Sổ Quỹ Đội
    const fundsBtn = document.getElementById('btn-open-funds');
    if (fundsBtn) {
      fundsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab('funds');
      });
    }

    // Xử lý mã PIN Quản trị & Quỹ Đội trong Modal Đăng Nhập Hợp Nhất
    const mgmtPinInput = document.getElementById('management-pin-input');
    const toggleMgmtPinBtn = document.getElementById('toggle-management-pin-btn');
    const submitMgmtPinBtn = document.getElementById('submit-management-pin-btn');
    const mgmtPinError = document.getElementById('management-pin-error');

    if (toggleMgmtPinBtn && mgmtPinInput) {
      toggleMgmtPinBtn.addEventListener('click', () => {
        if (mgmtPinInput.type === 'password') {
          mgmtPinInput.type = 'text';
          toggleMgmtPinBtn.innerText = '🙈';
        } else {
          mgmtPinInput.type = 'password';
          toggleMgmtPinBtn.innerText = '👁️';
        }
      });
    }

    const handleMgmtPinSubmit = async () => {
      if (!mgmtPinInput) return;
      const pin = mgmtPinInput.value.trim();
      if (mgmtPinError) mgmtPinError.innerText = '';
      if (!pin) {
        if (mgmtPinError) mgmtPinError.innerText = 'Vui lòng nhập mã PIN!';
        mgmtPinInput.focus();
        return;
      }

      if (submitMgmtPinBtn) {
        submitMgmtPinBtn.disabled = true;
        submitMgmtPinBtn.innerText = '⏳ Đang kiểm tra...';
      }

      const res = await window.stateManager.loginManagementPin(pin);

      if (submitMgmtPinBtn) {
        submitMgmtPinBtn.disabled = false;
        submitMgmtPinBtn.innerText = '🔓 Mở Khóa';
      }

      if (res.success) {
        this.closePlayerLoginModal();
        this.updateAuthUI();
        if (res.role === 'admin') {
          window.showToast('👑 Đăng nhập Quản trị viên thành công! Bạn có toàn quyền quản lý đội bóng.');
        } else if (res.role === 'treasurer') {
          window.showToast('💰 Đăng nhập Thủ Quỹ thành công! Đã mở quyền quản lý quỹ đội.');
          this.switchTab('funds');
        }
        if (window.matchesModule) window.matchesModule.renderMatches();
        if (window.playersModule) window.playersModule.renderPlayers();
      } else {
        if (mgmtPinError) mgmtPinError.innerText = res.error || 'Mã PIN không đúng!';
        mgmtPinInput.focus();
      }
    };

    if (submitMgmtPinBtn) {
      submitMgmtPinBtn.addEventListener('click', handleMgmtPinSubmit);
    }
    if (mgmtPinInput) {
      mgmtPinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleMgmtPinSubmit();
        }
      });
    }

    // Logout Button (quản lý cả Admin, Thủ Quỹ lẫn Cầu thủ)
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (window.stateManager.isAdmin) {
          window.stateManager.logoutAdmin();
          window.showToast('🚪 Đã đăng xuất quyền Quản trị viên.', 'info');
        } else if (window.stateManager.isTreasurer) {
          window.stateManager.logoutTreasurer();
          window.showToast('🚪 Đã đăng xuất quyền Thủ Quỹ.', 'info');
        } else if (window.stateManager.isPlayerLoggedIn()) {
          this.handlePlayerLogout();
        }
        this.updateAuthUI();
        if (window.matchesModule) window.matchesModule.renderMatches();
        if (window.playersModule) window.playersModule.renderPlayers();
      });
    }

    // Toggle PIN visibility
    if (togglePinBtn && pinInput) {
      togglePinBtn.addEventListener('click', () => {
        if (pinInput.type === 'password') {
          pinInput.type = 'text';
          togglePinBtn.innerText = '🙈';
        } else {
          pinInput.type = 'password';
          togglePinBtn.innerText = '👁️';
        }
      });
    }

    // Admin PIN Form submit
    if (pinForm) {
      pinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pin = pinInput.value.trim();
        const errorEl = document.getElementById('admin-pin-error');
        if (errorEl) errorEl.innerText = '';

        if (!pin) {
          if (errorEl) errorEl.innerText = 'Vui lòng nhập mã PIN!';
          return;
        }

        const submitBtn = pinForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = '⏳ Đang xác thực...';
        }

        const res = await window.stateManager.loginAdmin(pin);

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = '🔑 Xác Nhận Mở Khóa';
        }

        if (res.success) {
          this.closeAdminModal();
          window.showToast('🎉 Đăng nhập Quản trị viên thành công! Bạn có toàn quyền quản lý đội bóng.');
          this.updateAuthUI();
          if (window.matchesModule) window.matchesModule.renderMatches();
          if (window.playersModule) window.playersModule.renderPlayers();
        } else {
          if (errorEl) errorEl.innerText = res.error || 'Mã PIN không đúng!';
          pinInput.focus();
        }
      });
    }

    // Toggle Player Password visibility
    const togglePlayerPassBtn = document.getElementById('toggle-player-pass-btn');
    const playerPassInput = document.getElementById('player-login-pass');
    if (togglePlayerPassBtn && playerPassInput) {
      togglePlayerPassBtn.addEventListener('click', () => {
        if (playerPassInput.type === 'password') {
          playerPassInput.type = 'text';
          togglePlayerPassBtn.innerText = '🙈';
        } else {
          playerPassInput.type = 'password';
          togglePlayerPassBtn.innerText = '👁️';
        }
      });
    }

    // Player Login Form Submit
    const playerLoginForm = document.getElementById('player-login-form');
    if (playerLoginForm) {
      playerLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userInput = document.getElementById('player-login-user');
        const passInput = document.getElementById('player-login-pass');
        const rememberInput = document.getElementById('player-login-remember');
        const errorEl = document.getElementById('player-login-error');
        if (errorEl) errorEl.innerText = '';

        const username = userInput.value.trim();
        const password = passInput.value;
        const remember = rememberInput ? rememberInput.checked : true;

        if (!username || !password) {
          if (errorEl) errorEl.innerText = 'Vui lòng nhập tên đăng nhập và mật khẩu!';
          return;
        }

        const submitBtn = playerLoginForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = '⏳ Đang vào sân...';
        }

        const res = await window.stateManager.loginPlayer(username, password, remember);

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = '⚽ Vào Sân Ngay';
        }

        if (res.success) {
          this.closePlayerLoginModal();
          this.updateAuthUI();

          if (res.mustChangePassword) {
            window.showToast('⚠️ Mật khẩu của bạn là mật khẩu tạm thời. Vui lòng đổi mật khẩu mới!', 'warning');
            this.openPlayerChangePasswordModal(true);
          } else {
            window.showToast('🎉 ' + (res.message || 'Đăng nhập thành công!'));
          }

          if (window.playersModule) window.playersModule.renderPlayers();
          if (window.matchesModule) window.matchesModule.renderMatches();
        } else {
          if (errorEl) errorEl.innerText = res.error || 'Đăng nhập thất bại!';
          passInput.focus();
        }
      });
    }

    // Avatar upload trong My Profile
    const myProfileAvatarFile = document.getElementById('my-profile-avatar-file');
    if (myProfileAvatarFile) {
      myProfileAvatarFile.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
          window.showToast('Vui lòng chọn ảnh dung lượng dưới 10MB!', 'warning');
          myProfileAvatarFile.value = '';
          return;
        }

        try {
          let base64 = '';
          if (window.playersModule && typeof window.playersModule.processImageUpload === 'function') {
            base64 = await window.playersModule.processImageUpload(file);
          } else {
            base64 = await new Promise((resolve, reject) => {
              const r = new FileReader();
              r.onload = ev => resolve(ev.target.result);
              r.onerror = reject;
              r.readAsDataURL(file);
            });
          }
          const prev = document.getElementById('my-profile-avatar-preview');
          const inp = document.getElementById('my-profile-avatar-input');
          if (prev) prev.src = base64;
          if (inp) inp.value = base64;
          window.showToast('📸 Đã nạp ảnh đại diện mới! Hãy bấm "Lưu Hồ Sơ" để hoàn tất.');
        } catch (err) {
          console.warn('[Profile] Avatar upload failed:', err.message);
          window.showToast('Lỗi khi đọc file ảnh!', 'error');
        }
      });
    }

    // My Profile Form Submit
    const myProfileForm = document.getElementById('my-profile-edit-form');
    if (myProfileForm) {
      myProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('my-profile-error');
        if (errorEl) errorEl.innerText = '';

        const updates = {
          nickname: document.getElementById('my-profile-nickname')?.value || '',
          number: parseInt(document.getElementById('my-profile-number')?.value) || 0,
          position: document.getElementById('my-profile-position')?.value || 'FW',
          preferredFoot: document.getElementById('my-profile-foot')?.value || 'R',
          height: parseInt(document.getElementById('my-profile-height')?.value) || 0,
          weight: parseInt(document.getElementById('my-profile-weight')?.value) || 0,
          phone: document.getElementById('my-profile-phone')?.value || '',
          bio: document.getElementById('my-profile-bio')?.value || '',
          bankCode: document.getElementById('my-profile-bank-code')?.value || '',
          bankAccountNumber: document.getElementById('my-profile-bank-acc-num')?.value || '',
          bankAccountName: document.getElementById('my-profile-bank-acc-name')?.value || ''
        };

        const avatarInput = document.getElementById('my-profile-avatar-input');
        if (avatarInput && avatarInput.value) {
          updates.avatar = avatarInput.value;
        }

        const saveBtn = document.getElementById('my-profile-save-btn');
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.innerText = '⏳ Đang lưu...';
        }

        const res = await window.stateManager.updatePlayerProfile(updates);

        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerText = '💾 Lưu Hồ Sơ';
        }

        if (res.success) {
          window.showToast('✅ Đã lưu cập nhật thông tin cá nhân!');
          this.closeMyProfileModal();
          this.updateAuthUI();
          if (window.playersModule) window.playersModule.renderPlayers();
        } else {
          if (errorEl) errorEl.innerText = res.error || 'Cập nhật thất bại!';
        }
      });
    }

    // Player Change Password Form Submit
    const changePassForm = document.getElementById('player-change-password-form');
    if (changePassForm) {
      changePassForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currPass = document.getElementById('player-current-pass')?.value || '';
        const newPass = document.getElementById('player-new-pass')?.value || '';
        const confPass = document.getElementById('player-confirm-pass')?.value || '';
        const errorEl = document.getElementById('player-change-pass-error');
        if (errorEl) errorEl.innerText = '';

        if (newPass.length < 6) {
          if (errorEl) errorEl.innerText = 'Mật khẩu mới phải có tối thiểu 6 ký tự!';
          return;
        }

        if (newPass !== confPass) {
          if (errorEl) errorEl.innerText = 'Xác nhận mật khẩu không khớp!';
          return;
        }

        const submitBtn = document.getElementById('player-change-pass-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = '⏳ Đang đổi...';
        }

        const res = await window.stateManager.changePlayerPassword(currPass, newPass);

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = '✓ Cập Nhật Mật Khẩu';
        }

        if (res.success) {
          window.showToast('🎉 Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới nhé.');
          this.closePlayerChangePasswordModal();
          this.updateAuthUI();
        } else {
          if (errorEl) errorEl.innerText = res.error || 'Đổi mật khẩu thất bại!';
        }
      });
    }
  },

  openAdminModal() {
    const modal = document.getElementById('admin-pin-modal');
    const pinInput = document.getElementById('admin-pin-input');
    const errorEl = document.getElementById('admin-pin-error');
    if (errorEl) errorEl.innerText = '';
    if (pinInput) {
      pinInput.value = '';
      pinInput.type = 'password';
    }
    const toggleBtn = document.getElementById('toggle-pin-visibility-btn');
    if (toggleBtn) toggleBtn.innerText = '👁️';

    if (modal) {
      modal.classList.add('active');
      setTimeout(() => pinInput && pinInput.focus(), 150);
    }
  },

  closeAdminModal() {
    const modal = document.getElementById('admin-pin-modal');
    if (modal) modal.classList.remove('active');
  },

  openPlayerLoginModal() {
    const modal = document.getElementById('player-login-modal');
    const userInput = document.getElementById('player-login-user');
    const passInput = document.getElementById('player-login-pass');
    const errorEl = document.getElementById('player-login-error');
    if (errorEl) errorEl.innerText = '';
    if (userInput) userInput.value = '';
    if (passInput) {
      passInput.value = '';
      passInput.type = 'password';
    }
    const toggleBtn = document.getElementById('toggle-player-pass-btn');
    if (toggleBtn) toggleBtn.innerText = '👁️';

    if (modal) {
      modal.classList.add('active');
      setTimeout(() => userInput && userInput.focus(), 150);
    }
  },

  closePlayerLoginModal() {
    const modal = document.getElementById('player-login-modal');
    if (modal) modal.classList.remove('active');
  },

  openMyProfileModal() {
    const player = window.stateManager.currentPlayer;
    if (!player) {
      this.openPlayerLoginModal();
      return;
    }

    const modal = document.getElementById('my-profile-modal');
    if (!modal) return;

    // Lấy thông số từ statsMap
    const statsList = window.stateManager.getPlayerOverallStats();
    const stats = statsList.find(s => s.player.id === player.id) || {
      matchesPlayed: 0,
      avgRating: 0,
      totalGoals: 0,
      totalAssists: 0
    };

    // Header info
    const prev = document.getElementById('my-profile-avatar-preview');
    if (prev) prev.src = player.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
    const avatarInp = document.getElementById('my-profile-avatar-input');
    if (avatarInp) avatarInp.value = '';

    const nameEl = document.getElementById('my-profile-display-name');
    if (nameEl) nameEl.innerText = player.nickname || player.name;

    const roleBadge = document.getElementById('my-profile-role-badge');
    if (roleBadge) {
      roleBadge.className = 'pos-tag pos-' + (player.position || 'fw').toLowerCase();
      roleBadge.innerText = player.position || 'FW';
    }

    const userTag = document.getElementById('my-profile-username-tag');
    if (userTag) userTag.innerText = player.username ? ('@' + player.username) : '@chưa_cấp';

    const subTitle = document.getElementById('my-profile-sub-title');
    if (subTitle) subTitle.innerText = 'Họ tên: ' + player.name + ' • Áo số #' + (player.number !== undefined ? player.number : '-');

    // Stats
    const rEl = document.getElementById('my-profile-stat-rating');
    if (rEl) rEl.innerText = stats.matchesPlayed > 0 ? stats.avgRating : '--';
    const mEl = document.getElementById('my-profile-stat-matches');
    if (mEl) mEl.innerText = stats.matchesPlayed;
    const gEl = document.getElementById('my-profile-stat-goals');
    if (gEl) gEl.innerText = stats.totalGoals;
    const aEl = document.getElementById('my-profile-stat-assists');
    if (aEl) aEl.innerText = stats.totalAssists;

    // Fill form
    const nickInp = document.getElementById('my-profile-nickname');
    if (nickInp) nickInp.value = player.nickname || '';
    const numInp = document.getElementById('my-profile-number');
    if (numInp) numInp.value = player.number !== undefined ? player.number : '';
    const posInp = document.getElementById('my-profile-position');
    if (posInp) posInp.value = player.position || 'FW';
    const footInp = document.getElementById('my-profile-foot');
    if (footInp) footInp.value = player.preferredFoot || 'R';
    const hInp = document.getElementById('my-profile-height');
    if (hInp) hInp.value = player.height || '';
    const wInp = document.getElementById('my-profile-weight');
    if (wInp) wInp.value = player.weight || '';
    const pInp = document.getElementById('my-profile-phone');
    if (pInp) pInp.value = player.phone || '';
    const bioInp = document.getElementById('my-profile-bio');
    if (bioInp) bioInp.value = player.bio || '';

    // Bank
    const bCode = document.getElementById('my-profile-bank-code');
    if (bCode) bCode.value = player.bankCode || '';
    const bNum = document.getElementById('my-profile-bank-acc-num');
    if (bNum) bNum.value = player.bankAccountNumber || '';
    const bName = document.getElementById('my-profile-bank-acc-name');
    if (bName) bName.value = player.bankAccountName || '';

    // Cập nhật số dư Ví Quỹ Thành Viên & Lịch Sử Giao Dịch
    const fundBalEl = document.getElementById('my-profile-fund-balance');
    const fundStatusEl = document.getElementById('my-profile-fund-status');
    const fundHistBtn = document.getElementById('my-profile-view-fund-history-btn');
    
    // Lấy số dư mới nhất từ players trong state hoặc currentPlayer
    let curFundBal = Number(player.fundBalance) || 0;
    if (window.stateManager && window.stateManager.data && Array.isArray(window.stateManager.data.players)) {
      const liveP = window.stateManager.data.players.find(p => p.id === player.id);
      if (liveP && liveP.fundBalance !== undefined) {
        curFundBal = Number(liveP.fundBalance) || 0;
      }
    }

    if (fundBalEl) {
      fundBalEl.innerText = (curFundBal >= 0 ? '+' : '') + curFundBal.toLocaleString('vi-VN') + 'đ';
      fundBalEl.style.color = curFundBal >= 0 ? 'var(--accent-emerald)' : '#ef4444';
    }

    if (fundStatusEl) {
      if (curFundBal < 0) {
        fundStatusEl.className = 'fund-status-badge badge-red';
        fundStatusEl.innerText = '🔴 Đang nợ quỹ';
      } else if (curFundBal <= 50000) {
        fundStatusEl.className = 'fund-status-badge badge-yellow';
        fundStatusEl.innerText = '🟡 Sắp hết (< 50k)';
      } else {
        fundStatusEl.className = 'fund-status-badge badge-green';
        fundStatusEl.innerText = '🟢 Dồi dào';
      }
    }

    if (fundHistBtn) {
      fundHistBtn.onclick = () => {
        if (window.TNT && window.TNT.funds && typeof window.TNT.funds.openHistoryModal === 'function') {
          window.TNT.funds.openHistoryModal(player.id);
        }
      };
    }

    const err = document.getElementById('my-profile-error');
    if (err) err.innerText = '';

    modal.classList.add('active');
  },

  closeMyProfileModal() {
    const modal = document.getElementById('my-profile-modal');
    if (modal) modal.classList.remove('active');
  },

  openPlayerChangePasswordModal(isFirstTime = false) {
    const modal = document.getElementById('player-change-password-modal');
    const alertBox = document.getElementById('must-change-password-alert');
    const currPass = document.getElementById('player-current-pass');
    const newPass = document.getElementById('player-new-pass');
    const confPass = document.getElementById('player-confirm-pass');
    const err = document.getElementById('player-change-pass-error');

    if (err) err.innerText = '';
    if (currPass) currPass.value = '';
    if (newPass) newPass.value = '';
    if (confPass) confPass.value = '';

    if (alertBox) {
      alertBox.style.display = isFirstTime ? 'block' : 'none';
    }

    if (modal) {
      modal.classList.add('active');
      setTimeout(() => currPass && currPass.focus(), 150);
    }
  },

  closePlayerChangePasswordModal() {
    const modal = document.getElementById('player-change-password-modal');
    if (modal) modal.classList.remove('active');
  },

  handlePlayerLogout() {
    window.stateManager.logoutPlayer();
    window.showToast('🚪 Đã đăng xuất khỏi tài khoản thành viên.', 'info');
    this.closeMyProfileModal();
    this.updateAuthUI();
    if (window.playersModule) window.playersModule.renderPlayers();
  },

  updateAuthUI() {
    const isAdmin = window.stateManager.isAdmin;
    const isTreasurer = window.stateManager.isTreasurer;
    const isPlayer = window.stateManager.isPlayerLoggedIn();
    const currentPlayer = window.stateManager.currentPlayer;

    const badge = document.getElementById('auth-role-badge');
    const loginBtn = document.getElementById('auth-login-btn');
    const playerLoginBtn = document.getElementById('auth-player-login-btn');
    const fundsBtn = document.getElementById('btn-open-funds');
    const logoutBtn = document.getElementById('auth-logout-btn');

    const isLoggedIn = isAdmin || isTreasurer || isPlayer;

    if (badge) {
      if (isAdmin) {
        badge.style.display = 'inline-flex';
        badge.className = 'auth-role-badge admin';
        badge.style.background = '';
        badge.style.color = '';
        badge.style.fontWeight = '';
        badge.innerHTML = '👑 <span>Quản Trị</span>';
        badge.onclick = null;
        badge.title = 'Bạn đang đăng nhập với quyền Quản trị viên FC TNT';
      } else if (isTreasurer) {
        // Thủ Quỹ: Ẩn role badge để hiển thị trực tiếp nút chức năng "Sổ Quỹ Đội", tránh bị lặp lại 2 nút cam cùng lúc
        badge.style.display = 'none';
        badge.onclick = null;
      } else if (isPlayer && currentPlayer) {
        badge.style.display = 'inline-flex';
        badge.className = 'auth-role-badge player';
        badge.style.background = '';
        badge.style.color = '';
        badge.style.fontWeight = '';
        const name = window.escapeHtml(currentPlayer.nickname || currentPlayer.name);
        badge.innerHTML = '<img src="' + (currentPlayer.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80') + '" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover; border: 1px solid #10b981;"> <span>' + name + '</span>';
        badge.onclick = () => this.openMyProfileModal();
        badge.title = 'Bấm để xem & chỉnh sửa hồ sơ của bạn';
      } else {
        badge.style.display = 'inline-flex';
        badge.className = 'auth-role-badge viewer';
        badge.style.background = '';
        badge.style.color = '';
        badge.style.fontWeight = '';
        badge.innerHTML = '👁️ <span>Khách</span>';
        badge.onclick = null;
        badge.title = 'Chế độ chỉ xem cho khách';
      }
    }

    if (loginBtn) {
      loginBtn.style.display = isLoggedIn ? 'none' : 'inline-flex';
    }

    if (playerLoginBtn) {
      playerLoginBtn.style.display = 'none';
    }

    // Nút Sổ Quỹ Đội: CHỈ hiển thị riêng cho Thủ Quỹ để thực hiện nghiệp vụ Quỹ Đội
    if (fundsBtn) {
      fundsBtn.style.display = isTreasurer ? 'inline-flex' : 'none';
    }

    if (logoutBtn) {
      logoutBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
    }

    // Show or hide admin-only elements (Xuất / Nhập file dự phòng)
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = isAdmin ? '' : 'none';
    });
  },
  bindNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });
  },

  switchTab(tabName) {
    this.currentTab = tabName;

    // Update Tab Buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Cập nhật trạng thái active cho nút Sổ Quỹ Đội trên thanh điều hướng
    const fundsNavBtn = document.getElementById('btn-open-funds');
    if (fundsNavBtn) {
      if (tabName === 'funds') {
        fundsNavBtn.classList.add('active');
        fundsNavBtn.style.boxShadow = '0 0 16px rgba(245, 158, 11, 0.6)';
      } else {
        fundsNavBtn.classList.remove('active');
        fundsNavBtn.style.boxShadow = '';
      }
    }

    // Update Tab Content Panels
    document.querySelectorAll('.tab-content').forEach(panel => {
      if (panel.id === `tab-${tabName}`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // Refresh view data when switching
    if (tabName === 'dashboard') this.renderDashboard();
    if (tabName === 'awards' && window.awardsModule) window.awardsModule.renderAwards();
    if (tabName === 'matches' && window.matchesModule) window.matchesModule.renderMatches();
    if (tabName === 'players' && window.playersModule) window.playersModule.renderPlayers();
    if (tabName === 'moments' && window.momentsModule) window.momentsModule.renderMoments();
    if (tabName === 'tactics' && window.tacticsModule) {
      window.tacticsModule.renderPlaybookList();
      window.tacticsModule.initCanvas();
    }
    if (tabName === 'weather' && window.weatherModule) {
      window.weatherModule.render7DayCards();
      window.weatherModule.renderDayDetail();
      window.weatherModule.renderAiChat();
    }
    if (tabName === 'funds' && window.TNT && window.TNT.funds && typeof window.TNT.funds.renderFundsPage === 'function') {
      window.TNT.funds.renderFundsPage();
    }

    // Bắn sự kiện chuyển tab cho hệ thống hiệu ứng & animation
    window.dispatchEvent(new CustomEvent('tabChanged', { detail: { tab: tabName } }));
    if (window.TNT && window.TNT.events) {
      window.TNT.events.emit('tab:changed', tabName);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  renderDashboard() {
    const overview = window.stateManager.getTeamOverview();
    const leaderboards = window.stateManager.getLeaderboards();

    if (window.weatherModule) {
      window.weatherModule.renderDashboardWidget();
    }

    // Update Team Hero Info
    const heroName = document.getElementById('hero-team-name-text');
    const heroSlogan = document.getElementById('hero-team-slogan-text');
    if (heroName) heroName.innerText = overview.teamName;
    if (heroSlogan) heroSlogan.innerText = `"${overview.slogan}"`;

    // Update Stat Cards
    const totalMatchesEl = document.getElementById('dash-total-matches');
    const winRateEl = document.getElementById('dash-win-rate');
    const totalGoalsEl = document.getElementById('dash-total-goals');
    const totalPlayersEl = document.getElementById('dash-total-players');

    if (totalMatchesEl) totalMatchesEl.innerText = overview.totalMatches;
    if (winRateEl) winRateEl.innerText = `${overview.winRate}% (${overview.wins}T-${overview.draws}H-${overview.losses}B)`;
    if (totalGoalsEl) totalGoalsEl.innerText = `${overview.goalsFor} ⚽`;
    if (totalPlayersEl) totalPlayersEl.innerText = overview.totalPlayers;

    // Update Dashboard Mini Spotlight (Top MVP, Top Scorer, Top Assist)
    const mvpSpotlight = document.getElementById('dash-mvp-spotlight');
    const scorerSpotlight = document.getElementById('dash-scorer-spotlight');
    const assistSpotlight = document.getElementById('dash-assist-spotlight');

    const topMVP = leaderboards.topRatings[0];
    const topScorer = leaderboards.topScorers[0];
    const topAssist = leaderboards.topAssists[0];

    if (mvpSpotlight && topMVP) {
      mvpSpotlight.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <img src="${topMVP.player.avatar}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-gold);">
          <div>
            <div style="font-weight: 800; color: #fff;">${topMVP.player.name}</div>
            <div style="font-size: 0.8rem; color: var(--accent-gold);">Điểm TB: ${topMVP.avgRating}/10 (${topMVP.matchesPlayed} trận)</div>
          </div>
        </div>
      `;
    }

    if (scorerSpotlight && topScorer) {
      scorerSpotlight.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <img src="${topScorer.player.avatar}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-ruby);">
          <div>
            <div style="font-weight: 800; color: #fff;">${topScorer.player.name}</div>
            <div style="font-size: 0.8rem; color: var(--accent-ruby);">${topScorer.totalGoals} bàn thắng</div>
          </div>
        </div>
      `;
    }

    if (assistSpotlight && topAssist) {
      assistSpotlight.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <img src="${topAssist.player.avatar}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-cyan);">
          <div>
            <div style="font-weight: 800; color: #fff;">${topAssist.player.name}</div>
            <div style="font-size: 0.8rem; color: var(--accent-cyan);">${topAssist.totalAssists} kiến tạo</div>
          </div>
        </div>
      `;
    }

    // Render Recent Matches preview on dashboard
    const recentMatchesContainer = document.getElementById('dash-recent-matches');
    if (recentMatchesContainer) {
      const recentMatches = window.stateManager.getMatches().slice(0, 2);
      if (recentMatches.length === 0) {
        recentMatchesContainer.innerHTML = '<p style="color: var(--text-dim);">Chưa có trận đấu nào gần đây.</p>';
      } else {
        recentMatchesContainer.innerHTML = recentMatches.map(m => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem; background: rgba(0,0,0,0.25); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); cursor: pointer;" onclick="window.matchesModule.openMatchDetailModal('${m.id}')">
            <div>
              <div style="font-weight: 700; color: #fff;">vs ${m.opponent}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">${m.date} • ${m.venue}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 900; color: ${m.homeScore > m.awayScore ? 'var(--accent-emerald)' : m.homeScore === m.awayScore ? 'var(--accent-gold)' : 'var(--accent-ruby)'};">
                ${m.homeScore} - ${m.awayScore}
              </span>
              <span class="btn btn-secondary btn-sm">Chấm điểm →</span>
            </div>
          </div>
        `).join('');
      }
    }
  },

  bindBackupRestore() {
    // Export Data JSON
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const jsonStr = window.stateManager.exportDataJSON();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const teamName = (window.stateManager.data.teamInfo?.name || 'FC').replace(/\s+/g, '_');
        a.href = url;
        a.download = `FC_TNT_${teamName}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        window.showToast('📁 Đã xuất file sao lưu dữ liệu thành công!');
      });
    }

    // Import Data JSON
    const importInput = document.getElementById('import-file-input');
    const importBtn = document.getElementById('import-data-btn');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const res = window.stateManager.importDataJSON(event.target.result);
          if (res.success) {
            window.showToast('✅ Đã khôi phục dữ liệu thành công!');
            setTimeout(() => location.reload(), 800);
          } else {
            window.showToast(res.error, 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    // Reset Sample Data
    const resetBtn = document.getElementById('reset-sample-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn nạp lại dữ liệu mẫu của đội bóng (Dữ liệu hiện tại sẽ được thay thế)?')) {
          window.stateManager.resetToSampleData();
          window.showToast('🔄 Đã nạp lại dữ liệu mẫu!');
          setTimeout(() => location.reload(), 600);
        }
      });
    }
  },

  bindTeamSettings() {
    const editTeamBtn = document.getElementById('edit-team-btn');
    const teamModal = document.getElementById('team-modal');
    const teamForm = document.getElementById('team-form');

    if (editTeamBtn && teamModal) {
      editTeamBtn.addEventListener('click', () => {
        if (!window.stateManager.isAdmin) {
          window.showToast('Chỉ Quản trị viên mới có quyền đổi thông tin đội!', 'error');
          return;
        }
        const info = window.stateManager.data.teamInfo;
        document.getElementById('team-name-input').value = info.name || '';
        document.getElementById('team-slogan-input').value = info.slogan || '';
        teamModal.classList.add('active');
      });
    }

    if (teamForm) {
      teamForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!window.stateManager.isAdmin) {
          window.showToast('Chỉ Quản trị viên mới có quyền đổi thông tin đội!', 'error');
          return;
        }
        const name = document.getElementById('team-name-input').value.trim();
        const slogan = document.getElementById('team-slogan-input').value.trim();
        if (!name) {
          window.showToast('Vui lòng nhập tên đội bóng!', 'error');
          return;
        }

        window.stateManager.updateTeamInfo({ name, slogan });
        window.showToast('Đã lưu thông tin đội bóng!');
        document.getElementById('team-modal').classList.remove('active');
        this.renderDashboard();
      });
    }
  }
};

// Global Toast Notification System
window.showToast = function (msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'error') {
    toast.style.borderColor = '#ef4444';
    toast.innerHTML = `⚠️ <span>${msg}</span>`;
  } else if (type === 'info') {
    toast.style.borderColor = '#06b6d4';
    toast.innerHTML = `ℹ️ <span>${msg}</span>`;
  } else {
    toast.innerHTML = `✨ <span>${msg}</span>`;
  }

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
};

// Start app on DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
  if (window.TNT) {
    window.TNT.register('app', window.appModule);
    window.TNT.register('ui', {
      showToast: window.showToast,
      escapeHtml: window.escapeHtml
    });
  }
  window.appModule.init();
});
