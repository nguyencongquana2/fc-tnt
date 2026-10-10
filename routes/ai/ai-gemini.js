/**
 * FC TNT - AI Performance Rating with Google Gemini Cloud LLM
 * routes/ai/ai-gemini.js
 * 
 * Tích hợp Google Gemini API (2.0-flash / 1.5-flash / 2.5-flash / 1.5-pro):
 * - Xây dựng prompt theo tiêu chuẩn sân 7 FC TNT và SSOT Player Aliases
 * - Vòng lặp tự động chuyển đổi qua các model khi gặp giới hạn quota hoặc lỗi mạng
 * - Hậu kiểm tra đồng bộ hóa tuyệt đối bàn thắng / kiến tạo giữa liveEvents và kết quả AI
 */

const { getPlayerAliases } = require('../../utils/playerAliases');

// Sinh động bảng đối soát biệt danh từ SSOT utils/playerAliases.js cho prompt Gemini
function generateAliasesPromptSection(playerList) {
  if (!Array.isArray(playerList) || playerList.length === 0) return '';
  return playerList.map(p => {
    const displayName = (p.nickname && p.nickname.trim()) ? p.nickname.trim() : p.name;
    const aliases = getPlayerAliases(p);
    const aliasStr = aliases.map(a => `"${a}"`).join(' / ');
    return `   - ${aliasStr} = ${displayName} (ID: "${p.id}", #${p.number})`;
  }).join('\n');
}

/**
 * Đánh giá trận đấu và chấm điểm cầu thủ bằng Google Gemini API
 * @param {Object} params
 * @param {Object} params.matchInfo
 * @param {Array} params.playerList
 * @param {string} params.matchNarration
 * @param {Array} params.liveEvents
 * @param {string} params.geminiKey
 * @returns {Promise<Object|null>} Kết quả đánh giá hoặc null nếu lỗi/không thành công
 */
async function evaluateWithGemini({ matchInfo, playerList, matchNarration, liveEvents, geminiKey }) {
  if (!geminiKey) return null;

  try {
    const playerInfoText = playerList.map(p =>
      `- ID: "${p.id}", Tên: "${p.name}", Biệt danh: "${p.nickname || ''}", Số áo: #${p.number}, Vị trí: ${p.position}, Đá chính: ${p.isStarter !== false ? 'Có' : 'Dự bị'}`
    ).join('\n');

    let eventsText = 'Không có sự kiện thô riêng biệt.';
    if (Array.isArray(liveEvents) && liveEvents.length > 0) {
      eventsText = liveEvents.map(e => {
        let assistText = '';
        if (e.type === 'GOAL' || e.type === 'WONDERGOAL') {
          assistText = e.assistPlayerName ? `(Người kiến tạo: ${e.assistPlayerName})` : '(Tự ghi bàn solo, KHÔNG CÓ kiến tạo)';
        } else if (e.assistPlayerName) {
          assistText = `(Người kiến tạo: ${e.assistPlayerName})`;
        }
        return `- Phút ${e.minute || 0}': [${e.typeLabel || e.type}] ${e.playerName || 'Đội bóng'} ${assistText}${e.note ? ` - ${e.note}` : ''}`;
      }).join('\n');
    }

    const systemInstruction = `Bạn là Chuyên gia phân tích bóng đá và Bình luận viên bóng đá phủi Việt Nam (Sân 7 người) của FC TNT.
Nhiệm vụ của bạn là chấm điểm (rating) từng cầu thủ từ 1.0 đến 10.0 (chính xác đến 1 chữ số thập phân) và đưa ra nhận xét cá nhân ngắn gọn, chân thực, hóm hỉnh đúng phong cách phủi.

QUY TẮC CHẤM ĐIỂM CHUYÊN MÔN THEO VỊ TRÍ & TỈ SỐ (TUÂN THỦ TUYỆT ĐỐI):

1. THANG ĐIỂM NỀN TẢNG THEO KẾT QUẢ TRẬN (KHÔNG CÀO BẰNG 7.0):
   - Đội THẮNG: Cầu thủ đá chính tròn vai: 6.8 - 7.2 | Dự bị: 6.5 - 6.8.
   - Đội HÒA: Cầu thủ đá chính tròn vai: 6.5 - 6.8 | Dự bị: 6.2 - 6.5.
   - Đội THUA (sát nút 1 bàn): Cầu thủ đá chính tròn vai: 6.2 - 6.5 | Dự bị: 5.9 - 6.2.
   - Đội THUA ĐẬM (cách biệt >= 2 bàn hoặc thủng lưới >= 4 bàn): Điểm nền toàn đội phải hạ thấp: Đá chính 5.8 - 6.3 | Dự bị 5.5 - 6.0.

2. THANG ĐIỂM CHI TIẾT THEO VỊ TRÍ THI ĐẤU:
   - THỦ MÔN (GK):
     + Cứu thua xuất thần / cản phá nhiều bàn thua mười mươi: 7.8 - 8.8 (Tag: "🧤 Người Nhện" hoặc "🧤 Cứu Thua Xuất Thần").
     + Bị thủng lưới nhiều nhưng do hàng thủ hớ hênh, không mắc lỗi trực tiếp: 6.0 - 6.5 (Tag: "🧤 Nỗ Lực Giữ Khung Thành").
     + Bắt bóng lập bập / ói bóng / đẻ trứng / mắc sai lầm dẫn đến bàn thua: 4.5 - 5.5 (Tag: "🧤❌ Mắc Sai Lầm").
   - HẬU VỆ (DF / CB / LB / RB):
     + Đánh chặn, bọc lót tốt, cắt bóng then chốt, tranh chấp lăn xả: 7.2 - 8.2 (Tag: "🛡️ Lá Chắn Thép" hoặc "💥 Tranh Chấp Lửa").
     + Phản lưới nhà (OWN_GOAL): 4.5 - 5.2 (Tag: "🤦‍♂️ Phản Lưới Nhà").
     + Mất bóng nguy hiểm hoặc phá bóng hỏng dẫn đến bàn thua: 4.8 - 5.8 (Tag: "⚠️ Sai Lầm Hàng Thủ").
     + Phạm lỗi chiến thuật kịp thời: 6.4 - 6.8 (Tag: "🛑 Phá Phản Công").
   - TIỀN VỆ (MF / CM / LM / RM / CDM / CAM):
     + Cầm nhịp, làm chủ tuyến giữa, kiến tạo cơ hội (KEYPASS / ASSIST): 7.5 - 8.5 (Tag: "🎯 Nhạc Trưởng" hoặc "👟 Kiến Tạo").
     + Thoát pressing, đánh chặn trục giữa (PRESSING_ESCAPE / INTERCEPT): 7.4 - 8.2 (Tag: "🌪️ Thoát Pressing" hoặc "🧲 Máy Quét Tuyến Giữa").
     + Mất bóng nguy hiểm ở trục giữa: 5.0 - 5.8 (Tag: "⚠️ Mất Bóng Giữa Sân").
     + Tròn vai: 6.5 - 6.8 (Tag: "⚖️ Tròn Vai").
   - TIỀN ĐẠO (FW / CF / ST):
     + Ghi bàn quý giá: 7.8 - 8.4 (Tag: "⚽ Ghi Bàn").
     + Siêu phẩm solo / Nã đại bác / Cú đúp / Hat-trick: 8.5 - 9.5 (Tag: "🌟 Siêu Phẩm" hoặc "🎩 Hat-trick").
     + Bỏ lỡ cơ hội ngon ăn mười mươi: 5.2 - 6.0 (Tag: "💨 Bỏ Lỡ Đáng Tiếc").
     + Tịt ngòi, đói bóng nhưng di chuyển chịu khó: 6.2 - 6.6 (Tag: "🏃 Nỗ Lực Di Chuyển").

3. RÀNG BUỘC DANH SÁCH & SỰ KIỆN:
   - CHỈ chấm điểm cho các cầu thủ có trong "DANH SÁCH CẦU THỦ RA SÂN" được cung cấp. Tuyệt đối không tự bịa thêm cầu thủ ngoài danh sách.
   - Giữ nguyên chính xác "playerId" của từng cầu thủ từ input.
   - BẮT BUỘC chọn đúng 1 "motmPlayerId" (Cầu thủ xuất sắc nhất trận) xứng đáng nhất.
   - QUY TẮC BÀN THẮNG & KIẾN TẠO (TUÂN THỦ CHÍNH XÁC TUYỆT ĐỐI):
     + Người ghi bàn KHÔNG BAO GIỜ được tính kiến tạo cho chính mình trong cùng bàn thắng!
     + Nếu sự kiện ghi "solo lập công", "tự ghi bàn", "không có kiến tạo" hoặc không có tên người kiến tạo cụ thể, thì số kiến tạo (assists) của tình huống đó BẮT BUỘC bằng 0.
     + Khi có "SỰ KIỆN GHI NHẬN TRỰC TIẾP TRÊN SÂN" (liveEvents), BẮT BUỘC lấy chính xác số bàn thắng (goals) và kiến tạo (assists) theo đúng danh sách sự kiện đó. Tuyệt đối không tự ý cộng thêm hoặc bịa thêm kiến tạo!

4. BẢNG BIỆT DANH FC TNT (Đối soát chuẩn xác từ danh sách ra sân theo SSOT):
${generateAliasesPromptSection(playerList)}

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

    const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-1.5-pro'];
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
        console.warn(`[AI Gemini] Model ${modelName} failed:`, mErr.message);
      }
    }

    if (geminiData && geminiData.parsed) {
      // Đảm bảo tính nhất quán tuyệt đối giữa sự kiện sân cỏ thực tế và kết quả AI trả về
      if (Array.isArray(liveEvents) && liveEvents.length > 0 && Array.isArray(geminiData.parsed.ratings)) {
        const liveStatsMap = {};
        playerList.forEach(p => { liveStatsMap[p.id] = { goals: 0, assists: 0 }; });
        liveEvents.forEach(e => {
          if (e.playerId && liveStatsMap[e.playerId]) {
            if (e.type === 'GOAL' || e.type === 'WONDERGOAL') liveStatsMap[e.playerId].goals += 1;
            if (e.type === 'ASSIST') liveStatsMap[e.playerId].assists += 1;
          }
          if (e.assistPlayerId && liveStatsMap[e.assistPlayerId]) {
            liveStatsMap[e.assistPlayerId].assists += 1;
          }
        });

        geminiData.parsed.ratings.forEach(r => {
          const liveP = liveStatsMap[r.playerId];
          if (liveP) {
            r.goals = liveP.goals;
            r.assists = liveP.assists;
            if (r.assists === 0 && r.tag && r.tag.includes('Kiến Tạo')) {
              r.tag = r.goals > 0 ? '⚽ Ghi Bàn' : '⚖️ Tròn Vai';
            }
          }
        });
      }

      return {
        ...geminiData.parsed,
        source: `Google Gemini AI (${geminiData.modelName})`
      };
    }
  } catch (err) {
    console.warn('[AI Gemini] Call failed, fallback will be used:', err.message);
  }

  return null;
}

module.exports = {
  evaluateWithGemini,
  generateAliasesPromptSection
};
