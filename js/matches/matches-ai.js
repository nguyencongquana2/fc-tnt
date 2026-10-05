/**
 * Matches Module - AI Match Rating & Review Engine (Gemini API)
 */
window.matchesModule = window.matchesModule || {};

Object.assign(window.matchesModule, {
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

    const homeScore = Number(m?.homeScore ?? 0);
    const awayScore = Number(m?.awayScore ?? 0);
    const isWin = m?.result === 'WIN' || (homeScore > awayScore);
    const isLoss = m?.result === 'LOSS' || (homeScore < awayScore);
    const isDraw = !isWin && !isLoss;
    const isHeavyLoss = isLoss && ((awayScore - homeScore >= 2) || awayScore >= 4);

    // Thang điểm nền tảng theo kết quả trận (tránh cào bằng 7.0)
    const baseStarterRating = isWin ? 7.0 : isDraw ? 6.6 : (isHeavyLoss ? 6.0 : 6.3);
    const baseSubRating = isWin ? 6.6 : isDraw ? 6.3 : (isHeavyLoss ? 5.7 : 6.0);

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
    const hasLiveEvents = Array.isArray(liveEvents) && liveEvents.length > 0;
    if (hasLiveEvents) {
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
      const pos = (p.position || '').toUpperCase();
      const isGK = pos === 'GK' || pos.includes('THỦ MÔN');
      const isDF = pos === 'DF' || pos === 'CB' || pos === 'LB' || pos === 'RB' || pos.includes('HẬU VỆ');
      const isMF = pos === 'MF' || pos === 'CM' || pos === 'LM' || pos === 'RM' || pos === 'CDM' || pos === 'CAM' || pos.includes('TIỀN VỆ');
      const isFW = pos === 'FW' || pos === 'CF' || pos === 'ST' || pos.includes('TIỀN ĐẠO');

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
            score += 1.3;
            noteItems.push(evt.note ? `⚽ Bàn thắng: ${evt.note}` : '⚽ Ghi bàn thắng quý giá');
            if (!roleTag) roleTag = '⚽ Ghi Bàn';
          } else if (evt.type === 'OWN_GOAL') {
            score -= 1.8;
            noteItems.push(evt.note ? `🤦‍♂️ ${evt.note}` : '🤦‍♂️ Vô tình phản lưới nhà đáng tiếc');
            if (!roleTag) roleTag = '🤦‍♂️ Phản Lưới Nhà';
          } else if (evt.type === 'ASSIST') {
            assists += 1;
            score += 1.0;
            noteItems.push(evt.note ? `👟 ${evt.note}` : '👟 Kiến tạo dọn cỗ sắc bén');
            if (!roleTag) roleTag = '👟 Kiến Tạo';
          } else if (evt.type === 'SAVE') {
            score += 1.4;
            noteItems.push(evt.note ? `🧤 Cứu thua: ${evt.note}` : '🧤 Cản phá xuất thần, cứu thua mười mươi');
            if (!roleTag) roleTag = '🧤 Người Nhện';
          } else if (evt.type === 'GK_BLUNDER') {
            score -= 1.8;
            noteItems.push(evt.note ? `🧤❌ ${evt.note}` : '🧤❌ Sai lầm bắt bóng lỗi');
            if (!roleTag) roleTag = '🧤❌ Mắc Sai Lầm';
          } else if (evt.type === 'KEYPASS') {
            score += 0.8;
            noteItems.push(evt.note ? `🎯 ${evt.note}` : '🎯 Chọc khe vượt tuyến sắc lẹm');
            if (!roleTag) roleTag = '🎯 Nhạc Trưởng';
          } else if (evt.type === 'PRESSING_ESCAPE') {
            score += 0.7;
            noteItems.push(evt.note ? `🌪️ ${evt.note}` : '🌪️ Thoát pressing cầm nhịp xuất sắc');
            if (!roleTag) roleTag = '🌪️ Thoát Pressing';
          } else if (evt.type === 'INTERCEPT') {
            score += 0.8;
            noteItems.push(evt.note ? `🧲 ${evt.note}` : '🧲 Đánh chặn trục giữa chuẩn xác');
            if (!roleTag) roleTag = '🧲 Máy Quét Tuyến Giữa';
          } else if (evt.type === 'LONG_SHOT') {
            score += 0.5;
            noteItems.push(evt.note ? `🚀 ${evt.note}` : '🚀 Nã đại bác từ xa uy lực');
            if (!roleTag) roleTag = '🚀 Nã Đại Bác';
          } else if (evt.type === 'DEFENSE') {
            score += 1.0;
            noteItems.push(evt.note ? `🛡️ ${evt.note}` : '🛡️ Bọc lót, cắt bóng then chốt');
            if (!roleTag) roleTag = '🛡️ Lá Chắn Thép';
          } else if (evt.type === 'TACKLE') {
            score += 0.8;
            noteItems.push(evt.note ? `💥 ${evt.note}` : '💥 Tranh chấp lăn xả dũng mãnh');
            if (!roleTag) roleTag = '💥 Chiến Binh Thép';
          } else if (evt.type === 'TACTICAL_FOUL') {
            score += 0.2;
            noteItems.push(evt.note ? `🛑 ${evt.note}` : '🛑 Phạm lỗi chiến thuật bẻ gãy phản công');
            if (!roleTag) roleTag = '🛑 Phá Phản Công';
          } else if (evt.type === 'WON_FOUL') {
            score += 0.4;
            noteItems.push(evt.note ? `🤕 ${evt.note}` : '🤕 Kiếm về quả đá phạt nguy hiểm');
            if (!roleTag) roleTag = '🤕 Khắc Tinh Hậu Vệ';
          } else if (evt.type === 'TURNOVER') {
            score -= isDF ? 1.0 : 0.8;
            noteItems.push(evt.note ? `⚠️ ${evt.note}` : '⚠️ Để mất bóng nguy hiểm');
            if (!roleTag) roleTag = isDF ? '⚠️ Sai Lầm Hàng Thủ' : '⚠️ Mất Bóng Nguy Hiểm';
          } else if (evt.type === 'WOODWORK') {
            score += 0.4;
            noteItems.push(evt.note ? `🪵 Sút xà/cột: ${evt.note}` : '🪵 Dứt điểm hiểm hóc dội xà ngang/cột dọc');
            if (!roleTag) roleTag = '⚡ Đen Đủi Xà Cột';
          } else if (evt.type === 'MISS') {
            score -= 0.9;
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

      // 2. Phân tích ngữ cảnh trong văn bản mô tả
      const contextChunks = playerContextMap[p.id];
      const isMentioned = !!contextChunks && contextChunks.length > 0;
      const playerCtx = isMentioned ? contextChunks.join(' ') : '';

      if (isMentioned) {
        // Khi đã có sự kiện sân cỏ trực tiếp (liveEvents), số bàn thắng và kiến tạo đã được chốt chuẩn xác từ thực tế
        if (!hasLiveEvents && goals === 0) {
          if (playerCtx.includes('poker') || playerCtx.includes('4 bàn')) {
            goals = 4;
            score += 2.6;
            noteItems.push('⚽ Lập Poker 4 bàn thắng lịch sử');
            roleTag = '🔥 Poker Thần Sầu';
          } else if (playerCtx.includes('hattrick') || playerCtx.includes('3 bàn')) {
            goals = 3;
            score += 2.1;
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
            score += 1.3;
            noteItems.push('⚽ Ghi 1 bàn thắng quan trọng');
            if (!roleTag) roleTag = '⚽ Ghi Bàn Quý Giá';
          }
        }

        if (!hasLiveEvents && assists === 0) {
          const hasNoAssist = /không\s*(có\s*)?kiến\s*tạo|ko\s*(có\s*)?kiến\s*tạo|không\s*ai\s*kiến\s*tạo|chưa\s*(có\s*)?kiến\s*tạo|không\s*cần\s*kiến\s*tạo|tự\s*(?:mình\s*)?(?:ghi\s*bàn|lập\s*công|solo)|solo\s*(?:ghi\s*bàn|lập\s*công)/i.test(playerCtx);
          const isPassiveAssist = /(?:nhận|từ|sau|hưởng)\s*(?:đường|pha)?\s*kiến\s*tạo/i.test(playerCtx);

          if (!hasNoAssist && !isPassiveAssist) {
            if (playerCtx.includes('2 kiến tạo') || playerCtx.includes('cú đúp kiến tạo')) {
              assists = 2;
              score += 1.5;
              noteItems.push('👟 2 kiến tạo dọn cỗ sắc bén');
              if (!roleTag) roleTag = '👟 Vua Kiến Tạo';
            } else if (
              playerCtx.includes('1 kiến tạo') ||
              /kiến\s*tạo\s*cho/i.test(playerCtx) ||
              /dọn\s*cỗ\s*cho/i.test(playerCtx) ||
              /chọc\s*khe\s*(?:cho|xé\s*gió)/i.test(playerCtx) ||
              /tạt\s*bóng\s*chuẩn/i.test(playerCtx) ||
              /chuyền\s*cho\s*[\w\s]+\s*(?:ghi\s*bàn|lập\s*công|sút)/i.test(playerCtx)
            ) {
              assists = 1;
              score += 0.9;
              noteItems.push('👟 1 kiến tạo chuẩn xác');
              if (!roleTag) roleTag = '👟 Kiến Tạo Chuẩn Xác';
            }
          }
        }

        if (playerCtx.includes('cực kì tốt') || playerCtx.includes('cực kỳ tốt') || playerCtx.includes('xuất sắc') || playerCtx.includes('gánh đội') || playerCtx.includes('gánh còng lưng') || playerCtx.includes('cháy hết mình')) {
          score += 1.2;
          noteItems.push('⭐ Thi đấu cực kì xuất sắc');
          if (!roleTag) roleTag = '⭐ Điểm Sáng Trận Đấu';
        }
        if (playerCtx.includes('đá thòng') || playerCtx.includes('bọc lót') || playerCtx.includes('cắt bóng') || playerCtx.includes('không chiến') || playerCtx.includes('khóa chặt')) {
          score += 0.9;
          noteItems.push('🛡️ Phòng ngự bọc lót chắc chắn');
          if (!roleTag) roleTag = '🛡️ Lá Chắn Thép';
        }
        if (playerCtx.includes('cản phá') || playerCtx.includes('cứu thua') || playerCtx.includes('bắt chắc tay') || playerCtx.includes('bắt dính') || playerCtx.includes('xuất thần')) {
          score += 1.1;
          noteItems.push('🧤 Cản phá nhiều cơ hội nguy hiểm');
          if (!roleTag) roleTag = '🧤 Người Nhện';
        }
        if (playerCtx.includes('phát động tấn công') || playerCtx.includes('cầm nhịp') || playerCtx.includes('chia bài') || playerCtx.includes('làm chủ tuyến giữa')) {
          score += 0.9;
          noteItems.push('🎯 Cầm nhịp và phát động tấn công sắc nét');
          if (!roleTag) roleTag = '🎯 Nhạc Trưởng Tuyến Giữa';
        }

        if (playerCtx.includes('triển khai bóng bằng chân yếu') || playerCtx.includes('chân yếu') || playerCtx.includes('bắt bóng lập bập') || playerCtx.includes('ói bóng')) {
          score -= 1.3;
          noteItems.push('⚠️ Bắt bóng lập bập / xử lý chân yếu');
          roleTag = '⚠️ Xử Lý Kém';
        }
        if (playerCtx.includes('bỏ lỡ') || playerCtx.includes('chân gỗ')) {
          score -= 0.9;
          noteItems.push('💨 Bỏ lỡ cơ hội ngon ăn');
          if (!roleTag) roleTag = '💨 Bỏ Lỡ Đáng Tiếc';
        }
        if (playerCtx.includes('tấu hài') || playerCtx.includes('vấp cỏ')) {
          score -= 0.3;
          noteItems.push('😂 Có pha tấu hài trên sân');
          if (!roleTag) roleTag = '😂 Cây Hài Sân Cỏ';
        }
        if (playerCtx.includes('mắc sai lầm') || playerCtx.includes('lỗi nhiều') || playerCtx.includes('bóp team')) {
          score -= 1.0;
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
        // Điều chỉnh theo vị trí khi không có sự kiện nổi bật
        if (isGK && awayScore >= 3) {
          score = Math.max(5.8, score - 0.3);
          noteItems.push(`Bị thủng lưới ${awayScore} bàn nhưng đã thi đấu nỗ lực`);
          roleTag = '🧤 Nỗ Lực Giữ Khung Thành';
        } else if (isFW && isHeavyLoss && goals === 0) {
          score = Math.max(5.5, score - 0.4);
          noteItems.push('Đói bóng trên hàng công, tịt ngòi đáng tiếc');
          roleTag = '💨 Tịt Ngòi';
        } else if (isStarter) {
          score = baseStarterRating;
          noteItems.push(isWin ? 'Thi đấu tròn vai, hoàn thành tốt nhiệm vụ' : 'Thi đấu tròn vai trên sân');
          roleTag = isWin ? '⚖️ Tròn Vai Thắng Trận' : '⚖️ Tròn Vai';
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
                <div style="font-weight: 800; font-size: 1.05rem; color: #fff;">${window.escapeHtml(motmPlayer.name)} #${motmPlayer.number}</div>
                <div style="font-size: 0.78rem; color: var(--accent-gold);">${motmPlayer.position} • "${window.escapeHtml(motmRating.note)}"</div>
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
              <div style="font-weight: 700; font-size: 0.85rem; color: #fff;">${window.escapeHtml(p.name)} #${p.number}</div>
              <div style="display: flex; align-items: center; gap: 0.35rem; margin-top: 0.1rem;">
                <span style="font-size: 0.7rem; color: var(--text-dim);">${p.position}</span>
                ${r.tag ? `<span class="ai-role-tag-pill">${window.escapeHtml(r.tag)}</span>` : ''}
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

          <div class="ai-note-text" title="${window.escapeHtml(r.note)}">
            💬 ${window.escapeHtml(r.note)}
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
});
