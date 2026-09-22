/**
 * FC TNT - Matches, Live Match & AI Performance Rating Router
 * Quản lý lịch sử trận đấu, thu chi tiền quỹ sân, đồng bộ Live Match thời gian thực và AI chấm điểm thang Sofascore
 */

const express = require('express');
const Match = require('../models/Match');
const LiveMatchDraft = require('../models/LiveMatchDraft');

// =========================================================================
// AI MATCH RATING & PERFORMANCE EVALUATION ENGINE (GEMINI + SMART NLP)
// =========================================================================

// Helper: Trích xuất các biến thể tên/biệt danh/số áo của toàn bộ 15+ cầu thủ FC TNT
function getPlayerAliases(p) {
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
}

// Bộ giải thuật phân tích & chấm điểm sân phủi chuyên sâu
function analyzeMatchWithNLP({ matchInfo, playerList, matchNarration, liveEvents }) {
  const rawText = (matchNarration || '').trim();
  const textLower = rawText.toLowerCase();
  const isWin = matchInfo?.result === 'WIN' || (Number(matchInfo?.homeScore) > Number(matchInfo?.awayScore));
  const isLoss = matchInfo?.result === 'LOSS' || (Number(matchInfo?.homeScore) < Number(matchInfo?.awayScore));

  const baseStarterRating = isWin ? 6.8 : isLoss ? 6.2 : 6.5;
  const baseSubRating = isWin ? 6.5 : isLoss ? 6.0 : 6.2;

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

    // 2. Phân tích ngữ cảnh trong văn bản mô tả
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

  const homeScore = matchInfo?.homeScore ?? 0;
  const awayScore = matchInfo?.awayScore ?? 0;
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

// =========================================================================
// ROUTER FACTORIES
// =========================================================================

function createMatchesRouter({ isMongoConnected, fallbackData, broadcastDataUpdate, requireAdmin }) {
  const router = express.Router();

  // GET /api/matches
  router.get('/', async (req, res) => {
    try {
      if (isMongoConnected()) {
        const matches = await Match.find().sort({ createdAt: -1 });
        return res.json(matches);
      }
      res.json(fallbackData.matches);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/matches
  router.post('/', requireAdmin, async (req, res) => {
    try {
      const matchData = req.body;
      if (!matchData.id) matchData.id = 'm_' + Date.now();

      if (isMongoConnected()) {
        const created = await Match.create(matchData);
        broadcastDataUpdate('matches', `⚽ Trận đấu mới gặp "${matchData.opponent || 'Đối thủ'}" vừa được thêm!`);
        return res.status(201).json(created);
      }

      fallbackData.matches.unshift(matchData);
      broadcastDataUpdate('matches', `⚽ Trận đấu mới gặp "${matchData.opponent || 'Đối thủ'}" vừa được thêm!`);
      res.status(201).json(matchData);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/matches/:id
  router.put('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (isMongoConnected()) {
        const updated = await Match.findOneAndUpdate({ id }, updates, { new: true });
        broadcastDataUpdate('matches', `⭐ Điểm số trận gặp "${updated?.opponent || ''}" vừa được cập nhật!`);
        return res.json(updated);
      }

      const idx = fallbackData.matches.findIndex(m => m.id === id);
      if (idx !== -1) {
        fallbackData.matches[idx] = { ...fallbackData.matches[idx], ...updates };
        broadcastDataUpdate('matches', `⭐ Điểm số trận gặp "${fallbackData.matches[idx].opponent || ''}" vừa được cập nhật!`);
        return res.json(fallbackData.matches[idx]);
      }
      res.status(404).json({ error: 'Match not found' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/matches/:id
  router.delete('/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      if (isMongoConnected()) {
        await Match.findOneAndDelete({ id });
        broadcastDataUpdate('matches', '🗑️ Một trận đấu vừa được xóa khỏi lịch sử.');
        return res.json({ success: true, message: 'Match deleted' });
      }

      fallbackData.matches = fallbackData.matches.filter(m => m.id !== id);
      broadcastDataUpdate('matches', '🗑️ Một trận đấu vừa được xóa khỏi lịch sử.');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/matches/:id/finance
  router.put('/:id/finance', async (req, res) => {
    try {
      const { id } = req.params;
      const financeData = req.body;

      if (isMongoConnected()) {
        const updated = await Match.findOneAndUpdate(
          { id },
          { $set: { finance: financeData } },
          { new: true }
        );
        if (!updated) return res.status(404).json({ error: 'Match not found' });
        broadcastDataUpdate('matches', '💰 Tiền sân trận đấu vừa được cập nhật!');
        return res.json(updated);
      }

      const idx = fallbackData.matches.findIndex(m => m.id === id);
      if (idx !== -1) {
        fallbackData.matches[idx].finance = financeData;
        broadcastDataUpdate('matches', '💰 Tiền sân trận đấu vừa được cập nhật!');
        return res.json(fallbackData.matches[idx]);
      }
      res.status(404).json({ error: 'Match not found' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/matches/:id/finance/toggle-payment
  router.patch('/:id/finance/toggle-payment', async (req, res) => {
    try {
      const { id } = req.params;
      const { playerId, isPaid } = req.body;

      if (isMongoConnected()) {
        const match = await Match.findOne({ id });
        if (!match) return res.status(404).json({ error: 'Match not found' });

        if (!match.finance) match.finance = { payments: [] };
        if (!match.finance.payments) match.finance.payments = [];

        const pIdx = match.finance.payments.findIndex(p => p.playerId === playerId);
        if (pIdx !== -1) {
          match.finance.payments[pIdx].isPaid = isPaid;
          match.finance.payments[pIdx].paidAt = isPaid ? new Date() : null;
        }
        await match.save();
        broadcastDataUpdate('matches', isPaid ? '💳 Đã ghi nhận nộp tiền sân thành công!' : '💳 Đã hủy trạng thái nộp tiền sân.');
        return res.json(match);
      }

      const idx = fallbackData.matches.findIndex(m => m.id === id);
      if (idx !== -1) {
        if (!fallbackData.matches[idx].finance) fallbackData.matches[idx].finance = { payments: [] };
        const pIdx = fallbackData.matches[idx].finance.payments.findIndex(p => p.playerId === playerId);
        if (pIdx !== -1) {
          fallbackData.matches[idx].finance.payments[pIdx].isPaid = isPaid;
          fallbackData.matches[idx].finance.payments[pIdx].paidAt = isPaid ? new Date().toISOString() : null;
        }
        broadcastDataUpdate('matches', isPaid ? '💳 Đã ghi nhận nộp tiền sân thành công!' : '💳 Đã hủy trạng thái nộp tiền sân.');
        return res.json(fallbackData.matches[idx]);
      }
      res.status(404).json({ error: 'Match not found' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/matches (Xóa tất cả trận)
  router.delete('/', requireAdmin, async (req, res) => {
    try {
      if (isMongoConnected()) {
        await Match.deleteMany({});
        broadcastDataUpdate('matches', '🗑️ Danh sách trận đấu đã được làm mới.');
        return res.json({ success: true, message: 'All matches deleted' });
      }

      fallbackData.matches = [];
      broadcastDataUpdate('matches', '🗑️ Danh sách trận đấu đã được làm mới.');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

// Router cho AI Rate Match (/api/ai/rate-match)
function createAiRouter() {
  const router = express.Router();

  router.post('/rate-match', async (req, res) => {
    try {
      const { matchInfo, playerList, matchNarration, liveEvents, apiKey } = req.body;

      if (!playerList || !Array.isArray(playerList) || playerList.length === 0) {
        return res.status(400).json({ success: false, error: 'Danh sách cầu thủ không hợp lệ!' });
      }

      const geminiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

      if (geminiKey) {
        try {
          const playerInfoText = playerList.map(p =>
            `- ID: "${p.id}", Tên: "${p.name}", Biệt danh: "${p.nickname || ''}", Số áo: #${p.number}, Vị trí: ${p.position}, Đá chính: ${p.isStarter !== false ? 'Có' : 'Dự bị'}`
          ).join('\n');

          let eventsText = 'Không có sự kiện thô riêng biệt.';
          if (Array.isArray(liveEvents) && liveEvents.length > 0) {
            eventsText = liveEvents.map(e =>
              `- Phút ${e.minute || 0}': [${e.typeLabel || e.type}] ${e.playerName || 'Đội bóng'} ${e.assistPlayerName ? `(Kiến tạo: ${e.assistPlayerName})` : ''} - ${e.note || ''}`
            ).join('\n');
          }

          const systemInstruction = `Bạn là Chuyên gia phân tích bóng đá và Bình luận viên giải bóng đá phủi Việt Nam (Sân 7 người) của FC TNT.

QUY TẮC CHẤM ĐIỂM BẮT BUỘC (TUÂN THỦ TUYỆT ĐỐI):
1. ĐÁNH GIÁ CÔNG TÂM, KHẮT KHE CHUẨN XÁC theo đúng diễn biến thực tế được ghi nhận trên sân.
2. TUÂN THỦ CHÍNH XÁC SỰ KIỆN SÂN CỎ:
   - Cầu thủ có bàn thắng hoặc siêu phẩm: "goals" >= 1, rating 7.8 - 9.2, tag: "🌟 Siêu Phẩm" hoặc "⚽ Ghi Bàn", note ghi rõ bàn thắng.
   - Cầu thủ kiến tạo: "assists" >= 1, rating 7.4 - 8.4, tag: "👟 Kiến Tạo", note ghi rõ đường kiến tạo.
   - Thủ môn/Hậu vệ cứu thua xuất thần: rating 7.8 - 8.8, tag: "🧤 Người Nhện" hoặc "🛡️ Cứu Thua Xuất Thần".
   - Cắt bóng / bọc lót tốt: rating 7.4 - 8.0, tag: "🛡️ Lá Chắn Thép".
   - Bỏ lỡ cơ hội ngon ăn: rating 5.5 - 6.2, tag: "💨 Bỏ Lỡ Đáng Tiếc".
   - Pha tấu hài / vấp bóng: rating 5.8 - 6.5, tag: "😂 Cây Hài Sân Cỏ".
   - Thi đấu tròn vai không sự kiện nổi bật: Đá chính 6.4 - 6.8, Dự bị 6.0 - 6.5.
   - Mắc sai lầm / chân yếu / ói bóng: rating 4.5 - 5.5.
3. TUYỆT ĐỐI KHÔNG TỰ BỊA BÀN THẮNG/KIẾN TẠO nếu không có trong diễn biến!
4. BẢNG BIỆT DANH FC TNT (Phải nhận diện chuẩn xác):
   - "Vinh" / "Duy Vinh" / "Vinh Lê" = Vinh Lê
   - "ToDiu" / "Tố Địu" / "Tố" / "Địu" / "Tố Điệu" = ToDiu
   - "Hoàn" / "Trí Hoàn" = Trí Hoàn
   - "Voi" / "Quang"  = Quang  Voi
   - "Bắc" / "Đức Bắc" = Đức Bắc
   - "Giang" / "Trường Giang" = Trường Giang
   - "Dũng" / "Công Dũng" = Công Dũng
   - "Nam Cao" / "Thành Nam" = Thành Nam
   - "Sỹ Nam" / "Nam Thấp" = Sỹ Nam
   - "Tài" / "Lê Tấn Tài" / "Tài Thọ"  = Tài Thọ
   - "Hùng" / "Hùng Sứt"  / "Lường Hùng"= Hùng Sứt
   - "Quân" / "Quân Kun" / "Công Quân" = Quân Kun
   - "Chiến" / "Đình Chiến" = Đình Chiến
   - "Anh" / "Đình Anh" = Đình Anh
   - "Tiến" / "Tiếnn"/ "Công Tiến" = Tiếnn
   - "Thắng" / "Công Thắng" / "ct" = ct

Trả về đúng chuẩn JSON không có định dạng markdown hay văn bản thừa:
{
  "matchHeadline": "Tiêu đề trận đấu súc tích, phản ánh đúng kết quả",
  "matchSummary": "Tóm tắt nhận định 2-3 câu về trận đấu",
  "motmPlayerId": "ID của cầu thủ xuất sắc nhất trận",
  "ratings": [
    {
      "playerId": "p_...",
      "rating": 7.5,
      "goals": 0,
      "assists": 0,
      "yellowCards": 0,
      "redCards": 0,
      "tag": "🛡️ Lá Chắn Thép",
      "note": "1 câu nhận xét chân thực, sắc sảo, có emoji"
    }
  ]
}`;

          const userPrompt = `THÔNG TIN TRẬN ĐẤU:
- Đội bóng: FC TNT vs ${matchInfo?.opponent || 'Đối thủ'}
- Tỉ số: ${matchInfo?.homeScore ?? 0} - ${matchInfo?.awayScore ?? 0}
- Kết quả: ${matchInfo?.result || 'LOSS'}

DANH SÁCH CẦU THỦ RA SÂN:
${playerInfoText}

SỰ KIỆN GHI NHẬN TRỰC TIẾP TRÊN SÂN:
${eventsText}

MÔ TẢ CHI TIẾT & DIỄN BIẾN TRẬN ĐẤU:
"""
${matchNarration || 'Đánh giá dựa trên tỉ số và số liệu thống kê thực tế.'}
"""

Hãy chấm điểm toàn bộ cầu thủ trong danh sách đúng theo mô tả và sự kiện trên sân rồi trả về JSON chuẩn xác.`;

          const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
          let geminiData = null;

          for (const modelName of modelsToTry) {
            try {
              const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
              const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
                  generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.1
                  }
                })
              });

              if (response.ok) {
                const data = await response.json();
                const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (rawText) {
                  geminiData = {
                    parsed: JSON.parse(rawText),
                    modelName
                  };
                  break;
                }
              }
            } catch (mErr) {
              console.warn(`Model ${modelName} failed:`, mErr.message);
            }
          }

          if (geminiData) {
            return res.json({
              success: true,
              ...geminiData.parsed,
              source: `Google Gemini AI (${geminiData.modelName})`
            });
          }
        } catch (geminiErr) {
          console.warn('Gemini API error, switching to NLP fallback:', geminiErr.message);
        }
      }

      // Fallback to Smart NLP Engine
      const fallbackResult = analyzeMatchWithNLP({ matchInfo, playerList, matchNarration, liveEvents });
      return res.json({
        success: true,
        ...fallbackResult
      });

    } catch (err) {
      console.error('Error in /api/ai/rate-match:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

// Router cho Live Match (/api/live-match)
function createLiveMatchRouter({ isMongoConnected, io }) {
  const router = express.Router();
  let fallbackLiveMatchDraft = null;

  // GET /api/live-match/current
  router.get('/current', async (req, res) => {
    try {
      let draft = null;
      if (isMongoConnected()) {
        draft = await LiveMatchDraft.findOne({ id: 'current_live_match_draft' }).lean();
      } else {
        draft = fallbackLiveMatchDraft;
      }

      if (!draft || draft.status === 'idle' || draft.status === 'finished') {
        return res.json({ success: true, active: false, draft: null });
      }

      const updatedAt = new Date(draft.updatedAt || draft.savedAt || Date.now()).getTime();
      if (Date.now() - updatedAt > 12 * 3600 * 1000) {
        return res.json({ success: true, active: false, draft: null });
      }

      return res.json({
        success: true,
        active: true,
        draft
      });
    } catch (err) {
      console.error('Error in GET /api/live-match/current:', err);
      res.status(500).json({ success: false, error: err.message, draft: fallbackLiveMatchDraft });
    }
  });

  // POST /api/live-match/sync
  router.post('/sync', async (req, res) => {
    try {
      const payload = req.body || {};
      const draftData = {
        id: 'current_live_match_draft',
        status: 'active',
        opponent: payload.opponent || 'FC Đối Thủ',
        venue: payload.venue || 'Sân bóng',
        homeScore: Number(payload.homeScore) || 0,
        awayScore: Number(payload.awayScore) || 0,
        timerSeconds: Number(payload.timerSeconds) || 0,
        timerRunning: Boolean(payload.timerRunning),
        timerStartedAt: payload.timerStartedAt || null,
        period: Number(payload.period) || 1,
        events: Array.isArray(payload.events) ? payload.events : [],
        registeredPlayerIds: Array.isArray(payload.registeredPlayerIds) ? payload.registeredPlayerIds : [],
        matchId: payload.matchId || null,
        updatedAt: new Date()
      };

      fallbackLiveMatchDraft = draftData;

      if (isMongoConnected()) {
        await LiveMatchDraft.findOneAndUpdate(
          { id: 'current_live_match_draft' },
          draftData,
          { upsert: true, new: true }
        );
      }

      if (io) {
        io.emit('live_match_synced', draftData);
      }

      return res.json({ success: true, draft: draftData });
    } catch (err) {
      console.error('Error in POST /api/live-match/sync:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/live-match/clear
  router.post('/clear', async (req, res) => {
    try {
      fallbackLiveMatchDraft = null;
      if (isMongoConnected()) {
        await LiveMatchDraft.findOneAndUpdate(
          { id: 'current_live_match_draft' },
          { status: 'idle', events: [], homeScore: 0, awayScore: 0, timerSeconds: 0, updatedAt: new Date() }
        );
      }

      if (io) {
        io.emit('live_match_cleared');
      }
      return res.json({ success: true });
    } catch (err) {
      console.error('Error in POST /api/live-match/clear:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

module.exports = {
  createMatchesRouter,
  createAiRouter,
  createLiveMatchRouter,
  analyzeMatchWithNLP,
  getPlayerAliases
};
