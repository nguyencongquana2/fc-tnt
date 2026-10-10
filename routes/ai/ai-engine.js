/**
 * FC TNT - AI Smart Football Analysis Engine (Local NLP & Rules Engine)
 * routes/ai/ai-engine.js
 * 
 * Bộ giải thuật phân tích diễn biến & chấm điểm sân 7 độc lập phía backend:
 * - Không phụ thuộc Internet / Cloud LLM
 * - Quét và phân tách context cho từng cầu thủ từ bài tường thuật
 * - Kết hợp chính xác sự kiện sân cỏ trực tiếp (Live Companion)
 * - Đảm bảo phân bổ điểm số công bằng theo kết quả trận và vị trí
 */

// Shared SSOT Helper: Trích xuất các biến thể tên/biệt danh/số áo cầu thủ FC TNT
const { getPlayerAliases } = require('../../utils/playerAliases');

/**
 * Phân tích trận đấu và chấm điểm phong độ cầu thủ bằng Rules Engine & Smart NLP
 * @param {Object} params
 * @param {Object} params.matchInfo
 * @param {Array} params.playerList
 * @param {string} params.matchNarration
 * @param {Array} params.liveEvents
 * @returns {Object} { matchHeadline, matchSummary, motmPlayerId, ratings, source }
 */
function analyzeMatchWithNLP({ matchInfo, playerList, matchNarration, liveEvents }) {
  const rawText = (matchNarration || '').trim();
  const textLower = rawText.toLowerCase();

  const homeScore = Number(matchInfo?.homeScore ?? 0);
  const awayScore = Number(matchInfo?.awayScore ?? 0);
  const isWin = matchInfo?.result === 'WIN' || (homeScore > awayScore);
  const isLoss = matchInfo?.result === 'LOSS' || (homeScore < awayScore);
  const isDraw = !isWin && !isLoss;
  const isHeavyLoss = isLoss && ((awayScore - homeScore >= 2) || awayScore >= 4);

  // Thang điểm nền tảng theo kết quả trận (tránh cào bằng 7.0)
  const baseStarterRating = isWin ? 7.0 : isDraw ? 6.6 : (isHeavyLoss ? 6.0 : 6.3);
  const baseSubRating = isWin ? 6.6 : isDraw ? 6.3 : (isHeavyLoss ? 5.7 : 6.0);

  // Bước 1: Quét và lập bản đồ vị trí tên các cầu thủ trong bài mô tả
  const playerMentions = [];
  playerList.forEach(p => {
    const aliases = getPlayerAliases(p);
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

  // Loại bỏ các mention trùng lặp
  const cleanMentions = [];
  playerMentions.forEach(m => {
    if (!cleanMentions.some(existing =>
      (m.index >= existing.index && m.index < existing.endIndex) ||
      (m.playerId === existing.playerId && Math.abs(m.index - existing.index) < 10)
    )) {
      cleanMentions.push(m);
    }
  });

  // Tách ngữ cảnh độc lập cho từng cầu thủ
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

  // Thu thập sự kiện trực tiếp từ Live Companion (nếu có)
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

    // 1. Áp dụng sự kiện trực tiếp trên sân
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
            /chuyền\s*cho\s*[^,.;!\n]{1,30}\s*(?:ghi\s*bàn|lập\s*công|sút)/i.test(playerCtx)
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

  const opponent = matchInfo?.opponent || 'Đối thủ';
  const matchHeadline = isWin
    ? `🔥 Chiến Thắng Thuyết Phục ${homeScore} - ${awayScore} Trước ${opponent}!`
    : isLoss
      ? `⚡ Trận Cầu Nỗ Lực (${homeScore} - ${awayScore} vs ${opponent})`
      : `🤝 Màn Rượt Đuổi Tỉ Số Kịch Tính ${homeScore} - ${awayScore} vs ${opponent}`;

  const matchSummary = isLoss
    ? `Trận đấu gặp ${opponent} kết thúc với tỉ số ${homeScore} - ${awayScore}. Đội bóng thi đấu nhiệt huyết nhưng còn bộc lộ một số sai sót trước đối thủ, ghi nhận nhiều nỗ lực cá nhân nổi bật.`
    : `Trận đấu giữa FC TNT và ${opponent} diễn ra sôi nổi với tỉ số chung cuộc ${homeScore} - ${awayScore}. Toàn đội thể hiện tinh thần quyết tâm cao, các cá nhân phối hợp ăn ý và cống hiến hết mình.`;

  return {
    matchHeadline,
    matchSummary,
    motmPlayerId: motmId,
    ratings,
    source: 'Smart Football Analysis Engine'
  };
}

module.exports = {
  analyzeMatchWithNLP,
  getPlayerAliases
};
