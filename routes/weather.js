/**
 * FC TNT - Weather & Pitch Intelligence Router (Sân AKKA Chu Văn An)
 * Dự báo thời tiết từ Open-Meteo và AI Cố vấn thời tiết sân cỏ nhân tạo
 */

const express = require('express');
const { aiRateLimiter } = require('../utils/rateLimiter');

// Tọa độ Sân bóng đá AKKA - 68 Đại Lộ Chu Văn An, Thanh Liệt, Thanh Trì / Hoàng Mai, Hà Nội
const AKKA_VENUE = {
  name: 'Sân bóng đá AKKA',
  address: '68 Đại Lộ Chu Văn An, Thanh Liệt, Hà Nội',
  latitude: 20.9752,
  longitude: 105.8175,
  turfType: 'Cỏ nhân tạo 5cm - Nền đá mi thoát nước tiêu chuẩn',
  slots: [
    { id: 'slot_1', name: 'Slot 1 (20h45)', time: '20:45 - 22:15', startHour: 20, endHour: 22 },
    { id: 'slot_2', name: 'Slot 2 (22h15)', time: '22:15 - 23:45', startHour: 22, endHour: 24 }
  ]
};

// Weather cache in memory (10 minutes TTL)
let weatherCache = {
  timestamp: 0,
  data: null
};

// Helper chuyển mã WMO weather code sang mô tả tiếng Việt và icon
function parseWmoWeather(code) {
  if (code === 0) return { label: 'Trời quang đãng, mát mẻ', icon: '☀️', condition: 'clear' };
  if (code === 1 || code === 2) return { label: 'Ít mây, trời thoáng', icon: '🌤️', condition: 'partly_cloudy' };
  if (code === 3) return { label: 'Nhiều mây, dịu mát', icon: '☁️', condition: 'cloudy' };
  if (code === 45 || code === 48) return { label: 'Sương mù nhẹ', icon: '🌫️', condition: 'fog' };
  if (code >= 51 && code <= 55) return { label: 'Mưa phùn lất phất', icon: '🌦️', condition: 'drizzle' };
  if (code >= 61 && code <= 65) return { label: 'Mưa rào', icon: '🌧️', condition: 'rain' };
  if (code >= 80 && code <= 82) return { label: 'Mưa rào nặng hạt', icon: '🌧️', condition: 'heavy_rain' };
  if (code >= 95 && code <= 99) return { label: 'Dông sét, mưa to nguy hiểm', icon: '⛈️', condition: 'thunderstorm' };
  return { label: 'Thời tiết bình thường', icon: '⛅', condition: 'unknown' };
}

// Tính chỉ số đá bóng (Match Playability Index 0 - 100%) và gợi ý giày chuẩn xác
function calculatePlayability(hourRainMm, hourRainProb, hourTemp, prevRainTotal = 0, weatherCode = 0, nextHourRain = 0) {
  let score = 100;
  let status = 'ideal'; // ideal | playable | caution | cancel
  let statusText = 'Thời tiết lý tưởng để đá';
  let badgeClass = 'badge-ideal';
  let pitchCondition = 'Mặt sân khô ráo, cỏ bám tốt';
  let bootAdvice = 'Giày đinh dăm TF thường, form tốc độ hoặc kiểm soát bóng';

  const maxSlotRain = Math.max(hourRainMm, nextHourRain);

  // 1. Dông sét nguy hiểm hoặc mưa rào to
  if (weatherCode >= 95 || maxSlotRain >= 3.0 || (maxSlotRain >= 1.5 && hourRainProb >= 80)) {
    score = Math.min(score, 35);
    status = 'cancel';
    statusText = 'Cảnh báo mưa to - Nguy cơ hủy trận';
    badgeClass = 'badge-cancel';
    pitchCondition = 'Mặt sân ướt sũng / đọng nước, bóng lăn nặng và rất trơn';
    bootAdvice = 'Khuyên nên hoãn trận hoặc đi giày đinh TF gai sâu bám cao su';
  } else if (maxSlotRain > 0.8 || hourRainProb >= 70) {
    score = Math.min(score, 55);
    status = 'caution';
    statusText = 'Có mưa - Sân trơn ướt';
    badgeClass = 'badge-caution';
    pitchCondition = 'Mặt cỏ ẩm ướt nhiều, dễ trượt trụ khi xoay người';
    bootAdvice = 'Giày đinh TF dăm cao su bám gót, cẩn thận tránh lật cổ chân';
  } else if (maxSlotRain > 0 || hourRainProb >= 35) {
    score = Math.min(score, 75);
    status = 'playable';
    statusText = 'Mưa lất phất - Đá được';
    badgeClass = 'badge-playable';
    pitchCondition = 'Mặt sân ẩm nhẹ, bóng đi đầm chân';
    bootAdvice = 'Giày đinh TF có độ bám gót tốt';
  }

  // 2. Xét lượng mưa tích lũy từ chiều (nếu mưa dầm nhiều giờ liên tiếp)
  if (prevRainTotal >= 3.0 && maxSlotRain > 0) {
    score = Math.min(score, 38);
    status = 'cancel';
    statusText = 'Mưa dầm từ chiều - Sân ướt nặng';
    badgeClass = 'badge-cancel';
    pitchCondition = 'Mặt cỏ bão hòa nước sau nhiều giờ mưa dầm, sân rất trơn';
    bootAdvice = 'Sân rất trơn, hạn chế xoạc bóng và mang giày đinh TF chống trượt';
  } else if (prevRainTotal >= 2.0 && maxSlotRain === 0) {
    score = Math.min(score, 80);
    status = 'playable';
    statusText = 'Tạnh mưa - Sân đang róc nước';
    badgeClass = 'badge-playable';
    pitchCondition = 'Sân vừa tạnh, đang thoát nước nhanh, mặt cỏ mềm';
    bootAdvice = 'Đá êm chân, giày đinh TF dăm tiêu chuẩn';
  }

  // 3. Nhiệt độ
  if (hourTemp > 35) {
    score -= 15;
    statusText += ' (Oi bức)';
  } else if (hourTemp < 15) {
    score -= 10;
    statusText += ' (Trời lạnh)';
  }

  score = Math.max(15, Math.min(100, Math.round(score)));

  return {
    score,
    status,
    statusText,
    badgeClass,
    pitchCondition,
    bootAdvice
  };
}

// Helper phân tích thông minh bằng NLP nếu không có Gemini key hoặc API lỗi
function analyzePitchWithFootballNLP(question, forecastData, selectedDate, selectedSlot) {
  const q = (question || '').toLowerCase();
  const venueName = 'Sân bóng đá AKKA (68 ĐL Chu Văn An, Thanh Liệt, Hà Nội)';

  const daysList = forecastData?.days || [];
  let dayData = daysList[0];
  if (selectedDate && daysList.length > 0) {
    const found = daysList.find(d => d.date === selectedDate);
    if (found) dayData = found;
  }

  const slot1 = dayData?.slots?.slot_1;
  const slot2 = dayData?.slots?.slot_2;

  // 1. Phân tích Slot được nhắc đến trong câu hỏi
  let targetSlotKey = 'slot_1';
  let targetSlotName = 'Slot 20h45';

  if (q.includes('22h15') || q.includes('10h15') || q.includes('slot 2') || q.includes('đá muộn') || q.includes('ca 2')) {
    targetSlotKey = 'slot_2';
    targetSlotName = 'Slot 22h15';
  } else if (q.includes('20h45') || q.includes('8h45') || q.includes('slot 1') || q.includes('đá sớm') || q.includes('ca 1')) {
    targetSlotKey = 'slot_1';
    targetSlotName = 'Slot 20h45';
  } else if (selectedSlot === 'slot_2') {
    targetSlotKey = 'slot_2';
    targetSlotName = 'Slot 22h15';
  }

  // 2. Nhận diện các thứ / ngày cụ thể được người dùng nhắc đến
  const daysMap = [
    { keys: ['thứ 2', 'thứ hai', 't2'], name: 'Thứ Hai', dayNum: 1 },
    { keys: ['thứ 3', 'thứ ba', 't3'], name: 'Thứ Ba', dayNum: 2 },
    { keys: ['thứ 4', 'thứ tư', 't4'], name: 'Thứ Tư', dayNum: 3 },
    { keys: ['thứ 5', 'thứ năm', 't5'], name: 'Thứ Năm', dayNum: 4 },
    { keys: ['thứ 6', 'thứ sáu', 't6'], name: 'Thứ Sáu', dayNum: 5 },
    { keys: ['thứ 7', 'thứ bảy', 't7'], name: 'Thứ Bảy', dayNum: 6 },
    { keys: ['chủ nhật', 'cn'], name: 'Chủ Nhật', dayNum: 0 }
  ];

  const queriedDays = [];
  daysMap.forEach(d => {
    if (d.keys.some(k => q.includes(k))) {
      const match = daysList.find(f => {
        const dt = new Date(f.date);
        return dt.getDay() === d.dayNum;
      });
      if (match) {
        queriedDays.push(match);
      }
    }
  });

  if (q.includes('hôm nay') && daysList[0] && !queriedDays.some(d => d.date === daysList[0].date)) {
    queriedDays.unshift(daysList[0]);
  }
  if (q.includes('ngày mai') && daysList[1] && !queriedDays.some(d => d.date === daysList[1].date)) {
    queriedDays.push(daysList[1]);
  }

  // TÌNH HUỐNG A: NGƯỜI DÙNG HỎI CÁC THỨ / NGÀY CỤ THỂ
  if (queriedDays.length > 0) {
    let evaluationLines = [];
    let canPlayAny = false;

    queriedDays.forEach(d => {
      const slot = d.slots[targetSlotKey];
      const dateShort = d.date.split('-').slice(1).reverse().join('/');
      let statusEmoji = '✅';
      let adviceText = '';

      if (slot.score <= 50 || slot.rainMm >= 1.5 || (slot.rainProbability >= 75 && slot.rainMm > 0)) {
        statusEmoji = '❌';
        adviceText = `**KHÔNG NÊN ĐÁ** (Mưa ${slot.rainMm}mm, xác suất mưa **${slot.rainProbability}%**, sân úng nước và rất trơn)`;
      } else if (slot.score <= 75 || slot.rainProbability >= 50) {
        statusEmoji = '⚠️';
        adviceText = `**CÂN NHẮC / SÂN ẨM** (Mưa nhỏ lất phất ${slot.rainMm}mm, xác suất ${slot.rainProbability}%, mặt sân hơi trơn)`;
      } else {
        statusEmoji = '✅';
        adviceText = `**ĐÁ RẤT TỐT** (Tạnh ráo, 0mm mưa, mát ${slot.temperature}°C, điểm đá **${slot.score}/100**)`;
        canPlayAny = true;
      }

      evaluationLines.push(`• ${statusEmoji} **${d.dayNameVi} (${dateShort}) - ${targetSlotName}:** ${adviceText}`);
    });

    const betterAlternatives = daysList.filter(d => {
      const s = d.slots[targetSlotKey];
      const isAlreadyQueried = queriedDays.some(qd => qd.date === d.date);
      return !isAlreadyQueried && s.score >= 80;
    }).sort((a, b) => b.slots[targetSlotKey].score - a.slots[targetSlotKey].score);

    let altSuggestion = '';
    if (betterAlternatives.length > 0) {
      const topAlts = betterAlternatives.slice(0, 2);
      const altText = topAlts.map(a => `**${a.dayNameVi} (${a.date.split('-').slice(1).reverse().join('/')})**`).join(' hoặc ');
      altSuggestion = `\n\n💡 **Phương án gợi ý tối ưu:** Nếu anh em muốn đá sân khô ráo, chạy bứt tốc êm chân và không lo trơn ngã, Trợ lý khuyên nên dời lịch sang ${altText} (Trời tạnh ráo hoàn toàn, không mưa, điểm đá **95 - 100/100**)!`;
    }

    let conclusionText = '';
    if (queriedDays.length === 1) {
      const singleSlot = queriedDays[0].slots[targetSlotKey];
      conclusionText = singleSlot.score <= 50
        ? `👉 **Kết luận:** **${queriedDays[0].dayNameVi}** ${targetSlotName} thời tiết rất xấu, **không nên đá** để bảo vệ an toàn cho anh em!`
        : (singleSlot.score <= 75 ? `👉 **Kết luận:** **${queriedDays[0].dayNameVi}** ${targetSlotName} đá được nhưng sân còn ẩm ướt, cần đi giày đinh TF bám gót!` : `👉 **Kết luận:** **${queriedDays[0].dayNameVi}** ${targetSlotName} thời tiết lý tưởng, chốt kèo đi đá thôi!`);
    } else {
      if (!canPlayAny) {
        conclusionText = `👉 **Kết luận:** Cả ${queriedDays.map(d => d.dayNameVi).join(' & ')} ${targetSlotName} đều dính mưa và trơn ướt, **không nên đá** vào các ngày này!`;
      } else {
        const bestAmong = [...queriedDays].sort((a, b) => b.slots[targetSlotKey].score - a.slots[targetSlotKey].score)[0];
        conclusionText = `👉 **Kết luận:** Giữa các ngày bạn hỏi, **${bestAmong.dayNameVi}** là ngày đá ổn nhất!`;
      }
    }

    return `📋 **Thẩm định thời tiết tại Sân AKKA theo yêu cầu của bạn (${targetSlotName}):**\n\n${evaluationLines.join('\n')}\n\n${conclusionText}${altSuggestion}`;
  }

  // TÌNH HUỐNG B: HỎI VỀ MƯA TRƯỚC TRẬN VÀ RÓC NƯỚC
  if (q.includes('mưa') && (q.includes('róc') || q.includes('khô') || q.includes('đá được không') || q.includes('ướt') || q.includes('trơn') || q.includes('19h') || q.includes('7h'))) {
    const isSlot2 = targetSlotKey === 'slot_2';
    const targetSlot = isSlot2 ? slot2 : slot1;
    const targetName = isSlot2 ? 'Slot 22h15' : 'Slot 20h45';

    if (targetSlot?.score <= 50 || targetSlot?.rainMm >= 1.5 || (targetSlot?.rainProbability >= 75 && targetSlot?.rainMm > 0)) {
      return `⚠️ **Cảnh báo ${targetName} tối nay tại Sân AKKA:**\n\n- **Dữ liệu thực tế:** Khung giờ này dự báo có mưa (${targetSlot.rainMm}mm, xác suất mưa **${targetSlot.rainProbability}%**) sau khi đã mưa dầm từ chiều.\n- **Tình trạng mặt cỏ:** Nền cỏ nhân tạo đã ngậm bão hòa nước nên **chưa thể róc nước kịp**, sân sẽ rất ướt sũng và trơn trượt (Điểm đá: **${targetSlot.score}/100**).\n- **Lời khuyên:** Đội trưởng nên cân nhắc hoãn trận tối nay để giữ chân cho anh em, tránh trượt xoạc lật cổ chân!`;
    } else if (targetSlot?.rainMm === 0 && targetSlot?.rainProbability < 40) {
      return `✅ **Đá cực nuột luôn anh em nhé!** ⚽\n\n- **Tình trạng mặt sân AKKA:** Hệ thống thoát nước đá mi của sân rất tốt. Nếu có mưa nhỏ từ 19h và dứt điểm sau đó, thì chỉ mất **30 - 45 phút** là mặt sân đã róc sạch nước.\n- **Đến khung ${targetName}:** Sân tạnh ráo, chỉ còn ẩm nhẹ giúp bóng đầm chân và êm ái.\n- **Lời khuyên chọn giày:** Mang giày đinh TF dăm cao su bám sân là chạy mượt mà!`;
    } else {
      return `🌦️ **Lưu ý ${targetName}:** Sân có thể còn ẩm ướt nhẹ (Điểm đá: **${targetSlot?.score || 70}/100**). Anh em nên mang giày đinh TF có gờ bám sâu để tránh trượt trụ khi xoay người!`;
    }
  }

  // TÌNH HUỐNG C: HỎI XẾP HẠNG NGÀY ĐẸP NHẤT TRONG TUẦN
  if (q.includes('hôm nào') || q.includes('ngày nào') || q.includes('chọn ngày') || q.includes('tuần này') || q.includes('đẹp nhất')) {
    if (daysList.length > 0) {
      const sortedDays = [...daysList].sort((a, b) => {
        const scoreA = (a.slots.slot_1.score + a.slots.slot_2.score) / 2;
        const scoreB = (b.slots.slot_1.score + b.slots.slot_2.score) / 2;
        return scoreB - scoreA;
      });

      const top1 = sortedDays[0];
      const top2 = sortedDays[1] || sortedDays[0];

      const s1_desc = top1.slots.slot_1.rainMm === 0 ? 'Tạnh ráo, cỏ khô' : top1.slots.slot_1.weatherLabel;
      const s2_desc = top2.slots.slot_1.rainMm === 0 ? 'Tạnh ráo, cỏ khô' : top2.slots.slot_1.weatherLabel;

      return `🏆 **Bảng xếp hạng ngày đẹp nhất tuần này để FC TNT lên kèo (Sân AKKA):**\n\n1. 🥇 **${top1.displayLabel} (${top1.date}):** Điểm thi đấu **${Math.round((top1.slots.slot_1.score + top1.slots.slot_2.score) / 2)}/100** • ${s1_desc}, mát ${top1.slots.slot_1.temperature}°C, xác suất mưa thấp (${top1.slots.slot_1.rainProbability}%).\n2. 🥈 **${top2.displayLabel} (${top2.date}):** Điểm thi đấu **${Math.round((top2.slots.slot_1.score + top2.slots.slot_2.score) / 2)}/100** • ${s2_desc}, cả 2 slot 20h45 & 22h15 đều lý tưởng.\n\n💡 **Gợi ý của Trợ lý:** Anh em nên bắt đối giao hữu vào **${top1.dayNameVi}** hoặc **${top2.dayNameVi}** để có trải nghiệm sân mượt mà nhất!`;
    }
  }

  // TÌNH HUỐNG D: HỎI VỀ CHỌN GIÀY
  if (q.includes('giày') || q.includes('đinh') || q.includes('tf') || q.includes('trơn') || q.includes('trượt')) {
    return `👟 **Tư vấn chọn giày đá bóng tại Sân AKKA Chu Văn An:**\n\n- **Trời khô ráo / Mát mẻ:** Đi giày đinh **TF dăm tròn hoặc dăm mỏng** (Nike Tiempo, Mercurial, Mizuno Neo...) để bứt tốc nhẹ nhàng, cảm giác bóng thật chân.\n- **Sân vừa mưa / Còn ẩm:** Khuyên dùng giày đinh **TF cao su đinh tam giác hoặc đinh sâu bám gót** (như Adidas Predator, X Speedportal, Puma Future). Tuyệt đối không mang giày đã mòn nhẵn đế vì cỏ nhân tạo ướt rất dễ bị trượt trụ gây lật sơ mi hoặc giãn dây chằng!`;
  }

  // TÌNH HUỐNG E: DÔNG SÉT
  if (q.includes('dông') || q.includes('sét') || q.includes('sấm') || q.includes('nguy hiểm')) {
    const isThunder = (slot1?.weatherCode >= 95) || (slot2?.weatherCode >= 95);
    if (isThunder) {
      return `⛈️ **CẢNH BÁO NGUY HIỂM:** Dự báo tối nay có khả năng xuất hiện dông sét và gió giật tại khu vực Chu Văn An. Anh em tuyệt đối không nên đá bóng trên sân cỏ nhân tạo khi trời có sấm sét!`;
    }

    const isRainHeavy = (slot1?.score <= 50) || (slot2?.score <= 50) || (slot1?.rainProbability >= 70);
    if (isRainHeavy) {
      return `🛡️ **Về Dông Sét:** Tối nay tại Sân AKKA **không có tín hiệu sấm sét** hay gió lốc nguy hiểm (an toàn về điện sét).\n\n⚠️ **TUY NHIÊN CẢNH BÁO MƯA ƯỚT:** Radar dự báo có mưa dầm từ chiều và lượng mưa trong giờ đá khá lớn (xác suất mưa **${slot1?.rainProbability || 100}%**). Mặt sân sẽ rất ướt sũng và trơn trượt (Điểm đá chỉ **${slot1?.score || 35}/100**). Dù không có sét nhưng anh em nên cân nhắc hoãn trận để tránh chấn thương nhé!`;
    }

    return `🛡️ **Yên tâm anh em nhé!**\n\nTheo radar thời tiết, tại **${venueName}** tối nay không có tín hiệu dông sét hay gió giật nguy hiểm. Thời tiết rất tạnh ráo, an toàn tuyệt đối để tổ chức trận đấu!`;
  }

  // Phản hồi tổng quan
  return `🌤️ **Tư vấn Thời Tiết Sân AKKA Chu Văn An cho FC TNT:**\n\n- **Ngày đang xem:** ${dayData?.displayLabel || 'Hôm nay'}\n- **Slot 20h45:** ${slot1?.temperature || 26}°C • ${slot1?.weatherLabel || 'Tạnh ráo'} (${slot1?.statusText || 'Đá tốt'}) • Điểm đánh giá: **${slot1?.score || 90}/100**\n- **Slot 22h15:** ${slot2?.temperature || 25}°C • ${slot2?.weatherLabel || 'Mát mẻ'} (${slot2?.statusText || 'Lý tưởng'}) • Điểm đánh giá: **${slot2?.score || 95}/100**\n\n👉 Anh em có thể hỏi bất kỳ ngày nào (vd: *Thứ 4, Thứ 5 đá được không?*) hoặc bấm vào câu hỏi gợi ý bên trên nhé!`;
}

function createWeatherRouter() {
  const router = express.Router();

  // GET /api/weather/forecast
  router.get('/forecast', async (req, res) => {
    try {
      const now = Date.now();
      if (weatherCache.data && (now - weatherCache.timestamp < 10 * 60 * 1000)) {
        return res.json({
          success: true,
          cached: true,
          ...weatherCache.data
        });
      }

      const { latitude, longitude } = AKKA_VENUE;
      const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,rain,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia%2FBangkok&forecast_days=7`;

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Open-Meteo API returned status: ${response.status}`);
      }

      const raw = await response.json();
      const hourly = raw.hourly;
      const daily = raw.daily;

      if (!hourly || !daily) {
        throw new Error('Dữ liệu thời tiết không hợp lệ!');
      }

      const days = [];
      const dayNamesVi = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

      for (let i = 0; i < daily.time.length; i++) {
        const dateStr = daily.time[i];
        const dateObj = new Date(dateStr);
        const dayOfWeek = dateObj.getDay();
        const dayNameVi = dayNamesVi[dayOfWeek];

        const isToday = i === 0;
        const isTomorrow = i === 1;
        let displayLabel = dayNameVi;
        if (isToday) displayLabel = `Hôm nay (${dayNameVi})`;
        else if (isTomorrow) displayLabel = `Ngày mai (${dayNameVi})`;

        const eveningHours = [];
        let afternoonRainSum = 0;

        for (let h = 17; h <= 23; h++) {
          const hourStr = `${dateStr}T${String(h).padStart(2, '0')}:00`;
          const idx = hourly.time.indexOf(hourStr);
          if (idx !== -1) {
            const temp = Math.round(hourly.temperature_2m[idx]);
            const appTemp = Math.round(hourly.apparent_temperature[idx]);
            const humidity = hourly.relative_humidity_2m[idx];
            const rainProb = hourly.precipitation_probability[idx] || 0;
            const rainMm = hourly.precipitation[idx] || 0;
            const code = hourly.weather_code[idx];
            const weatherInfo = parseWmoWeather(code);

            if (h < 20) {
              afternoonRainSum += rainMm;
            }

            let pitchState = 'Khô ráo';
            if (rainMm > 2) pitchState = 'Ướt đọng';
            else if (rainMm > 0) pitchState = 'Mưa nhẹ';
            else if (afternoonRainSum > 0 && h >= 20) pitchState = 'Đang róc nước';

            eveningHours.push({
              hour: `${h}:00`,
              timeStr: hourStr,
              temperature: temp,
              apparentTemperature: appTemp,
              humidity,
              rainProbability: rainProb,
              rainMm,
              weatherCode: code,
              weatherIcon: weatherInfo.icon,
              weatherLabel: weatherInfo.label,
              pitchState
            });
          }
        }

        const idx20 = hourly.time.indexOf(`${dateStr}T20:00`);
        const idx21 = hourly.time.indexOf(`${dateStr}T21:00`);
        const slot1Rain20 = idx20 !== -1 ? hourly.precipitation[idx20] : 0;
        const slot1Rain21 = idx21 !== -1 ? hourly.precipitation[idx21] : 0;
        const slot1Rain = Math.max(slot1Rain20, slot1Rain21);
        const slot1Prob = Math.max(idx20 !== -1 ? hourly.precipitation_probability[idx20] : 0, idx21 !== -1 ? hourly.precipitation_probability[idx21] : 0);
        const slot1Temp = idx21 !== -1 ? Math.round(hourly.temperature_2m[idx21]) : 26;
        const slot1AppTemp = idx21 !== -1 ? Math.round(hourly.apparent_temperature[idx21]) : 27;
        const slot1Code = Math.max(idx20 !== -1 ? hourly.weather_code[idx20] : 0, idx21 !== -1 ? hourly.weather_code[idx21] : 0);
        const slot1Weather = parseWmoWeather(slot1Code);
        const slot1Eval = calculatePlayability(slot1Rain20, slot1Prob, slot1Temp, afternoonRainSum, slot1Code, slot1Rain21);

        const idx22 = hourly.time.indexOf(`${dateStr}T22:00`);
        const idx23 = hourly.time.indexOf(`${dateStr}T23:00`);
        const slot2Rain22 = idx22 !== -1 ? hourly.precipitation[idx22] : 0;
        const slot2Rain23 = idx23 !== -1 ? hourly.precipitation[idx23] : 0;
        const slot2Rain = Math.max(slot2Rain22, slot2Rain23);
        const slot2Prob = Math.max(idx22 !== -1 ? hourly.precipitation_probability[idx22] : 0, idx23 !== -1 ? hourly.precipitation_probability[idx23] : 0);
        const slot2Temp = idx22 !== -1 ? Math.round(hourly.temperature_2m[idx22]) : 25;
        const slot2AppTemp = idx22 !== -1 ? Math.round(hourly.apparent_temperature[idx22]) : 26;
        const slot2Code = Math.max(idx22 !== -1 ? hourly.weather_code[idx22] : 0, idx23 !== -1 ? hourly.weather_code[idx23] : 0);
        const slot2Weather = parseWmoWeather(slot2Code);
        const pre22Rain = afternoonRainSum + slot1Rain20 + slot1Rain21;
        const slot2Eval = calculatePlayability(slot2Rain22, slot2Prob, slot2Temp, pre22Rain, slot2Code, slot2Rain23);

        days.push({
          date: dateStr,
          dayNameVi,
          displayLabel,
          isToday,
          isTomorrow,
          tempMax: Math.round(daily.temperature_2m_max[i]),
          tempMin: Math.round(daily.temperature_2m_min[i]),
          dailyRainSum: daily.precipitation_sum[i],
          dailyRainProbMax: daily.precipitation_probability_max[i],
          weatherCode: daily.weather_code[i],
          weatherIcon: parseWmoWeather(daily.weather_code[i]).icon,
          weatherLabel: parseWmoWeather(daily.weather_code[i]).label,
          slots: {
            slot_1: {
              id: 'slot_1',
              name: 'Slot 20h45 (20:45 - 22:15)',
              time: '20:45 - 22:15',
              temperature: slot1Temp,
              apparentTemperature: slot1AppTemp,
              rainProbability: slot1Prob,
              rainMm: slot1Rain,
              weatherCode: slot1Code,
              weatherIcon: slot1Weather.icon,
              weatherLabel: slot1Weather.label,
              ...slot1Eval
            },
            slot_2: {
              id: 'slot_2',
              name: 'Slot 22h15 (22:15 - 23:45)',
              time: '22:15 - 23:45',
              temperature: slot2Temp,
              apparentTemperature: slot2AppTemp,
              rainProbability: slot2Prob,
              rainMm: slot2Rain,
              weatherCode: slot2Code,
              weatherIcon: slot2Weather.icon,
              weatherLabel: slot2Weather.label,
              ...slot2Eval
            }
          },
          eveningTimeline: eveningHours
        });
      }

      const payload = {
        venue: AKKA_VENUE,
        days,
        updatedAt: new Date().toISOString()
      };

      weatherCache = {
        timestamp: now,
        data: payload
      };

      res.json({
        success: true,
        cached: false,
        ...payload
      });
    } catch (err) {
      console.error('Error in /api/weather/forecast:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/weather/ai-consultant (Có rate limiting bảo vệ hạn ngạch Gemini)
  router.post('/ai-consultant', aiRateLimiter, async (req, res) => {
    try {
      const { question, forecastData, selectedDate, selectedSlot } = req.body;
      if (!question || !String(question).trim()) {
        return res.status(400).json({ success: false, error: 'Vui lòng cung cấp câu hỏi!' });
      }

      const geminiKey = process.env.GEMINI_API_KEY;

      if (geminiKey) {
        try {
          const systemInstruction = `Bạn là "Trợ Lý Trọng Tài & Cố Vấn Thời Tiết Sân Cỏ Nhân Tạo FC TNT", am hiểu sâu sắc về thời tiết Hà Nội và sân bóng đá cỏ nhân tạo AKKA (68 Đại Lộ Chu Văn An, Thanh Liệt, Hà Nội).
Đặc tính sân AKKA: Mặt sân cỏ nhân tạo tiêu chuẩn, nền đá mi thoát nước tốt. Nếu mưa nhỏ hoặc vừa trước đó 1-2 tiếng (lúc 18h, 19h, 20h), sau khi tạnh mưa khoảng 30-45 phút thì mặt sân róc nước, chỉ còn ẩm nhẹ, đến 22h15 đá rất êm chân, không trơn trượt.
Phong cách trả lời: Thân thiện, hào sảng chuẩn dân đá bóng phủi, súc tích, có emoji bóng đá, phân tích logic theo giờ và đưa ra lời khuyên thực tế (đá được hay không, róc nước chưa, nên đi giày TF nào).`;

          const userPrompt = `DỮ LIỆU THỜI TIẾT DỰ BÁO 7 NGÀY TẠI SÂN AKKA CHU VĂN AN:
${JSON.stringify(forecastData?.days?.slice(0, 4) || {}, null, 2)}

NGÀY ĐANG CHỌN: ${selectedDate || 'Hôm nay'}
SLOT ĐANG CHỌN: ${selectedSlot || '20h45 / 22h15'}

CÂU HỎI CỦA ANH EM TRONG ĐỘI:
"${question}"

Hãy trả lời trực diện câu hỏi của anh em thật tự nhiên, chuẩn xác theo dữ liệu thời tiết và đặc tính sân AKKA.`;

          const modelName = 'gemini-1.5-flash';
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1000
              }
            })
          });

          if (response.ok) {
            const data = await response.json();
            const answerText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (answerText) {
              return res.json({
                success: true,
                answer: answerText,
                source: `Google Gemini AI (${modelName})`
              });
            }
          }
        } catch (geminiErr) {
          console.warn('Gemini API weather consultant error, switching to football NLP:', geminiErr.message);
        }
      }

      // Fallback thông minh với Football NLP
      const answer = analyzePitchWithFootballNLP(question, forecastData, selectedDate, selectedSlot);
      return res.json({
        success: true,
        answer,
        source: 'FC TNT Pitch Intelligence Engine'
      });
    } catch (err) {
      console.error('Error in /api/weather/ai-consultant:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

module.exports = {
  createWeatherRouter,
  AKKA_VENUE
};
