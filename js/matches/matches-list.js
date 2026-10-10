/**
 * FC TNT - Matches List & Live Banner Submodule (js/matches/matches-list.js)
 * Quản lý hiển thị danh sách trận đấu mùa giải & thẻ thông báo Live Match đang diễn ra
 */

window.matchesModule = window.matchesModule || {};

Object.assign(window.matchesModule, {
  getActiveLiveSession() {
    try {
      const raw = localStorage.getItem('fctnt_live_pitch_draft');
      if (raw) {
        const draft = JSON.parse(raw);
        const age = Date.now() - (draft.savedAt || 0);
        if (age < 6 * 3600 * 1000 && (draft.timerSeconds > 0 || (draft.events && draft.events.length > 0) || draft.homeScore > 0 || draft.awayScore > 0 || draft.timerRunning)) {
          return draft;
        }
      }
    } catch (e) {
      console.warn('[Matches] Lỗi parse bản nháp Live Match từ localStorage:', e);
    }
    return null;
  },

  renderMatches() {
    const container = document.getElementById('matches-list-container');
    if (!container) return;

    const matches = window.stateManager ? window.stateManager.getMatches() : [];
    const teamInfo = window.stateManager ? window.stateManager.data.teamInfo : null;

    // Hiển thị banner trạng thái nếu đang có trận đấu Live ngoài sân chưa kết thúc
    const liveDraft = this.getActiveLiveSession();
    const liveBannerContainer = document.getElementById('matches-live-active-banner');
    if (liveBannerContainer) {
      if (liveDraft) {
        const mins = Math.floor((liveDraft.timerSeconds || 0) / 60);
        const secs = (liveDraft.timerSeconds || 0) % 60;
        const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        const opponentName = liveDraft.opponent || 'Đối thủ';
        const homeScore = liveDraft.homeScore || 0;
        const awayScore = liveDraft.awayScore || 0;
        const isRunning = !!liveDraft.timerRunning;

        liveBannerContainer.innerHTML = `
          <div class="live-active-match-card" onclick="window.matchesModule.openLiveMatchCompanion()">
            <div class="live-card-pulse-badge">
              <span class="live-indicator-dot"></span>
              <span>${isRunning ? 'TRẬN ĐẤU ĐANG DIỄN RA TRỰC TIẾP' : 'BẢN NHÁP TRẬN ĐẤU ĐANG TẠM DỪNG'}</span>
            </div>
            <div class="live-card-body">
              <div class="live-card-teams">
                <span class="live-team-name">${window.escapeHtml(teamInfo?.name || 'FC TNT')}</span>
                <span class="live-card-score">${homeScore} - ${awayScore}</span>
                <span class="live-team-name">${window.escapeHtml(opponentName)}</span>
              </div>
              <div class="live-card-meta">
                <span class="live-time-chip">⏱️ ${timeStr}</span>
                <span class="live-events-count">⚡ ${liveDraft.events ? liveDraft.events.length : 0} sự kiện</span>
                <span class="live-venue-chip">📍 ${window.escapeHtml(liveDraft.venue || 'Sân bóng')}</span>
              </div>
            </div>
            <div class="live-card-cta">
              <button class="btn btn-emerald btn-sm live-pulse-btn">
                ⚽ Tiếp tục trợ lý sân cỏ & ghi bàn →
              </button>
            </div>
          </div>
        `;
        liveBannerContainer.style.display = 'block';
      } else {
        liveBannerContainer.innerHTML = '';
        liveBannerContainer.style.display = 'none';
      }
    }

    if (matches.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚽</div>
          <p style="font-size: 1.1rem; margin-bottom: 1rem;">Chưa có trận đấu nào được ghi nhận.</p>
          <button class="btn btn-primary" onclick="window.matchesModule.openCreateMatchModal()">+ Thêm Trận Đấu Đầu Tiên</button>
        </div>
      `;
      return;
    }

    container.innerHTML = matches.map(m => {
      try {
        const resultClass = m.result === 'WIN' ? 'result-win' : m.result === 'DRAW' ? 'result-draw' : 'result-loss';
        const resultText = m.result === 'WIN' ? 'THẮNG' : m.result === 'DRAW' ? 'HÒA' : 'THUA';
        const cardResultClass = m.result === 'WIN' ? 'match-win' : m.result === 'DRAW' ? 'match-draw' : 'match-loss';

        // Tìm MOTM (Cầu thủ có điểm cao nhất >= 7.0)
        let motm = null;
        let highestRating = -1;
        if (m.playerStats && m.playerStats.length > 0) {
          m.playerStats.forEach(ps => {
            const r = Number(ps.rating) || 0;
            if (r > highestRating) {
              highestRating = r;
              motm = ps;
            }
          });
        }
        const motmPlayer = (motm && highestRating >= 7.0 && window.stateManager) ? window.stateManager.getPlayerById(motm.playerId) : null;
        const motmName = motmPlayer ? ((motmPlayer.nickname && motmPlayer.nickname.trim()) ? motmPlayer.nickname.trim() : motmPlayer.name) : '';

        const totalGoals = (m.playerStats || []).reduce((sum, ps) => sum + (ps.goals || 0), 0);
        const totalAssists = (m.playerStats || []).reduce((sum, ps) => sum + (ps.assists || 0), 0);

        const escapedOpponent = window.escapeHtml(m.opponent || 'Đối thủ');
        const escapedVenue = window.escapeHtml(m.venue || 'Sân bóng');
        const escapedNote = m.note ? window.escapeHtml(m.note) : '';

        const financePaidCount = (m.finance && m.finance.payments) ? m.finance.payments.filter(p => p.isPaid).length : 0;
        const financeTotalCount = (m.finance && m.finance.payments) ? m.finance.payments.length : 0;

        return `
          <div class="match-card ${cardResultClass}" onclick="window.matchesModule.openMatchDetailModal('${m.id}')">
            <div class="match-card-top-bar">
              <div class="match-meta-left">
                <span class="match-date-badge">📅 ${m.date} ${m.time ? `• ${m.time}` : ''}</span>
                <span class="match-venue">📍 ${escapedVenue} (Sân 7 • 3-1-2)</span>
              </div>
              
              <div class="match-meta-right" onclick="event.stopPropagation()">
                <button class="btn btn-secondary btn-sm match-finance-btn" onclick="window.financeModule.openFinanceModal('${m.id}')" title="Quản lý tiền sân, chia tiền & tạo mã VietQR" style="padding: 0.25rem 0.55rem; color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.1); font-size: 0.78rem;">
                  💰 Tiền Sân ${financeTotalCount > 0 ? `(${financePaidCount}/${financeTotalCount})` : ''}
                </button>
                <span class="match-result-badge ${resultClass}">${resultText}</span>
              </div>
            </div>

            <div class="match-scoreboard">
              <div class="team-box home">
                <span class="team-title">${window.escapeHtml(teamInfo?.name || 'FC TNT')}</span>
                <div class="brand-icon-box">⚽</div>
              </div>

              <div class="score-display">
                <span class="score-num ${m.homeScore > m.awayScore ? 'win' : ''}">${m.homeScore}</span>
                <span class="score-divider">-</span>
                <span class="score-num ${m.awayScore > m.homeScore ? 'win' : ''}">${m.awayScore}</span>
              </div>

              <div class="team-box away">
                <div class="brand-icon-box away-brand">🛡️</div>
                <span class="team-title">${escapedOpponent}</span>
              </div>
            </div>

            <div class="match-card-bottom">
              <div class="match-note-text">
                ${escapedNote ? `💬 "${escapedNote}"` : `⚽ ${totalGoals} bàn • 👟 ${totalAssists} kiến tạo • Sơ đồ sân 7 (3-1-2)`}
              </div>

              <div class="match-bottom-details">
                ${motmPlayer ? `
                  <div class="motm-badge-preview">
                    ${motmPlayer.avatar ? `<img class="motm-avatar-small" src="${window.escapeHtml(motmPlayer.avatar)}" alt="${window.escapeHtml(motmName)}">` : ''}
                    <span>👑 MOTM: <strong>${window.escapeHtml(motmName)}</strong> (${highestRating.toFixed(1)}⭐)</span>
                  </div>
                ` : `
                  <div style="font-size: 0.78rem; color: var(--text-dim); display: flex; gap: 0.6rem;">
                    <span>⚽ ${totalGoals} bàn</span>
                    <span>👟 ${totalAssists} kiến tạo</span>
                  </div>
                `}
                
                <div class="match-view-detail-btn">
                  🏟️ Xem Sơ Đồ 3-1-2 & Chấm Điểm →
                </div>
              </div>
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Error rendering match card:', m, err);
        return '';
      }
    }).join('');
  }
});
