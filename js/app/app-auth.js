/**
 * FC TNT - Application Authentication & Role State Submodule (js/app/app-auth.js)
 * Quản lý sự kiện đăng nhập Admin PIN, Thủ Quỹ, Cầu Thủ, đổi mật khẩu & cập nhật thanh điều hướng
 */

(function (root) {
  'use strict';

  const AppAuthMixin = {
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
      if (window.stateManager && typeof window.stateManager.logoutPlayer === 'function') {
        window.stateManager.logoutPlayer();
      }
      window.showToast('🚪 Đã đăng xuất khỏi tài khoản thành viên.', 'info');
      this.closeMyProfileModal();
      this.updateAuthUI();
      if (window.playersModule) window.playersModule.renderPlayers();
    },

    updateAuthUI() {
      const isAdmin = window.stateManager ? window.stateManager.isAdmin : false;
      const isTreasurer = window.stateManager ? window.stateManager.isTreasurer : false;
      const isPlayer = window.stateManager && typeof window.stateManager.isPlayerLoggedIn === 'function'
        ? window.stateManager.isPlayerLoggedIn()
        : false;
      const currentPlayer = window.stateManager ? window.stateManager.currentPlayer : null;

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

      if (fundsBtn) {
        fundsBtn.style.display = isTreasurer ? 'inline-flex' : 'none';
      }

      if (logoutBtn) {
        logoutBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
      }

      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin ? '' : 'none';
      });
    }
  };

  root.TNTAppMixins = root.TNTAppMixins || {};
  root.TNTAppMixins.auth = AppAuthMixin;

})(typeof window !== 'undefined' ? window : this);
