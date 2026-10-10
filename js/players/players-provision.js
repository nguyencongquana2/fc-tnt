/**
 * FC TNT - Players Provision Submodule (js/players/players-provision.js)
 * Quản lý Modal Cấp Tài Khoản & Đặt Lại Mật Khẩu Thành Viên (#admin-provision-modal)
 * Hỗ trợ tự sinh mật khẩu, gợi ý username và sao chép văn bản gửi Zalo
 */

(function (root) {
  'use strict';

  function showToast(msg, type = 'info') {
    if (root.TNT && root.TNT.ui && typeof root.TNT.ui.showToast === 'function') {
      root.TNT.ui.showToast(msg, type);
    } else if (typeof root.showToast === 'function') {
      root.showToast(msg, type);
    }
  }

  function escapeHtml(str) {
    if (root.TNT && root.TNT.utils && typeof root.TNT.utils.escapeHtml === 'function') {
      return root.TNT.utils.escapeHtml(str);
    }
    if (typeof root.escapeHtml === 'function') {
      return root.escapeHtml(str);
    }
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const PlayersProvisionMixin = {
    bindProvisionEvents() {
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

          const player = window.stateManager ? window.stateManager.getPlayerById(playerId) : null;
          const hasAccount = Boolean(player && player.username && player.accountStatus !== 'unprovisioned');
          const hasCustomPassword = Boolean(hasAccount && player.mustChangePassword === false);

          // Cảnh báo xác nhận khi đặt lại mật khẩu cho tài khoản đã có mật khẩu riêng
          if (hasCustomPassword) {
            const playerName = player.name || 'Cầu thủ';
            const confirmMsg = `⚠️ CẦU THỦ "${playerName}" ĐÃ ĐỔI MẬT KHẨU CÁ NHÂN!\n\nNếu bạn tiếp tục, mật khẩu riêng hiện tại của cầu thủ sẽ bị ĐẶT LẠI thành mật khẩu tạm thời mới.\n\nCầu thủ sẽ phải đăng nhập bằng mật khẩu tạm này và đổi lại mật khẩu mới khi vào hệ thống.\n\nBạn có chắc chắn muốn đặt lại mật khẩu không?`;
            if (!confirm(confirmMsg)) {
              return;
            }
          }

          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = hasAccount ? '⏳ Đang đặt lại...' : '⏳ Đang cấp...';
          }

          const res = await window.stateManager.provisionPlayer(playerId, username, tempPassword);

          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = hasAccount ? '🔄 Đặt Lại Mật Khẩu' : '⚡ Cấp Tài Khoản';
          }

          if (res.success) {
            showToast('🎉 ' + res.message, 'success');
            const resultTitle = document.getElementById('provision-result-title');
            if (resultTitle) {
              resultTitle.innerText = hasAccount ? '✅ Đã đặt lại mật khẩu thành công!' : '✅ Cấp tài khoản thành công!';
            }
            if (resultCard && shareTextarea) {
              shareTextarea.value = res.shareText;
              resultCard.style.display = 'block';
            }
            this.renderPlayers();
            const profileModal = document.getElementById('player-profile-modal');
            if (profileModal && profileModal.classList.contains('active')) {
              this.viewPlayerProfile(playerId);
            }
          } else {
            if (errorEl) errorEl.innerText = res.error || (hasAccount ? 'Đặt lại mật khẩu thất bại!' : 'Cấp tài khoản thất bại!');
          }
        });
      }
    },

    openProvisionModal(playerId) {
      const player = window.stateManager ? window.stateManager.getPlayerById(playerId) : null;
      if (!player) return;

      const modal = document.getElementById('admin-provision-modal');
      const modalTitle = document.getElementById('provision-modal-title');
      const idInp = document.getElementById('provision-player-id');
      const nameEl = document.getElementById('provision-player-name');
      const avEl = document.getElementById('provision-player-avatar');
      const stEl = document.getElementById('provision-player-status');
      const warningBanner = document.getElementById('provision-warning-banner');
      const passLabel = document.getElementById('provision-password-label');
      const submitBtn = document.getElementById('provision-submit-btn');
      const userInp = document.getElementById('provision-username');
      const passInp = document.getElementById('provision-password');
      const errorEl = document.getElementById('provision-error');
      const resultCard = document.getElementById('provision-result-card');

      if (errorEl) errorEl.innerText = '';
      if (resultCard) resultCard.style.display = 'none';
      if (idInp) idInp.value = player.id;
      if (nameEl) nameEl.innerText = player.name + ' (#' + (player.number !== undefined ? player.number : '-') + ')';
      if (avEl) avEl.src = player.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

      const hasAccount = Boolean(player.username && player.accountStatus !== 'unprovisioned');
      const hasCustomPassword = Boolean(hasAccount && player.mustChangePassword === false);

      if (hasAccount) {
        // TRƯỜNG HỢP: ĐÃ CÓ TÀI KHOẢN (ĐẶT LẠI MẬT KHẨU)
        if (modalTitle) modalTitle.innerText = '🔄 Đặt Lại Mật Khẩu Cầu Thủ';
        if (submitBtn) submitBtn.innerText = '🔄 Đặt Lại Mật Khẩu';
        if (userInp) userInp.value = player.username;

        if (hasCustomPassword) {
          if (stEl) {
            stEl.innerHTML = `Trạng thái: <strong style="color: var(--accent-emerald);">Đã đổi mật khẩu cá nhân</strong> (@${escapeHtml(player.username)})`;
          }
          if (warningBanner) {
            warningBanner.style.display = 'block';
            warningBanner.innerHTML = `⚠️ <strong>Lưu ý quan trọng:</strong> Cầu thủ <strong>${escapeHtml(player.name)}</strong> đã tự đổi mật khẩu cá nhân.<br>Chỉ thực hiện đặt lại mật khẩu tạm thời khi cầu thủ <strong>bị quên mật khẩu</strong> và nhờ Ban Quản Trị hỗ trợ!`;
          }
          if (passLabel) passLabel.innerText = 'Mật khẩu tạm thời mới (Sẽ ghi đè mật khẩu hiện tại)';
        } else {
          if (stEl) {
            stEl.innerHTML = `Trạng thái: <strong style="color: var(--accent-gold);">Chưa đổi mật khẩu lần đầu</strong> (@${escapeHtml(player.username)})`;
          }
          if (warningBanner) {
            warningBanner.style.display = 'block';
            warningBanner.innerHTML = `ℹ️ Cầu thủ <strong>${escapeHtml(player.name)}</strong> chưa đổi mật khẩu lần đầu. Bạn có thể cấp lại mật khẩu khởi tạo tạm thời mới nếu cầu thủ chưa nhận được.`;
          }
          if (passLabel) passLabel.innerText = 'Mật khẩu khởi tạo tạm thời mới';
        }
      } else {
        // TRƯỜNG HỢP: CẤP MỚI TÀI KHOẢN LẦN ĐẦU
        if (modalTitle) modalTitle.innerText = '🔑 Cấp Tài Khoản Cho Cầu Thủ';
        if (submitBtn) submitBtn.innerText = '⚡ Cấp Tài Khoản';
        if (passLabel) passLabel.innerText = 'Mật khẩu khởi tạo tạm thời';
        if (stEl) {
          stEl.innerText = 'Trạng thái: Chưa cấp tài khoản';
          stEl.style.color = 'var(--text-muted)';
        }
        if (warningBanner) warningBanner.style.display = 'none';
        if (userInp) userInp.value = this.suggestUsername(player.name);
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
        showToast('📋 Đã sao chép thông tin tài khoản! Giờ bạn có thể dán vào Zalo gửi cho anh em.', 'success');
        if (copyBtn) {
          const originalText = copyBtn.innerText;
          copyBtn.innerText = '✅ Đã Sao Chép!';
          setTimeout(() => copyBtn.innerText = originalText, 2500);
        }
      }).catch(() => {
        showToast('Không thể sao chép tự động, vui lòng chọn văn bản và bấm Copy.', 'warning');
      });
    }
  };

  root.TNTPlayersMixins = root.TNTPlayersMixins || {};
  root.TNTPlayersMixins.provision = PlayersProvisionMixin;

})(typeof window !== 'undefined' ? window : this);
