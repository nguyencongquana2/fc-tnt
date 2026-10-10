/**
 * FC TNT - Match Form & Security Actions Submodule (js/matches/matches-form.js)
 * Quản lý Form tạo/sửa trận đấu (#match-form-modal) & Xác thực mã PIN an toàn khi sửa/xóa trận
 */

window.matchesModule = window.matchesModule || {};

Object.assign(window.matchesModule, {
  openCreateMatchModal(editId = null) {
    if (!window.stateManager || !window.stateManager.isAdmin) {
      window.showToast('Chỉ Quản trị viên mới có quyền thêm hoặc sửa trận đấu!', 'error');
      return;
    }
    this.currentEditMatchId = editId;
    const modal = document.getElementById('match-form-modal');
    const title = document.getElementById('match-form-title');
    const form = document.getElementById('match-form');
    if (form) form.reset();

    const playersContainer = document.getElementById('match-lineup-selection');
    const allPlayers = window.stateManager ? window.stateManager.getPlayers() : [];

    if (editId) {
      if (title) title.innerHTML = '✏️ Sửa Thông Tin Trận Đấu (Sân 7 • 3-1-2)';
      const m = window.stateManager ? window.stateManager.getMatchById(editId) : null;
      if (m) {
        const dateInput = document.getElementById('match-date');
        const timeInput = document.getElementById('match-time');
        const oppInput = document.getElementById('match-opponent');
        const venueInput = document.getElementById('match-venue');
        const typeInput = document.getElementById('match-type');
        const homeScoreInput = document.getElementById('match-home-score');
        const awayScoreInput = document.getElementById('match-away-score');
        const noteInput = document.getElementById('match-note');

        if (dateInput) dateInput.value = m.date || '';
        if (timeInput) timeInput.value = m.time || '';
        if (oppInput) oppInput.value = m.opponent || '';
        if (venueInput) venueInput.value = m.venue || '';
        if (typeInput) typeInput.value = m.type || '7';
        if (homeScoreInput) homeScoreInput.value = m.homeScore;
        if (awayScoreInput) awayScoreInput.value = m.awayScore;
        if (noteInput) noteInput.value = m.note || '';

        const activePlayerIds = (m.playerStats || []).map(ps => ps.playerId);
        if (playersContainer) {
          playersContainer.innerHTML = allPlayers.map(p => {
            const nick = (p.nickname && p.nickname.trim() && p.nickname.trim() !== p.name) ? ` (${p.nickname.trim()})` : '';
            const isChecked = activePlayerIds.includes(p.id);
            return `
              <label class="lineup-item-label ${isChecked ? 'selected-item' : ''}" id="lineup-label-${p.id}">
                <input type="checkbox" name="selected_players" value="${p.id}" ${isChecked ? 'checked' : ''} onchange="document.getElementById('lineup-label-${p.id}').classList.toggle('selected-item', this.checked)">
                <img class="lineup-item-avatar" src="${p.avatar}" alt="${p.name}">
                <div style="overflow: hidden;">
                  <div class="lineup-item-name">${p.name}${nick}</div>
                  <div style="font-size: 0.68rem; color: var(--text-dim);">#${p.number} • ${p.position}</div>
                </div>
              </label>
            `;
          }).join('');
        }
      }
    } else {
      if (title) title.innerHTML = '⚽ Thêm Trận Đấu Mới (Sân 7 • 3-1-2)';
      const today = new Date().toISOString().split('T')[0];
      const dateInput = document.getElementById('match-date');
      const timeInput = document.getElementById('match-time');
      const typeInput = document.getElementById('match-type');
      const homeScoreInput = document.getElementById('match-home-score');
      const awayScoreInput = document.getElementById('match-away-score');

      if (dateInput) dateInput.value = today;
      if (timeInput) timeInput.value = '19:30';
      if (typeInput) typeInput.value = '7';
      if (homeScoreInput) homeScoreInput.value = '0';
      if (awayScoreInput) awayScoreInput.value = '0';

      if (playersContainer) {
        playersContainer.innerHTML = allPlayers.map(p => {
          const nick = (p.nickname && p.nickname.trim() && p.nickname.trim() !== p.name) ? ` (${p.nickname.trim()})` : '';
          return `
            <label class="lineup-item-label selected-item" id="lineup-label-${p.id}">
              <input type="checkbox" name="selected_players" value="${p.id}" checked onchange="document.getElementById('lineup-label-${p.id}').classList.toggle('selected-item', this.checked)">
              <img class="lineup-item-avatar" src="${p.avatar}" alt="${p.name}">
              <div style="overflow: hidden;">
                <div class="lineup-item-name">${p.name}${nick}</div>
                <div style="font-size: 0.68rem; color: var(--text-dim);">#${p.number} • ${p.position}</div>
              </div>
            </label>
          `;
        }).join('');
      }
    }

    const dz = document.getElementById('match-form-danger-zone');
    if (dz) {
      dz.style.display = editId ? 'block' : 'none';
    }

    if (modal) modal.classList.add('active');
  },

  selectAllLineup(checkAll = true) {
    const checkboxes = document.querySelectorAll('input[name="selected_players"]');
    checkboxes.forEach(cb => {
      cb.checked = checkAll;
      const label = cb.closest('.lineup-item-label');
      if (label) label.classList.toggle('selected-item', checkAll);
    });
  },

  closeCreateMatchModal() {
    const modal = document.getElementById('match-form-modal');
    if (modal) modal.classList.remove('active');
    this.currentEditMatchId = null;
  },

  handleSaveMatch(e) {
    e.preventDefault();
    const opponent = document.getElementById('match-opponent')?.value.trim();
    if (!opponent) {
      window.showToast('Vui lòng nhập tên đối thủ!', 'error');
      return;
    }

    const homeScore = parseInt(document.getElementById('match-home-score')?.value) || 0;
    const awayScore = parseInt(document.getElementById('match-away-score')?.value) || 0;

    let result = 'DRAW';
    if (homeScore > awayScore) result = 'WIN';
    else if (homeScore < awayScore) result = 'LOSS';

    const selectedCheckboxes = document.querySelectorAll('input[name="selected_players"]:checked');
    const selectedPlayerIds = Array.from(selectedCheckboxes).map(cb => cb.value);

    if (selectedPlayerIds.length === 0) {
      window.showToast('Vui lòng chọn ít nhất một cầu thủ tham gia trận đấu!', 'error');
      return;
    }

    if (this.currentEditMatchId) {
      const currentMatch = window.stateManager ? window.stateManager.getMatchById(this.currentEditMatchId) : null;
      const existingStats = (currentMatch && currentMatch.playerStats) ? currentMatch.playerStats : [];

      const updatedPlayerStats = selectedPlayerIds.map((pId, idx) => {
        const found = existingStats.find(ps => ps.playerId === pId);
        return found || {
          playerId: pId,
          isStarter: idx < 7,
          rating: 7.0,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          note: ''
        };
      });

      const updatedData = {
        date: document.getElementById('match-date')?.value,
        time: document.getElementById('match-time')?.value,
        opponent,
        venue: document.getElementById('match-venue')?.value.trim(),
        type: document.getElementById('match-type')?.value,
        formation: '3-1-2',
        homeScore,
        awayScore,
        result,
        note: document.getElementById('match-note')?.value.trim(),
        playerStats: updatedPlayerStats
      };

      if (window.stateManager) window.stateManager.updateMatch(this.currentEditMatchId, updatedData);
      window.showToast('Đã cập nhật thông tin trận đấu!');
    } else {
      const playerStats = selectedPlayerIds.map((pId, idx) => ({
        playerId: pId,
        isStarter: idx < 7,
        rating: 7.0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        note: ''
      }));

      const newMatchData = {
        date: document.getElementById('match-date')?.value,
        time: document.getElementById('match-time')?.value,
        opponent,
        venue: document.getElementById('match-venue')?.value.trim() || 'Sân bóng cỏ nhân tạo',
        type: document.getElementById('match-type')?.value,
        formation: '3-1-2',
        homeScore,
        awayScore,
        result,
        note: document.getElementById('match-note')?.value.trim(),
        playerStats
      };

      const created = window.stateManager ? window.stateManager.addMatch(newMatchData) : null;
      window.showToast('Đã tạo trận đấu mới! Giờ bạn có thể chấm điểm chi tiết.');
      this.closeCreateMatchModal();
      this.renderMatches();
      if (created) this.openMatchDetailModal(created.id);
      return;
    }

    this.closeCreateMatchModal();
    this.renderMatches();
    if (this.currentMatchId) {
      this.openMatchDetailModal(this.currentMatchId);
    }
    if (window.awardsModule) window.awardsModule.renderAwards();
    if (window.appModule) window.appModule.renderDashboard();
  },

  // =========================================================================
  // XÁC THỰC MÃ PIN & KHU VỰC NGUY HIỂM (SỬA & XÓA TRẬN ĐẤU)
  // =========================================================================
  pendingPinAction: null,

  requestEditMatch(id, e = null) {
    if (e) e.stopPropagation();
    if (!window.stateManager || !window.stateManager.isAdmin) {
      window.showToast('🔒 Hãy đăng nhập Quản trị viên để sửa trận đấu!', 'info');
      return;
    }
    const m = window.stateManager.getMatchById(id);
    if (!m) return;

    this.pendingPinAction = { type: 'EDIT', matchId: id };
    this.openPinVerifyModal({
      title: '🛡️ Xác Thực PIN Quản Trị Để Sửa Trận',
      match: m,
      desc: 'Vui lòng nhập Mã PIN Quản trị viên để mở quyền chỉnh sửa tỉ số, ngày giờ hoặc danh sách ra sân trận này.',
      btnText: '🔓 Xác Nhận Mở Form Sửa',
      isDanger: false
    });
  },

  requestDeleteMatch(id, e = null) {
    if (e) e.stopPropagation();
    if (!window.stateManager || !window.stateManager.isAdmin) {
      window.showToast('🔒 Hãy đăng nhập Quản trị viên để xóa trận đấu!', 'info');
      return;
    }
    const m = window.stateManager.getMatchById(id);
    if (!m) return;

    this.pendingPinAction = { type: 'DELETE', matchId: id };
    this.openPinVerifyModal({
      title: '🚨 Xác Thực PIN Để XÓA VĨNH VIỄN Trận Đấu',
      match: m,
      desc: 'CẢNH BÁO NGUY HIỂM: Trận đấu này và toàn bộ thống kê (điểm số, bàn thắng, kiến tạo) sẽ bị xóa vĩnh viễn khỏi hệ thống! Hãy nhập mã PIN Quản trị viên để xác nhận.',
      btnText: '🗑️ Xác Nhận Xóa Vĩnh Viễn',
      isDanger: true
    });
  },

  requestClearAllMatches() {
    if (!window.stateManager || !window.stateManager.isAdmin) {
      window.showToast('🔒 Hãy đăng nhập Quản trị viên để thực hiện!', 'info');
      return;
    }

    this.pendingPinAction = { type: 'CLEAR_ALL' };
    this.openPinVerifyModal({
      title: '⚠️ Xác Thực PIN Để Xóa Tất Cả Trận Đấu',
      match: null,
      desc: 'NGUY HIỂM TỘT CÙNG: Toàn bộ tất cả các trận đấu trong mùa giải sẽ bị xóa trắng! Vui lòng nhập mã PIN Quản trị viên để xác nhận.',
      btnText: '🚨 Xóa Toàn Bộ Trận Đấu',
      isDanger: true
    });
  },

  openPinVerifyModal({ title, match, desc, btnText, isDanger }) {
    const modal = document.getElementById('pin-verify-action-modal');
    if (!modal) return;

    const titleEl = document.getElementById('pin-verify-title');
    const infoEl = document.getElementById('pin-verify-match-info');
    const descEl = document.getElementById('pin-verify-desc');
    const submitBtn = document.getElementById('pin-verify-submit-btn');
    const input = document.getElementById('pin-verify-input');
    const errorEl = document.getElementById('pin-verify-error');

    if (titleEl) titleEl.innerHTML = title;
    if (descEl) descEl.textContent = desc;

    if (submitBtn) {
      submitBtn.textContent = btnText;
      submitBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';
    }

    if (infoEl) {
      if (match) {
        infoEl.style.display = 'block';
        infoEl.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <span style="font-weight: 800; font-size: 0.95rem; color: #fff;">⚽ vs ${window.escapeHtml(match.opponent)}</span>
            <span style="font-size: 0.85rem; font-weight: 800; color: var(--accent-emerald); background: rgba(0,0,0,0.3); padding: 0.15rem 0.5rem; border-radius: 4px;">
              ${match.homeScore} - ${match.awayScore}
            </span>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-dim);">
            📅 Ngày: ${match.date} • 📍 ${window.escapeHtml(match.venue || 'Sân bóng')} • Sân 7 (3-1-2)
          </div>
        `;
        if (isDanger) {
          infoEl.style.borderColor = 'rgba(239, 68, 68, 0.5)';
          infoEl.style.background = 'rgba(239, 68, 68, 0.1)';
        } else {
          infoEl.style.borderColor = 'var(--border-subtle)';
          infoEl.style.background = 'rgba(255, 255, 255, 0.05)';
        }
      } else {
        infoEl.style.display = 'none';
      }
    }

    if (input) {
      input.value = '';
      input.placeholder = 'Nhập mã PIN...';
    }
    if (errorEl) errorEl.style.display = 'none';

    modal.classList.add('active');
    setTimeout(() => {
      if (input) input.focus();
    }, 150);
  },

  closePinVerifyModal() {
    const modal = document.getElementById('pin-verify-action-modal');
    if (modal) modal.classList.remove('active');
    const input = document.getElementById('pin-verify-input');
    if (input) input.value = '';
    const errorEl = document.getElementById('pin-verify-error');
    if (errorEl) errorEl.style.display = 'none';
    this.pendingPinAction = null;
  },

  async handlePinVerifySubmit(e) {
    if (e) e.preventDefault();

    const input = document.getElementById('pin-verify-input');
    const errorEl = document.getElementById('pin-verify-error');
    const submitBtn = document.getElementById('pin-verify-submit-btn');
    const pin = input ? input.value.trim() : '';

    if (!pin) {
      if (errorEl) {
        errorEl.textContent = '❌ Vui lòng nhập mã PIN!';
        errorEl.style.display = 'inline';
      }
      return;
    }

    const origBtnText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang xác thực...';
    }

    try {
      const res = await window.stateManager.loginAdmin(pin);
      if (res && res.success) {
        const action = this.pendingPinAction;
        this.closePinVerifyModal();

        if (!action) return;

        if (action.type === 'EDIT') {
          this.openCreateMatchModal(action.matchId);
        } else if (action.type === 'DELETE') {
          this.executeDeleteMatch(action.matchId);
        } else if (action.type === 'CLEAR_ALL') {
          this.executeClearAllMatches();
        }
      } else {
        if (errorEl) {
          errorEl.textContent = '❌ ' + (res?.error || 'Mã PIN không đúng!');
          errorEl.style.display = 'inline';
        }
        if (input) {
          input.value = '';
          input.focus();
          input.classList.add('shake-anim');
          setTimeout(() => input.classList.remove('shake-anim'), 500);
        }
      }
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = '❌ Lỗi kết nối xác thực!';
        errorEl.style.display = 'inline';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = origBtnText;
      }
    }
  },

  executeDeleteMatch(id) {
    const m = window.stateManager ? window.stateManager.getMatchById(id) : null;
    const opponent = m ? m.opponent : 'trận đấu';

    if (window.stateManager) window.stateManager.deleteMatch(id);
    window.showToast(`🗑️ Đã xóa vĩnh viễn trận gặp "${opponent}"!`, 'info');

    this.closeCreateMatchModal();
    this.closeMatchDetailModal();
    this.renderMatches();
    if (window.awardsModule) window.awardsModule.renderAwards();
    if (window.playersModule) window.playersModule.renderPlayers();
    if (window.appModule) window.appModule.renderDashboard();
  },

  executeClearAllMatches() {
    if (window.stateManager) window.stateManager.clearAllMatches();
    window.showToast('🗑️ Đã xóa toàn bộ trận đấu trong mùa giải!', 'info');
    this.closeCreateMatchModal();
    this.closeMatchDetailModal();
    this.renderMatches();
    if (window.awardsModule) window.awardsModule.renderAwards();
    if (window.playersModule) window.playersModule.renderPlayers();
    if (window.appModule) window.appModule.renderDashboard();
  },

  // Backward compatibility alias
  deleteMatch(id, e = null) {
    this.requestDeleteMatch(id, e);
  },

  clearAllMatches() {
    this.requestClearAllMatches();
  }
});
