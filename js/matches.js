/**
 * Matches & Sofascore Pitch Module - FC Stats Master
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

  renderMatches() {
    const container = document.getElementById('matches-list-container');
    if (!container) return;

    const matches = window.stateManager.getMatches();
    const teamInfo = window.stateManager.data.teamInfo;

    if (matches.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3.5rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-xl); border: 1px dashed rgba(255,255,255,0.15);">
          <div style="font-size: 3.5rem; margin-bottom: 1rem;">⚽</div>
          <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem; color: #fff;">Chưa có trận đấu nào trong mùa giải</h3>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem; max-width: 450px; margin-left: auto; margin-right: auto;">
            Danh sách 15 anh em trong đội đã sẵn sàng. Hãy bấm nút dưới đây để nhập trận đấu thực tế đầu tiên và chấm điểm!
          </p>
          <button class="btn btn-primary" onclick="window.matchesModule.openCreateMatchModal()" style="padding: 0.75rem 1.5rem; font-size: 1rem;">
            ➕ Thêm Trận Đấu Đầu Tiên (Sân 7 • 3-1-2)
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = matches.map(m => {
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

      return `
        <div class="match-card" onclick="window.matchesModule.openMatchDetailModal('${m.id}')">
          <div class="match-card-top-bar">
            <div class="match-meta-left">
              <span class="match-date-badge">📅 ${m.date} • ${m.time || '19:30'}</span>
              <span class="match-venue">📍 ${m.venue || 'Sân bóng'} (Sân 7 • 3-1-2)</span>
            </div>
            
            <div style="display: flex; align-items: center; gap: 0.5rem;" onclick="event.stopPropagation()">
              <span class="match-result-badge ${resultClass}">${resultText}</span>
              ${window.stateManager.isAdmin ? `
                <button class="btn btn-secondary btn-sm" onclick="window.matchesModule.openCreateMatchModal('${m.id}')" title="Sửa trận" style="padding: 0.25rem 0.6rem;">
                  ✏️ Sửa
                </button>
                <button class="btn btn-danger btn-sm" onclick="window.matchesModule.deleteMatch('${m.id}', event)" title="Xóa trận này" style="padding: 0.25rem 0.6rem;">
                  🗑️ Xóa
                </button>
              ` : ''}
            </div>
          </div>

          <div class="match-scoreboard">
            <div class="team-box home">
              <span class="team-title">${teamInfo?.name || 'FC ANH EM'}</span>
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
                  <span>MOTM: ${motm.name} (${highestRating}⭐)</span>
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
        playersContainer.innerHTML = allPlayers.map(p => `
          <label class="lineup-item-label">
            <input type="checkbox" name="selected_players" value="${p.id}" ${activePlayerIds.includes(p.id) ? 'checked' : ''}>
            <img class="lineup-item-avatar" src="${p.avatar}" alt="${p.name}">
            <div style="overflow: hidden;">
              <div class="lineup-item-name">${p.name}</div>
              <div style="font-size: 0.68rem; color: var(--text-dim);">#${p.number} • ${p.position}</div>
            </div>
          </label>
        `).join('');
      }
    } else {
      title.innerHTML = '⚽ Thêm Trận Đấu Mới (Sân 7 • 3-1-2)';
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('match-date').value = today;
      document.getElementById('match-time').value = '19:30';
      document.getElementById('match-type').value = '7';
      document.getElementById('match-home-score').value = '0';
      document.getElementById('match-away-score').value = '0';

      playersContainer.innerHTML = allPlayers.map(p => `
        <label class="lineup-item-label">
          <input type="checkbox" name="selected_players" value="${p.id}" checked>
          <img class="lineup-item-avatar" src="${p.avatar}" alt="${p.name}">
          <div style="overflow: hidden;">
            <div class="lineup-item-name">${p.name}</div>
            <div style="font-size: 0.68rem; color: var(--text-dim);">#${p.number} • ${p.position}</div>
          </div>
        </label>
      `).join('');
    }

    modal.classList.add('active');
  },

  selectAllLineup(checkAll = true) {
    const checkboxes = document.querySelectorAll('input[name="selected_players"]');
    checkboxes.forEach(cb => cb.checked = checkAll);
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
      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 0.85rem 1rem; border-radius: var(--radius-lg); margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <div style="font-weight: 800; font-size: 1.15rem; color: #fff;">
            ${teamInfo?.name || 'Đội nhà'} <span style="color: var(--accent-emerald);">${m.homeScore}</span> : <span style="color: #f87171;">${m.awayScore}</span> ${m.opponent}
          </div>
          <div style="font-size: 0.82rem; color: var(--text-dim); margin-top: 0.15rem;">
            📅 ${m.date} • 📍 ${m.venue || 'Sân bóng'} • <span style="color: var(--accent-gold); font-weight:700;">Sơ đồ Sân 7: 3-1-2 (3 Hậu vệ • 1 Giữa • 2 Cánh)</span>
          </div>
          ${m.note ? `<div style="font-size: 0.82rem; color: var(--accent-gold); margin-top: 0.25rem;">💬 ${m.note}</div>` : ''}
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <button class="btn btn-secondary btn-sm" onclick="window.matchesModule.toggleViewMode()">
            ${this.activeViewMode === 'pitch' ? '📋 Xem Dạng Bảng Kéo' : '🏟️ Xem Sơ Đồ 3-1-2'}
          </button>
          ${window.stateManager.isAdmin ? `
            <button class="btn btn-secondary btn-sm" onclick="window.matchesModule.openCreateMatchModal('${m.id}')">✏️ Sửa Tỉ Số/Đội</button>
            <button class="btn btn-danger btn-sm" onclick="window.matchesModule.deleteMatch('${m.id}')">🗑️ Xóa Trận</button>
          ` : ''}
        </div>
      </div>
    `;

    this.renderDetailBody();
    modal.classList.add('active');
  },

  toggleViewMode() {
    this.activeViewMode = this.activeViewMode === 'pitch' ? 'list' : 'pitch';
    this.openMatchDetailModal(this.currentMatchId);
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
          <button class="btn btn-secondary btn-sm" onclick="window.matchesModule.openCreateMatchModal('${m.id}')">Chỉnh sửa danh sách ra sân</button>
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

    if (this.activeViewMode === 'pitch') {
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <span style="font-family: var(--font-display); font-size: 0.85rem; font-weight: 800; color: var(--accent-gold); letter-spacing: 0.5px; display: flex; align-items: center; gap: 0.4rem;">
                🏟️ SƠ ĐỒ 3-1-2 TRÊN SÂN
                <span style="background: rgba(16,185,129,0.2); color: var(--accent-emerald); font-size: 0.7rem; padding: 0.15rem 0.45rem; border-radius: 4px; border: 1px solid rgba(16,185,129,0.4);">
                  ✋ Kéo thả để đổi vị trí
                </span>
              </span>
              <span style="font-size: 0.75rem; color: var(--text-dim);">Bấm để chấm điểm • Kéo để xếp đội hình</span>
            </div>

            <div class="sofascore-pitch-container" id="sofascore-pitch-dropzone">
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
                <span style="font-size: 0.72rem; color: var(--accent-gold); text-transform: none; font-weight: normal;">
                  Kéo vào sân để thay người
                </span>
              </div>
              <div class="substitutes-grid">
                ${subs.length > 0 ? subs.map(ps => {
                  const p = window.stateManager.getPlayerById(ps.playerId);
                  if (!p) return '';
                  const rating = Number(ps.rating) || 7.0;
                  const ratingClass = this.getRatingClass(rating);

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
                      <div class="sub-avatar-wrap">
                        <img class="sub-avatar" src="${p.avatar}" alt="${p.name}">
                        <span class="sub-rating-badge ${ratingClass}">${rating.toFixed(1)}</span>
                      </div>
                      <div class="sub-name">${p.name}</div>
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
      `;
    } else {
      body.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.85rem;">
          ${playerStats.map(ps => {
            const p = window.stateManager.getPlayerById(ps.playerId);
            if (!p) return '';
            const rating = Number(ps.rating) || 7.0;
            const goals = Number(ps.goals) || 0;
            const assists = Number(ps.assists) || 0;
            const yellow = Number(ps.yellowCards) || 0;
            const red = Number(ps.redCards) || 0;
            const note = ps.note || '';

            return `
              <div class="player-rating-row-item" data-player-id="${p.id}">
                <div class="rating-item-header">
                  <div class="rating-item-player">
                    <img class="rating-item-avatar" src="${p.avatar}" alt="${p.name}">
                    <div>
                      <div class="rating-item-name">${p.name} #${p.number}</div>
                      <div class="rating-item-pos">${p.position} ${p.nickname ? `• "${p.nickname}"` : ''}</div>
                    </div>
                  </div>

                  <div class="rating-slider-section">
                    <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 700;">CHẤM ĐIỂM:</span>
                    <input type="range" class="rating-slider" min="1.0" max="10.0" step="0.1" value="${rating}" 
                      oninput="document.getElementById('rating-val-${p.id}').innerText = Number(this.value).toFixed(1)">
                    <span class="rating-score-display" id="rating-val-${p.id}">${rating.toFixed(1)}</span>
                    <span style="font-size: 0.85rem; color: var(--text-dim);">/10</span>
                  </div>
                </div>

                <div class="rating-item-stats-controls">
                  <div class="stat-stepper">
                    <span class="stat-stepper-label">⚽ Bàn:</span>
                    <button type="button" class="stat-stepper-btn" onclick="window.matchesModule.stepStat(this, -1)">-</button>
                    <span class="stat-stepper-value goals-val" style="color: var(--accent-ruby);">${goals}</span>
                    <button type="button" class="stat-stepper-btn" onclick="window.matchesModule.stepStat(this, 1)">+</button>
                  </div>

                  <div class="stat-stepper">
                    <span class="stat-stepper-label">👟 Kiến tạo:</span>
                    <button type="button" class="stat-stepper-btn" onclick="window.matchesModule.stepStat(this, -1)">-</button>
                    <span class="stat-stepper-value assists-val" style="color: var(--accent-cyan);">${assists}</span>
                    <button type="button" class="stat-stepper-btn" onclick="window.matchesModule.stepStat(this, 1)">+</button>
                  </div>

                  <div class="stat-stepper">
                    <span class="stat-stepper-label">🟨 Thẻ vàng:</span>
                    <button type="button" class="stat-stepper-btn" onclick="window.matchesModule.stepStat(this, -1)">-</button>
                    <span class="stat-stepper-value yellow-val" style="color: #fbbf24;">${yellow}</span>
                    <button type="button" class="stat-stepper-btn" onclick="window.matchesModule.stepStat(this, 1)">+</button>
                  </div>

                  <div class="stat-stepper">
                    <span class="stat-stepper-label">🟥 Thẻ đỏ:</span>
                    <button type="button" class="stat-stepper-btn" onclick="window.matchesModule.stepStat(this, -1)">-</button>
                    <span class="stat-stepper-value red-val" style="color: #ef4444;">${red}</span>
                    <button type="button" class="stat-stepper-btn" onclick="window.matchesModule.stepStat(this, 1)">+</button>
                  </div>

                  <input type="text" class="rating-note-input player-note-val" placeholder="Nhận xét màn trình diễn..." value="${note}">
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
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
          <img class="sofascore-avatar-img" src="${p.avatar}" alt="${p.name}">
          
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

        <div class="sofascore-player-name">${p.number} ${p.name}</div>
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

    if (!window.stateManager.isAdmin) {
      container.innerHTML = `
        <div class="quick-edit-card" style="border-color: rgba(255,255,255,0.15);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <img src="${p.avatar}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-emerald);">
              <div>
                <div style="font-weight: 800; font-size: 1rem; color: #fff;">${p.name} (#${p.number})</div>
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
              <div style="font-weight: 800; font-size: 1rem; color: #fff;">${p.name} (#${p.number})</div>
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

  deleteMatch(id, e = null) {
    if (e) e.stopPropagation();

    const m = window.stateManager.getMatchById(id);
    const opponentName = m ? m.opponent : 'trận này';

    if (confirm(`Bạn có chắc muốn XÓA trận đấu gặp "${opponentName}"? Toàn bộ điểm số của trận này sẽ được xóa khỏi bảng xếp hạng.`)) {
      window.stateManager.deleteMatch(id);
      window.showToast('Đã xóa trận đấu!', 'info');
      this.closeMatchDetailModal();
      this.renderMatches();
      if (window.awardsModule) window.awardsModule.renderAwards();
      if (window.playersModule) window.playersModule.renderPlayers();
      if (window.appModule) window.appModule.renderDashboard();
    }
  },

  clearAllMatches() {
    if (confirm('Bạn có chắc muốn XÓA TOÀN BỘ tất cả các trận đấu để làm mới bảng điểm từ đầu? (Danh sách 15 cầu thủ vẫn được giữ nguyên)')) {
      window.stateManager.clearAllMatches();
      window.showToast('Đã xóa toàn bộ trận đấu!', 'info');
      this.renderMatches();
      if (window.awardsModule) window.awardsModule.renderAwards();
      if (window.playersModule) window.playersModule.renderPlayers();
      if (window.appModule) window.appModule.renderDashboard();
    }
  }
};
