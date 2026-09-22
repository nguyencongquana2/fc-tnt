/**
 * Matches & Sofascore Pitch Module - FC TNT
 * Quản lý trận đấu, xóa từng trận nhanh trực tiếp ngoài thẻ, xóa tất cả trận đấu
 */

window.matchesModule = {
  currentMatchId: null,
  currentEditMatchId: null,
  activeViewMode: 'pitch', // 'pitch' or 'list'

  init() {
    this.bindEvents();
    this.renderMatches();
  },

  bindEvents() {
    const addMatchBtn = document.getElementById('add-match-btn');
    if (addMatchBtn) {
      addMatchBtn.addEventListener('click', () => this.openCreateMatchModal());
    }

    const matchForm = document.getElementById('match-form');
    if (matchForm) {
      matchForm.addEventListener('submit', (e) => this.handleSaveMatch(e));
    }

    const saveRatingBtn = document.getElementById('save-match-ratings-btn');
    if (saveRatingBtn) {
      saveRatingBtn.addEventListener('click', () => this.handleSaveRatings());
    }
  },

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
    } catch (e) {}
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
                <span style="color: var(--accent-gold);">${activeDraft.opponent || 'FC Đối Thủ'}</span>
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
      let motm = null;
      let highestRating = -1;
      if (m.playerStats && m.playerStats.length > 0) {
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

      return `
        <div class="match-card ${cardResultClass}" onclick="window.matchesModule.openMatchDetailModal('${m.id}')">
          <div class="match-card-top-bar">
            <div class="match-meta-left">
              <span class="match-date-badge">📅 ${m.date} • ${m.time || '19:30'}</span>
              <span class="match-venue">📍 ${m.venue || 'Sân bóng'} (Sân 7 • 3-1-2)</span>
            </div>
            
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;" onclick="event.stopPropagation()">
              <button class="btn btn-secondary btn-sm" onclick="window.financeModule.openFinanceModal('${m.id}')" title="Quản lý tiền sân, chia tiền & tạo mã VietQR" style="padding: 0.25rem 0.6rem; color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.1);">
                💰 Tiền Sân ${m.finance && m.finance.payments && m.finance.payments.length > 0 ? `(${m.finance.payments.filter(p => p.isPaid).length}/${m.finance.payments.length})` : ''}
              </button>
              <span class="match-result-badge ${resultClass}">${resultText}</span>
            </div>
          </div>

          <div class="match-scoreboard">
            <div class="team-box home">
              <span class="team-title">${teamInfo?.name || 'FC TNT'}</span>
              <div class="brand-icon-box" style="width:36px; height:36px; font-size:1.1rem;">⚽</div>
            </div>

            <div class="score-display">
              <span class="score-num ${m.homeScore > m.awayScore ? 'win' : ''}">${m.homeScore}</span>
              <span class="score-divider">-</span>
              <span class="score-num ${m.awayScore > m.homeScore ? 'win' : ''}">${m.awayScore}</span>
            </div>

            <div class="team-box away">
              <div class="brand-icon-box" style="width:36px; height:36px; font-size:1.1rem; background: #334155; box-shadow: none;">🛡️</div>
              <span class="team-title">${m.opponent}</span>
            </div>
          </div>

          <div class="match-card-bottom">
            <div style="color: var(--text-dim); font-size: 0.85rem; font-style: italic;">
              ${m.note ? `"${m.note}"` : 'Sơ đồ 3 Hậu Vệ - 1 Giữa - 2 Cánh Tiền Đạo'}
            </div>

            <div style="display: flex; align-items: center; gap: 1rem;">
              ${motm && highestRating >= 7.0 ? `
                <div class="motm-badge-preview">
                  <img class="motm-avatar-small" src="${motm.avatar}" alt="${motm.name}">
                  <span>MOTM: ${(motm.nickname && motm.nickname.trim()) ? motm.nickname.trim() : motm.name} (${highestRating}⭐)</span>
                </div>
              ` : ''}
              
              <div style="font-size: 0.85rem; color: var(--accent-emerald); font-weight: 700;">
                🏟️ Xem Sơ Đồ 3-1-2 & Chấm Điểm →
              </div>
            </div>
          </div>
        </div>
      `;
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

    headerTitle.innerHTML = `
      <span>⚽ vs ${m.opponent} (${m.homeScore} - ${m.awayScore})</span>
    `;

    const infoHeader = document.getElementById('match-detail-info-header');
    infoHeader.innerHTML = `
      <div class="match-detail-header-compact">
        <div class="match-detail-header-left">
          <div class="match-detail-header-teams">
            ${teamInfo?.name || 'Đội nhà'} <span class="score-win-highlight">${m.homeScore}</span> : <span class="score-loss-highlight">${m.awayScore}</span> ${m.opponent}
          </div>
          <div class="match-detail-header-sub">
            <span>📅 ${m.date}</span>
            <span>📍 ${m.venue || 'Sân bóng'}</span>
            <span class="formation-tag">Sân 7 • 3-1-2</span>
            ${m.note ? `<span class="note-tag" title="${m.note}">💬 ${m.note}</span>` : ''}
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
                      ${ps.note ? `<div class="sub-speech-indicator" title="Nhận xét: ${ps.note.replace(/"/g, '&quot;')}">💬</div>` : ''}
                      <div class="sub-avatar-wrap">
                        <img class="sub-avatar" src="${p.avatar}" alt="${displayName}">
                        <span class="sub-rating-badge ${ratingClass}">${rating.toFixed(1)}</span>
                      </div>
                      <div class="sub-name">${displayName}</div>
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
                      <img class="review-avatar" src="${p.avatar}" alt="${displayName}">
                      <div>
                        <div class="review-player-name">
                          ${displayName} #${p.number}
                          ${isMOTM ? '<span class="review-motm-badge">👑 MOTM</span>' : ''}
                        </div>
                        <div class="review-player-pos">
                          ${p.position} ${realName ? `• ${realName}` : ''} • ${ps.isStarter !== false ? '<span style="color:var(--accent-emerald); font-weight:700;">Đá chính</span>' : '<span style="color:var(--accent-cyan); font-weight:700;">Dự bị</span>'}
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
                    ${note ? `💬 "${note}"` : '<span style="color: var(--text-dim); font-style: italic;">Chưa có nhận xét chi tiết. Hãy dùng "🤖 AI Chấm Điểm" để tự động sinh nhận xét.</span>'}
                  </div>
                </div>
              `;
    }).join('')}
          </div>
        </div>
      `;
  },

  renderPitchSlot(slotId, roleLabel, ps, motmId) {
    if (!ps) {
      // Vị trí trống trên sân
      return `
        <div class="sofascore-player-node empty-slot" 
             id="pitch-slot-${slotId}"
             ondragover="window.matchesModule.handleSlotDragOver(event)"
             ondragleave="window.matchesModule.handleSlotDragLeave(event)"
             ondrop="window.matchesModule.handleSlotDrop(event, '${slotId}')"
             style="border: 2px dashed rgba(255,255,255,0.3); border-radius: 50%; width: 52px; height: 52px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.25); cursor: pointer;"
             title="Kéo cầu thủ vào vị trí này">
          <span style="font-size: 1.2rem; opacity: 0.6;">➕</span>
          <div style="font-size: 0.58rem; color: rgba(255,255,255,0.7); font-weight:700; position: absolute; bottom: -18px; white-space: nowrap;">${roleLabel}</div>
        </div>
      `;
    }

    const p = window.stateManager.getPlayerById(ps.playerId);
    if (!p) return '';

    const rating = Number(ps.rating) || 7.0;
    const ratingClass = this.getRatingClass(rating);
    const isMOTM = ps.playerId === motmId && rating >= 7.0;
    const displayName = (p.nickname && p.nickname.trim()) ? p.nickname.trim() : p.name;

    return `
      <div class="sofascore-player-node" 
           id="pitch-player-${p.id}"
           draggable="true"
           ondragstart="window.matchesModule.handleDragStart(event, '${p.id}', '${slotId}')"
           ondragend="window.matchesModule.handleDragEnd(event)"
           ondragover="window.matchesModule.handleSlotDragOver(event)"
           ondragleave="window.matchesModule.handleSlotDragLeave(event)"
           ondrop="window.matchesModule.handleSlotDrop(event, '${slotId}', '${p.id}')"
           onclick="window.matchesModule.openQuickEdit('${p.id}')"
           title="Kéo để đổi vị trí hoặc bấm để chấm điểm">
        
        <div class="sofascore-avatar-box">
          <img class="sofascore-avatar-img" src="${p.avatar}" alt="${displayName}">
          ${ps.note ? `<div class="sofa-speech-indicator" title="Nhận xét: ${ps.note.replace(/"/g, '&quot;')}">💬</div>` : ''}
          
          <!-- HUY HIỆU BÊN PHẢI (⚽ BÀN THẮNG & 👟 KIẾN TẠO CHUẨN SOFASCORE) -->
          <div class="sofa-right-badges">
            ${ps.goals > 0 ? `
              <div class="sofa-event-badge ${ps.goals === 1 ? 'is-single' : ''}" title="${ps.goals} Bàn Thắng">
                <span class="sofa-icon-img">⚽</span>
                ${ps.goals > 1 ? `<span class="sofa-badge-count">${ps.goals}</span>` : ''}
              </div>
            ` : ''}

            ${ps.assists > 0 ? `
              <div class="sofa-event-badge ${ps.assists === 1 ? 'is-single' : ''}" title="${ps.assists} Kiến Tạo">
                <span class="sofa-icon-img">👟</span>
                ${ps.assists > 1 ? `<span class="sofa-badge-count">${ps.assists}</span>` : ''}
              </div>
            ` : ''}
          </div>

          <!-- HUY HIỆU BÊN TRÁI (THẺ PHẠT) -->
          <div class="sofa-left-badges">
            ${ps.redCards > 0 ? `<div class="sofa-card-badge sofa-card-red" title="Thẻ Đỏ"></div>` :
        ps.yellowCards > 0 ? `<div class="sofa-card-badge sofa-card-yellow" title="Thẻ Vàng"></div>` : ''}
          </div>

          <!-- RATING BOX VÀ NGÔI SAO MOTM ĐẶT DƯỚI AVATAR -->
          <div class="sofa-rating-container">
            ${isMOTM ? `<div class="sofa-motm-star" title="Cầu thủ xuất sắc nhất trận">✪</div>` : ''}
            <div class="sofa-rating-box ${ratingClass}">${rating.toFixed(1)}</div>
          </div>
        </div>

        <div class="sofascore-player-name">${p.number} ${displayName}</div>
        <div style="font-size: 0.62rem; color: rgba(255,255,255,0.85); text-shadow: 0 1px 2px #000; font-weight:700;">${roleLabel}</div>
      </div>
    `;
  },

  // =========================================================================
  // DRAG & DROP ENGINE ĐỔI VỊ TRÍ VÀ THAY NGƯỜI
  // =========================================================================
  dragState: {
    playerId: null,
    fromSlot: null,
    isDragging: false
  },

  handleDragStart(e, playerId, fromSlot) {
    if (!window.stateManager.isAdmin) {
      if (e.preventDefault) e.preventDefault();
      window.showToast('🔒 Bạn đang ở Chế Độ Xem. Hãy đăng nhập Quản trị viên để thay đổi đội hình!', 'info');
      return false;
    }

    this.dragState.playerId = playerId;
    this.dragState.fromSlot = fromSlot;
    this.dragState.isDragging = true;

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify({ playerId, fromSlot }));
    }

    const node = e.currentTarget;
    if (node) {
      node.classList.add('dragging');
    }

    // Hiển thị visual gợi ý kéo vào băng ghế dự bị
    const bench = document.getElementById('substitutes-bench-zone');
    if (bench && fromSlot !== 'BENCH') {
      bench.classList.add('bench-drag-target');
    }
  },

  handleDragEnd(e) {
    if (e.currentTarget) {
      e.currentTarget.classList.remove('dragging');
    }

    // Xóa tất cả các class hover drag-over
    document.querySelectorAll('.drag-over, .bench-drag-target').forEach(el => {
      el.classList.remove('drag-over');
      el.classList.remove('bench-drag-target');
    });

    setTimeout(() => {
      this.dragState.isDragging = false;
      this.dragState.playerId = null;
      this.dragState.fromSlot = null;
    }, 150);
  },

  handleSlotDragOver(e) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const targetNode = e.currentTarget;
    if (targetNode && !targetNode.classList.contains('dragging')) {
      targetNode.classList.add('drag-over');
    }
  },

  handleSlotDragLeave(e) {
    if (e.currentTarget) {
      e.currentTarget.classList.remove('drag-over');
    }
  },

  handleSlotDrop(e, targetSlotId, targetPlayerId = null) {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget) e.currentTarget.classList.remove('drag-over');

    const sourcePlayerId = this.dragState.playerId;
    const sourceSlot = this.dragState.fromSlot;

    if (!sourcePlayerId || sourcePlayerId === targetPlayerId) return;

    const m = window.stateManager.getMatchById(this.currentMatchId);
    if (!m) return;

    const stats = m.playerStats || [];
    const sourcePs = stats.find(s => s.playerId === sourcePlayerId);
    if (!sourcePs) return;

    const sourcePlayer = window.stateManager.getPlayerById(sourcePlayerId);

    if (targetPlayerId) {
      // Đã có cầu thủ ở vị trí đích
      const targetPs = stats.find(s => s.playerId === targetPlayerId);
      const targetPlayer = window.stateManager.getPlayerById(targetPlayerId);

      if (sourceSlot === 'BENCH') {
        // Thay người: Cầu thủ dự bị vào sân, cầu thủ đá chính ra ngoài
        sourcePs.isStarter = true;
        sourcePs.pitchSlot = targetSlotId;

        if (targetPs) {
          targetPs.isStarter = false;
          targetPs.pitchSlot = null;
        }

        window.showToast(`🔄 Thay người: ${sourcePlayer?.name || 'Cầu thủ'} vào sân thế chỗ ${targetPlayer?.name || 'đồng đội'}`);
      } else {
        // Đổi vị trí giữa 2 cầu thủ đang trên sân
        sourcePs.pitchSlot = targetSlotId;
        if (targetPs) {
          targetPs.pitchSlot = sourceSlot;
        }
        window.showToast(`🔄 Đã hoán đổi vị trí: ${sourcePlayer?.name || ''} ⇄ ${targetPlayer?.name || ''}`);
      }
    } else {
      // Kéo vào một vị trí còn trống trên sân
      sourcePs.isStarter = true;
      sourcePs.pitchSlot = targetSlotId;
      window.showToast(`⚽ Đã xếp ${sourcePlayer?.name || 'cầu thủ'} vào vị trí trên sân`);
    }

    window.stateManager.updateMatch(this.currentMatchId, { playerStats: stats });
    this.renderDetailBody();
  },

  handleBenchDragOver(e) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const bench = document.getElementById('substitutes-bench-zone');
    if (bench && this.dragState.fromSlot !== 'BENCH') {
      bench.classList.add('drag-over');
    }
  },

  handleBenchDragLeave(e) {
    const bench = document.getElementById('substitutes-bench-zone');
    if (bench) {
      bench.classList.remove('drag-over');
    }
  },

  handleBenchDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const bench = document.getElementById('substitutes-bench-zone');
    if (bench) {
      bench.classList.remove('drag-over');
      bench.classList.remove('bench-drag-target');
    }

    const sourcePlayerId = this.dragState.playerId;
    const sourceSlot = this.dragState.fromSlot;

    if (!sourcePlayerId || sourceSlot === 'BENCH') return;

    const m = window.stateManager.getMatchById(this.currentMatchId);
    if (!m) return;

    const stats = m.playerStats || [];
    const sourcePs = stats.find(s => s.playerId === sourcePlayerId);
    if (!sourcePs) return;

    const sourcePlayer = window.stateManager.getPlayerById(sourcePlayerId);

    // Chuyển cầu thủ ra băng ghế dự bị
    sourcePs.isStarter = false;
    sourcePs.pitchSlot = null;

    window.stateManager.updateMatch(this.currentMatchId, { playerStats: stats });
    window.showToast(`🔄 Đã chuyển ${sourcePlayer?.name || 'cầu thủ'} ra băng ghế dự bị`);
    this.renderDetailBody();
  },

  handleSubCardDragOver(e) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    if (e.currentTarget) e.currentTarget.classList.add('drag-over');
  },

  handleSubCardDragLeave(e) {
    if (e.currentTarget) e.currentTarget.classList.remove('drag-over');
  },

  handleSubCardDrop(e, targetSubPlayerId) {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget) e.currentTarget.classList.remove('drag-over');

    const sourcePlayerId = this.dragState.playerId;
    const sourceSlot = this.dragState.fromSlot;

    if (!sourcePlayerId || sourcePlayerId === targetSubPlayerId) return;

    const m = window.stateManager.getMatchById(this.currentMatchId);
    if (!m) return;

    const stats = m.playerStats || [];
    const sourcePs = stats.find(s => s.playerId === sourcePlayerId);
    const targetPs = stats.find(s => s.playerId === targetSubPlayerId);
    if (!sourcePs || !targetPs) return;

    const sourcePlayer = window.stateManager.getPlayerById(sourcePlayerId);
    const targetPlayer = window.stateManager.getPlayerById(targetSubPlayerId);

    if (sourceSlot !== 'BENCH') {
      // Đổi cầu thủ trên sân với cầu thủ dự bị này
      sourcePs.isStarter = false;
      const prevSlot = sourcePs.pitchSlot;
      sourcePs.pitchSlot = null;

      targetPs.isStarter = true;
      targetPs.pitchSlot = prevSlot;

      window.showToast(`🔄 Thay người: ${targetPlayer?.name || ''} vào sân thế chỗ ${sourcePlayer?.name || ''}`);
      window.stateManager.updateMatch(this.currentMatchId, { playerStats: stats });
      this.renderDetailBody();
    }
  },

  getRatingClass(rating) {
    if (rating >= 9.8) return 'rating-blue';
    if (rating >= 8.5) return 'rating-emerald';
    if (rating >= 7.0) return 'rating-green';
    if (rating >= 6.5) return 'rating-gold';
    if (rating >= 6.0) return 'rating-yellow';
    return 'rating-red';
  },

  openQuickEdit(playerId) {
    if (this.dragState && this.dragState.isDragging) return;
    const m = window.stateManager.getMatchById(this.currentMatchId);
    if (!m) return;

    const p = window.stateManager.getPlayerById(playerId);
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
    if (!window.stateManager.isAdmin) {
      container.innerHTML = `
        <div class="quick-edit-card" style="border-color: rgba(255,255,255,0.15);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <img src="${p.avatar}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-emerald);">
              <div>
                <div style="font-weight: 800; font-size: 1rem; color: #fff;">${displayName} (#${p.number})</div>
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

          ${ps.note ? `<div style="font-size: 0.82rem; color: var(--text-main); font-style: italic; background: rgba(255,255,255,0.03); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); margin-bottom: 0.85rem;">💬 "${ps.note}"</div>` : ''}

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
              <div style="font-weight: 800; font-size: 1rem; color: #fff;">${displayName} (#${p.number})</div>
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
          <input type="text" class="form-control" id="quick-note" placeholder="Nhận xét màn trình diễn..." value="${ps.note || ''}" style="font-size: 0.82rem; padding: 0.5rem 0.75rem;">
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
    const m = window.stateManager.getMatchById(this.currentMatchId);
    if (!m) return;

    const stats = m.playerStats || [];
    const ps = stats.find(s => s.playerId === playerId);
    if (ps) {
      ps.isStarter = !ps.isStarter;
      window.stateManager.updateMatch(this.currentMatchId, { playerStats: stats });
      window.showToast('Đã đổi vị trí đá chính / dự bị');
      this.renderDetailBody();
    }
  },

  saveQuickEdit(playerId) {
    const m = window.stateManager.getMatchById(this.currentMatchId);
    if (!m) return;

    const rating = parseFloat(document.getElementById('quick-rating-slider').value) || 7.0;
    const goals = parseInt(document.getElementById('quick-goals').innerText) || 0;
    const assists = parseInt(document.getElementById('quick-assists').innerText) || 0;
    const yellowCards = parseInt(document.getElementById('quick-yellow').innerText) || 0;
    const note = document.getElementById('quick-note').value.trim();

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
    window.showToast('🎉 Đã cập nhật điểm thành công!');

    this.renderDetailBody();
    this.renderMatches();
    if (window.awardsModule) window.awardsModule.renderAwards();
    if (window.playersModule) window.playersModule.renderPlayers();
    if (window.appModule) window.appModule.renderDashboard();
  },

  stepStat(btn, delta) {
    const container = btn.parentElement;
    const valueSpan = container.querySelector('.stat-stepper-value');
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
        const rating = parseFloat(row.querySelector('.rating-slider').value) || 7.0;
        const goals = parseInt(row.querySelector('.goals-val').innerText) || 0;
        const assists = parseInt(row.querySelector('.assists-val').innerText) || 0;
        const yellowCards = parseInt(row.querySelector('.yellow-val').innerText) || 0;
        const redCards = parseInt(row.querySelector('.red-val').innerText) || 0;
        const note = row.querySelector('.player-note-val').value.trim();

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

      window.stateManager.updateMatch(this.currentMatchId, { playerStats: updatedStats });
    }

    window.showToast('🎉 Đã lưu toàn bộ điểm số trận đấu!');
    this.closeMatchDetailModal();
    this.renderMatches();
    if (window.awardsModule) window.awardsModule.renderAwards();
    if (window.playersModule) window.playersModule.renderPlayers();
    if (window.appModule) window.appModule.renderDashboard();
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
            <span style="font-weight: 800; font-size: 0.95rem; color: #fff;">⚽ vs ${match.opponent}</span>
            <span style="font-size: 0.85rem; font-weight: 800; color: var(--accent-emerald); background: rgba(0,0,0,0.3); padding: 0.15rem 0.5rem; border-radius: 4px;">
              ${match.homeScore} - ${match.awayScore}
            </span>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-dim);">
            📅 Ngày: ${match.date} • 📍 ${match.venue || 'Sân bóng'} • Sân 7 (3-1-2)
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

  // =========================================================================
  // AI MATCH RATING & EVALUATION ENGINE
  // =========================================================================
  currentAiRatingData: null,

  openAiRatingModal(matchId) {
    if (!window.stateManager.isAdmin) {
      window.showToast('🔒 Hãy đăng nhập Quản trị viên để sử dụng AI chấm điểm!', 'info');
      return;
    }

    const m = window.stateManager.getMatchById(matchId || this.currentMatchId);
    if (!m) return;
    this.currentMatchId = m.id;

    const modal = document.getElementById('ai-match-rating-modal');
    if (!modal) return;

    // Hiển thị pill tóm tắt thông tin trận
    const contextPill = document.getElementById('ai-match-context-pill');
    const teamInfo = window.stateManager.data.teamInfo;
    const playerStats = m.playerStats || [];
    const startersCount = playerStats.filter(ps => ps.isStarter !== false).length;
    const subsCount = playerStats.filter(ps => ps.isStarter === false).length;

    contextPill.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <span style="font-weight: 800; color: #fff; font-size: 1.05rem;">
            ${teamInfo?.name || 'FC TNT'} <span style="color: var(--accent-emerald);">${m.homeScore}</span> - <span style="color: #f87171;">${m.awayScore}</span> ${m.opponent}
          </span>
          <span style="font-size: 0.8rem; color: var(--text-dim); margin-left: 0.5rem;">
            📅 ${m.date} • Sơ đồ 3-1-2 • ${startersCount} đá chính • ${subsCount} dự bị
          </span>
        </div>
        <div style="font-size: 0.78rem; background: rgba(255,255,255,0.08); padding: 0.2rem 0.6rem; border-radius: 999px; color: var(--accent-gold);">
          ${m.result === 'WIN' ? '🏆 Thắng' : m.result === 'LOSS' ? '💔 Thua' : '🤝 Hòa'}
        </div>
      </div>
    `;

    // Load saved API Key if any
    const savedKey = localStorage.getItem('gemini_api_key') || '';
    const keyInput = document.getElementById('ai-user-gemini-key');
    if (keyInput) keyInput.value = savedKey;

    // Reset Steps
    document.getElementById('ai-rating-input-step').style.display = 'block';
    document.getElementById('ai-rating-loading-state').style.display = 'none';
    document.getElementById('ai-rating-result-step').style.display = 'none';
    document.getElementById('btn-apply-ai-ratings').style.display = 'none';

    // Pre-fill existing note if textarea is empty
    const textarea = document.getElementById('ai-match-narration-input');
    if (textarea && !textarea.value.trim() && m.note) {
      textarea.value = m.note;
    }

    modal.classList.add('active');
  },

  closeAiRatingModal() {
    const modal = document.getElementById('ai-match-rating-modal');
    if (modal) modal.classList.remove('active');
    this.currentAiRatingData = null;
  },

  saveGeminiKey() {
    const keyInput = document.getElementById('ai-user-gemini-key');
    const val = (keyInput ? keyInput.value : '').trim();
    if (val) {
      localStorage.setItem('gemini_api_key', val);
      window.showToast('✅ Đã lưu Gemini API Key trên trình duyệt của bạn!');
    } else {
      localStorage.removeItem('gemini_api_key');
      window.showToast('Đã xóa Gemini API Key (Hệ thống sẽ dùng AI mặc định)');
    }
  },

  insertAiSample(type) {
    const textarea = document.getElementById('ai-match-narration-input');
    if (!textarea) return;

    if (type === 'clear') {
      textarea.value = '';
      return;
    }

    const m = window.stateManager.getMatchById(this.currentMatchId);
    const opponent = m ? m.opponent : 'đối thủ';

    if (type === 'win') {
      textarea.value = `Hôm nay FC TNT có chiến thắng tưng bừng trước ${opponent}. 
ToDiu bắt rất chắc tay, cản phá 3 pha đối mặt xuất sắc giữ vững thế trận.
Quân Kun leo biên dẻo, tạt bóng như đặt có 1 kiến tạo và phòng ngự bọc lót chắc chắn.
Quang Voi đá thòng cực hay, không chiến và tranh chấp dũng mãnh.
Vinh Lê cầm nhịp tuyến giữa xuất sắc, chia bài đỉnh cao và có 2 kiến tạo.
Tài Thọ bứt tốc cánh phải lập cú đúp siêu phẩm, quấy phá hàng thủ đối phương.
Hùng Sứt vào sân thay người đá năng nổ ghi 1 bàn ấn định chiến thắng.
Toàn đội đá pressing rực lửa, phối hợp ăn ý và tinh thần đoàn kết tuyệt vời!`;
    } else if (type === 'comeback') {
      textarea.value = `Trận cầu kịch tính nghẹt thở trước ${opponent}.
Hiệp 1 đội bị dẫn trước do hàng thủ thoáng mất tập trung.
Sang hiệp 2 toàn đội vùng lên rực lửa:
Vinh Lê làm chủ hoàn toàn tuyến giữa, chọc khe cho Tài Thọ bứt tốc ghi bàn rút ngắn tỉ số.
Tiếp đó Quân Kun tạt bóng chuẩn xác để Thành Nam đánh đầu gỡ hòa.
Phút cuối, Hùng Sứt tung cú sút sấm sét ấn định màn lội ngược dòng cảm xúc.
ToDiu có 2 pha cứu thua mười mươi trong hiệp 2 giúp toàn đội giữ vững chiến thắng!`;
    } else if (type === 'draw') {
      textarea.value = `Trận đấu giằng co kịch tính từng phút trước ${opponent}.
Tài Thọ mở tỉ số từ pha bứt tốc dứt điểm góc hẹp hiểm hóc.
Vinh Lê điều tiết nhịp độ và hỗ trợ phòng ngự tốt.
Quân Kun và Đức Bắc tranh chấp quyết liệt ở 2 hành lang cánh.
ToDiu có nhiều pha bay người cản phá ấn tượng.
Cuối trận đối thủ ép sân và gỡ hòa đáng tiếc, hai đội chia điểm sau màn rượt đuổi tỉ số hấp dẫn.`;
    }
  },

  editAiInput() {
    document.getElementById('ai-rating-input-step').style.display = 'block';
    document.getElementById('ai-rating-loading-state').style.display = 'none';
    document.getElementById('ai-rating-result-step').style.display = 'none';
    document.getElementById('btn-apply-ai-ratings').style.display = 'none';
  },

  async executeAiRating(liveEventsParam = null) {
    const m = window.stateManager.getMatchById(this.currentMatchId);
    if (!m) return;

    const textarea = document.getElementById('ai-match-narration-input');
    const narration = (textarea ? textarea.value : '').trim();

    const playerStats = m.playerStats || [];
    if (playerStats.length === 0) {
      window.showToast('⚠️ Trận đấu chưa có danh sách cầu thủ ra sân để chấm điểm!', 'info');
      return;
    }

    const liveEvents = liveEventsParam || this.pendingLiveEvents || null;

    // Prepare player list with details
    const playerList = playerStats.map(ps => {
      const p = window.stateManager.getPlayerById(ps.playerId);
      return {
        id: ps.playerId,
        name: p ? p.name : ps.playerId,
        nickname: p ? p.nickname : '',
        number: p ? p.number : 0,
        position: p ? p.position : 'MF',
        isStarter: ps.isStarter !== false,
        pitchSlot: ps.pitchSlot,
        currentStats: {
          rating: ps.rating || 7.0,
          goals: ps.goals || 0,
          assists: ps.assists || 0,
          yellowCards: ps.yellowCards || 0,
          redCards: ps.redCards || 0,
          note: ps.note || ''
        }
      };
    });

    const apiKey = localStorage.getItem('gemini_api_key') || '';

    // Switch to Loading View
    document.getElementById('ai-rating-input-step').style.display = 'none';
    document.getElementById('ai-rating-loading-state').style.display = 'block';
    document.getElementById('ai-rating-result-step').style.display = 'none';
    document.getElementById('btn-apply-ai-ratings').style.display = 'none';

    try {
      const response = await fetch('/api/ai/rate-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchInfo: {
            opponent: m.opponent,
            homeScore: m.homeScore,
            awayScore: m.awayScore,
            date: m.date,
            venue: m.venue,
            result: m.result
          },
          playerList,
          matchNarration: narration,
          liveEvents,
          apiKey
        })
      });

      let data;
      if (response.ok) {
        data = await response.json();
      } else {
        throw new Error('API server returned error');
      }

      this.currentAiRatingData = data;
      this.renderAiResultPreview(data);

    } catch (err) {
      console.warn('Backend AI API error, falling back to local client evaluation:', err);
      // Client-side instant evaluation fallback
      const mockResult = this.clientSideAiEvaluation(m, playerList, narration, liveEvents);
      this.currentAiRatingData = mockResult;
      this.renderAiResultPreview(mockResult);
    }
  },

  clientSideAiEvaluation(m, playerList, narration, liveEvents) {
    const rawText = (narration || '').trim();
    const textLower = rawText.toLowerCase();
    const isWin = m.result === 'WIN' || (Number(m.homeScore) > Number(m.awayScore));
    const isLoss = m.result === 'LOSS' || (Number(m.homeScore) < Number(m.awayScore));

    const baseStarterRating = isWin ? 6.8 : isLoss ? 6.2 : 6.5;
    const baseSubRating = isWin ? 6.5 : isLoss ? 6.0 : 6.2;

    const playerMentions = [];
    playerList.forEach(p => {
      const aliases = this.getPlayerAliases(p);
      aliases.forEach(alias => {
        let startIndex = 0;
        while ((startIndex = textLower.indexOf(alias, startIndex)) !== -1) {
          const prevChar = startIndex > 0 ? textLower[startIndex - 1] : ' ';
          const nextChar = startIndex + alias.length < textLower.length ? textLower[startIndex + alias.length] : ' ';
          const isWordBoundary = /[\s,.;!?:()\n\r\t\[\]'"]/.test(prevChar) && /[\s,.;!?:()\n\r\t\[\]'"]/.test(nextChar);

          if (isWordBoundary || startIndex === 0 || startIndex + alias.length === textLower.length) {
            playerMentions.push({
              playerId: p.id,
              playerName: p.name,
              alias,
              index: startIndex,
              endIndex: startIndex + alias.length
            });
          }
          startIndex += alias.length;
        }
      });
    });

    playerMentions.sort((a, b) => a.index - b.index);

    const cleanMentions = [];
    playerMentions.forEach(m => {
      if (!cleanMentions.some(existing =>
        (m.index >= existing.index && m.index < existing.endIndex) ||
        (m.playerId === existing.playerId && Math.abs(m.index - existing.index) < 10)
      )) {
        cleanMentions.push(m);
      }
    });

    const playerContextMap = {};
    for (let i = 0; i < cleanMentions.length; i++) {
      const cur = cleanMentions[i];
      const nextMention = cleanMentions[i + 1];
      const chunkStart = cur.endIndex;
      const chunkEnd = nextMention ? nextMention.index : textLower.length;
      let chunk = textLower.substring(chunkStart, chunkEnd);

      const between = nextMention ? textLower.substring(cur.endIndex, nextMention.index).trim() : '';
      let inheritedChunk = '';
      if (nextMention && (between === 'và' || between === 'cùng' || between === 'với' || between === 'và cả' || between === ',')) {
        const nextNext = cleanMentions[i + 2];
        const afterNextEnd = nextNext ? nextNext.index : textLower.length;
        inheritedChunk = textLower.substring(nextMention.endIndex, afterNextEnd);
      }

      if (!playerContextMap[cur.playerId]) {
        playerContextMap[cur.playerId] = [];
      }
      playerContextMap[cur.playerId].push(chunk);
      if (inheritedChunk) {
        playerContextMap[cur.playerId].push(inheritedChunk);
      }
    }

    // Direct event map
    const playerEventsMap = {};
    if (Array.isArray(liveEvents) && liveEvents.length > 0) {
      liveEvents.forEach(evt => {
        if (evt.playerId) {
          if (!playerEventsMap[evt.playerId]) playerEventsMap[evt.playerId] = [];
          playerEventsMap[evt.playerId].push(evt);
        }
        if (evt.assistPlayerId) {
          if (!playerEventsMap[evt.assistPlayerId]) playerEventsMap[evt.assistPlayerId] = [];
          playerEventsMap[evt.assistPlayerId].push({
            type: 'ASSIST',
            typeLabel: '👟 Kiến Tạo',
            minute: evt.minute,
            note: `Kiến tạo cho ${evt.playerName || 'đồng đội'}`
          });
        }
      });
    }

    let highestScore = -1;
    let motmId = null;

    const ratings = playerList.map(p => {
      const isStarter = p.isStarter !== false;
      let score = isStarter ? baseStarterRating : baseSubRating;
      let goals = 0;
      let assists = 0;
      let yellowCards = 0;
      let redCards = 0;
      const noteItems = [];
      let roleTag = '';

      // 1. Áp dụng sự kiện sân cỏ trực tiếp
      const directEvents = playerEventsMap[p.id] || [];
      if (directEvents.length > 0) {
        directEvents.forEach(evt => {
          if (evt.type === 'WONDERGOAL') {
            goals += 1;
            score += 1.8;
            noteItems.push(evt.note ? `🌟 Siêu phẩm: ${evt.note}` : '🌟 Ghi siêu phẩm đẳng cấp');
            if (!roleTag) roleTag = '🌟 Siêu Phẩm Đỉnh Cao';
          } else if (evt.type === 'GOAL') {
            goals += 1;
            score += 1.2;
            noteItems.push(evt.note ? `⚽ Bàn thắng: ${evt.note}` : '⚽ Ghi bàn thắng quý giá');
            if (!roleTag) roleTag = '⚽ Ghi Bàn';
          } else if (evt.type === 'ASSIST') {
            assists += 1;
            score += 0.9;
            noteItems.push(evt.note ? `👟 ${evt.note}` : '👟 Kiến tạo dọn cỗ sắc bén');
            if (!roleTag) roleTag = '👟 Kiến Tạo';
          } else if (evt.type === 'SAVE') {
            score += 1.2;
            noteItems.push(evt.note ? `🧤 Cứu thua: ${evt.note}` : '🧤 Cản phá xuất thần, cứu thua mười mươi');
            if (!roleTag) roleTag = '🧤 Người Nhện';
          } else if (evt.type === 'DEFENSE') {
            score += 0.9;
            noteItems.push(evt.note ? `🛡️ ${evt.note}` : '🛡️ Bọc lót, cắt bóng then chốt');
            if (!roleTag) roleTag = '🛡️ Lá Chắn Thép';
          } else if (evt.type === 'WOODWORK') {
            score += 0.3;
            noteItems.push(evt.note ? `🪵 Sút xà/cột: ${evt.note}` : '🪵 Dứt điểm hiểm hóc dội xà ngang/cột dọc');
            if (!roleTag) roleTag = '⚡ Đen Đủi Xà Cột';
          } else if (evt.type === 'MISS') {
            score -= 0.8;
            noteItems.push(evt.note ? `💨 Bỏ lỡ: ${evt.note}` : '💨 Bỏ lỡ cơ hội ngon ăn');
            if (!roleTag) roleTag = '💨 Bỏ Lỡ Đáng Tiếc';
          } else if (evt.type === 'FUNNY') {
            score -= 0.3;
            noteItems.push(evt.note ? `😂 Pha tấu hài: ${evt.note}` : '😂 Có pha xử lý tấu hài sân cỏ');
            if (!roleTag) roleTag = '😂 Cây Hài Sân Cỏ';
          } else if (evt.note) {
            noteItems.push(evt.note);
          }
        });
      }

      // 2. Phân tích ngữ cảnh văn bản
      const contextChunks = playerContextMap[p.id];
      const isMentioned = !!contextChunks && contextChunks.length > 0;
      const playerCtx = isMentioned ? contextChunks.join(' ') : '';

      if (isMentioned) {
        if (goals === 0) {
          if (playerCtx.includes('poker') || playerCtx.includes('4 bàn')) {
            goals = 4;
            score += 2.5;
            noteItems.push('⚽ Lập Poker 4 bàn thắng lịch sử');
            roleTag = '🔥 Poker Thần Sầu';
          } else if (playerCtx.includes('hattrick') || playerCtx.includes('3 bàn')) {
            goals = 3;
            score += 2.0;
            noteItems.push('⚽ Lập hat-trick bùng nổ');
            roleTag = '🎩 Hat-trick Anh Hùng';
          } else if (playerCtx.includes('cú đúp') || playerCtx.includes('2 bàn')) {
            goals = 2;
            score += 1.6;
            noteItems.push('⚽ Lập cú đúp bàn thắng');
            roleTag = '⚽ Cú Đúp Đẳng Cấp';
          } else if (playerCtx.includes('siêu phẩm') || playerCtx.includes('solo')) {
            goals = 1;
            score += 1.8;
            noteItems.push('🌟 Ghi siêu phẩm đẳng cấp');
            if (!roleTag) roleTag = '🌟 Siêu Phẩm Đỉnh Cao';
          } else if (playerCtx.includes('ghi được 1 bàn') || playerCtx.includes('ghi 1 bàn') || playerCtx.includes('sút tung lưới') || playerCtx.includes('lập công') || playerCtx.includes('ghi bàn') || playerCtx.includes('nã đại bác') || playerCtx.includes('mở tỉ số') || playerCtx.includes('ấn định')) {
            goals = 1;
            score += 1.2;
            noteItems.push('⚽ Ghi 1 bàn thắng quan trọng');
            if (!roleTag) roleTag = '⚽ Ghi Bàn Quý Giá';
          }
        }

        if (assists === 0) {
          if (playerCtx.includes('2 kiến tạo') || playerCtx.includes('cú đúp kiến tạo')) {
            assists = 2;
            score += 1.4;
            noteItems.push('👟 2 kiến tạo dọn cỗ sắc bén');
            if (!roleTag) roleTag = '👟 Vua Kiến Tạo';
          } else if (playerCtx.includes('1 kiến tạo') || playerCtx.includes('kiến tạo') || playerCtx.includes('dọn cỗ') || playerCtx.includes('chọc khe') || playerCtx.includes('tạt bóng chuẩn')) {
            assists = 1;
            score += 0.8;
            noteItems.push('👟 1 kiến tạo chuẩn xác');
            if (!roleTag) roleTag = '👟 Kiến Tạo Chuẩn Xác';
          }
        }

        if (playerCtx.includes('cực kì tốt') || playerCtx.includes('cực kỳ tốt') || playerCtx.includes('xuất sắc') || playerCtx.includes('gánh đội') || playerCtx.includes('gánh còng lưng') || playerCtx.includes('cháy hết mình')) {
          score += 1.2;
          noteItems.push('⭐ Thi đấu cực kì xuất sắc');
          if (!roleTag) roleTag = '⭐ Điểm Sáng Trận Đấu';
        }
        if (playerCtx.includes('đá thòng') || playerCtx.includes('bọc lót') || playerCtx.includes('cắt bóng') || playerCtx.includes('không chiến') || playerCtx.includes('khóa chặt')) {
          score += 0.8;
          noteItems.push('🛡️ Phòng ngự bọc lót chắc chắn');
          if (!roleTag) roleTag = '🛡️ Lá Chắn Thép';
        }
        if (playerCtx.includes('cản phá') || playerCtx.includes('cứu thua') || playerCtx.includes('bắt chắc tay') || playerCtx.includes('bắt dính') || playerCtx.includes('xuất thần')) {
          score += 0.9;
          noteItems.push('🧤 Cản phá nhiều cơ hội nguy hiểm');
          if (!roleTag) roleTag = '🧤 Người Nhện';
        }
        if (playerCtx.includes('phát động tấn công') || playerCtx.includes('cầm nhịp') || playerCtx.includes('chia bài') || playerCtx.includes('làm chủ tuyến giữa')) {
          score += 0.8;
          noteItems.push('🎯 Cầm nhịp và phát động tấn công sắc nét');
          if (!roleTag) roleTag = '🎯 Nhạc Trưởng Tuyến Giữa';
        }

        if (playerCtx.includes('triển khai bóng bằng chân yếu') || playerCtx.includes('chân yếu') || playerCtx.includes('bắt bóng lập bập') || playerCtx.includes('ói bóng')) {
          score -= 1.1;
          noteItems.push('⚠️ Xử lý chân lập bập, ảnh hưởng lối chơi');
          roleTag = '⚠️ Xử Lý Chân Kém';
        }
        if (playerCtx.includes('bỏ lỡ') || playerCtx.includes('chân gỗ')) {
          score -= 0.8;
          noteItems.push('💨 Bỏ lỡ cơ hội đáng tiếc');
          if (!roleTag) roleTag = '💨 Bỏ Lỡ Đáng Tiếc';
        }
        if (playerCtx.includes('tấu hài') || playerCtx.includes('vấp cỏ')) {
          score -= 0.3;
          noteItems.push('😂 Có pha tấu hài trên sân');
          if (!roleTag) roleTag = '😂 Cây Hài Sân Cỏ';
        }
        if (playerCtx.includes('mắc sai lầm') || playerCtx.includes('lỗi nhiều') || playerCtx.includes('bóp team')) {
          score -= 0.8;
          noteItems.push('⚠️ Mắc sai lầm xử lý bóng');
          if (!roleTag) roleTag = '⚠️ Mắc Sai Lầm';
        }
        if (playerCtx.includes('dưới sức') || playerCtx.includes('đuối sức') || playerCtx.includes('hết pin')) {
          score -= 0.8;
          noteItems.push('⚠️ Thi đấu dưới sức');
          if (!roleTag) roleTag = '⚠️ Dưới Sức';
        }

        if (playerCtx.includes('thẻ đỏ')) {
          redCards = 1;
          score -= 2.0;
          noteItems.push('🟥 Nhận thẻ đỏ');
          roleTag = '🟥 Thẻ Đỏ Truất Quyền';
        } else if (playerCtx.includes('thẻ vàng')) {
          yellowCards = 1;
          score -= 0.4;
          noteItems.push('🟨 Nhận thẻ vàng');
        }
      } else if (directEvents.length === 0) {
        if (isStarter) {
          score = baseStarterRating;
          noteItems.push('Thi đấu tròn vai, hoàn thành nhiệm vụ');
          roleTag = '⚖️ Tròn Vai';
        } else {
          score = baseSubRating;
          noteItems.push('Dự bị vào sân thi đấu nỗ lực');
          roleTag = '🔄 Dự Bị';
        }
      }

      score = Math.max(4.0, Math.min(9.9, Math.round(score * 10) / 10));
      let finalNote = noteItems.length > 0 ? noteItems.join(' • ') : (isStarter ? 'Hoàn thành nhiệm vụ trên sân' : 'Dự bị trận đấu');

      if (score > highestScore) {
        highestScore = score;
        motmId = p.id;
      }

      return {
        playerId: p.id,
        name: p.name,
        rating: score,
        goals,
        assists,
        yellowCards,
        redCards,
        tag: roleTag || (isStarter ? '⚖️ Tròn Vai' : '🔄 Dự Bị'),
        note: finalNote
      };
    });

    return {
      matchHeadline: isWin ? `🔥 Chiến Thắng Thuyết Phục Trước ${m.opponent}!` : `⚡ Trận Cầu ${m.homeScore} - ${m.awayScore} Trước ${m.opponent}`,
      matchSummary: isLoss
        ? `Trận đấu gặp ${m.opponent} kết thúc với tỉ số ${m.homeScore} - ${m.awayScore}. Đội bóng thi đấu nhiệt huyết nhưng còn bộc lộ một số sai sót trước đối thủ, ghi nhận nhiều nỗ lực cá nhân nổi bật.`
        : `Trận đấu giữa FC TNT và ${m.opponent} diễn ra sôi nổi với tỉ số chung cuộc ${m.homeScore} - ${m.awayScore}. Toàn đội thể hiện tinh thần quyết tâm cao, các cá nhân phối hợp ăn ý và cống hiến hết mình.`,
      motmPlayerId: motmId,
      ratings,
      source: 'Smart Football Analysis Engine'
    };
  },

  renderAiResultPreview(data) {
    document.getElementById('ai-rating-loading-state').style.display = 'none';
    document.getElementById('ai-rating-result-step').style.display = 'block';
    document.getElementById('btn-apply-ai-ratings').style.display = 'inline-flex';
    const btnEdit = document.getElementById('btn-edit-ai-narration');
    if (btnEdit) btnEdit.style.display = 'inline-flex';

    // Set Headline & Summary
    document.getElementById('ai-result-headline').innerText = data.matchHeadline || '⚽ Tổng Quan Màn Trình Diễn';
    document.getElementById('ai-result-summary').innerText = data.matchSummary || '';
    document.getElementById('ai-source-label').innerText = `Engine: ${data.source || 'FC TNT AI Intelligence'}`;

    // MOTM Spotlight
    const motmBox = document.getElementById('ai-result-motm-box');
    if (data.motmPlayerId) {
      const motmPlayer = window.stateManager.getPlayerById(data.motmPlayerId);
      const motmRating = data.ratings?.find(r => r.playerId === data.motmPlayerId);
      if (motmPlayer && motmRating) {
        motmBox.innerHTML = `
          <div class="ai-motm-card">
            <div class="ai-motm-crown">👑 CẦU THỦ XUẤT SẮC NHẤT TRẬN (MOTM)</div>
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-top: 0.35rem;">
              <img src="${motmPlayer.avatar}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--accent-gold); object-fit: cover;">
              <div>
                <div style="font-weight: 800; font-size: 1.05rem; color: #fff;">${motmPlayer.name} #${motmPlayer.number}</div>
                <div style="font-size: 0.78rem; color: var(--accent-gold);">${motmPlayer.position} • "${motmRating.note}"</div>
              </div>
              <div style="margin-left: auto; font-family: var(--font-display); font-size: 1.6rem; font-weight: 900; color: var(--accent-gold);">
                ${Number(motmRating.rating).toFixed(1)} ⭐
              </div>
            </div>
          </div>
        `;
      } else {
        motmBox.innerHTML = '';
      }
    } else {
      motmBox.innerHTML = '';
    }

    // Player Ratings Preview List
    const previewContainer = document.getElementById('ai-rating-preview-list');
    const ratings = data.ratings || [];

    previewContainer.innerHTML = ratings.map(r => {
      const p = window.stateManager.getPlayerById(r.playerId);
      if (!p) return '';

      const ratingClass = this.getRatingClass(r.rating);
      return `
        <div class="ai-player-row">
          <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1.2; min-width: 150px;">
            <img src="${p.avatar}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover;">
            <div>
              <div style="font-weight: 700; font-size: 0.85rem; color: #fff;">${p.name} #${p.number}</div>
              <div style="display: flex; align-items: center; gap: 0.35rem; margin-top: 0.1rem;">
                <span style="font-size: 0.7rem; color: var(--text-dim);">${p.position}</span>
                ${r.tag ? `<span class="ai-role-tag-pill">${r.tag}</span>` : ''}
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${r.goals > 0 ? `<span class="ai-stat-badge stat-badge-goal">⚽ ${r.goals}</span>` : ''}
            ${r.assists > 0 ? `<span class="ai-stat-badge stat-badge-assist">👟 ${r.assists}</span>` : ''}
            ${r.yellowCards > 0 ? `<span class="ai-stat-badge stat-badge-card" style="background: rgba(245,158,11,0.2); color: #fbbf24;">🟨 ${r.yellowCards}</span>` : ''}
            ${r.redCards > 0 ? `<span class="ai-stat-badge stat-badge-card" style="background: rgba(239,68,68,0.2); color: #ef4444;">🟥 ${r.redCards}</span>` : ''}
            
            <span class="sofa-rating-box ${ratingClass}" style="min-width: 38px; text-align: center; font-size: 0.88rem; font-weight: 900; padding: 0.2rem 0.45rem;">
              ${Number(r.rating).toFixed(1)}
            </span>
          </div>

          <div class="ai-note-text" title="${r.note}">
            💬 ${r.note}
          </div>
        </div>
      `;
    }).join('');
  },

  applyAiRatingsToMatch() {
    if (!this.currentAiRatingData || !this.currentMatchId) return;

    const m = window.stateManager.getMatchById(this.currentMatchId);
    if (!m) return;

    const aiRatings = this.currentAiRatingData.ratings || [];
    const existingStats = m.playerStats || [];

    // Merge AI generated values into player stats
    const updatedStats = existingStats.map(ps => {
      const aiStat = aiRatings.find(r => r.playerId === ps.playerId);
      if (aiStat) {
        return {
          ...ps,
          rating: Number(aiStat.rating) || ps.rating || 7.0,
          goals: aiStat.goals !== undefined ? aiStat.goals : ps.goals,
          assists: aiStat.assists !== undefined ? aiStat.assists : ps.assists,
          yellowCards: aiStat.yellowCards !== undefined ? aiStat.yellowCards : ps.yellowCards,
          redCards: aiStat.redCards !== undefined ? aiStat.redCards : ps.redCards,
          note: aiStat.note || ps.note || ''
        };
      }
      return ps;
    });

    // Update match note with AI commentary if match note was empty
    const updatedNote = m.note || this.currentAiRatingData.matchHeadline || '';

    window.stateManager.updateMatch(this.currentMatchId, {
      playerStats: updatedStats,
      note: updatedNote
    });

    window.showToast('🎉 Đã áp dụng toàn bộ điểm số & nhận xét AI vào sơ đồ sân 3-1-2!');
    this.closeAiRatingModal();
    if (window.awardsModule) window.awardsModule.renderAwards();
    if (window.playersModule) window.playersModule.renderPlayers();
    if (window.appModule) window.appModule.renderDashboard();
  },

  scrollToReviews() {
    const section = document.getElementById('match-player-reviews-section');
    if (section) {
      const grid = document.getElementById('match-reviews-grid-body');
      if (grid && grid.style.display === 'none') {
        grid.style.display = 'grid';
      }
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      section.classList.add('review-pulse-highlight');
      setTimeout(() => section.classList.remove('review-pulse-highlight'), 1800);
    }
  },

  toggleReviewsCollapse() {
    const grid = document.getElementById('match-reviews-grid-body');
    const btnText = document.getElementById('reviews-collapse-btn-text');
    if (!grid) return;

    if (grid.style.display === 'none') {
      grid.style.display = 'grid';
      if (btnText) btnText.innerText = '🔽 Thu gọn';
    } else {
      grid.style.display = 'none';
      if (btnText) btnText.innerText = '▶️ Mở rộng xem nhận xét';
    }
  },

  filterReviews(filterType, btnEl) {
    if (btnEl) {
      document.querySelectorAll('#reviews-filter-container .review-filter-btn').forEach(b => b.classList.remove('active'));
      btnEl.classList.add('active');
    }

    const grid = document.getElementById('match-reviews-grid-body');
    if (grid && grid.style.display === 'none') {
      grid.style.display = 'grid';
      const btnText = document.getElementById('reviews-collapse-btn-text');
      if (btnText) btnText.innerText = '🔽 Thu gọn';
    }

    const cards = document.querySelectorAll('.match-review-card');
    cards.forEach(card => {
      const isStarter = card.getAttribute('data-is-starter') === 'true';
      const hasNote = card.getAttribute('data-has-note') === 'true';
      const isMotm = card.getAttribute('data-is-motm') === 'true';

      let show = false;
      if (filterType === 'all') show = true;
      else if (filterType === 'has-note') show = hasNote;
      else if (filterType === 'starter') show = isStarter;
      else if (filterType === 'bench') show = !isStarter;
      else if (filterType === 'motm') show = isMotm;

      card.style.display = show ? 'flex' : 'none';
    });
  },

  // =========================================================================
  // 🏟️ LIVE PITCH COMPANION (TRỢ LÝ SÂN CỎ TRỰC TIẾP & VOICE-TO-EVENT)
  // =========================================================================
  // LIVE PITCH COMPANION (TRỢ LÝ TRỰC TIẾP NGOÀI SÂN CỎ)
  // =========================================================================
  livePitchState: {
    matchId: null,
    opponent: 'FC Đối Thủ',
    venue: 'Sân bóng Tân Triều',
    homeScore: 0,
    awayScore: 0,
    timerSeconds: 0,
    timerInterval: null,
    isTimerRunning: false,
    period: 1, // 1: H1, 2: H2, 3: Full-time
    events: [],
    registeredPlayerIds: [], // Danh sách ID cầu thủ có mặt đi đá hôm nay
    tempRosterSelection: [], // State tạm khi đang mở modal điểm danh
    currentAction: null,
    pendingGoalPlayerId: null,
    wakeLockSentinel: null,
    isScreenWakeOn: false,
    speechRecognition: null,
    isRecordingVoice: false
  },

  async openLiveCompanionModal() {
    if (!window.stateManager.isAdmin) {
      window.showToast('🔒 Hãy đăng nhập Quản trị viên để ghi nhận trực tiếp trên sân!', 'info');
      return;
    }

    const modal = document.getElementById('live-companion-modal');
    if (!modal) return;

    // Trợ lý Sân Cỏ chỉ dành riêng cho việc ghi nhận trận đấu trực tiếp ngoài sân
    // Tuyệt đối không can thiệp hay liên kết vào bất kỳ trận đấu cũ nào đã kết thúc
    this.livePitchState.matchId = null;
    this.livePitchState.date = new Date().toISOString().split('T')[0];

    // Đọc bản nháp từ Cloud/Local để tiếp tục trận đấu dở dang ngoài sân (nếu có)
    await this.loadLiveDraft();

    // Luôn bảo đảm không gán matchId cũ
    this.livePitchState.matchId = null;

    // Khởi tạo danh sách cầu thủ có mặt nếu chưa có
    this.initLiveRoster();

    // Cập nhật giao diện
    this.updateLiveCompanionUI();

    // Tự động bật giữ sáng màn hình
    this.acquireWakeLock();

    modal.classList.add('active');
  },

  initLiveRoster() {
    const allPlayers = window.stateManager.getPlayers();
    if (!Array.isArray(this.livePitchState.registeredPlayerIds) || this.livePitchState.registeredPlayerIds.length === 0) {
      // Mặc định lấy 7 cầu thủ đầu tiên (đá chính)
      this.livePitchState.registeredPlayerIds = allPlayers.slice(0, Math.min(allPlayers.length, 7)).map(p => p.id);
    }
  },

  updateRosterPreview() {
    const countBadge = document.getElementById('live-roster-count-badge');
    const previewEl = document.getElementById('live-roster-names-preview');
    const regIds = this.livePitchState.registeredPlayerIds || [];

    if (countBadge) countBadge.innerText = regIds.length;

    if (previewEl) {
      if (regIds.length === 0) {
        previewEl.innerText = 'Chưa chọn cầu thủ có mặt. Hãy bấm để điểm danh!';
        previewEl.style.color = '#f87171';
      } else {
        const names = regIds.map(id => {
          const p = window.stateManager.getPlayerById(id);
          if (!p) return null;
          return (p.nickname && p.nickname.trim()) ? p.nickname.trim() : p.name;
        }).filter(Boolean);

        previewEl.innerText = names.join(', ');
        previewEl.style.color = '#e2e8f0';
      }
    }
  },

  // Modal Điểm Danh Đội Hình
  openLiveRosterModal() {
    const allPlayers = window.stateManager.getPlayers();
    this.livePitchState.tempRosterSelection = [...(this.livePitchState.registeredPlayerIds || [])];

    // Nếu rỗng, mặc định chọn 7 người đầu
    if (this.livePitchState.tempRosterSelection.length === 0) {
      this.livePitchState.tempRosterSelection = allPlayers.slice(0, 7).map(p => p.id);
    }

    this.renderRosterGrid();
    const modal = document.getElementById('live-roster-modal');
    if (modal) modal.style.display = 'flex';
  },

  closeLiveRosterModal() {
    const modal = document.getElementById('live-roster-modal');
    if (modal) modal.style.display = 'none';
  },

  renderRosterGrid() {
    const grid = document.getElementById('live-roster-player-grid');
    if (!grid) return;

    const allPlayers = window.stateManager.getPlayers();
    const selectedSet = new Set(this.livePitchState.tempRosterSelection);

    grid.innerHTML = allPlayers.map(p => {
      const isSelected = selectedSet.has(p.id);
      const displayName = (p.nickname && p.nickname.trim()) ? p.nickname.trim() : p.name;
      return `
        <div class="live-roster-card ${isSelected ? 'active' : ''}" onclick="window.matchesModule.togglePlayerInRoster('${p.id}')">
          <img class="live-roster-avatar" src="${p.avatar}" alt="${displayName}">
          <div class="live-roster-card-info">
            <div class="live-roster-card-name">${displayName}</div>
            <div class="live-roster-card-sub">#${p.number} • ${p.position}</div>
          </div>
          <div class="live-roster-check-icon">✓</div>
        </div>
      `;
    }).join('');

    const countSelected = document.getElementById('live-roster-selected-count');
    const countConfirm = document.getElementById('live-roster-confirm-count');
    if (countSelected) countSelected.innerText = selectedSet.size;
    if (countConfirm) countConfirm.innerText = selectedSet.size;
  },

  togglePlayerInRoster(playerId) {
    const sel = this.livePitchState.tempRosterSelection;
    const idx = sel.indexOf(playerId);
    if (idx >= 0) {
      sel.splice(idx, 1);
    } else {
      sel.push(playerId);
    }
    this.renderRosterGrid();
  },

  selectRosterPreset(type) {
    const allPlayers = window.stateManager.getPlayers();
    if (type === 'all') {
      this.livePitchState.tempRosterSelection = allPlayers.map(p => p.id);
    } else if (type === 'starters') {
      this.livePitchState.tempRosterSelection = allPlayers.slice(0, Math.min(allPlayers.length, 7)).map(p => p.id);
    } else if (type === 'clear') {
      this.livePitchState.tempRosterSelection = [];
    }
    this.renderRosterGrid();
  },

  saveLiveRosterSelection() {
    if (this.livePitchState.tempRosterSelection.length === 0) {
      if (!confirm('Bạn chưa chọn cầu thủ nào đi đá hôm nay. Bạn có chắc muốn tiếp tục không?')) {
        return;
      }
    }

    this.livePitchState.registeredPlayerIds = [...this.livePitchState.tempRosterSelection];
    this.updateRosterPreview();
    this.saveLiveDraft();
    this.closeLiveRosterModal();
    window.showToast(`✅ Đã lưu danh sách ${this.livePitchState.registeredPlayerIds.length} cầu thủ có mặt hôm nay!`);
  },

  updateLiveCompanionUI() {
    const teamInfo = window.stateManager.data.teamInfo;
    const homeNameEl = document.getElementById('live-home-team-name');
    if (homeNameEl) homeNameEl.innerText = teamInfo?.name || 'FC TNT';

    const opponentLabel = document.getElementById('live-match-opponent-label');
    if (opponentLabel) opponentLabel.innerText = 'vs ' + (this.livePitchState.opponent || 'FC Đối Thủ');

    const awayInput = document.getElementById('live-away-team-input');
    if (awayInput) {
      awayInput.value = this.livePitchState.opponent || 'FC Đối Thủ';
      awayInput.onchange = (e) => {
        this.livePitchState.opponent = e.target.value.trim() || 'FC Đối Thủ';
        if (opponentLabel) opponentLabel.innerText = 'vs ' + this.livePitchState.opponent;
        this.saveLiveDraft();
      };
    }

    const homeScoreEl = document.getElementById('live-home-score');
    if (homeScoreEl) homeScoreEl.innerText = this.livePitchState.homeScore;

    const awayScoreEl = document.getElementById('live-away-score');
    if (awayScoreEl) awayScoreEl.innerText = this.livePitchState.awayScore;

    this.updateTimerDisplay();
    this.updateRosterPreview();
    this.renderLiveTimeline();
  },

  handleRemoteLiveMatchSync(draftData) {
    if (!draftData) return;
    const modal = document.getElementById('live-companion-modal');
    const isModalActive = modal && modal.classList.contains('active');

    // Cập nhật state nội bộ
    this.applyLiveDraftData(draftData);

    if (isModalActive) {
      window.showToast('📡 Đã nhận đồng bộ trực tiếp từ thiết bị khác!', 'info');
    }
  },

  handleRemoteLiveMatchClear() {
    localStorage.removeItem('fctnt_live_pitch_draft');
    this.livePitchState.events = [];
    this.livePitchState.registeredPlayerIds = [];
    this.livePitchState.homeScore = 0;
    this.livePitchState.awayScore = 0;
    this.livePitchState.timerSeconds = 0;
    this.livePitchState.period = 1;
    this.initLiveRoster();
    this.updateLiveCompanionUI();
  },

  closeLiveCompanionModal() {
    const modal = document.getElementById('live-companion-modal');
    if (modal) modal.classList.remove('active');
    this.closeLivePlayerPicker();
    this.closeLiveRosterModal();
    this.saveLiveDraft();
  },

  // ==========================================
  // SCREEN WAKE LOCK (GIỮ SÁNG MÀN HÌNH NGOÀI SÂN)
  // ==========================================
  async toggleScreenWakeLock() {
    if (this.livePitchState.wakeLockSentinel) {
      this.releaseWakeLock();
      window.showToast('Đã tắt chế độ giữ sáng màn hình');
    } else {
      await this.acquireWakeLock();
      if (this.livePitchState.wakeLockSentinel) {
        window.showToast('☀️ Đã bật giữ sáng màn hình ngoài sân bóng!');
      }
    }
  },

  async acquireWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.livePitchState.wakeLockSentinel = await navigator.wakeLock.request('screen');
        this.livePitchState.isScreenWakeOn = true;
        const btn = document.getElementById('live-wakelock-toggle');
        const text = document.getElementById('live-wakelock-text');
        if (btn) btn.classList.add('active');
        if (text) text.innerText = 'Màn hình: LUÔN SÁNG ☀️';

        this.livePitchState.wakeLockSentinel.addEventListener('release', () => {
          this.livePitchState.wakeLockSentinel = null;
          this.livePitchState.isScreenWakeOn = false;
          if (btn) btn.classList.remove('active');
          if (text) text.innerText = 'Giữ sáng: TẮT';
        });
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    }
  },

  releaseWakeLock() {
    if (this.livePitchState.wakeLockSentinel) {
      this.livePitchState.wakeLockSentinel.release();
      this.livePitchState.wakeLockSentinel = null;
    }
    this.livePitchState.isScreenWakeOn = false;
    const btn = document.getElementById('live-wakelock-toggle');
    const text = document.getElementById('live-wakelock-text');
    if (btn) btn.classList.remove('active');
    if (text) text.innerText = 'Giữ sáng: TẮT';
  },

  // ==========================================
  // MATCH TIMER (ĐỒNG HỒ BẤM GIỜ LIỀN MẠCH SÂN PHỦI)
  // ==========================================
  toggleLiveTimer() {
    const btn = document.getElementById('live-timer-toggle-btn');
    const periodBadge = document.getElementById('live-timer-period');

    if (this.livePitchState.isTimerRunning) {
      // Pause
      clearInterval(this.livePitchState.timerInterval);
      this.livePitchState.timerInterval = null;
      this.livePitchState.isTimerRunning = false;
      if (btn) {
        btn.innerHTML = '▶️ Tiếp Tục';
        btn.style.background = 'rgba(16, 185, 129, 0.2)';
      }
      if (periodBadge) {
        periodBadge.innerText = '⏸️ TẠM DỪNG';
        periodBadge.style.color = '#fbbf24';
        periodBadge.style.background = 'rgba(245, 158, 11, 0.15)';
      }
    } else {
      // Start
      this.livePitchState.isTimerRunning = true;
      if (btn) {
        btn.innerHTML = '⏸️ Tạm Dừng';
        btn.style.background = 'rgba(239, 68, 68, 0.25)';
      }
      if (periodBadge) {
        periodBadge.innerText = '🟢 ĐANG THI ĐẤU';
        periodBadge.style.color = 'var(--accent-emerald)';
        periodBadge.style.background = 'rgba(16, 185, 129, 0.15)';
      }
      this.livePitchState.timerInterval = setInterval(() => {
        this.livePitchState.timerSeconds++;
        this.updateTimerDisplay();
        if (this.livePitchState.timerSeconds % 10 === 0) {
          this.saveLiveDraft();
        }
      }, 1000);
    }
  },

  finishLiveMatchTime() {
    if (this.livePitchState.isTimerRunning) {
      this.toggleLiveTimer();
    }
    const periodBadge = document.getElementById('live-timer-period');
    if (periodBadge) {
      periodBadge.innerText = '🏁 ĐÃ KẾT THÚC';
      periodBadge.style.color = '#f87171';
      periodBadge.style.background = 'rgba(239, 68, 68, 0.15)';
    }
    const mins = Math.floor(this.livePitchState.timerSeconds / 60);
    this.recordLiveEvent('NOTE', null, null, `🏁 Trọng tài / Hai đội kết thúc trận đấu (Tổng thời gian: ${mins} phút)`);
    window.showToast(`🏁 Hết giờ thi đấu (${mins} phút)! Giờ bạn có thể bấm "🤖 AI Chấm Điểm" hoặc "📋 Copy Gửi Zalo".`);
    this.saveLiveDraft();
  },

  resetLiveTimer() {
    if (confirm('Bạn có chắc muốn đặt lại đồng hồ bấm giờ về 00:00?')) {
      if (this.livePitchState.isTimerRunning) {
        this.toggleLiveTimer();
      }
      this.livePitchState.timerSeconds = 0;
      const periodBadge = document.getElementById('live-timer-period');
      const btn = document.getElementById('live-timer-toggle-btn');
      if (periodBadge) {
        periodBadge.innerText = '⏱️ CHƯA BẮT ĐẦU';
        periodBadge.style.color = 'var(--accent-gold)';
        periodBadge.style.background = 'rgba(245, 158, 11, 0.15)';
      }
      if (btn) {
        btn.innerHTML = '▶️ Bắt Đầu';
        btn.style.background = 'rgba(16, 185, 129, 0.2)';
      }
      this.updateTimerDisplay();
      this.saveLiveDraft();
    }
  },

  updateTimerDisplay() {
    const display = document.getElementById('live-timer-display');
    if (!display) return;
    const mins = Math.floor(this.livePitchState.timerSeconds / 60);
    const secs = this.livePitchState.timerSeconds % 60;
    display.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  getCurrentMatchMinute() {
    if (this.livePitchState.timerSeconds > 0) {
      return Math.floor(this.livePitchState.timerSeconds / 60) + 1;
    }
    return 1;
  },

  // ==========================================
  // SCORE STEPPER & SYNC
  // ==========================================
  adjustLiveScore(team, delta) {
    if (team === 'home') {
      this.livePitchState.homeScore = Math.max(0, this.livePitchState.homeScore + delta);
      document.getElementById('live-home-score').innerText = this.livePitchState.homeScore;
    } else {
      this.livePitchState.awayScore = Math.max(0, this.livePitchState.awayScore + delta);
      document.getElementById('live-away-score').innerText = this.livePitchState.awayScore;
    }
    this.saveLiveDraft();
  },

  // ==========================================
  // 🎙️ VOICE-TO-EVENT ENGINE (WEB SPEECH API + FALLBACK)
  // ==========================================
  async toggleVoiceRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    const micBtn = document.getElementById('live-voice-mic-btn');
    const statusText = document.getElementById('live-voice-status');
    const transcriptText = document.getElementById('live-voice-transcript');
    const controlsRow = document.getElementById('live-voice-controls-row');
    const inputEdit = document.getElementById('live-voice-input-edit');

    // Nếu đang ghi âm -> Dừng lại và mở ô duyệt
    if (this.livePitchState.isRecordingVoice && this.livePitchState.speechRecognition) {
      try {
        this.livePitchState.speechRecognition.stop();
      } catch (e) { }
      this.livePitchState.isRecordingVoice = false;
      if (micBtn) micBtn.classList.remove('recording');
      if (statusText) statusText.innerText = '🎙️ Đã dừng thu! Bấm "Ghi Nhận" hoặc chỉnh sửa';
      return;
    }

    // Trường hợp trình duyệt không hỗ trợ Web Speech API (Firefox, In-app Browser,...)
    if (!SpeechRecognition) {
      if (controlsRow) controlsRow.style.display = 'flex';
      if (inputEdit) {
        inputEdit.focus();
        inputEdit.placeholder = 'Nhập câu sự kiện (hoặc bấm biểu tượng Mic 🎙️ trên bàn phím điện thoại)...';
      }
      if (statusText) statusText.innerText = '⌨️ Nhập sự kiện / Dùng Mic bàn phím';
      if (transcriptText) transcriptText.innerText = 'Trình duyệt chưa hỗ trợ Speech API trực tiếp. Bạn có thể dùng phím Mic trên bàn phím điện thoại hoặc chọn mẫu nhanh bên dưới!';
      window.showToast('Bạn có thể nhập câu lệnh hoặc dùng phím Micro 🎙️ trên bàn phím điện thoại!', 'info');
      return;
    }

    try {
      // Hủy bỏ instance cũ nếu còn tồn tại
      if (this.livePitchState.speechRecognition) {
        try { this.livePitchState.speechRecognition.abort(); } catch (e) { }
        this.livePitchState.speechRecognition = null;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      // Trên Android Chrome, continuous=false ổn định hơn nhiều và không bị ngắt audio stream
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      this.livePitchState.speechRecognition = recognition;
      this.livePitchState.isRecordingVoice = true;

      if (micBtn) micBtn.classList.add('recording');
      if (statusText) statusText.innerText = '🔴 Đang lắng nghe... Hãy nói sự kiện trận đấu!';
      if (transcriptText) transcriptText.innerText = 'Đang nhận diện giọng nói tiếng Việt...';
      if (inputEdit) inputEdit.value = '';
      if (controlsRow) controlsRow.style.display = 'flex';

      let speechTimeout = null;

      recognition.onstart = () => {
        this.livePitchState.isRecordingVoice = true;
        if (micBtn) micBtn.classList.add('recording');
        if (statusText) statusText.innerText = '🔴 Đang lắng nghe... Hãy nói sự kiện!';
        // Tự động dừng sau 12 giây nếu người dùng không bấm nút dừng
        speechTimeout = setTimeout(() => {
          if (this.livePitchState.isRecordingVoice && this.livePitchState.speechRecognition) {
            try { this.livePitchState.speechRecognition.stop(); } catch (e) { }
          }
        }, 12000);
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          if (transcriptText) transcriptText.innerText = `"${currentText}"`;
          if (inputEdit) inputEdit.value = currentText;
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (speechTimeout) clearTimeout(speechTimeout);
        if (micBtn) micBtn.classList.remove('recording');
        this.livePitchState.isRecordingVoice = false;

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          window.showToast('Quyền Micro bị từ chối! Hãy bấm vào biểu tượng 🔒 trên thanh địa chỉ để BẬT Micro.', 'error');
          if (statusText) statusText.innerText = '⚠️ Quyền truy cập Micro bị chặn (Bật ở 🔒)';
        } else if (event.error === 'no-speech') {
          if (statusText) statusText.innerText = '🎙️ Chưa nhận được tiếng, chạm lại Mic và nói gần hơn!';
        } else if (event.error === 'network') {
          window.showToast('Lỗi kết nối mạng dịch vụ giọng nói Google. Bạn có thể gõ nhanh hoặc chọn mẫu bên dưới!', 'warning');
          if (statusText) statusText.innerText = '⌨️ Có thể gõ nhanh hoặc chọn mẫu sự kiện bên dưới';
        } else if (event.error === 'audio-capture') {
          window.showToast('Không tìm thấy thiết bị thu âm Micro hoặc Micro đang bận bởi ứng dụng khác!', 'error');
          if (statusText) statusText.innerText = '⚠️ Thiết bị Micro đang bận';
        } else {
          if (statusText) statusText.innerText = '🎙️ Chạm Mic & Nói Tự Nhiên (Tiếng Việt)';
        }
      };

      recognition.onend = () => {
        if (speechTimeout) clearTimeout(speechTimeout);
        if (micBtn) micBtn.classList.remove('recording');
        this.livePitchState.isRecordingVoice = false;
        const currentVal = inputEdit ? inputEdit.value.trim() : '';
        if (statusText) {
          statusText.innerText = currentVal ? '✅ Đã nhận diện! Bấm "Ghi Nhận Sự Kiện" để xác nhận' : '🎙️ Chạm Mic & Nói Tự Nhiên (Tiếng Việt)';
        }
      };

      recognition.start();
    } catch (err) {
      console.error('Speech recognition start failed:', err);
      this.livePitchState.isRecordingVoice = false;
      if (micBtn) micBtn.classList.remove('recording');
      if (controlsRow) controlsRow.style.display = 'flex';
      if (inputEdit) inputEdit.focus();
      window.showToast('Không thể bật ghi âm tự động: ' + (err.message || 'Lỗi khởi động'), 'warning');
    }
  },

  toggleVoiceManualInput() {
    const controlsRow = document.getElementById('live-voice-controls-row');
    const inputEdit = document.getElementById('live-voice-input-edit');
    const statusText = document.getElementById('live-voice-status');

    if (!controlsRow) return;

    if (controlsRow.style.display === 'none' || !controlsRow.style.display) {
      controlsRow.style.display = 'flex';
      if (inputEdit) {
        inputEdit.focus();
        inputEdit.placeholder = 'Nhập câu sự kiện (hoặc dùng mic bàn phím)...';
      }
      if (statusText) statusText.innerText = '⌨️ Đang mở ô nhập sự kiện thủ công';
    } else {
      controlsRow.style.display = 'none';
      if (statusText) statusText.innerText = '🎙️ Chạm Mic & Nói Tự Nhiên (Tiếng Việt)';
    }
  },

  quickVoicePreset(presetText) {
    const inputEdit = document.getElementById('live-voice-input-edit');
    const controlsRow = document.getElementById('live-voice-controls-row');

    if (inputEdit) inputEdit.value = presetText;
    if (controlsRow) controlsRow.style.display = 'flex';

    // Xử lý và ghi nhận ngay
    this.parseVoiceTranscript(presetText);

    const statusText = document.getElementById('live-voice-status');
    const transcriptText = document.getElementById('live-voice-transcript');
    if (statusText) statusText.innerText = '🎙️ Chạm Mic & Nói Tự Nhiên (Tiếng Việt)';
    if (transcriptText) transcriptText.innerText = `Đã ghi nhận: "${presetText}"`;
    if (inputEdit) inputEdit.value = '';
    if (controlsRow) controlsRow.style.display = 'none';
  },

  cancelVoiceRecording() {
    if (this.livePitchState.speechRecognition && this.livePitchState.isRecordingVoice) {
      this.livePitchState.speechRecognition.stop();
    }
    this.livePitchState.isRecordingVoice = false;

    const micBtn = document.getElementById('live-voice-mic-btn');
    const statusText = document.getElementById('live-voice-status');
    const transcriptText = document.getElementById('live-voice-transcript');
    const controlsRow = document.getElementById('live-voice-controls-row');
    const inputEdit = document.getElementById('live-voice-input-edit');

    if (micBtn) micBtn.classList.remove('recording');
    if (statusText) statusText.innerText = '🎙️ Chạm Mic & Nói Tự Nhiên (Tiếng Việt)';
    if (transcriptText) transcriptText.innerText = 'Ví dụ: "Quân vừa sút xa ghi bàn, Tuấn Anh kiến tạo" hoặc "Hùng cứu thua 1vs1"';
    if (inputEdit) inputEdit.value = '';
    if (controlsRow) controlsRow.style.display = 'none';

    window.showToast('Đã hủy bỏ câu nói');
  },

  submitVoiceRecording() {
    if (this.livePitchState.speechRecognition && this.livePitchState.isRecordingVoice) {
      this.livePitchState.speechRecognition.stop();
    }
    this.livePitchState.isRecordingVoice = false;

    const micBtn = document.getElementById('live-voice-mic-btn');
    const statusText = document.getElementById('live-voice-status');
    const transcriptText = document.getElementById('live-voice-transcript');
    const controlsRow = document.getElementById('live-voice-controls-row');
    const inputEdit = document.getElementById('live-voice-input-edit');

    const textToSubmit = inputEdit ? inputEdit.value.trim() : '';

    if (!textToSubmit || textToSubmit === 'Đang nghe bạn nói...') {
      window.showToast('Chưa có nội dung sự kiện để ghi nhận!', 'info');
      return;
    }

    this.parseVoiceTranscript(textToSubmit);

    if (micBtn) micBtn.classList.remove('recording');
    if (statusText) statusText.innerText = '🎙️ Chạm Mic & Nói Tự Nhiên (Tiếng Việt)';
    if (transcriptText) transcriptText.innerText = `Đã ghi nhận: "${textToSubmit}"`;
    if (inputEdit) inputEdit.value = '';
    if (controlsRow) controlsRow.style.display = 'none';
  },

  getPlayerShortName(p) {
    if (!p) return '';
    if (p.nickname && p.nickname.trim()) return p.nickname.trim();
    return p.name || '';
  },

  getPlayerAliases(p) {
    const aliases = new Set();
    const rawName = (p.name || '').toLowerCase().trim();
    const rawNick = (p.nickname || '').toLowerCase().trim();
    const numStr = String(p.number || '').trim();

    if (rawName) aliases.add(rawName);
    if (rawNick) aliases.add(rawNick);
    if (numStr) {
      aliases.add(`số ${numStr}`);
      aliases.add(`#${numStr}`);
    }

    const nameParts = rawName.split(/\s+/);
    if (nameParts.length > 1) {
      aliases.add(nameParts[nameParts.length - 1]);
    }
    const nickParts = rawNick.split(/\s+/);
    if (nickParts.length > 1) {
      aliases.add(nickParts[0]);
      aliases.add(nickParts[nickParts.length - 1]);
    }

    // Bảng ánh xạ biệt danh phủi đặc trưng của FC TNT
    if (rawName.includes('vinh') || rawNick.includes('vinh')) {
      aliases.add('duy vinh');
      aliases.add('vinh lê');
      aliases.add('vinh');
    }
    if (rawName.includes('todiu') || rawNick.includes('todiu') || rawName.includes('diu') || rawNick.includes('diu') || rawName.includes('diệu') || rawNick.includes('diệu')) {
      aliases.add('tố địu');
      aliases.add('tố điệu');
      aliases.add('tố');
      aliases.add('địu');
    }
    if (rawName.includes('quang') || rawNick.includes('quang')) {
      aliases.add('quang');
      aliases.add('voi');
    }
    if (rawName.includes('bắc') || rawNick.includes('bắc')) {
      aliases.add('đức bắc');
      aliases.add('bắc');
    }
    if (rawName.includes('giang') || rawNick.includes('giang')) {
      aliases.add('trường giang');
      aliases.add('giang');
    }
    if (rawName.includes('dũng') || rawNick.includes('dũng')) {
      aliases.add('công dũng');
      aliases.add('dũng');
    }
    if (rawName.includes('hoàn') || rawNick.includes('hoàn')) {
      aliases.add('trí hoàn');
      aliases.add('hoàn');
    }
    if (rawName.includes('quân') || rawNick.includes('quân')) {
      aliases.add('quân kun');
      aliases.add('quân');
      aliases.add('công quân');
    }
    if (rawName.includes('tài') || rawNick.includes('tài')) {
      aliases.add('tài thọ');
      aliases.add('tài');
      aliases.add('tấn tài');
      aliases.add('lê tấn tài');
    }
    if (rawName.includes('hùng') || rawNick.includes('hùng')) {
      aliases.add('hùng sứt');
      aliases.add('hùng');
      aliases.add('lường hùng');
    }
    if (rawName.includes('nam') || rawNick.includes('nam')) {
      if (rawName.includes('thành nam') || rawNick.includes('thành nam')) {
        aliases.add('thành nam');
        aliases.add('nam cao');
      }
      if (rawName.includes('sỹ nam') || rawNick.includes('sỹ nam') || p.position === 'GK') {
        aliases.add('sỹ nam');
        aliases.add('nam thấp');
      }
    }
    if (rawName.includes('chiến') || rawNick.includes('chiến')) {
      aliases.add('đình chiến');
      aliases.add('chiến');
    }
    if (rawName.includes('anh') || rawNick.includes('anh')) {
      aliases.add('đình anh');
      aliases.add('anh');
    }
    if (rawName.includes('tiến') || rawNick.includes('tiến')) {
      aliases.add('tiếnn');
      aliases.add('tiến');
      aliases.add('công tiến');
    }

    if (rawName.includes('ct') || rawNick.includes('ct') || rawName.includes('thắng') || rawNick.includes('thắng')) {
      aliases.add('ct');
      aliases.add('thắng');
      aliases.add('công thắng');
    }

    return Array.from(aliases).filter(a => a.length >= 2);
  },

  parseVoiceTranscript(text) {
    const raw = text.toLowerCase().trim();
    if (!raw) return;

    const allPlayers = window.stateManager.getPlayers();
    const minute = this.getCurrentMatchMinute();

    // 1. Quét tìm tất cả các đề cập cầu thủ trong câu nói theo vị trí
    const mentions = [];
    allPlayers.forEach(p => {
      const aliases = this.getPlayerAliases(p);
      aliases.forEach(alias => {
        let startIndex = 0;
        while ((startIndex = raw.indexOf(alias, startIndex)) !== -1) {
          const prevChar = startIndex > 0 ? raw[startIndex - 1] : ' ';
          const nextChar = startIndex + alias.length < raw.length ? raw[startIndex + alias.length] : ' ';
          const isWordBoundary = /[\s,.;!?:()\n\r\t\[\]'"]/.test(prevChar) && /[\s,.;!?:()\n\r\t\[\]'"]/.test(nextChar);

          if (isWordBoundary || startIndex === 0 || startIndex + alias.length === raw.length) {
            mentions.push({
              player: p,
              alias,
              startIndex,
              endIndex: startIndex + alias.length
            });
          }
          startIndex += alias.length;
        }
      });
    });

    // Sắp xếp theo vị trí xuất hiện trong câu; nếu cùng vị trí thì ưu tiên alias dài hơn
    mentions.sort((a, b) => a.startIndex - b.startIndex || b.alias.length - a.alias.length);

    // Lọc trùng lặp
    const cleanMentions = [];
    mentions.forEach(m => {
      if (!cleanMentions.some(existing =>
        (m.startIndex >= existing.startIndex && m.startIndex < existing.endIndex) ||
        (m.player.id === existing.player.id && Math.abs(m.startIndex - existing.startIndex) < 6)
      )) {
        cleanMentions.push(m);
      }
    });

    // 2. Phân tích ngữ nghĩa bóng đá thông minh (Grammar & Intent Parsing)
    let handled = false;

    // A. Mẫu: [A] kiến tạo / chuyền / tạt / dọn cỗ cho [B] ghi bàn / sút vào / lập công
    if (!handled && cleanMentions.length >= 2) {
      const p1 = cleanMentions[0];
      const p2 = cleanMentions[1];
      const betweenText = raw.substring(p1.endIndex, p2.startIndex);
      const afterText = raw.substring(p2.endIndex);

      const isP1AssistP2 = /kiến\s*tạo|chuyền|tạt|dọn\s*cỗ|đưa\s*bóng|nhả\s*bóng/i.test(betweenText) &&
        /cho|để|tới/i.test(betweenText);
      const isP2Score = /ghi\s*bàn|sút\s*vào|lập\s*công|đánh\s*đầu|đệm\s*bóng|vào\s*rồi|lưới/i.test(afterText) ||
        /ghi\s*bàn|sút\s*vào|lập\s*công/i.test(raw);

      if (isP1AssistP2 && isP2Score) {
        const assistPlayer = p1.player;
        const scorerPlayer = p2.player;
        const scorerName = this.getPlayerShortName(scorerPlayer);
        const assistName = this.getPlayerShortName(assistPlayer);

        this.recordLiveEvent('GOAL', scorerPlayer.id, assistPlayer.id, `${assistName} kiến tạo cho ${scorerName} ghi bàn`);
        this.adjustLiveScore('home', 1);
        window.showToast(`⚽ +1 Bàn thắng cho ${scorerName} (Kiến tạo: ${assistName})!`);
        handled = true;
      }
    }

    // B. Mẫu: [B] ghi bàn từ đường chuyền / kiến tạo của [A] hoặc [B] ghi bàn, [A] kiến tạo
    if (!handled && cleanMentions.length >= 2) {
      const p1 = cleanMentions[0];
      const p2 = cleanMentions[1];
      const betweenText = raw.substring(p1.endIndex, p2.startIndex);
      const afterText = raw.substring(p2.endIndex);

      const isP1Scorer = /ghi\s*bàn|sút\s*vào|lập\s*công|đánh\s*đầu/i.test(betweenText);
      const isP2Assist = /kiến\s*tạo|chuyền|dọn\s*cỗ|tạt/i.test(betweenText) || /kiến\s*tạo|chuyền|dọn\s*cỗ/i.test(afterText);

      if (isP1Scorer && isP2Assist) {
        const scorerPlayer = p1.player;
        const assistPlayer = p2.player;
        const scorerName = this.getPlayerShortName(scorerPlayer);
        const assistName = this.getPlayerShortName(assistPlayer);

        this.recordLiveEvent('GOAL', scorerPlayer.id, assistPlayer.id, `${scorerName} ghi bàn (Kiến tạo: ${assistName})`);
        this.adjustLiveScore('home', 1);
        window.showToast(`⚽ +1 Bàn thắng cho ${scorerName} (Kiến tạo: ${assistName})!`);
        handled = true;
      }
    }

    // C. Siêu phẩm / Solo qua người
    if (!handled && (raw.includes('siêu phẩm') || raw.includes('solo') || raw.includes('qua 3 người') || raw.includes('góc chữ a') || raw.includes('móc bóng') || raw.includes('xe đạp chổng ngược') || raw.includes('sút xa đỉnh'))) {
      const primary = cleanMentions[0]?.player;
      const secondary = cleanMentions[1]?.player;
      if (primary) {
        const pName = this.getPlayerShortName(primary);
        const assistName = secondary ? this.getPlayerShortName(secondary) : null;
        this.recordLiveEvent('WONDERGOAL', primary.id, secondary ? secondary.id : null, `${pName} lập siêu phẩm: "${text}"`);
        this.adjustLiveScore('home', 1);
        window.showToast(`🌟 Siêu phẩm cho ${pName}! Quá đỉnh!`);
      } else {
        this.recordLiveEvent('WONDERGOAL', null, null, `🌟 ${minute}': Siêu phẩm - "${text}"`);
        this.adjustLiveScore('home', 1);
        window.showToast(`🌟 Siêu phẩm từ giọng nói!`);
      }
      handled = true;
    }

    // D. Bàn thắng đơn lẻ
    if (!handled && (raw.includes('ghi bàn') || raw.includes('sút vào') || raw.includes('bàn thắng') || raw.includes('lập công') || raw.includes('vào rồi'))) {
      const primary = cleanMentions[0]?.player;
      const secondary = cleanMentions[1]?.player;
      if (primary) {
        const pName = this.getPlayerShortName(primary);
        const assistName = secondary ? this.getPlayerShortName(secondary) : null;
        this.recordLiveEvent('GOAL', primary.id, secondary ? secondary.id : null, `🎙️ Giọng nói: "${text}"`);
        this.adjustLiveScore('home', 1);
        window.showToast(`⚽ +1 Bàn thắng cho ${pName}${assistName ? ` (Kiến tạo: ${assistName})` : ''}!`);
      } else {
        this.recordLiveEvent('NOTE', null, null, `⚽ ${minute}': Bàn thắng - "${text}"`);
        this.adjustLiveScore('home', 1);
        window.showToast(`⚽ +1 Bàn thắng từ giọng nói!`);
      }
      handled = true;
    }

    // E. Kiến tạo đơn lẻ
    if (!handled && (raw.includes('kiến tạo') || raw.includes('dọn cỗ') || raw.includes('chuyền đẹp') || raw.includes('tạt bóng chuẩn'))) {
      const primary = cleanMentions[0]?.player;
      if (primary) {
        const pName = this.getPlayerShortName(primary);
        this.recordLiveEvent('ASSIST', primary.id, null, `${pName} có đường kiến tạo đẹp`);
        window.showToast(`👟 +1 Kiến tạo cho ${pName}!`);
        handled = true;
      }
    }

    // F. Cứu thua / Cản phá
    if (!handled && (raw.includes('cứu thua') || raw.includes('cản phá') || raw.includes('bắt dính') || raw.includes('xuất thần') || raw.includes('đẩy bóng'))) {
      const p = cleanMentions[0]?.player || allPlayers.find(pl => pl.position === 'GK') || allPlayers[0];
      const pName = this.getPlayerShortName(p);
      this.recordLiveEvent('SAVE', p ? p.id : null, null, `${pName} cản phá cứu thua xuất thần`);
      window.showToast(`🧤 Cứu thua xuất thần: ${pName}!`);
      handled = true;
    }

    // G. Xà ngang / Cột dọc
    if (!handled && (raw.includes('xà ngang') || raw.includes('cột dọc') || raw.includes('trúng xà') || raw.includes('trúng cột') || raw.includes('khung gỗ'))) {
      const primary = cleanMentions[0]?.player;
      const pName = primary ? this.getPlayerShortName(primary) : 'Cầu thủ';
      this.recordLiveEvent('WOODWORK', primary ? primary.id : null, null, `${pName} dứt điểm trúng khung gỗ`);
      window.showToast(`🪵 Sút trúng xà/cột: ${pName}!`);
      handled = true;
    }

    // H. Bỏ lỡ cơ hội
    if (!handled && (raw.includes('bỏ lỡ') || raw.includes('đệm ra ngoài') || raw.includes('lên trời') || raw.includes('bắn chim') || raw.includes('gỗ'))) {
      const primary = cleanMentions[0]?.player;
      const pName = primary ? this.getPlayerShortName(primary) : 'Cầu thủ';
      this.recordLiveEvent('MISS', primary ? primary.id : null, null, `${pName} bỏ lỡ cơ hội ngon ăn`);
      window.showToast(`💨 Bỏ lỡ đáng tiếc: ${pName}!`);
      handled = true;
    }

    // I. Tấu hài
    if (!handled && (raw.includes('tấu hài') || raw.includes('hài hước') || raw.includes('vấp cỏ') || raw.includes('trượt chân') || raw.includes('ngã'))) {
      const primary = cleanMentions[0]?.player;
      const pName = primary ? this.getPlayerShortName(primary) : 'Cầu thủ';
      this.recordLiveEvent('FUNNY', primary ? primary.id : null, null, `${pName} tạo khoảnh khắc tấu hài`);
      window.showToast(`😂 Pha tấu hài: ${pName}!`);
      handled = true;
    }

    // J. Phòng ngự / Bọc lót
    if (!handled && (raw.includes('phòng ngự') || raw.includes('bọc lót') || raw.includes('cắt bóng') || raw.includes('thủ hay') || raw.includes('xoạc bóng'))) {
      const primary = cleanMentions[0]?.player;
      const pName = primary ? this.getPlayerShortName(primary) : 'Cầu thủ';
      this.recordLiveEvent('DEFENSE', primary ? primary.id : null, null, `${pName} phòng ngự chắc chắn`);
      window.showToast(`🧱 Phòng ngự hay: ${pName}!`);
      handled = true;
    }

    // K. Mặc định: Ghi chú diễn biến
    if (!handled) {
      const primary = cleanMentions[0]?.player;
      this.recordLiveEvent('NOTE', primary ? primary.id : null, null, `🎙️ "${text}"`);
      window.showToast(`📝 Đã ghi nhận diễn biến: "${text}"`);
    }
  },

  // ==========================================
  // QUICK TOUCH ACTION MATRIX & PLAYER PICKER
  // ==========================================
  openLivePlayerPicker(actionType) {
    this.livePitchState.currentAction = actionType;
    this.livePitchState.pendingGoalPlayerId = null;

    const overlay = document.getElementById('live-player-picker-overlay');
    const tagEl = document.getElementById('live-picker-action-tag');
    const titleEl = document.getElementById('live-picker-title');
    const assistBox = document.getElementById('live-assist-prompt-box');
    const grid = document.getElementById('live-picker-player-grid');

    if (assistBox) assistBox.style.display = 'none';

    const actionConfig = {
      GOAL: { tag: '⚽ BÀN THẮNG (+1)', title: 'Ai là người ghi bàn?', color: '#ef4444' },
      ASSIST: { tag: '👟 KIẾN TẠO (+1)', title: 'Ai là người kiến tạo?', color: '#06b6d4' },
      SAVE: { tag: '🧤 CỨU THUA XUẤT THẦN', title: 'Ai là người cản phá cứu thua?', color: '#f59e0b' },
      WONDERGOAL: { tag: '🌟 SIÊU PHẨM / SOLO', title: 'Ai vừa lập siêu phẩm / solo qua người?', color: '#fbbf24' },
      WOODWORK: { tag: '🪵 SÚT XÀ / CỘT DỌC', title: 'Ai sút bóng trúng khung gỗ?', color: '#d97706' },
      MISS: { tag: '💨 BỎ LỠ ĐÁNG TIẾC', title: 'Ai vừa bỏ lỡ cơ hội ngon ăn?', color: '#94a3b8' },
      DEFENSE: { tag: '🧱 BỌC LÓT / CẮT BÓNG HAY', title: 'Ai vừa phòng ngự / cản phá hay?', color: '#10b981' },
      FUNNY: { tag: '😂 PHA TẤU HÀI SÂN CỎ', title: 'Ai vừa tạo khoảnh khắc tấu hài?', color: '#a855f7' }
    };

    const cfg = actionConfig[actionType] || { tag: '⚡ SỰ KIỆN', title: 'Chọn cầu thủ liên quan:', color: '#fff' };
    if (tagEl) {
      tagEl.innerText = cfg.tag;
      tagEl.style.color = cfg.color;
    }
    if (titleEl) titleEl.innerText = cfg.title;

    const allPlayers = window.stateManager.getPlayers();
    let eligiblePlayers = allPlayers.filter(p => (this.livePitchState.registeredPlayerIds || []).includes(p.id));
    if (eligiblePlayers.length === 0) eligiblePlayers = allPlayers;

    if (grid) {
      grid.innerHTML = eligiblePlayers.map(p => {
        const displayName = this.getPlayerShortName(p);
        return `
          <div class="live-picker-card" onclick="window.matchesModule.selectPlayerForLiveAction('${p.id}')">
            <img class="live-picker-avatar" src="${p.avatar}" alt="${displayName}">
            <div style="overflow: hidden;">
              <div class="live-picker-name">${displayName}</div>
              <div class="live-picker-sub">#${p.number} • ${p.position}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    if (overlay) overlay.style.display = 'flex';
  },

  closeLivePlayerPicker() {
    const overlay = document.getElementById('live-player-picker-overlay');
    if (overlay) overlay.style.display = 'none';
    this.livePitchState.currentAction = null;
    this.livePitchState.pendingGoalPlayerId = null;
  },

  selectPlayerForLiveAction(playerId) {
    const p = window.stateManager.getPlayerById(playerId);
    if (!p) return;
    const pShort = this.getPlayerShortName(p);

    if (this.livePitchState.currentAction === 'GOAL') {
      if (!this.livePitchState.pendingGoalPlayerId) {
        // Bước 1: Đã chọn người ghi bàn -> chuyển sang chọn người kiến tạo
        this.livePitchState.pendingGoalPlayerId = playerId;
        const tagEl = document.getElementById('live-picker-action-tag');
        const titleEl = document.getElementById('live-picker-title');
        const assistBox = document.getElementById('live-assist-prompt-box');

        if (tagEl) {
          tagEl.innerText = `⚽ BÀN THẮNG: ${pShort}`;
          tagEl.style.color = '#ef4444';
        }
        if (titleEl) titleEl.innerText = '👟 Ai là người kiến tạo đường chuyền?';
        if (assistBox) assistBox.style.display = 'block';

        // Lọc bớt người ghi bàn ra khỏi danh sách kiến tạo (ưu tiên người trong danh sách có mặt)
        const allPlayers = window.stateManager.getPlayers();
        let eligiblePlayers = allPlayers.filter(pl => (this.livePitchState.registeredPlayerIds || []).includes(pl.id));
        if (eligiblePlayers.length === 0) eligiblePlayers = allPlayers;

        const grid = document.getElementById('live-picker-player-grid');
        if (grid) {
          grid.innerHTML = eligiblePlayers.filter(pl => pl.id !== playerId).map(pl => {
            const displayName = this.getPlayerShortName(pl);
            return `
              <div class="live-picker-card" onclick="window.matchesModule.selectPlayerForLiveAction('${pl.id}')">
                <img class="live-picker-avatar" src="${pl.avatar}" alt="${displayName}">
                <div style="overflow: hidden;">
                  <div class="live-picker-name">${displayName}</div>
                  <div class="live-picker-sub">#${pl.number} • ${pl.position}</div>
                </div>
              </div>
            `;
          }).join('');
        }
        return;
      } else {
        // Bước 2: Đã chọn người kiến tạo
        const scorer = window.stateManager.getPlayerById(this.livePitchState.pendingGoalPlayerId);
        const scorerShort = this.getPlayerShortName(scorer);
        this.recordLiveEvent('GOAL', scorer.id, p.id, `${scorerShort} ghi bàn (Kiến tạo: ${pShort})`);
        this.adjustLiveScore('home', 1);
        window.showToast(`⚽ +1 Bàn thắng cho ${scorerShort} (Kiến tạo: ${pShort})!`);
        this.closeLivePlayerPicker();
        return;
      }
    }

    // Các sự kiện khác
    const action = this.livePitchState.currentAction;
    if (action === 'WONDERGOAL') {
      this.recordLiveEvent('WONDERGOAL', p.id, null, `${pShort} lập siêu phẩm solo / sút xa đẹp mắt`);
      this.adjustLiveScore('home', 1);
      window.showToast(`🌟 +1 Siêu phẩm cho ${pShort}! Quá đẳng cấp!`);
    } else if (action === 'ASSIST') {
      this.recordLiveEvent('ASSIST', p.id, null, `${pShort} có đường chuyền dọn cỗ`);
      window.showToast(`👟 +1 Kiến tạo cho ${pShort}!`);
    } else if (action === 'SAVE') {
      this.recordLiveEvent('SAVE', p.id, null, `${pShort} cản phá xuất thần cứu thua mười mươi`);
      window.showToast(`🧤 Cứu thua xuất thần: ${pShort}!`);
    } else if (action === 'WOODWORK') {
      this.recordLiveEvent('WOODWORK', p.id, null, `${pShort} dứt điểm dội xà ngang / cột dọc`);
      window.showToast(`🪵 Sút trúng xà/cột: ${pShort}!`);
    } else if (action === 'MISS') {
      this.recordLiveEvent('MISS', p.id, null, `${pShort} bỏ lỡ cơ hội đáng tiếc trước gôn`);
      window.showToast(`💨 Bỏ lỡ đáng tiếc: ${pShort}!`);
    } else if (action === 'DEFENSE') {
      this.recordLiveEvent('DEFENSE', p.id, null, `${pShort} bọc lót và cắt bóng chuẩn xác`);
      window.showToast(`🧱 Phòng ngự chắc chắn: ${pShort}!`);
    } else if (action === 'FUNNY') {
      this.recordLiveEvent('FUNNY', p.id, null, `${pShort} có pha xử lý tấu hài mang lại tiếng cười`);
      window.showToast(`😂 Pha tấu hài: ${pShort}!`);
    }

    this.closeLivePlayerPicker();
  },

  skipAssistSelection() {
    if (this.livePitchState.pendingGoalPlayerId) {
      const scorer = window.stateManager.getPlayerById(this.livePitchState.pendingGoalPlayerId);
      if (scorer) {
        const scorerShort = this.getPlayerShortName(scorer);
        this.recordLiveEvent('GOAL', scorer.id, null, `${scorerShort} solo lập công (Không có kiến tạo)`);
        this.adjustLiveScore('home', 1);
        window.showToast(`⚽ +1 Bàn thắng solo cho ${scorerShort}!`);
      }
    }
    this.closeLivePlayerPicker();
  },

  recordLiveEvent(type, playerId, assistId = null, extraNote = '') {
    const minute = this.getCurrentMatchMinute();
    const p = playerId ? window.stateManager.getPlayerById(playerId) : null;
    const assistP = assistId ? window.stateManager.getPlayerById(assistId) : null;

    const typeConfig = {
      GOAL: { label: '⚽ Bàn Thắng', badgeColor: '#ef4444' },
      ASSIST: { label: '👟 Kiến Tạo', badgeColor: '#06b6d4' },
      SAVE: { label: '🧤 Cứu Thua', badgeColor: '#f59e0b' },
      WONDERGOAL: { label: '🌟 Siêu Phẩm', badgeColor: '#fbbf24' },
      WOODWORK: { label: '🪵 Xà/Cột', badgeColor: '#d97706' },
      MISS: { label: '💨 Bỏ Lỡ', badgeColor: '#94a3b8' },
      DEFENSE: { label: '🧱 Bọc Lót', badgeColor: '#10b981' },
      FUNNY: { label: '😂 Tấu Hài', badgeColor: '#a855f7' },
      NOTE: { label: '📝 Ghi Chú', badgeColor: '#64748b' }
    };

    const cfg = typeConfig[type] || { label: '⚡ Sự kiện', badgeColor: '#fff' };

    const newEvent = {
      id: 'evt_' + Date.now() + Math.random(),
      minute,
      type,
      typeLabel: cfg.label,
      badgeColor: cfg.badgeColor,
      playerId: p ? p.id : null,
      playerName: p ? this.getPlayerShortName(p) : null,
      playerAvatar: p ? p.avatar : null,
      assistPlayerId: assistP ? assistP.id : null,
      assistPlayerName: assistP ? this.getPlayerShortName(assistP) : null,
      note: extraNote,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    this.livePitchState.events.unshift(newEvent);
    this.renderLiveTimeline();
    this.saveLiveDraft();
  },

  renderLiveTimeline() {
    const list = document.getElementById('live-timeline-events-list');
    const countEl = document.getElementById('live-event-count');
    if (countEl) countEl.innerText = this.livePitchState.events.length;
    if (!list) return;

    if (this.livePitchState.events.length === 0) {
      list.innerHTML = `
        <div class="live-empty-timeline" id="live-empty-timeline">
          ⏳ Chưa có sự kiện nào. Hãy bấm nút sự kiện bên trên hoặc giữ Mic để nói!
        </div>
      `;
      return;
    }

    list.innerHTML = this.livePitchState.events.map((evt, idx) => `
      <div class="live-event-card">
        <span class="live-event-minute">${evt.minute}'</span>
        <div class="live-event-body">
          <span class="live-event-badge" style="background: ${evt.badgeColor}22; color: ${evt.badgeColor}; border: 1px solid ${evt.badgeColor}44;">
            ${evt.typeLabel}
          </span>
          ${evt.playerAvatar ? `<img src="${evt.playerAvatar}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover;">` : ''}
          <span style="font-weight: 700; color: #fff;">${evt.playerName || ''}</span>
          ${evt.assistPlayerName ? `<span style="font-size: 0.76rem; color: var(--accent-cyan);">(👟 ${evt.assistPlayerName})</span>` : ''}
          ${evt.note && evt.note !== `${evt.playerName} ghi bàn` ? `<span style="font-size: 0.78rem; color: #94a3b8; font-style: italic;">• ${evt.note}</span>` : ''}
        </div>
        <button type="button" class="live-event-del-btn" onclick="window.matchesModule.deleteLiveEvent(${idx})" title="Xóa sự kiện">&times;</button>
      </div>
    `).join('');
  },

  deleteLiveEvent(index) {
    const evt = this.livePitchState.events[index];
    if (!evt) return;

    if (evt.type === 'GOAL' || evt.type === 'WONDERGOAL') {
      if (confirm(`Sự kiện này là bàn thắng của ${evt.playerName || 'cầu thủ'}. Bạn có muốn giảm 1 bàn của đội nhà trên bảng tỉ số không?`)) {
        this.adjustLiveScore('home', -1);
      }
    }

    this.livePitchState.events.splice(index, 1);
    this.renderLiveTimeline();
    this.saveLiveDraft();
  },

  addCustomNotePrompt() {
    const note = prompt('Nhập diễn biến / ghi chú trực tiếp trên sân:', '');
    if (note && note.trim()) {
      this.recordLiveEvent('NOTE', null, null, note.trim());
      window.showToast('Đã lưu ghi chú diễn biến!');
    }
  },

  // ==========================================
  // EXPORT & AI RATING INTEGRATION
  // ==========================================
  copyLiveSummaryToZalo() {
    const teamInfo = window.stateManager.data.teamInfo;
    const teamName = teamInfo?.name || 'FC TNT';
    const opponent = this.livePitchState.opponent;
    const homeScore = this.livePitchState.homeScore;
    const awayScore = this.livePitchState.awayScore;
    const dateStr = new Date().toLocaleDateString('vi-VN');

    // Gom bàn thắng & siêu phẩm
    const goals = this.livePitchState.events.filter(e => e.type === 'GOAL' || e.type === 'WONDERGOAL');
    const assists = this.livePitchState.events.filter(e => e.type === 'ASSIST' || e.assistPlayerName);
    const saves = this.livePitchState.events.filter(e => e.type === 'SAVE');
    const funny = this.livePitchState.events.filter(e => e.type === 'FUNNY');

    let text = `🔥 [KẾT QUẢ TRẬN ĐẤU ${teamName.toUpperCase()}] 🔥\n`;
    text += `⚽ ${teamName} ${homeScore} - ${awayScore} ${opponent}\n`;
    text += `📅 Ngày: ${dateStr} • 📍 Sân: ${this.livePitchState.venue}\n\n`;

    if (goals.length > 0) {
      text += `⚽ Bàn thắng & Highlight:\n`;
      goals.forEach(g => {
        text += `• ${g.minute}' - ${g.type === 'WONDERGOAL' ? '🌟 ' : ''}${g.playerName}${g.assistPlayerName ? ` (Kiến tạo: ${g.assistPlayerName})` : ''}\n`;
      });
      text += `\n`;
    }

    if (saves.length > 0) {
      text += `🧤 Cứu thua xuất thần: ${saves.map(s => s.playerName).filter(Boolean).join(', ')}\n`;
    }

    if (funny.length > 0) {
      text += `😂 Khoảnh khắc tấu hài: ${funny.map(f => `${f.playerName} (${f.note || ''})`).join('; ')}\n`;
    }

    text += `\n👉 Xem sơ đồ sân & chi tiết điểm số: ${window.location.origin}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        window.showToast('📋 Đã copy tóm tắt trận đấu! Dán ngay vào nhóm Zalo nhé.');
      }).catch(() => {
        prompt('Copy nội dung gửi Zalo:', text);
      });
    } else {
      prompt('Copy nội dung gửi Zalo:', text);
    }
  },

  finishAndGenerateAiRatings() {
    if (this.livePitchState.events.length === 0) {
      if (!confirm('Chưa có sự kiện nào được ghi nhận trực tiếp trên sân. Bạn vẫn muốn AI chấm điểm dựa trên kết quả tỉ số chứ?')) {
        return;
      }
    }

    // Sao chép sự kiện thực tế để đưa vào đánh giá AI
    const liveEventsSnapshot = [...this.livePitchState.events];
    this.pendingLiveEvents = liveEventsSnapshot;

    // Tự động lưu trận trước
    const savedMatch = this.saveAndPublishLiveMatch(false);
    if (!savedMatch) return;

    // Tổng hợp narration phong phú từ toàn bộ sự kiện trên sân
    const teamInfo = window.stateManager.data.teamInfo;
    const teamName = teamInfo?.name || 'FC TNT';
    const opponent = this.livePitchState.opponent || 'FC Đối Thủ';
    const homeScore = this.livePitchState.homeScore;
    const awayScore = this.livePitchState.awayScore;
    const isWin = homeScore > awayScore;
    const isLoss = homeScore < awayScore;
    const resultStr = isWin ? 'Thắng' : isLoss ? 'Thua' : 'Hòa';

    let narration = `Trận đấu giữa ${teamName} và ${opponent} (${resultStr} ${homeScore} - ${awayScore}).\n`;
    narration += `Địa điểm: ${this.livePitchState.venue || 'Sân bóng Tân Triều'}.\n\n`;

    if (liveEventsSnapshot.length > 0) {
      narration += `DIỄN BIẾN THỰC TẾ TRỰC TIẾP TRÊN SÂN:\n`;
      // Sắp xếp sự kiện theo phút tăng dần
      const sortedEvents = [...liveEventsSnapshot].sort((a, b) => (a.minute || 0) - (b.minute || 0));
      sortedEvents.forEach(evt => {
        narration += `- Phút ${evt.minute}': [${evt.typeLabel}] ${evt.playerName || 'Đội bóng'} ${evt.assistPlayerName ? `(Kiến tạo: ${evt.assistPlayerName})` : ''}${evt.note ? ` - ${evt.note}` : ''}\n`;
      });

      // Tóm tắt theo từng cầu thủ
      narration += `\nTỔNG HỢP NỔI BẬT:\n`;
      const playerHighlights = {};
      sortedEvents.forEach(evt => {
        const name = evt.playerName || 'Đội bóng';
        if (!playerHighlights[name]) playerHighlights[name] = [];
        playerHighlights[name].push(`${evt.typeLabel}${evt.note ? ` (${evt.note})` : ''}`);
        if (evt.assistPlayerName) {
          if (!playerHighlights[evt.assistPlayerName]) playerHighlights[evt.assistPlayerName] = [];
          playerHighlights[evt.assistPlayerName].push(`👟 Kiến tạo cho ${evt.playerName}`);
        }
      });

      Object.entries(playerHighlights).forEach(([pName, acts]) => {
        narration += `• ${pName}: ${acts.join(', ')}\n`;
      });
    }

    this.closeLiveCompanionModal();
    this.openAiRatingModal(savedMatch.id);

    // Điền văn bản sự kiện trực tiếp vào ô nhập AI và kích hoạt chấm điểm ngay lập tức
    const textarea = document.getElementById('ai-match-narration-input');
    if (textarea) {
      textarea.value = narration;
    }

    window.showToast('🤖 AI đang phân tích toàn bộ diễn biến sân cỏ và tự động chấm điểm...', 'info');

    // Tự động chạy chấm điểm ngay lập tức
    setTimeout(() => {
      this.executeAiRating(liveEventsSnapshot);
    }, 250);
  },

  saveAndPublishLiveMatch(showSuccessToast = true) {
    const allPlayers = window.stateManager.getPlayers();
    const opponent = this.livePitchState.opponent || 'FC Đối Thủ';
    const homeScore = this.livePitchState.homeScore;
    const awayScore = this.livePitchState.awayScore;

    let result = 'DRAW';
    if (homeScore > awayScore) result = 'WIN';
    else if (homeScore < awayScore) result = 'LOSS';

    // Lọc danh sách cầu thủ có mặt đi đá hôm nay
    let attendingPlayerIds = this.livePitchState.registeredPlayerIds;
    if (!Array.isArray(attendingPlayerIds) || attendingPlayerIds.length === 0) {
      // Nếu chưa chọn, lấy các cầu thủ có sự kiện hoặc 7 cầu thủ đầu tiên
      const activeFromEvents = new Set();
      this.livePitchState.events.forEach(e => {
        if (e.playerId) activeFromEvents.add(e.playerId);
        if (e.assistPlayerId) activeFromEvents.add(e.assistPlayerId);
      });
      if (activeFromEvents.size > 0) {
        attendingPlayerIds = Array.from(activeFromEvents);
      } else {
        attendingPlayerIds = allPlayers.slice(0, Math.min(allPlayers.length, 7)).map(p => p.id);
      }
    }

    const attendingPlayers = allPlayers.filter(p => attendingPlayerIds.includes(p.id));

    // Thống kê bàn thắng, kiến tạo từ events CHỈ CHO CẦU THỦ CÓ MẶT
    const playerStatsMap = {};
    attendingPlayers.forEach((p, idx) => {
      playerStatsMap[p.id] = {
        playerId: p.id,
        isStarter: idx < 7,
        rating: 7.0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        note: ''
      };
    });

    this.livePitchState.events.forEach(evt => {
      if (evt.playerId && playerStatsMap[evt.playerId]) {
        if (evt.type === 'GOAL' || evt.type === 'WONDERGOAL') playerStatsMap[evt.playerId].goals += 1;
        if (evt.type === 'ASSIST') playerStatsMap[evt.playerId].assists += 1;
        if (evt.note && !playerStatsMap[evt.playerId].note) {
          playerStatsMap[evt.playerId].note = evt.note;
        }
      }
      if (evt.assistPlayerId && playerStatsMap[evt.assistPlayerId]) {
        playerStatsMap[evt.assistPlayerId].assists += 1;
      }
    });

    const matchPayload = {
      date: new Date().toISOString().split('T')[0],
      time: '19:30',
      opponent,
      venue: this.livePitchState.venue || 'Sân bóng Tân Triều',
      type: '7',
      formation: '3-1-2',
      homeScore,
      awayScore,
      result,
      note: `Ghi nhận trực tiếp ngoài sân (${attendingPlayers.length} cầu thủ có mặt • ${this.livePitchState.events.length} sự kiện)`,
      playerStats
    };

    // Luôn luôn tạo một trận đấu mới đã hoàn tất vào kho Lịch Sử, không ghi đè trận cũ
    const savedMatch = window.stateManager.addMatch(matchPayload);

    this.clearLiveDraft();
    this.renderMatches();
    if (window.awardsModule) window.awardsModule.renderAwards();
    if (window.appModule) window.appModule.renderDashboard();

    if (showSuccessToast) {
      window.showToast('🎉 Đã kết thúc và lưu trận đấu thành công vào kho Lịch Sử!');
      this.closeLiveCompanionModal();
      this.openMatchDetailModal(savedMatch.id);
    }

    return savedMatch;
  },

  // ==========================================
  // AUTO-SAVE & MULTI-DEVICE CLOUD DRAFT SYNC
  // ==========================================
  saveLiveDraft() {
    try {
      const draft = {
        opponent: this.livePitchState.opponent || 'FC Đối Thủ',
        venue: this.livePitchState.venue || 'Sân bóng',
        homeScore: Number(this.livePitchState.homeScore) || 0,
        awayScore: Number(this.livePitchState.awayScore) || 0,
        timerSeconds: Number(this.livePitchState.timerSeconds) || 0,
        timerRunning: Boolean(this.livePitchState.isTimerRunning),
        period: Number(this.livePitchState.period) || 1,
        events: Array.isArray(this.livePitchState.events) ? this.livePitchState.events : [],
        registeredPlayerIds: Array.isArray(this.livePitchState.registeredPlayerIds) ? this.livePitchState.registeredPlayerIds : [],
        matchId: this.livePitchState.matchId || null,
        savedAt: Date.now()
      };

      // 1. Lưu tức thời tại Local Storage của thiết bị hiện tại
      localStorage.setItem('fctnt_live_pitch_draft', JSON.stringify(draft));

      // 2. Đồng bộ lên Cloud Server cho các thiết bị khác
      if (this._syncDebounceTimer) clearTimeout(this._syncDebounceTimer);
      this._syncDebounceTimer = setTimeout(() => {
        fetch('/api/live-match/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft)
        }).catch(err => console.warn('Cloud live draft sync error:', err));
      }, 250);

    } catch (e) {
      console.warn('Draft save error:', e);
    }
  },

  async loadLiveDraft() {
    // 1. Thử tải từ Cloud Server trước để lấy dữ liệu mới nhất nếu đổi thiết bị
    try {
      const res = await fetch('/api/live-match/current');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.active && data.draft) {
          console.log('☁️ Đã khôi phục trận đấu Live từ Cloud Server:', data.draft);
          this.applyLiveDraftData(data.draft);
          localStorage.setItem('fctnt_live_pitch_draft', JSON.stringify(data.draft));
          return;
        }
      }
    } catch (err) {
      console.warn('Cloud live draft fetch failed, switching to local storage:', err);
    }

    // 2. Fallback sang Local Storage
    try {
      const raw = localStorage.getItem('fctnt_live_pitch_draft');
      if (raw) {
        const draft = JSON.parse(raw);
        // Nếu draft lưu trong vòng 12 tiếng
        if (draft && (Date.now() - (draft.savedAt || 0) < 12 * 3600 * 1000)) {
          this.applyLiveDraftData(draft);
        }
      }
    } catch (e) {
      console.warn('Draft load error:', e);
    }
  },

  applyLiveDraftData(draft) {
    if (!draft) return;
    this.livePitchState.opponent = draft.opponent || 'FC Đối Thủ';
    this.livePitchState.venue = draft.venue || 'Sân bóng';
    this.livePitchState.homeScore = Number(draft.homeScore) || 0;
    this.livePitchState.awayScore = Number(draft.awayScore) || 0;
    this.livePitchState.timerSeconds = Number(draft.timerSeconds) || 0;
    this.livePitchState.period = Number(draft.period) || 1;
    this.livePitchState.matchId = draft.matchId || null;
    this.livePitchState.events = Array.isArray(draft.events) ? draft.events : [];
    if (Array.isArray(draft.registeredPlayerIds) && draft.registeredPlayerIds.length > 0) {
      this.livePitchState.registeredPlayerIds = draft.registeredPlayerIds;
    } else if (!this.livePitchState.registeredPlayerIds || this.livePitchState.registeredPlayerIds.length === 0) {
      this.initLiveRoster();
    }
    this.updateLiveCompanionUI();
  },

  clearLiveDraft() {
    localStorage.removeItem('fctnt_live_pitch_draft');
    this.livePitchState.events = [];
    this.livePitchState.homeScore = 0;
    this.livePitchState.awayScore = 0;
    this.livePitchState.timerSeconds = 0;
    this.livePitchState.period = 1;
    this.livePitchState.matchId = null;

    // Xóa trên Cloud
    fetch('/api/live-match/clear', { method: 'POST' }).catch(e => { });
  }
};




