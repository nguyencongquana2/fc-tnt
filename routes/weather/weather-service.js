/**
 * FC TNT - Weather & Pitch Intelligence Service (routes/weather/weather-service.js)
 * Sân AKKA Chu Văn An - Kết nối Open-Meteo API & Tính chỉ số thi đấu Match Playability
 */

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

/**
 * Lấy dự báo thời tiết 7 ngày từ Open-Meteo và tính toán các chỉ số cho sân AKKA
 * Hỗ trợ cache in-memory 10 phút để giảm tải kết nối ngoại mạng
 * @returns {Promise<Object>} { cached, venue, days, updatedAt }
 */
async function fetchWeatherForecast() {
  const now = Date.now();
  if (weatherCache.data && (now - weatherCache.timestamp < 10 * 60 * 1000)) {
    return {
      cached: true,
      ...weatherCache.data
    };
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

  return {
    cached: false,
    ...payload
  };
}

module.exports = {
  AKKA_VENUE,
  parseWmoWeather,
  calculatePlayability,
  fetchWeatherForecast
};
