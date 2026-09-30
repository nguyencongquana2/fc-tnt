/**
 * Matches Module - Match List, Details Modal & CRUD Management
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

    const matches = window.stateManager.getMatches();
    const teamInfo = window.stateManager.data.teamInfo;

    // Hiển thị banner trạng thái nếu đang có trận đấu Live ngoài sân chưa kết thúc
    let liveBannerHtml = '';
    const activeDraft = this.getActiveLiveSession();
    if (activeDraft) {
      liveBannerHtml = `
        <div class="active-live-match-banner" onclick="window.matchesModule.openLiveCompanionModal()" title="Bấm để mở Trợ Lý Sân Cỏ và tiếp tục trận đấu">
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <span class="pulse-live-dot"></span>
            <div>
              <div style="font-weight: 800; font-size: 0.98rem; color: #fff; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span>🔴 TRẬN ĐANG ĐÁ TRỰC TIẾP:</span>
                <span style="color: var(--accent-gold);">${window.escapeHtml(activeDraft.opponent || 'FC Đối Thủ')}</span>
                <span style="background: rgba(0,0,0,0.4); padding: 0.1rem 0.5rem; border-radius: 4px; color: var(--accent-emerald);">${activeDraft.homeScore || 0} - ${activeDraft.awayScore || 0}</span>
              </div>
              <div style="font-size: 0.76rem; color: var(--text-dim); margin-top: 0.2rem;">
                ⏱️ Hiệp ${activeDraft.period || 1} • ${activeDraft.events?.length || 0} sự kiện ngoài sân • Bấm để tiếp tục ghi nhận trực tiếp
              </div>
            </div>
          </div>
          <button class="btn btn-emerald btn-sm" style="pointer-events: none;">
            Tiếp Tục Ghi Nhận Live ⚡
          </button>
        </div>
      `;
    }

    if (matches.length === 0) {
      container.innerHTML = liveBannerHtml + `
        <div style="text-align: center; padding: 3.5rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-xl); border: 1px dashed rgba(255,255,255,0.15);">
          <div style="font-size: 3.5rem; margin-bottom: 1rem;">⚽</div>
          <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem; color: #fff;">Chưa có trận đấu nào trong mùa giải</h3>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem; max-width: 450px; margin-left: auto; margin-right: auto;">
            Danh sách 15 anh em trong đội đã sẵn sàng. Hãy bấm nút dưới đây để nhập trận đấu thực tế đầu tiên và chấm điểm!
          </p>
          ${window.stateManager.isAdmin ? `
          <button class="btn btn-primary" onclick="window.matchesModule.openCreateMatchModal()" style="padding: 0.75rem 1.5rem; font-size: 1rem;">
            ➕ Thêm Trận Đấu Đầu Tiên (Sân 7 • 3-1-2)
          </button>` : ''}
        </div>
      `;
      return;
    }

    container.innerHTML = liveBannerHtml + matches.map(m => {
      try {
        let motm = null;
        let highestRating = -1;
        if (m.playerStats && Array.isArray(m.playerStats) && m.playerStats.length > 0) {
          m.playerStats.forEach(ps => {
            const r = Number(ps.rating) || 0;
            if (r > highestRating) {
              highestRating = r;
              motm = window.stateManager.getPlayerById(ps.playerId);
            }
          });
        }

        const resultClass = m.result === 'WIN' ? 'result-win' : m.result === 'DRAW' ? 'result-draw' : 'result-loss';
        const resultText = m.result === 'WIN' ? 'THẮNG' : m.result === 'DRAW' ? 'HÒA' : 'THUA';
        const cardResultClass = m.result === 'WIN' ? 'match-win' : m.result === 'DRAW' ? 'match-draw' : 'match-loss';
        const homeScore = m.homeScore ?? 0;
        const awayScore = m.awayScore ?? 0;
        const opponentName = window.escapeHtml(m.opponent || 'FC Đối Thủ');
        const venueName = window.escapeHtml(m.venue || 'Sân bóng');

        return `
          <div class="match-card ${cardResultClass}" onclick="window.matchesModule.openMatchDetailModal('${m.id}')">
            <div class="match-card-top-bar">
              <div class="match-meta-left">
                <span class="match-date-badge">📅 ${m.date || '---'} • ${m.time || '19:30'}</span>
                <span class="match-venue">📍 ${venueName} (Sân 7 • 3-1-2)</span>
              </div>
              
              <div class="match-meta-right" onclick="event.stopPropagation()">
                <button class="btn btn-secondary btn-sm match-finance-btn" onclick="window.financeModule.openFinanceModal('${m.id}')" title="Quản lý tiền sân, chia tiền & tạo mã VietQR" style="padding: 0.25rem 0.55rem; color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.1);">
                  💰 Tiền Sân ${m.finance && Array.isArray(m.finance.payments) && m.finance.payments.length > 0 ? `(${m.finance.payments.filter(p => p.isPaid).length}/${m.finance.payments.length})` : ''}
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
                <span class="score-num ${homeScore > awayScore ? 'win' : ''}">${homeScore}</span>
                <span class="score-divider">-</span>
                <span class="score-num ${awayScore > homeScore ? 'win' : ''}">${awayScore}</span>
              </div>

              <div class="team-box away">
                <div class="brand-icon-box away-brand">🛡️</div>
                <span class="team-title">${opponentName}</span>
              </div>
            </div>

            <div class="match-card-bottom">
              <div class="match-note-text">
                ${m.note ? `"${window.escapeHtml(m.note)}"` : 'Sơ đồ 3 Hậu Vệ - 1 Giữa - 2 Cánh Tiền Đạo'}
              </div>

              <div class="match-bottom-details">
                ${motm && highestRating >= 7.0 ? `
                  <div class="motm-badge-preview">
                    <img class="motm-avatar-small" src="${motm.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" alt="${window.escapeHtml(motm.name || 'Cầu thủ')}">
                    <span>MOTM: ${window.escapeHtml((motm.nickname && motm.nickname.trim()) ? motm.nickname.trim() : (motm.name || 'Cầu thủ'))} (${highestRating}⭐)</span>
                  </div>
                ` : '<div></div>'}
                
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
  },

  openCreateMatchModal(editId = null) {
    if (!window.stateManager.isAdmin) {
      window.showToast('Chỉ Quản trị viên mới có quyền thêm hoặc sửa trận đấu!', 'error');
      return;
    }
    this.currentEditMatchId = editId;
    const modal = document.getElementById('match-form-modal');
    const title = document.getElementById('match-form-title');
    const form = document.getElementById('match-form');
    form.reset();

    const playersContainer = document.getElementById('match-lineup-selection');
    const allPlayers = window.stateManager.getPlayers();

    if (editId) {
      title.innerHTML = '✏️ Sửa Thông Tin Trận Đấu (Sân 7 • 3-1-2)';
      const m = window.stateManager.getMatchById(editId);
      if (m) {
        document.getElementById('match-date').value = m.date || '';
        document.getElementById('match-time').value = m.time || '';
        document.getElementById('match-opponent').value = m.opponent || '';
        document.getElementById('match-venue').value = m.venue || '';
        document.getElementById('match-type').value = m.type || '7';
        document.getElementById('match-home-score').value = m.homeScore;
        document.getElementById('match-away-score').value = m.awayScore;
        document.getElementById('match-note').value = m.note || '';

        const activePlayerIds = (m.playerStats || []).map(ps => ps.playerId);
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
    } else {
      title.innerHTML = '⚽ Thêm Trận Đấu Mới (Sân 7 • 3-1-2)';
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('match-date').value = today;
      document.getElementById('match-time').value = '19:30';
      document.getElementById('match-type').value = '7';
      document.getElementById('match-home-score').value = '0';
      document.getElementById('match-away-score').value = '0';

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

    const dz = document.getElementById('match-form-danger-zone');
    if (dz) {
      dz.style.display = editId ? 'block' : 'none';
    }

    modal.classList.add('active');
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
    modal.classList.remove('active');
    this.currentEditMatchId = null;
  },

  handleSaveMatch(e) {
    e.preventDefault();
    const opponent = document.getElementById('match-opponent').value.trim();
    if (!opponent) {
      window.showToast('Vui lòng nhập tên đối thủ!', 'error');
      return;
    }

    const homeScore = parseInt(document.getElementById('match-home-score').value) || 0;
    const awayScore = parseInt(document.getElementById('match-away-score').value) || 0;

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
      const currentMatch = window.stateManager.getMatchById(this.currentEditMatchId);
      const existingStats = currentMatch.playerStats || [];

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
        date: document.getElementById('match-date').value,
        time: document.getElementById('match-time').value,
        opponent,
        venue: document.getElementById('match-venue').value.trim(),
        type: document.getElementById('match-type').value,
        formation: '3-1-2',
        homeScore,
        awayScore,
        result,
        note: document.getElementById('match-note').value.trim(),
        playerStats: updatedPlayerStats
      };

      window.stateManager.updateMatch(this.currentEditMatchId, updatedData);
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
        date: document.getElementById('match-date').value,
        time: document.getElementById('match-time').value,
        opponent,
        venue: document.getElementById('match-venue').value.trim() || 'Sân bóng cỏ nhân tạo',
        type: document.getElementById('match-type').value,
        formation: '3-1-2',
        homeScore,
        awayScore,
        result,
        note: document.getElementById('match-note').value.trim(),
        playerStats
      };

      const created = window.stateManager.addMatch(newMatchData);
      window.showToast('Đã tạo trận đấu mới! Giờ bạn có thể chấm điểm chi tiết.');
      this.closeCreateMatchModal();
      this.renderMatches();
      this.openMatchDetailModal(created.id);
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

  openMatchDetailModal(matchId) {
    this.currentMatchId = matchId;
    const m = window.stateManager.getMatchById(matchId);
    if (!m) return;

    const modal = document.getElementById('match-detail-modal');
    const headerTitle = document.getElementById('match-detail-title');
    const teamInfo = window.stateManager.data.teamInfo;

    const escapedOpponent = window.escapeHtml(m.opponent || 'Đối thủ');
    const escapedVenue = window.escapeHtml(m.venue || 'Sân bóng');
    const escapedNote = m.note ? window.escapeHtml(m.note) : '';

    headerTitle.innerHTML = `
      <span>⚽ vs ${escapedOpponent} (${m.homeScore} - ${m.awayScore})</span>
    `;

    const infoHeader = document.getElementById('match-detail-info-header');
    infoHeader.innerHTML = `
      <div class="match-detail-header-compact">
        <div class="match-detail-header-left">
          <div class="match-detail-header-teams">
            ${window.escapeHtml(teamInfo?.name || 'Đội nhà')} <span class="score-win-highlight">${m.homeScore}</span> : <span class="score-loss-highlight">${m.awayScore}</span> ${escapedOpponent}
          </div>
          <div class="match-detail-header-sub">
            <span>📅 ${m.date}</span>
            <span>📍 ${escapedVenue}</span>
            <span class="formation-tag">Sân 7 • 3-1-2</span>
            ${escapedNote ? `<span class="note-tag" title="${escapedNote}">💬 ${escapedNote}</span>` : ''}
          </div>
        </div>
        <div class="match-detail-header-actions">
          <button class="btn btn-secondary btn-sm" onclick="window.financeModule.openFinanceModal('${m.id}')" title="Quản lý tiền sân, chia tiền & tạo mã VietQR" style="color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.1); padding: 0.25rem 0.55rem; font-size: 0.78rem;">
            💰 Tiền Sân
          </button>
          <button class="btn btn-ai-sparkle btn-sm" onclick="window.matchesModule.openAiRatingModal('${m.id}')" title="Tự động chấm điểm & viết nhận xét bằng AI" style="padding: 0.25rem 0.55rem; font-size: 0.78rem;">
            🤖 AI Chấm Điểm
          </button>
          <button class="btn btn-secondary btn-sm" onclick="window.matchesModule.scrollToReviews()" title="Xem toàn bộ nhận xét chi tiết của từng cầu thủ" style="padding: 0.25rem 0.55rem; font-size: 0.78rem;">
            💬 Nhận Xét
          </button>
          <button class="btn btn-gold btn-sm" onclick="window.posterModule.openPosterModal('${m.id}')" title="Xuất Poster Ảnh Khoe Mạng Xã Hội" style="padding: 0.25rem 0.55rem; font-size: 0.78rem;">
            🎨 Poster
          </button>
          ${window.stateManager.isAdmin ? `
            <button class="btn btn-secondary btn-sm" onclick="window.matchesModule.requestEditMatch('${m.id}')" style="padding: 0.25rem 0.55rem; font-size: 0.78rem;">✏️ Sửa</button>
            <button class="btn btn-danger btn-sm" onclick="window.matchesModule.requestDeleteMatch('${m.id}')" style="padding: 0.25rem 0.55rem; font-size: 0.78rem;">🗑️ Xóa</button>
          ` : ''}
        </div>
      </div>
    `;

    this.renderDetailBody();
    modal.classList.add('active');
  },

  renderDetailBody() {
    const m = window.stateManager.getMatchById(this.currentMatchId);
    if (!m) return;

    const body = document.getElementById('match-rating-list-container');
    const playerStats = m.playerStats || [];

    if (playerStats.length === 0) {
      body.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          Chưa có cầu thủ nào trong danh sách ra sân trận này.
          <br><br>
          <button class="btn btn-secondary btn-sm" onclick="window.matchesModule.requestEditMatch('${m.id}')">Chỉnh sửa danh sách ra sân</button>
        </div>
      `;
      return;
    }

    let highestRating = -1;
    let motmId = null;
    playerStats.forEach(ps => {
      const r = Number(ps.rating) || 0;
      if (r > highestRating) {
        highestRating = r;
        motmId = ps.playerId;
      }
    });

    const allStats = [...playerStats];
    const starters = allStats.filter(ps => ps.isStarter !== false);
    const subs = allStats.filter(ps => ps.isStarter === false);

    // 7 vị trí chuẩn sơ đồ 3-1-2
    const slotDefs = [
      { id: 'GK', name: 'THỦ MÔN (GK)', row: 1 },
      { id: 'DF_L', name: 'CÁNH TRÁI', row: 2 },
      { id: 'DF_C', name: 'THÒNG GIỮA', row: 2 },
      { id: 'DF_R', name: 'CÁNH PHẢI', row: 2 },
      { id: 'MF_C', name: 'TIỀN VỆ GIỮA', row: 3 },
      { id: 'FW_L', name: 'TIỀN ĐẠO TRÁI', row: 4 },
      { id: 'FW_R', name: 'TIỀN ĐẠO PHẢI', row: 4 }
    ];

    // Phân bổ các vị trí cho starters nếu chưa có slot
    const usedSlots = new Set();
    starters.forEach(ps => {
      if (ps.pitchSlot && slotDefs.some(s => s.id === ps.pitchSlot) && !usedSlots.has(ps.pitchSlot)) {
        usedSlots.add(ps.pitchSlot);
      } else {
        ps.pitchSlot = null;
      }
    });

    // Gán slot tự động cho các cầu thủ chưa có slot
    starters.forEach(ps => {
      if (!ps.pitchSlot) {
        const p = window.stateManager.getPlayerById(ps.playerId);
        const pos = p ? p.position : 'DF';

        let preferredSlot = null;
        if (pos === 'GK' && !usedSlots.has('GK')) preferredSlot = 'GK';
        else if (pos === 'DF') {
          if (!usedSlots.has('DF_L')) preferredSlot = 'DF_L';
          else if (!usedSlots.has('DF_C')) preferredSlot = 'DF_C';
          else if (!usedSlots.has('DF_R')) preferredSlot = 'DF_R';
        } else if (pos === 'MF') {
          if (!usedSlots.has('MF_C')) preferredSlot = 'MF_C';
          else if (!usedSlots.has('DF_C')) preferredSlot = 'DF_C';
        } else if (pos === 'FW') {
          if (!usedSlots.has('FW_L')) preferredSlot = 'FW_L';
          else if (!usedSlots.has('FW_R')) preferredSlot = 'FW_R';
        }

        if (!preferredSlot) {
          const available = slotDefs.find(s => !usedSlots.has(s.id));
          if (available) preferredSlot = available.id;
        }

        if (preferredSlot) {
          ps.pitchSlot = preferredSlot;
          usedSlots.add(preferredSlot);
        }
      }
    });

    // Lấy cầu thủ cho từng slot
    const getSlotPlayer = (slotId) => starters.find(ps => ps.pitchSlot === slotId);

    const gkPs = getSlotPlayer('GK');
    const dfLPs = getSlotPlayer('DF_L');
    const dfCPs = getSlotPlayer('DF_C');
    const dfRPs = getSlotPlayer('DF_R');
    const mfCPs = getSlotPlayer('MF_C');
    const fwLPs = getSlotPlayer('FW_L');
    const fwRPs = getSlotPlayer('FW_R');

    body.innerHTML = `
        <div class="match-detail-split-layout">
          <!-- CỘT TRÁI: SÂN BÓNG 3-1-2 TRỌN VẸN (KÉO THẢ ĐỔI VỊ TRÍ) -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.4rem;">
              <span style="font-family: var(--font-display); font-size: 0.85rem; font-weight: 800; color: var(--accent-gold); letter-spacing: 0.5px; display: flex; align-items: center; gap: 0.4rem;">
                🏟️ SƠ ĐỒ 3-1-2 TRÊN SÂN
                <span style="background: rgba(16,185,129,0.2); color: var(--accent-emerald); font-size: 0.7rem; padding: 0.15rem 0.45rem; border-radius: 4px; border: 1px solid rgba(16,185,129,0.4);">
                  ✋ Kéo thả để đổi vị trí
                </span>
              </span>
              <span style="font-size: 0.75rem; color: var(--text-dim);">Bấm để chấm điểm • Kéo để xếp đội hình</span>
            </div>

            <div class="sofascore-pitch-container" id="sofascore-pitch-dropzone">
              <!-- Tactical AI Radar Scan Wave & Laser -->
              <div class="tactical-pitch-radar">
                <div class="radar-scan-beam"></div>
                <div class="radar-scan-trail"></div>
              </div>
              <div class="tactical-radar-live-tag">
                <span class="radar-live-blip"></span>
                <span>AI TACTICAL RADAR • LIVE</span>
              </div>
              <div class="pitch-penalty-box-top"></div>
              <div class="pitch-center-circle"></div>
              <div class="pitch-center-line"></div>
              <div class="pitch-penalty-box-bottom"></div>

              <div class="pitch-formation-grid">
                <!-- HÀNG 1: THỦ MÔN (1 GK) -->
                <div class="pitch-row" style="justify-content: center;">
                  ${this.renderPitchSlot('GK', 'GK', gkPs, motmId)}
                </div>

                <!-- HÀNG 2: 3 HẬU VỆ (3 DF: Cánh Trái - Thòng Giữa - Cánh Phải) -->
                <div class="pitch-row" style="justify-content: space-between; padding: 0 4%;">
                  ${this.renderPitchSlot('DF_L', 'CÁNH TRÁI', dfLPs, motmId)}
                  ${this.renderPitchSlot('DF_C', 'THÒNG GIỮA', dfCPs, motmId)}
                  ${this.renderPitchSlot('DF_R', 'CÁNH PHẢI', dfRPs, motmId)}
                </div>

                <!-- HÀNG 3: 1 TIỀN VỆ GIỮA (1 MF) -->
                <div class="pitch-row" style="justify-content: center;">
                  ${this.renderPitchSlot('MF_C', 'TIỀN VỆ GIỮA', mfCPs, motmId)}
                </div>

                <!-- HÀNG 4: 2 TIỀN ĐẠO CÁNH (2 FW) -->
                <div class="pitch-row" style="justify-content: space-around; padding: 0 10%;">
                  ${this.renderPitchSlot('FW_L', 'TIỀN ĐẠO TRÁI', fwLPs, motmId)}
                  ${this.renderPitchSlot('FW_R', 'TIỀN ĐẠO PHẢI', fwRPs, motmId)}
                </div>
              </div>
            </div>
          </div>

          <!-- CỘT PHẢI: BĂNG GHẾ DỰ BỊ & KHUNG CHẤM ĐIỂM NHANH -->
          <div class="match-right-sidebar">
            <div id="quick-edit-container"></div>

            <div class="substitutes-bench-section" id="substitutes-bench-zone"
                 ondragover="window.matchesModule.handleBenchDragOver(event)"
                 ondragleave="window.matchesModule.handleBenchDragLeave(event)"
                 ondrop="window.matchesModule.handleBenchDrop(event)">
              <div class="substitutes-bench-header">
                <span style="display: flex; align-items: center; gap: 0.4rem;">
                  🔄 Cầu Thủ Dự Bị (${subs.length})
                </span>
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  ${window.stateManager.isAdmin ? `
                  <button type="button" class="btn btn-secondary btn-sm" onclick="window.matchesModule.requestEditMatch('${m.id}')" title="Thêm hoặc bớt cầu thủ trong trận đấu này (Yêu cầu mã PIN)" style="font-size: 0.72rem; padding: 0.2rem 0.5rem; background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2);">
                    👥 Thêm / Bớt Cầu Thủ
                  </button>
                  ` : ''}
                  <span style="font-size: 0.72rem; color: var(--accent-gold); text-transform: none; font-weight: normal;">
                    Kéo vào sân để thay người
                  </span>
                </div>
              </div>
              <div class="substitutes-grid">
                ${subs.length > 0 ? subs.map(ps => {
      const p = window.stateManager.getPlayerById(ps.playerId);
      if (!p) return '';
      const rating = Number(ps.rating) || 7.0;
      const ratingClass = this.getRatingClass(rating);
      const displayName = (p.nickname && p.nickname.trim()) ? p.nickname.trim() : p.name;

      return `
                    <div class="sub-player-card" 
                         id="player-card-${p.id}"
                         draggable="true"
                         ondragstart="window.matchesModule.handleDragStart(event, '${p.id}', 'BENCH')"
                         ondragend="window.matchesModule.handleDragEnd(event)"
                         ondragover="window.matchesModule.handleSubCardDragOver(event)"
                         ondragleave="window.matchesModule.handleSubCardDragLeave(event)"
                         ondrop="window.matchesModule.handleSubCardDrop(event, '${p.id}')"
                         onclick="window.matchesModule.openQuickEdit('${p.id}')">
                      ${ps.note ? `<div class="sub-speech-indicator" title="Nhận xét: ${window.escapeHtml(ps.note)}">💬</div>` : ''}
                      <div class="sub-avatar-wrap">
                        <img class="sub-avatar" src="${p.avatar}" alt="${window.escapeHtml(displayName)}">
                        <span class="sub-rating-badge ${ratingClass}">${rating.toFixed(1)}</span>
                      </div>
                      <div class="sub-name">${window.escapeHtml(displayName)}</div>
                      <div class="sub-pos">#${p.number} • ${p.position}</div>
                      ${ps.goals > 0 ? `<span style="font-size: 0.72rem; color: var(--accent-ruby); font-weight:700; margin-top:2px;">⚽ ${ps.goals}</span>` : ''}
                      ${ps.assists > 0 ? `<span style="font-size: 0.72rem; color: var(--accent-cyan); font-weight:700;">👟 ${ps.assists}</span>` : ''}
                    </div>
                  `;
    }).join('') : '<p style="grid-column: 1/-1; text-align: center; color: var(--text-dim); font-size: 0.85rem; padding: 1rem;">Không có cầu thủ dự bị (Kéo cầu thủ từ sân vào đây để dự bị)</p>'}
              </div>
            </div>
          </div>
        </div>

        <!-- BẢNG NHẬN XÉT CHI TIẾT MÀN TRÌNH DIỄN CỦA TỪNG CẦU THỦ -->
        <div class="match-player-reviews-wrapper" id="match-player-reviews-section">
          <div class="match-reviews-header">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <span style="font-size: 1.35rem;">💬</span>
              <div>
                <div style="font-weight: 800; font-size: 1.05rem; color: #fff;">
                  Bảng Nhận Xét & Đánh Giá Phong Độ Cầu Thủ (${playerStats.length} cầu thủ)
                </div>
                <div style="font-size: 0.75rem; color: var(--text-dim);">
                  Chi tiết điểm số, vai trò chiến thuật & lời bình phẩm của từng thành viên
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.matchesModule.toggleReviewsCollapse()" style="font-size: 0.78rem; padding: 0.35rem 0.85rem;">
                <span id="reviews-collapse-btn-text">🔽 Thu gọn</span>
              </button>
            </div>
          </div>

          <!-- Bộ lọc nhận xét -->
          <div class="match-reviews-filters" id="reviews-filter-container">
            <button type="button" class="review-filter-btn active" onclick="window.matchesModule.filterReviews('all', this)">Tất cả (${playerStats.length})</button>
            <button type="button" class="review-filter-btn" onclick="window.matchesModule.filterReviews('has-note', this)">Có nhận xét (${playerStats.filter(s => s.note && s.note.trim().length > 0).length})</button>
            <button type="button" class="review-filter-btn" onclick="window.matchesModule.filterReviews('starter', this)">Đá chính (7)</button>
            <button type="button" class="review-filter-btn" onclick="window.matchesModule.filterReviews('bench', this)">Dự bị (${playerStats.filter(s => s.isStarter === false).length})</button>
            ${motmId ? `<button type="button" class="review-filter-btn" onclick="window.matchesModule.filterReviews('motm', this)">👑 MOTM</button>` : ''}
          </div>

          <div id="match-reviews-grid-body" class="match-reviews-grid">
            ${playerStats.map(ps => {
      const p = window.stateManager.getPlayerById(ps.playerId);
      if (!p) return '';
      const rating = Number(ps.rating) || 7.0;
      const ratingClass = this.getRatingClass(rating);
      const isMOTM = ps.playerId === motmId && rating >= 7.0;
      const goals = Number(ps.goals) || 0;
      const assists = Number(ps.assists) || 0;
      const yellow = Number(ps.yellowCards) || 0;
      const red = Number(ps.redCards) || 0;
      const note = ps.note || '';
      const displayName = (p.nickname && p.nickname.trim()) ? p.nickname.trim() : p.name;
      const realName = (p.name && p.name.trim() && p.name.trim().toLowerCase() !== displayName.toLowerCase()) ? p.name.trim() : '';

      return `
                <div class="match-review-card ${isMOTM ? 'is-motm-card' : ''}" 
                     id="review-card-${p.id}"
                     data-is-starter="${ps.isStarter !== false ? 'true' : 'false'}"
                     data-has-note="${note.trim().length > 0 ? 'true' : 'false'}"
                     data-is-motm="${isMOTM ? 'true' : 'false'}"
                     onclick="window.matchesModule.openQuickEdit('${p.id}')" 
                     title="Bấm để xem/chỉnh sửa điểm & nhận xét">
                  <div class="review-card-top">
                    <div style="display: flex; align-items: center; gap: 0.65rem;">
                      <img class="review-avatar" src="${p.avatar}" alt="${window.escapeHtml(displayName)}">
                      <div>
                        <div class="review-player-name">
                          ${window.escapeHtml(displayName)} #${p.number}
                          ${isMOTM ? '<span class="review-motm-badge">👑 MOTM</span>' : ''}
                        </div>
                        <div class="review-player-pos">
                          ${p.position} ${realName ? `• ${window.escapeHtml(realName)}` : ''} • ${ps.isStarter !== false ? '<span style="color:var(--accent-emerald); font-weight:700;">Đá chính</span>' : '<span style="color:var(--accent-cyan); font-weight:700;">Dự bị</span>'}
                        </div>
                      </div>
                    </div>

                    <div style="text-align: right;">
                      <div class="sofa-rating-box ${ratingClass}" style="display: inline-block; font-size: 0.95rem; font-weight: 900; padding: 0.2rem 0.55rem; min-width: 40px; text-align: center;">
                        ${rating.toFixed(1)}
                      </div>
                    </div>
                  </div>

                  ${(goals > 0 || assists > 0 || yellow > 0 || red > 0) ? `
                    <div class="review-stats-row">
                      ${goals > 0 ? `<span class="ai-stat-badge stat-badge-goal">⚽ ${goals} Bàn thắng</span>` : ''}
                      ${assists > 0 ? `<span class="ai-stat-badge stat-badge-assist">👟 ${assists} Kiến tạo</span>` : ''}
                      ${yellow > 0 ? `<span class="ai-stat-badge" style="background: rgba(245,158,11,0.2); color: #fbbf24;">🟨 ${yellow} Thẻ vàng</span>` : ''}
                      ${red > 0 ? `<span class="ai-stat-badge" style="background: rgba(239,68,68,0.2); color: #ef4444;">🟥 ${red} Thẻ đỏ</span>` : ''}
                    </div>
                  ` : ''}

                  <div class="review-quote-box">
                    ${note ? `💬 "${window.escapeHtml(note)}"` : '<span style="color: var(--text-dim); font-style: italic;">Chưa có nhận xét chi tiết. Hãy dùng "🤖 AI Chấm Điểm" để tự động sinh nhận xét.</span>'}
                  </div>
                </div>
              `;
    }).join('')}
          </div>
        </div>
      `;
  },

  closeMatchDetailModal() {
    const modal = document.getElementById('match-detail-modal');
    modal.classList.remove('active');
    this.currentMatchId = null;
  },

  // =========================================================================
  // XÁC THỰC MÃ PIN & KHU VỰC NGUY HIỂM (SỬA & XÓA TRẬN ĐẤU)
  // =========================================================================
  pendingPinAction: null,

  requestEditMatch(id, e = null) {
    if (e) e.stopPropagation();
    if (!window.stateManager.isAdmin) {
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
    if (!window.stateManager.isAdmin) {
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
    if (!window.stateManager.isAdmin) {
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
    const m = window.stateManager.getMatchById(id);
    const opponent = m ? m.opponent : 'trận đấu';

    window.stateManager.deleteMatch(id);
    window.showToast(`🗑️ Đã xóa vĩnh viễn trận gặp "${opponent}"!`, 'info');

    this.closeCreateMatchModal();
    this.closeMatchDetailModal();
    this.renderMatches();
    if (window.awardsModule) window.awardsModule.renderAwards();
    if (window.playersModule) window.playersModule.renderPlayers();
    if (window.appModule) window.appModule.renderDashboard();
  },

  executeClearAllMatches() {
    window.stateManager.clearAllMatches();
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
  },
});
