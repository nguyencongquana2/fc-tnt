/**
 * Matches Module - Pitch Quick Rating Editor & Performance Modal
 * js/matches/matches-pitch-edit.js
 * 
 * Thẻ chấm điểm nhanh (Quick Edit Card), thanh trượt Rating, bộ đếm Bàn thắng / Kiến tạo / Thẻ phạt
 * và lưu điểm toàn bộ trận đấu
 */

(function (root) {
  'use strict';

  root.matchesModule = root.matchesModule || {};

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

  Object.assign(root.matchesModule, {
    // =========================================================================
    // QUICK EDIT CARD & PLAYER RATINGS
    // =========================================================================
    openQuickEdit(playerId) {
      if (this.dragState && this.dragState.isDragging) return;
      const m = window.stateManager ? window.stateManager.getMatchById(this.currentMatchId) : null;
      if (!m) return;

      const p = window.stateManager ? window.stateManager.getPlayerById(playerId) : null;
      if (!p) return;

      const ps = (m.playerStats || []).find(s => s.playerId === playerId) || {
        rating: 7.0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        note: ''
      };

      const container = document.getElementById('quick-edit-container');
      if (!container) return;

      const displayName = (p.nickname && p.nickname.trim()) ? p.nickname.trim() : p.name;
      if (!window.stateManager || !window.stateManager.isAdmin) {
        container.innerHTML = `
          <div class="quick-edit-card" style="border-color: rgba(255,255,255,0.15);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <img src="${p.avatar}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-emerald);">
                <div>
                  <div style="font-weight: 800; font-size: 1rem; color: #fff;">${escapeHtml(displayName)} (#${p.number})</div>
                  <div style="font-size: 0.75rem; color: var(--accent-emerald); font-weight: 600;">
                    ${ps.isStarter !== false ? 'Đang đá chính (Sân 3-1-2)' : 'Đang ngồi dự bị'}
                  </div>
                </div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="document.getElementById('quick-edit-container').innerHTML = ''" style="padding: 0.2rem 0.6rem;">&times;</button>
            </div>

            <div style="display: flex; justify-content: space-around; background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: var(--radius-md); margin-bottom: 0.85rem;">
              <div style="text-align: center;">
                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Điểm Trận</div>
                <div style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 900; color: var(--accent-emerald);">${Number(ps.rating || 7.0).toFixed(1)} ⭐</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Bàn Thắng</div>
                <div style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 900; color: var(--accent-ruby);">${ps.goals || 0} ⚽</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Kiến Tạo</div>
                <div style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 900; color: var(--accent-cyan);">${ps.assists || 0} 👟</div>
              </div>
            </div>

            ${ps.note ? `<div style="font-size: 0.82rem; color: var(--text-main); font-style: italic; background: rgba(255,255,255,0.03); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); margin-bottom: 0.85rem;">💬 "${escapeHtml(ps.note)}"</div>` : ''}

            <div style="text-align: center; font-size: 0.78rem; color: var(--text-dim); padding-top: 0.4rem; border-top: 1px dashed rgba(255,255,255,0.08);">
              🔒 <em>Đăng nhập Quản trị viên để chấm điểm & điều chỉnh.</em>
            </div>
          </div>
        `;
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      container.innerHTML = `
        <div class="quick-edit-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <img src="${p.avatar}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-emerald);">
              <div>
                <div style="font-weight: 800; font-size: 1rem; color: #fff;">${escapeHtml(displayName)} (#${p.number})</div>
                <div style="font-size: 0.75rem; color: var(--accent-emerald); font-weight: 600;">
                  ${ps.isStarter !== false ? 'Đang đá chính (Sân 3-1-2)' : 'Đang ngồi dự bị'}
                </div>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('quick-edit-container').innerHTML = ''" style="padding: 0.2rem 0.6rem;">&times;</button>
          </div>

          <div style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
              <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">CHẤM ĐIỂM (1 - 10):</label>
              <span style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 900; color: var(--accent-emerald);" id="quick-rating-val">${Number(ps.rating || 7.0).toFixed(1)}/10</span>
            </div>
            <input type="range" class="rating-slider" min="1.0" max="10.0" step="0.1" value="${ps.rating || 7.0}" 
              oninput="document.getElementById('quick-rating-val').innerText = Number(this.value).toFixed(1) + '/10'" id="quick-rating-slider">
          </div>

          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.85rem;">
            <div class="stat-stepper">
              <span class="stat-stepper-label">⚽ Bàn:</span>
              <button type="button" class="stat-stepper-btn" onclick="window.matchesModule.stepStat(this, -1)">-</button>
              <span class="stat-stepper-value" id="quick-goals" style="color: var(--accent-ruby);">${ps.goals || 0}</span>
              <button type="button" class="stat-stepper-btn" onclick="window.matchesModule.stepStat(this, 1)">+</button>
            </div>

            <div class="stat-stepper">
              <span class="stat-stepper-label">👟 Kiến tạo:</span>
              <button type="button" class="stat-stepper-btn" onclick="window.matchesModule.stepStat(this, -1)">-</button>
              <span class="stat-stepper-value" id="quick-assists" style="color: var(--accent-cyan);">${ps.assists || 0}</span>
              <button type="button" class="stat-stepper-btn" onclick="window.matchesModule.stepStat(this, 1)">+</button>
            </div>

            <div class="stat-stepper">
              <span class="stat-stepper-label">🟨 Thẻ:</span>
              <button type="button" class="stat-stepper-btn" onclick="window.matchesModule.stepStat(this, -1)">-</button>
              <span class="stat-stepper-value" id="quick-yellow" style="color: #fbbf24;">${ps.yellowCards || 0}</span>
              <button type="button" class="stat-stepper-btn" onclick="window.matchesModule.stepStat(this, 1)">+</button>
            </div>
          </div>

          <div style="margin-bottom: 0.85rem;">
            <input type="text" class="form-control" id="quick-note" placeholder="Nhận xét màn trình diễn..." value="${escapeHtml(ps.note || '')}" style="font-size: 0.82rem; padding: 0.5rem 0.75rem;">
          </div>

          <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="window.matchesModule.toggleStarter('${playerId}')" style="font-size: 0.78rem;">
              ${ps.isStarter !== false ? 'Chuyển Dự Bị 🔄' : 'Đưa Vào Sân ⚽'}
            </button>
            <button class="btn btn-primary btn-sm" onclick="window.matchesModule.saveQuickEdit('${playerId}')">
              💾 Lưu Điểm
            </button>
          </div>
        </div>
      `;

      container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    toggleStarter(playerId) {
      const m = window.stateManager ? window.stateManager.getMatchById(this.currentMatchId) : null;
      if (!m) return;

      const stats = m.playerStats || [];
      const ps = stats.find(s => s.playerId === playerId);
      if (ps) {
        ps.isStarter = !ps.isStarter;
        window.stateManager.updateMatch(this.currentMatchId, { playerStats: stats });
        showToast('Đã đổi vị trí đá chính / dự bị');
        if (typeof this.renderDetailBody === 'function') this.renderDetailBody();
      }
    },

    saveQuickEdit(playerId) {
      const m = window.stateManager ? window.stateManager.getMatchById(this.currentMatchId) : null;
      if (!m) return;

      const sliderEl = document.getElementById('quick-rating-slider');
      const goalsEl = document.getElementById('quick-goals');
      const assistsEl = document.getElementById('quick-assists');
      const yellowEl = document.getElementById('quick-yellow');
      const noteEl = document.getElementById('quick-note');

      const rating = sliderEl ? (parseFloat(sliderEl.value) || 7.0) : 7.0;
      const goals = goalsEl ? (parseInt(goalsEl.innerText) || 0) : 0;
      const assists = assistsEl ? (parseInt(assistsEl.innerText) || 0) : 0;
      const yellowCards = yellowEl ? (parseInt(yellowEl.innerText) || 0) : 0;
      const note = noteEl ? noteEl.value.trim() : '';

      const stats = m.playerStats || [];
      const foundIdx = stats.findIndex(s => s.playerId === playerId);

      if (foundIdx !== -1) {
        stats[foundIdx].rating = rating;
        stats[foundIdx].goals = goals;
        stats[foundIdx].assists = assists;
        stats[foundIdx].yellowCards = yellowCards;
        stats[foundIdx].note = note;
      } else {
        stats.push({
          playerId,
          isStarter: true,
          rating,
          goals,
          assists,
          yellowCards,
          redCards: 0,
          note
        });
      }

      window.stateManager.updateMatch(this.currentMatchId, { playerStats: stats });
      showToast('🎉 Đã cập nhật điểm thành công!', 'success');

      if (typeof this.renderDetailBody === 'function') this.renderDetailBody();
      if (typeof this.renderMatches === 'function') this.renderMatches();
      if (window.awardsModule && typeof window.awardsModule.renderAwards === 'function') {
        window.awardsModule.renderAwards();
      }
      if (window.playersModule && typeof window.playersModule.renderPlayers === 'function') {
        window.playersModule.renderPlayers();
      }
      if (window.appModule && typeof window.appModule.renderDashboard === 'function') {
        window.appModule.renderDashboard();
      }
    },

    stepStat(btn, delta) {
      const container = btn.parentElement;
      if (!container) return;
      const valueSpan = container.querySelector('.stat-stepper-value');
      if (!valueSpan) return;
      let current = parseInt(valueSpan.innerText) || 0;
      current = Math.max(0, current + delta);
      valueSpan.innerText = current;
    },

    handleSaveRatings() {
      if (!this.currentMatchId) return;

      if (this.activeViewMode === 'list') {
        const rows = document.querySelectorAll('.player-rating-row-item');
        const updatedStats = [];

        rows.forEach(row => {
          const playerId = row.getAttribute('data-player-id');
          const sliderEl = row.querySelector('.rating-slider');
          const goalsEl = row.querySelector('.goals-val');
          const assistsEl = row.querySelector('.assists-val');
          const yellowEl = row.querySelector('.yellow-val');
          const redEl = row.querySelector('.red-val');
          const noteEl = row.querySelector('.player-note-val');

          const rating = sliderEl ? (parseFloat(sliderEl.value) || 7.0) : 7.0;
          const goals = goalsEl ? (parseInt(goalsEl.innerText) || 0) : 0;
          const assists = assistsEl ? (parseInt(assistsEl.innerText) || 0) : 0;
          const yellowCards = yellowEl ? (parseInt(yellowEl.innerText) || 0) : 0;
          const redCards = redEl ? (parseInt(redEl.innerText) || 0) : 0;
          const note = noteEl ? noteEl.value.trim() : '';

          updatedStats.push({
            playerId,
            isStarter: true,
            rating,
            goals,
            assists,
            yellowCards,
            redCards,
            note
          });
        });

        if (window.stateManager) {
          window.stateManager.updateMatch(this.currentMatchId, { playerStats: updatedStats });
        }
      }

      showToast('🎉 Đã lưu toàn bộ điểm số trận đấu!', 'success');
      if (typeof this.closeMatchDetailModal === 'function') this.closeMatchDetailModal();
      if (typeof this.renderMatches === 'function') this.renderMatches();
      if (window.awardsModule && typeof window.awardsModule.renderAwards === 'function') {
        window.awardsModule.renderAwards();
      }
      if (window.playersModule && typeof window.playersModule.renderPlayers === 'function') {
        window.playersModule.renderPlayers();
      }
      if (window.appModule && typeof window.appModule.renderDashboard === 'function') {
        window.appModule.renderDashboard();
      }
    }
  });

})(typeof window !== 'undefined' ? window : this);
