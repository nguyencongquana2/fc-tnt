/**
 * FC TNT - Player Profile Hub Submodule (js/app/app-profile.js)
 * Quản lý Modal hồ sơ cá nhân, cập nhật avatar, thông số thống kê & liên kết ví số dư quỹ
 */

(function (root) {
  'use strict';

  function formatMoney(amount) {
    if (root.TNT && root.TNT.utils && typeof root.TNT.utils.formatMoney === 'function') {
      return root.TNT.utils.formatMoney(amount);
    }
    if (typeof root.formatMoney === 'function') {
      return root.formatMoney(amount);
    }
    const num = Number(amount) || 0;
    return num.toLocaleString('vi-VN') + 'đ';
  }

  const AppProfileMixin = {
    bindProfileEvents() {
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
    },

    openMyProfileModal() {
      const player = window.stateManager ? window.stateManager.currentPlayer : null;
      if (!player) {
        this.openPlayerLoginModal();
        return;
      }

      const modal = document.getElementById('my-profile-modal');
      if (!modal) return;

      // Lấy thông số từ statsMap
      const statsList = window.stateManager && typeof window.stateManager.getPlayerOverallStats === 'function'
        ? window.stateManager.getPlayerOverallStats()
        : [];
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
      
      let curFundBal = Number(player.fundBalance) || 0;
      if (window.stateManager && window.stateManager.data && Array.isArray(window.stateManager.data.players)) {
        const liveP = window.stateManager.data.players.find(p => p.id === player.id);
        if (liveP && liveP.fundBalance !== undefined) {
          curFundBal = Number(liveP.fundBalance) || 0;
        }
      }

      if (fundBalEl) {
        const formatted = formatMoney(curFundBal);
        fundBalEl.innerText = (curFundBal >= 0 ? '+' : '') + formatted;
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
    }
  };

  root.TNTAppMixins = root.TNTAppMixins || {};
  root.TNTAppMixins.profile = AppProfileMixin;

})(typeof window !== 'undefined' ? window : this);
