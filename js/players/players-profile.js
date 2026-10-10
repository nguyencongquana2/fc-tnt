/**
 * FC TNT - Players Profile Submodule (js/players/players-profile.js)
 * Quản lý Modal hồ sơ chi tiết (#player-profile-modal), xem lịch sử phong độ
 * và Engine xử lý nén ảnh Canvas cho Avatar cầu thủ
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

  function formatMoney(amount) {
    if (root.TNT && root.TNT.utils && typeof root.TNT.utils.formatMoney === 'function') {
      return root.TNT.utils.formatMoney(amount);
    }
    if (typeof root.formatMoney === 'function') {
      return root.formatMoney(amount);
    }
    return (Number(amount) || 0).toLocaleString('vi-VN') + 'đ';
  }

  const PlayersProfileMixin = {
    quickUploadPlayerId: null,

    bindProfileEvents() {
      // Xử lý upload ảnh từ máy tính / điện thoại trong form thêm/sửa
      const avatarFileInput = document.getElementById('player-avatar-file-input');
      if (avatarFileInput) {
        avatarFileInput.addEventListener('change', async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;

          if (file.size > 10 * 1024 * 1024) {
            showToast('Vui lòng chọn ảnh dung lượng dưới 10MB!', 'warning');
            avatarFileInput.value = '';
            return;
          }

          try {
            const base64 = await this.processImageUpload(file);
            const preview = document.getElementById('player-avatar-preview');
            const customInput = document.getElementById('player-avatar-custom');
            if (preview) preview.src = base64;
            if (customInput) customInput.value = base64;
            showToast('📸 Đã tải ảnh avatar lên thành công!', 'success');
          } catch (err) {
            console.error('[Players] Lỗi nén file ảnh:', err);
            showToast('Lỗi khi đọc file ảnh!', 'error');
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
            showToast('Vui lòng chọn ảnh dung lượng dưới 10MB!', 'warning');
            globalFileInput.value = '';
            return;
          }

          try {
            const base64 = await this.processImageUpload(file);
            const p = window.stateManager ? window.stateManager.getPlayerById(this.quickUploadPlayerId) : null;
            if (p) {
              await window.stateManager.updatePlayerAvatar(this.quickUploadPlayerId, base64);
              showToast(`📸 Đã cập nhật ảnh đại diện cho ${p.name}!`, 'success');

              // Đồng bộ re-render các thành phần phụ thuộc
              this.renderPlayers();
              const profileModal = document.getElementById('player-profile-modal');
              if (profileModal && profileModal.classList.contains('active')) {
                this.viewPlayerProfile(this.quickUploadPlayerId);
              }
              if (window.matchesModule && window.matchesModule.currentMatchId && typeof window.matchesModule.renderDetailBody === 'function') {
                window.matchesModule.renderDetailBody();
              }
              if (window.awardsModule && typeof window.awardsModule.renderAwards === 'function') {
                window.awardsModule.renderAwards();
              }
              if (window.appModule && typeof window.appModule.renderDashboard === 'function') {
                window.appModule.renderDashboard();
              }
            }
          } catch (err) {
            console.error('[Players] Lỗi cập nhật avatar nhanh:', err);
            showToast('Lỗi khi tải ảnh!', 'error');
          } finally {
            this.quickUploadPlayerId = null;
            globalFileInput.value = '';
          }
        });
      }

      // Preset avatar select
      const avatarSelect = document.getElementById('player-avatar-preset');
      if (avatarSelect) {
        avatarSelect.addEventListener('change', (e) => {
          const customInput = document.getElementById('player-avatar-custom');
          const preview = document.getElementById('player-avatar-preview');
          if (e.target.value) {
            if (customInput) customInput.value = e.target.value;
            if (preview) preview.src = e.target.value;
          }
        });
      }

      // Custom avatar url input
      const customAvatarInput = document.getElementById('player-avatar-custom');
      if (customAvatarInput) {
        customAvatarInput.addEventListener('input', (e) => {
          const preview = document.getElementById('player-avatar-preview');
          if (preview) {
            preview.src = e.target.value || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
          }
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
      if (!window.stateManager || !window.stateManager.canEditPlayerAvatar(playerId)) {
        showToast('Bạn chỉ có thể đổi ảnh đại diện của chính mình hoặc cần quyền Quản trị viên!', 'warning');
        return;
      }
      this.quickUploadPlayerId = playerId;
      const fileInput = document.getElementById('global-player-avatar-file');
      if (fileInput) {
        fileInput.click();
      }
    },

    getRatingColor(rating) {
      if (!rating || rating === 0) return '#94a3b8';
      if (rating >= 8.5) return '#10b981'; // Green
      if (rating >= 7.5) return '#06b6d4'; // Cyan
      if (rating >= 6.5) return '#f59e0b'; // Gold
      return '#f43f5e'; // Red
    },

    viewPlayerProfile(id) {
      const player = window.stateManager ? window.stateManager.getPlayerById(id) : null;
      if (!player) return;

      const statsList = window.stateManager.getPlayerOverallStats ? window.stateManager.getPlayerOverallStats() : [];
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
      if (!modal || !content) return;

      const isAdmin = window.stateManager.isAdmin;
      const canEditProfileAvatar = window.stateManager.canEditPlayerAvatar(player.id);

      const primaryDisplayName = escapeHtml((player.nickname && player.nickname.trim()) ? player.nickname.trim() : player.name);
      const secondaryRealName = escapeHtml((player.name && player.name.trim() && player.name.trim().toLowerCase() !== primaryDisplayName.toLowerCase()) ? player.name.trim() : '');

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
            <p style="color: var(--text-dim); font-size: 0.85rem; margin-top: 0.25rem;">${escapeHtml(player.note || 'Chưa có ghi chú đặc biệt')}</p>
            ${player.bankAccountNumber ? `
              <div style="display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 6px; padding: 3px 8px; margin-top: 0.4rem; font-size: 0.8rem; color: var(--accent-gold);">
                💳 <strong>${escapeHtml(player.bankCode || 'NH')}:</strong> ${escapeHtml(player.bankAccountNumber)} ${player.bankAccountName ? `(${escapeHtml(player.bankAccountName)})` : ''}
              </div>
            ` : ''}
            ${(player.fundBalance !== undefined) ? `
              <div style="display: flex; align-items: center; gap: 0.5rem; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 6px; padding: 3px 10px; margin-top: 0.4rem; font-size: 0.82rem; width: fit-content;">
                <span>💰 Ví: <strong style="color: ${player.fundBalance >= 0 ? 'var(--accent-emerald)' : '#ef4444'};">${player.fundBalance >= 0 ? '+' : ''}${formatMoney(player.fundBalance)}</strong></span>
                <button class="btn btn-secondary btn-xs" onclick="window.TNT.funds.openHistoryModal('${player.id}')" title="Xem lịch sử biến động số dư">📜 Lịch sử</button>
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
          ${stats.matchHistory && stats.matchHistory.length > 0 ? stats.matchHistory.map(mh => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: rgba(0,0,0,0.25); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div>
                <div style="font-weight: 700; color: #fff;">vs ${escapeHtml(mh.opponent)} <span style="font-size: 0.8rem; color: var(--text-dim);">(${mh.score})</span></div>
                <div style="font-size: 0.75rem; color: var(--text-dim);">${escapeHtml(mh.date)} • ${escapeHtml(mh.note || 'Thi đấu tròn vai')}</div>
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
      if (modal) modal.classList.remove('active');
    }
  };

  root.TNTPlayersMixins = root.TNTPlayersMixins || {};
  root.TNTPlayersMixins.profile = PlayersProfileMixin;

})(typeof window !== 'undefined' ? window : this);
