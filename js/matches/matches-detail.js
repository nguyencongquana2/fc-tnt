/**
 * FC TNT - Match Detail View & Performance Modal Submodule (js/matches/matches-detail.js)
 * Quản lý Modal chi tiết trận đấu (#match-detail-modal), sơ đồ chiến thuật 3-1-2 & bảng nhận xét cầu thủ
 */

window.matchesModule = window.matchesModule || {};

Object.assign(window.matchesModule, {
  openMatchDetailModal(matchId) {
    this.currentMatchId = matchId;
    const m = window.stateManager ? window.stateManager.getMatchById(matchId) : null;
    if (!m) return;

    const modal = document.getElementById('match-detail-modal');
    const headerTitle = document.getElementById('match-detail-title');
    const teamInfo = window.stateManager ? window.stateManager.data.teamInfo : null;

    const escapedOpponent = window.escapeHtml(m.opponent || 'Đối thủ');
    const escapedVenue = window.escapeHtml(m.venue || 'Sân bóng');
    const escapedNote = m.note ? window.escapeHtml(m.note) : '';

    if (headerTitle) {
      headerTitle.innerHTML = `
        <span>⚽ vs ${escapedOpponent} (${m.homeScore} - ${m.awayScore})</span>
      `;
    }

    const infoHeader = document.getElementById('match-detail-info-header');
    if (infoHeader) {
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
    }

    this.renderDetailBody();
    if (modal) modal.classList.add('active');
  },

  renderDetailBody() {
    const m = window.stateManager ? window.stateManager.getMatchById(this.currentMatchId) : null;
    if (!m) return;

    const body = document.getElementById('match-rating-list-container');
    if (!body) return;
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
        const p = window.stateManager ? window.stateManager.getPlayerById(ps.playerId) : null;
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
                ${window.stateManager && window.stateManager.isAdmin ? `
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
            const p = window.stateManager ? window.stateManager.getPlayerById(ps.playerId) : null;
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
    if (modal) modal.classList.remove('active');
    this.currentMatchId = null;
  }
});
