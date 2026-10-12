/**
 * FC TNT - Matches Guest Player Submodule (js/matches/matches-guest.js)
 * Quản lý thêm nhanh khách mời / viện binh ngay trong trận đấu và xem trước avatar áo đấu
 */

(function (root) {
  'use strict';

  root.matchesModule = root.matchesModule || {};

  const escapeHtml = root.escapeHtml || (str => (str == null ? '' : String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')));

  function showToast(msg, type = 'info') {
    if (root.TNT && root.TNT.ui && typeof root.TNT.ui.showToast === 'function') {
      root.TNT.ui.showToast(msg, type);
    } else if (typeof root.showToast === 'function') {
      root.showToast(msg, type);
    }
  }

  Object.assign(root.matchesModule, {
    quickGuestSource: 'match',
    currentEditGuestId: null,

    openQuickAddGuestModal(source = 'match') {
      this.currentEditGuestId = null;
      this.quickGuestSource = source;
      const modal = document.getElementById('quick-add-guest-modal');
      if (!modal) return;

      const titleEl = document.getElementById('quick-guest-modal-title');
      if (titleEl) titleEl.innerHTML = '🤝 Thêm Viện Binh / Khách Đi Đá Cùng';
      const descEl = document.getElementById('quick-guest-modal-desc');
      if (descEl) descEl.innerHTML = '💡 Thêm nhanh bạn của anh em đi đá cùng. Tự động sinh avatar áo đấu nhận diện, không lo rác danh sách đội bóng chính thức!';
      const submitBtn = document.getElementById('quick-guest-submit-btn');
      if (submitBtn) submitBtn.innerHTML = '✓ Xác Nhận Thêm Viện Binh';

      const select = document.getElementById('guest-quick-invited-by');
      if (select && window.stateManager) {
        const allPlayers = window.stateManager.getPlayers();
        const isGuestFn = (root.TNTGuestJersey && typeof root.TNTGuestJersey.isGuestPlayer === 'function')
          ? root.TNTGuestJersey.isGuestPlayer
          : (p => Boolean(p.isGuest));

        const official = allPlayers.filter(p => !isGuestFn(p));
        select.innerHTML = '<option value="">-- Không rõ / Cả đội --</option>' +
          official.map(p => {
            const label = (p.nickname && p.nickname.trim()) ? p.nickname.trim() : p.name;
            return `<option value="${escapeHtml(label)}">${escapeHtml(label)} (#${p.number})</option>`;
          }).join('');
      }

      const fullnameInput = document.getElementById('guest-quick-fullname');
      if (fullnameInput) fullnameInput.value = '';
      const nameInput = document.getElementById('guest-quick-name');
      if (nameInput) nameInput.value = '';
      const numInput = document.getElementById('guest-quick-num');
      if (numInput) numInput.value = '';
      const posSelect = document.getElementById('guest-quick-pos');
      if (posSelect) posSelect.value = 'FW';
      const colorSelect = document.getElementById('guest-quick-color');
      if (colorSelect) colorSelect.value = 'white';
      const noteInput = document.getElementById('guest-quick-note');
      if (noteInput) noteInput.value = '';

      this.updateGuestAvatarPreview();
      modal.classList.add('active');
      setTimeout(() => {
        if (fullnameInput) fullnameInput.focus();
        else if (nameInput) nameInput.focus();
      }, 150);
    },

    openEditGuestModal(playerId) {
      if (!window.stateManager || !window.stateManager.isAdmin) {
        showToast('Vui lòng đăng nhập Quản trị viên để sửa thông tin!', 'error');
        if (window.appModule && window.appModule.openAdminModal) {
          window.appModule.openAdminModal();
        }
        return;
      }

      const player = window.stateManager ? window.stateManager.getPlayerById(playerId) : null;
      if (!player) {
        showToast('Không tìm thấy thông tin cầu thủ!', 'error');
        return;
      }

      this.currentEditGuestId = playerId;
      this.quickGuestSource = 'players';
      const modal = document.getElementById('quick-add-guest-modal');
      if (!modal) return;

      const titleEl = document.getElementById('quick-guest-modal-title');
      if (titleEl) titleEl.innerHTML = '✏️ Chỉnh Sửa Viện Binh / Khách Mời';
      const descEl = document.getElementById('quick-guest-modal-desc');
      if (descEl) descEl.innerHTML = '💡 Chỉnh sửa thông tin khách: họ và tên, biệt danh, người bảo lãnh, vị trí và màu áo nhận diện.';
      const submitBtn = document.getElementById('quick-guest-submit-btn');
      if (submitBtn) submitBtn.innerHTML = '✓ Lưu Thông Tin Khách';

      const select = document.getElementById('guest-quick-invited-by');
      if (select && window.stateManager) {
        const allPlayers = window.stateManager.getPlayers();
        const isGuestFn = (root.TNTGuestJersey && typeof root.TNTGuestJersey.isGuestPlayer === 'function')
          ? root.TNTGuestJersey.isGuestPlayer
          : (p => Boolean(p.isGuest));

        const official = allPlayers.filter(p => !isGuestFn(p) && p.id !== playerId);
        select.innerHTML = '<option value="">-- Không rõ / Cả đội --</option>' +
          official.map(p => {
            const label = (p.nickname && p.nickname.trim()) ? p.nickname.trim() : p.name;
            return `<option value="${escapeHtml(label)}">${escapeHtml(label)} (#${p.number})</option>`;
          }).join('');

        const cleanInvited = (player.invitedBy || '').replace(/^Bạn\s+/i, '').trim().toLowerCase();
        let found = false;
        for (let i = 0; i < select.options.length; i++) {
          const optVal = select.options[i].value.replace(/^Bạn\s+/i, '').trim().toLowerCase();
          if (select.options[i].value === player.invitedBy || (cleanInvited && optVal === cleanInvited)) {
            select.selectedIndex = i;
            found = true;
            break;
          }
        }
        if (!found) select.value = '';
      }

      const fullnameInput = document.getElementById('guest-quick-fullname');
      if (fullnameInput) fullnameInput.value = player.name || '';
      const nameInput = document.getElementById('guest-quick-name');
      if (nameInput) nameInput.value = (player.nickname && player.nickname.trim()) ? player.nickname.trim() : (player.name || '');
      const posSelect = document.getElementById('guest-quick-pos');
      if (posSelect) posSelect.value = player.position || 'FW';
      const colorSelect = document.getElementById('guest-quick-color');
      if (colorSelect) colorSelect.value = player.jerseyColor || 'white';
      const numInput = document.getElementById('guest-quick-num');
      if (numInput) numInput.value = (player.number !== undefined && player.number !== null && player.number !== '') ? player.number : '';
      const noteInput = document.getElementById('guest-quick-note');
      if (noteInput) noteInput.value = player.note || '';

      this.updateGuestAvatarPreview();
      modal.classList.add('active');
      setTimeout(() => {
        if (fullnameInput) fullnameInput.focus();
        else if (nameInput) nameInput.focus();
      }, 150);
    },

    closeQuickAddGuestModal() {
      const modal = document.getElementById('quick-add-guest-modal');
      if (modal) modal.classList.remove('active');
      this.currentEditGuestId = null;
    },

    updateGuestAvatarPreview() {
      const fullnameInput = document.getElementById('guest-quick-fullname');
      const nameInput = document.getElementById('guest-quick-name');
      const colorSelect = document.getElementById('guest-quick-color');
      const numInput = document.getElementById('guest-quick-num');
      const sponsorSelect = document.getElementById('guest-quick-invited-by');
      const previewImg = document.getElementById('guest-quick-avatar-preview');
      const previewName = document.getElementById('guest-preview-name-label');
      const previewSub = document.getElementById('guest-preview-sub-label');

      const rawFullName = fullnameInput ? fullnameInput.value.trim() : '';
      const rawName = nameInput ? nameInput.value.trim() : '';
      const color = colorSelect ? colorSelect.value : 'white';
      const fallbackBadge = rawName ? rawName.slice(0, 2).toUpperCase() : (rawFullName ? rawFullName.slice(0, 2).toUpperCase() : 'K');
      const numVal = numInput && numInput.value ? numInput.value.trim() : fallbackBadge;
      const sponsor = sponsorSelect ? sponsorSelect.value : '';

      let uri = '';
      if (root.TNTGuestJersey && typeof root.TNTGuestJersey.generateJerseyDataUri === 'function') {
        uri = root.TNTGuestJersey.generateJerseyDataUri(color, numVal, sponsor ? `b.${sponsor}` : 'GUEST');
      }

      if (previewImg && uri) previewImg.src = uri;
      const displayName = rawName || rawFullName || 'Viện Binh';
      if (previewName) previewName.textContent = displayName ? `${displayName} (Khách)` : 'Viện Binh Mới';
      if (previewSub) {
        const pal = (root.TNTGuestJersey && root.TNTGuestJersey.JERSEY_PALETTES[color])
          ? root.TNTGuestJersey.JERSEY_PALETTES[color].name
          : color;
        previewSub.textContent = sponsor ? `Bạn ${sponsor} bảo lãnh • ${pal}` : `Áo đấu ${pal}`;
      }
    },

    async handleSaveQuickGuest(e) {
      if (e) e.preventDefault();
      const fullnameInput = document.getElementById('guest-quick-fullname');
      const nameInput = document.getElementById('guest-quick-name');
      const colorSelect = document.getElementById('guest-quick-color');
      const numInput = document.getElementById('guest-quick-num');
      const posSelect = document.getElementById('guest-quick-pos');
      const sponsorSelect = document.getElementById('guest-quick-invited-by');
      const noteInput = document.getElementById('guest-quick-note');

      const rawFullName = fullnameInput ? fullnameInput.value.trim() : '';
      const rawName = nameInput ? nameInput.value.trim() : '';
      const rawNote = noteInput ? noteInput.value.trim() : '';
      if (!rawName && !rawFullName) {
        showToast('Vui lòng nhập họ tên hoặc tên gọi của khách!', 'error');
        return;
      }

      const color = colorSelect ? colorSelect.value : 'white';
      const pos = posSelect ? posSelect.value : 'FW';
      const sponsor = sponsorSelect ? sponsorSelect.value : '';
      const finalNote = rawNote || (sponsor ? `Khách của ${sponsor}` : 'Khách mời');

      let finalName = '';
      let finalNickname = '';
      if (rawFullName) {
        finalName = rawFullName;
        finalNickname = rawName || rawFullName;
      } else {
        finalName = rawName;
        finalNickname = sponsor ? `${rawName} (Bạn ${sponsor})` : rawName;
      }

      // Tự sinh số áo nếu chưa nhập (90 -> 99)
      let playerNumber = parseInt(numInput?.value, 10);
      if (isNaN(playerNumber) || playerNumber <= 0) {
        const all = window.stateManager ? window.stateManager.getPlayers() : [];
        let maxNum = 90;
        all.forEach(p => {
          const n = Number(p.number) || 0;
          if (n >= 90 && n > maxNum) maxNum = n;
        });
        playerNumber = Math.min(99, maxNum + 1);
      }

      const numLabel = String(playerNumber);
      let avatarUri = '';
      if (root.TNTGuestJersey) {
        avatarUri = root.TNTGuestJersey.generateJerseyDataUri(color, numLabel, sponsor ? `b.${sponsor}` : 'GUEST');
      }

      // CHẾ ĐỘ SỬA: Cập nhật thông tin khách hiện có
      if (this.currentEditGuestId) {
        try {
          const updatedGuest = {
            name: finalName,
            nickname: finalNickname,
            number: playerNumber,
            position: pos,
            avatar: avatarUri,
            isGuest: true,
            invitedBy: sponsor ? (sponsor.startsWith('Bạn ') ? sponsor : `Bạn ${sponsor}`) : '',
            jerseyColor: color,
            note: finalNote
          };

          if (window.stateManager) {
            await window.stateManager.updatePlayer(this.currentEditGuestId, updatedGuest);
          }
          this.closeQuickAddGuestModal();
          showToast(`✓ Đã lưu thông tin khách "${finalName}" (#${playerNumber})!`, 'success');

          if (window.playersModule && typeof window.playersModule.renderPlayers === 'function') {
            window.playersModule.renderPlayers();
          }
          if (window.matchesModule && typeof window.matchesModule.renderMatchesList === 'function') {
            window.matchesModule.renderMatchesList();
          }
        } catch (err) {
          console.warn('[Matches] Cập nhật khách thất bại:', err.message);
          showToast('Không thể cập nhật thông tin khách mời!', 'error');
        }
        return;
      }

      // CHẾ ĐỘ THÊM: Tạo mới viện binh
      const newGuest = {
        name: finalName,
        nickname: finalNickname,
        number: playerNumber,
        position: pos,
        avatar: avatarUri,
        isGuest: true,
        invitedBy: sponsor ? (sponsor.startsWith('Bạn ') ? sponsor : `Bạn ${sponsor}`) : '',
        jerseyColor: color,
        note: finalNote
      };

      try {
        let created = null;
        if (window.stateManager) {
          created = await window.stateManager.addPlayer(newGuest);
        }
        this.closeQuickAddGuestModal();
        showToast(`🤝 Đã thêm viện binh "${finalName}" (#${playerNumber})!`, 'success');

        // Nếu form trận đấu đang mở: Tự động thêm vào danh sách và tick chọn
        const playersContainer = document.getElementById('match-lineup-selection');
        if (playersContainer && created) {
          const newLabel = document.createElement('label');
          newLabel.className = 'lineup-item-label selected-item';
          newLabel.id = `lineup-label-${created.id}`;
          newLabel.innerHTML = `
            <input type="checkbox" name="selected_players" value="${created.id}" checked onchange="document.getElementById('lineup-label-${created.id}').classList.toggle('selected-item', this.checked)">
            <img class="lineup-item-avatar" src="${created.avatar}" alt="${escapeHtml(created.name)}">
            <div style="overflow: hidden;">
              <div class="lineup-item-name" style="color: var(--accent-gold); font-weight: 700;">
                ${escapeHtml(created.name)} <span style="font-size: 0.65rem;">(Khách)</span>
              </div>
              <div style="font-size: 0.68rem; color: var(--text-dim);">#${created.number} • ${created.position}</div>
            </div>
          `;
          playersContainer.appendChild(newLabel);
        }

        // Cập nhật tab Cầu thủ
        if (window.playersModule && typeof window.playersModule.renderPlayers === 'function') {
          if (this.quickGuestSource === 'players') {
            window.playersModule.setPlayerFilter('guest');
          } else {
            window.playersModule.renderPlayers();
          }
        }
      } catch (err) {
        console.warn('[Matches] Thêm khách thất bại:', err.message);
        showToast('Không thể lưu thông tin khách mời!', 'error');
      }
    }
  });

})(typeof window !== 'undefined' ? window : this);
