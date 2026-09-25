/**
 * Matches Module - Sofascore Pitch Tactical Board (3-1-2) & Player Ratings
 */
window.matchesModule = window.matchesModule || {};

Object.assign(window.matchesModule, {
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
});
