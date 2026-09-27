/**
 * Matches Module - Live Pitch Events, Quick Touch Matrix & Timeline
 * Quản lý bộ chọn cầu thủ sự kiện nhanh, ghi nhận diễn biến và dòng thời gian trực tiếp
 */
window.matchesModule = window.matchesModule || {};

Object.assign(window.matchesModule, {
  // =========================================================================
  // QUICK TOUCH ACTION MATRIX & PLAYER PICKER
  // =========================================================================
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
      OWN_GOAL: { tag: '🤦‍♂️ PHẢN LƯỚI NHÀ (OG)', title: 'Ai vô tình phản lưới nhà (+1 cho đội bạn)?', color: '#f87171' },
      ASSIST: { tag: '👟 KIẾN TẠO (+1)', title: 'Ai là người kiến tạo?', color: '#06b6d4' },
      SAVE: { tag: '🧤 CỨU THUA XUẤT THẦN', title: 'Ai là người cản phá cứu thua?', color: '#f59e0b' },
      GK_BLUNDER: { tag: '🧤❌ SAI LẦM THỦ MÔN', title: 'Thủ môn nào mắc sai lầm bắt bóng lỗi?', color: '#fb7185' },
      WONDERGOAL: { tag: '🌟 SIÊU PHẨM / SOLO', title: 'Ai vừa lập siêu phẩm / solo qua người?', color: '#fbbf24' },
      LONG_SHOT: { tag: '🚀 NÃ ĐẠI BÁC / SÚT XA', title: 'Ai vừa tung cú sút xa / nã đại bác uy lực?', color: '#f97316' },
      WOODWORK: { tag: '🪵 SÚT XÀ / CỘT DỌC', title: 'Ai sút bóng trúng khung gỗ?', color: '#d97706' },
      MISS: { tag: '💨 BỎ LỠ ĐÁNG TIẾC', title: 'Ai vừa bỏ lỡ cơ hội ngon ăn?', color: '#94a3b8' },
      KEYPASS: { tag: '🎯 CHỌC KHE XÉ GIÓ', title: 'Ai vừa tung đường chuyền chọc khe xé gió?', color: '#38bdf8' },
      PRESSING_ESCAPE: { tag: '🌪️ THOÁT PRESSING', title: 'Ai vừa xoay sở thoát pressing đẳng cấp?', color: '#a78bfa' },
      INTERCEPT: { tag: '🧲 ĐÁNH CHẶN TRỤC GIỮA', title: 'Ai vừa phán đoán cắt bóng / đánh chặn trục giữa?', color: '#2dd4bf' },
      DEFENSE: { tag: '🧱 BỌC LÓT / CẮT BÓNG HAY', title: 'Ai vừa phòng ngự / bọc lót hay?', color: '#10b981' },
      TACKLE: { tag: '💥 TRANH CHẤP LỬA / XOẠC', title: 'Ai vừa lăn xả tranh chấp / xoạc bóng đoạt lại bóng?', color: '#eab308' },
      TACTICAL_FOUL: { tag: '🛑 PHẠM LỖI CHIẾN THUẬT', title: 'Ai vừa phạm lỗi chiến thuật bẻ gãy phản công?', color: '#fb923c' },
      WON_FOUL: { tag: '🤕 KIẾM ĐÁ PHẠT / PEN', title: 'Ai vừa bị phạm lỗi mang về quả phạt nguy hiểm?', color: '#34d399' },
      TURNOVER: { tag: '⚠️ MẤT BÓNG NGUY HIỂM', title: 'Ai vừa để mất bóng nguy hiểm sân nhà?', color: '#f43f5e' },
      FUNNY: { tag: '😂 PHA TẤU HÀI SÂN CỎ', title: 'Ai vừa tạo khoảnh khắc tấu hài mang lại tiếng cười?', color: '#c084fc' }
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
            <img class="live-picker-avatar" src="${p.avatar}" alt="${window.escapeHtml(displayName)}">
            <div style="overflow: hidden;">
              <div class="live-picker-name">${window.escapeHtml(displayName)}</div>
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
                <img class="live-picker-avatar" src="${pl.avatar}" alt="${window.escapeHtml(displayName)}">
                <div style="overflow: hidden;">
                  <div class="live-picker-name">${window.escapeHtml(displayName)}</div>
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
    } else if (action === 'OWN_GOAL') {
      this.recordLiveEvent('OWN_GOAL', p.id, null, `${pShort} vô tình phản lưới nhà (OG)`);
      this.adjustLiveScore('away', 1);
      window.showToast(`🤦‍♂️ Bàn phản lưới nhà của ${pShort}! (+1 bàn cho đối thủ)`, 'warning');
    } else if (action === 'ASSIST') {
      this.recordLiveEvent('ASSIST', p.id, null, `${pShort} có đường chuyền dọn cỗ`);
      window.showToast(`👟 +1 Kiến tạo cho ${pShort}!`);
    } else if (action === 'SAVE') {
      this.recordLiveEvent('SAVE', p.id, null, `${pShort} cản phá xuất thần cứu thua mười mươi`);
      window.showToast(`🧤 Cứu thua xuất thần: ${pShort}!`);
    } else if (action === 'GK_BLUNDER') {
      this.recordLiveEvent('GK_BLUNDER', p.id, null, `Thủ môn ${pShort} mắc sai lầm bắt bóng lỗi`);
      window.showToast(`🧤❌ Sai lầm thủ môn: ${pShort}!`, 'warning');
    } else if (action === 'LONG_SHOT') {
      this.recordLiveEvent('LONG_SHOT', p.id, null, `${pShort} nã đại bác sút xa uy lực`);
      window.showToast(`🚀 Nã đại bác sút xa: ${pShort}!`);
    } else if (action === 'WOODWORK') {
      this.recordLiveEvent('WOODWORK', p.id, null, `${pShort} dứt điểm dội xà ngang / cột dọc`);
      window.showToast(`🪵 Sút trúng xà/cột: ${pShort}!`);
    } else if (action === 'MISS') {
      this.recordLiveEvent('MISS', p.id, null, `${pShort} bỏ lỡ cơ hội đáng tiếc trước gôn`);
      window.showToast(`💨 Bỏ lỡ đáng tiếc: ${pShort}!`);
    } else if (action === 'KEYPASS') {
      this.recordLiveEvent('KEYPASS', p.id, null, `${pShort} có đường chọc khe vượt tuyến sắc lẹm`);
      window.showToast(`🎯 Chọc khe xé gió: ${pShort}!`);
    } else if (action === 'PRESSING_ESCAPE') {
      this.recordLiveEvent('PRESSING_ESCAPE', p.id, null, `${pShort} xoay sở thoát pressing đẳng cấp`);
      window.showToast(`🌪️ Thoát pressing: ${pShort}!`);
    } else if (action === 'INTERCEPT') {
      this.recordLiveEvent('INTERCEPT', p.id, null, `${pShort} phán đoán đánh chặn trục giữa chuẩn xác`);
      window.showToast(`🧲 Đánh chặn trục giữa: ${pShort}!`);
    } else if (action === 'DEFENSE') {
      this.recordLiveEvent('DEFENSE', p.id, null, `${pShort} bọc lót và cắt bóng chuẩn xác`);
      window.showToast(`🧱 Phòng ngự chắc chắn: ${pShort}!`);
    } else if (action === 'TACKLE') {
      this.recordLiveEvent('TACKLE', p.id, null, `${pShort} tranh chấp lăn xả quyết liệt đoạt lại bóng`);
      window.showToast(`💥 Tranh chấp lửa: ${pShort}!`);
    } else if (action === 'TACTICAL_FOUL') {
      this.recordLiveEvent('TACTICAL_FOUL', p.id, null, `${pShort} phạm lỗi chiến thuật bẻ gãy đợt phản công`);
      window.showToast(`🛑 Phạm lỗi chiến thuật: ${pShort}!`);
    } else if (action === 'WON_FOUL') {
      this.recordLiveEvent('WON_FOUL', p.id, null, `${pShort} bị phạm lỗi mang về quả đá phạt nguy hiểm`);
      window.showToast(`🤕 Kiếm đá phạt: ${pShort}!`);
    } else if (action === 'TURNOVER') {
      this.recordLiveEvent('TURNOVER', p.id, null, `${pShort} để mất bóng nguy hiểm`);
      window.showToast(`⚠️ Mất bóng nguy hiểm: ${pShort}!`, 'warning');
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
      OWN_GOAL: { label: '🤦‍♂️ Phản Lưới', badgeColor: '#f87171' },
      ASSIST: { label: '👟 Kiến Tạo', badgeColor: '#06b6d4' },
      SAVE: { label: '🧤 Cứu Thua', badgeColor: '#f59e0b' },
      GK_BLUNDER: { label: '🧤❌ Lỗi Thủ Môn', badgeColor: '#fb7185' },
      WONDERGOAL: { label: '🌟 Siêu Phẩm', badgeColor: '#fbbf24' },
      LONG_SHOT: { label: '🚀 Sút Xa', badgeColor: '#f97316' },
      WOODWORK: { label: '🪵 Xà/Cột', badgeColor: '#d97706' },
      MISS: { label: '💨 Bỏ Lỡ', badgeColor: '#94a3b8' },
      KEYPASS: { label: '🎯 Chọc Khe', badgeColor: '#38bdf8' },
      PRESSING_ESCAPE: { label: '🌪️ Thoát Press', badgeColor: '#a78bfa' },
      INTERCEPT: { label: '🧲 Đánh Chặn', badgeColor: '#2dd4bf' },
      DEFENSE: { label: '🧱 Bọc Lót', badgeColor: '#10b981' },
      TACKLE: { label: '💥 Tranh Chấp', badgeColor: '#eab308' },
      TACTICAL_FOUL: { label: '🛑 Phạm Lỗi', badgeColor: '#fb923c' },
      WON_FOUL: { label: '🤕 Kiếm Phạt', badgeColor: '#34d399' },
      TURNOVER: { label: '⚠️ Mất Bóng', badgeColor: '#f43f5e' },
      FUNNY: { label: '😂 Tấu Hài', badgeColor: '#c084fc' },
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
          <span style="font-weight: 700; color: #fff;">${window.escapeHtml(evt.playerName || '')}</span>
          ${evt.assistPlayerName ? `<span style="font-size: 0.76rem; color: var(--accent-cyan);">(👟 ${window.escapeHtml(evt.assistPlayerName)})</span>` : ''}
          ${evt.note && evt.note !== `${evt.playerName} ghi bàn` ? `<span style="font-size: 0.78rem; color: #94a3b8; font-style: italic;">• ${window.escapeHtml(evt.note)}</span>` : ''}
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
  }
});
