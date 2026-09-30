/**
 * FC TNT - Weather & Pitch AI Consultant Module
 * Tọa độ Sân bóng đá AKKA - 68 Đại Lộ Chu Văn An, Thanh Liệt, Hà Nội
 */

window.weatherModule = {
  forecastData: null,
  selectedDate: null,
  selectedSlot: 'slot_1',
  isLoading: false,
  isAiTyping: false,
  chatMessages: [
    {
      sender: 'ai',
      time: 'Vừa xong',
      text: 'Chào anh em FC TNT! ⚽ Mình là **Trợ Lý Thời Tiết & Thẩm Định Sân AKKA Chu Văn An**.\n\nMình theo dõi sát sao dữ liệu thời tiết từng giờ tại sân (đặc biệt 2 khung **20h45** & **22h15**). Anh em cần hỏi thời tiết hôm nào, mưa lúc mấy giờ thì sân khô, hay nên đi giày đinh gì thì cứ hỏi mình nhé!'
    }
  ],

  init() {
    this.bindEvents();
    this.fetchForecast();
  },

  bindEvents() {
    // Chat form submit
    const chatForm = document.getElementById('weather-ai-form');
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('weather-ai-input');
        if (input && input.value.trim()) {
          const q = input.value.trim();
          input.value = '';
          this.askAi(q);
        }
      });
    }

    // Quick question chips
    document.querySelectorAll('.weather-quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const question = chip.getAttribute('data-question');
        if (question) {
          this.askAi(question);
        }
      });
    });

    // Refresh weather button
    const refreshBtn = document.getElementById('weather-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.fetchForecast(true);
      });
    }
  },

  async fetchForecast(isManualRefresh = false) {
    this.isLoading = true;
    const container = document.getElementById('weather-days-grid');
    if (container && !this.forecastData) {
      container.innerHTML = `
        <div class="weather-loading-box">
          <div class="weather-spinner"></div>
          <p>Đang kết nối vệ tinh & đo đạc thời tiết Sân AKKA Chu Văn An...</p>
        </div>
      `;
    }

    try {
      let data = null;
      try {
        const res = await fetch('/api/weather/forecast');
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            data = json;
          }
        }
      } catch (e) {
        console.warn('Backend weather API failed, fetching directly from Open-Meteo:', e);
      }

      // Fallback: nếu backend chưa chạy hoặc lỗi thì gọi trực tiếp Open-Meteo từ client
      if (!data) {
        data = await this.fetchClientFallback();
      }

      this.forecastData = data;
      if (!this.selectedDate && data.days && data.days.length > 0) {
        this.selectedDate = data.days[0].date;
      }

      this.render7DayCards();
      this.renderDayDetail();
      this.renderDashboardWidget();
      this.renderAiChat();

      if (isManualRefresh && window.showToast) {
        window.showToast('🌤️ Đã cập nhật dự báo thời tiết mới nhất tại Sân AKKA!');
      }

    } catch (err) {
      console.error('Failed to load weather forecast:', err);
      if (container) {
        container.innerHTML = `
          <div class="empty-state-box" style="padding: 2rem;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚠️</div>
            <p style="color: var(--text-muted);">Không thể tải dữ liệu thời tiết. Vui lòng kiểm tra kết nối mạng!</p>
            <button class="btn btn-secondary btn-sm" onclick="window.weatherModule.fetchForecast(true)">🔄 Thử Lại</button>
          </div>
        `;
      }
    } finally {
      this.isLoading = false;
    }
  },

  // Fallback trực tiếp phía Client Open-Meteo
  async fetchClientFallback() {
    const lat = 20.9752;
    const lon = 105.8175;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia%2FBangkok&forecast_days=7`;
    
    const res = await fetch(url);
    const raw = await res.json();
    
    const dayNamesVi = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const days = [];

    for (let i = 0; i < raw.daily.time.length; i++) {
      const dateStr = raw.daily.time[i];
      const dateObj = new Date(dateStr);
      const dayNameVi = dayNamesVi[dateObj.getDay()];
      const isToday = i === 0;
      const isTomorrow = i === 1;
      let displayLabel = dayNameVi;
      if (isToday) displayLabel = `Hôm nay (${dayNameVi})`;
      else if (isTomorrow) displayLabel = `Ngày mai (${dayNameVi})`;

      const eveningHours = [];
      let afternoonRainSum = 0;

      for (let h = 17; h <= 23; h++) {
        const hourStr = `${dateStr}T${String(h).padStart(2, '0')}:00`;
        const idx = raw.hourly.time.indexOf(hourStr);
        if (idx !== -1) {
          const temp = Math.round(raw.hourly.temperature_2m[idx]);
          const appTemp = Math.round(raw.hourly.apparent_temperature[idx]);
          const rainProb = raw.hourly.precipitation_probability[idx] || 0;
          const rainMm = raw.hourly.precipitation[idx] || 0;
          const code = raw.hourly.weather_code[idx];
          const weatherInfo = this.parseWmo(code);

          if (h < 20) afternoonRainSum += rainMm;

          eveningHours.push({
            hour: `${h}:00`,
            timeStr: hourStr,
            temperature: temp,
            apparentTemperature: appTemp,
            rainProbability: rainProb,
            rainMm,
            weatherCode: code,
            weatherIcon: weatherInfo.icon,
            weatherLabel: weatherInfo.label,
            pitchState: rainMm > 1 ? 'Có mưa' : (afternoonRainSum > 0 && h >= 20 ? 'Đang róc nước' : 'Khô ráo')
          });
        }
      }

      const idx20 = raw.hourly.time.indexOf(`${dateStr}T20:00`);
      const idx21 = raw.hourly.time.indexOf(`${dateStr}T21:00`);
      const slot1Rain20 = idx20 !== -1 ? raw.hourly.precipitation[idx20] : 0;
      const slot1Rain21 = idx21 !== -1 ? raw.hourly.precipitation[idx21] : 0;
      const slot1Rain = Math.max(slot1Rain20, slot1Rain21);
      const slot1Prob = Math.max(idx20 !== -1 ? raw.hourly.precipitation_probability[idx20] : 0, idx21 !== -1 ? raw.hourly.precipitation_probability[idx21] : 0);
      const slot1Temp = idx21 !== -1 ? Math.round(raw.hourly.temperature_2m[idx21]) : 26;
      const slot1Code = Math.max(idx20 !== -1 ? raw.hourly.weather_code[idx20] : 0, idx21 !== -1 ? raw.hourly.weather_code[idx21] : 0);
      const slot1Info = this.parseWmo(slot1Code);

      const idx22 = raw.hourly.time.indexOf(`${dateStr}T22:00`);
      const idx23 = raw.hourly.time.indexOf(`${dateStr}T23:00`);
      const slot2Rain22 = idx22 !== -1 ? raw.hourly.precipitation[idx22] : 0;
      const slot2Rain23 = idx23 !== -1 ? raw.hourly.precipitation[idx23] : 0;
      const slot2Rain = Math.max(slot2Rain22, slot2Rain23);
      const slot2Prob = Math.max(idx22 !== -1 ? raw.hourly.precipitation_probability[idx22] : 0, idx23 !== -1 ? raw.hourly.precipitation_probability[idx23] : 0);
      const slot2Temp = idx22 !== -1 ? Math.round(raw.hourly.temperature_2m[idx22]) : 25;
      const slot2Code = Math.max(idx22 !== -1 ? raw.hourly.weather_code[idx22] : 0, idx23 !== -1 ? raw.hourly.weather_code[idx23] : 0);
      const slot2Info = this.parseWmo(slot2Code);

      // Tính điểm chuẩn xác cho slot 1
      let s1Score = 95, s1Status = 'ideal', s1Text = 'Lý tưởng để đá', s1Badge = 'badge-ideal', s1Pitch = 'Mặt sân khô ráo', s1Boot = 'Giày đinh TF tốc độ tiêu chuẩn';
      if (slot1Code >= 95 || slot1Rain >= 3.0 || (slot1Rain >= 1.0 && slot1Prob >= 75)) {
        s1Score = 35; s1Status = 'cancel'; s1Text = 'Cảnh báo mưa to - Nguy cơ hủy'; s1Badge = 'badge-cancel';
        s1Pitch = 'Sân ướt sũng / đọng nước, rất trơn'; s1Boot = 'Khuyên nên hoãn hoặc đi giày đinh TF gai bám sâu';
      } else if (slot1Rain > 0.5 || slot1Prob >= 60) {
        s1Score = 55; s1Status = 'caution'; s1Text = 'Có mưa - Sân trơn ướt'; s1Badge = 'badge-caution';
        s1Pitch = 'Mặt cỏ ẩm ướt nhiều'; s1Boot = 'Giày đinh TF dăm cao su chống trượt';
      } else if (slot1Rain > 0 || slot1Prob >= 30) {
        s1Score = 75; s1Status = 'playable'; s1Text = 'Mưa lất phất - Đá được'; s1Badge = 'badge-playable';
        s1Pitch = 'Mặt sân ẩm nhẹ'; s1Boot = 'Giày đinh TF bám gót';
      }

      // Tính điểm chuẩn xác cho slot 2 (xét cả mưa dầm từ chiều và mưa lúc 23h)
      const pre22Rain = afternoonRainSum + slot1Rain20 + slot1Rain21;
      let s2Score = 95, s2Status = 'ideal', s2Text = 'Lý tưởng để đá', s2Badge = 'badge-ideal', s2Pitch = 'Mặt sân khô ráo', s2Boot = 'Giày đinh TF tiêu chuẩn';
      if (slot2Code >= 95 || slot2Rain >= 3.0 || (slot2Rain >= 1.0 && slot2Prob >= 75) || (pre22Rain >= 2.5 && slot2Rain > 0)) {
        s2Score = 35; s2Status = 'cancel'; s2Text = 'Cảnh báo mưa to - Sân ướt nặng'; s2Badge = 'badge-cancel';
        s2Pitch = 'Mặt sân bão hòa nước sau nhiều giờ mưa, rất trơn trượt'; s2Boot = 'Khuyên nên hoãn hoặc đi giày đinh TF gai bám cao su';
      } else if (slot2Rain > 0.5 || slot2Prob >= 60) {
        s2Score = 55; s2Status = 'caution'; s2Text = 'Có mưa - Sân trơn ướt'; s2Badge = 'badge-caution';
        s2Pitch = 'Mặt cỏ ẩm ướt nhiều'; s2Boot = 'Giày đinh TF dăm cao su chống trượt';
      } else if (slot2Rain > 0 || slot2Prob >= 30) {
        s2Score = 75; s2Status = 'playable'; s2Text = 'Mưa lất phất - Đá được'; s2Badge = 'badge-playable';
        s2Pitch = 'Mặt sân ẩm nhẹ'; s2Boot = 'Giày đinh TF bám gót';
      }

      days.push({
        date: dateStr,
        dayNameVi,
        displayLabel,
        isToday,
        isTomorrow,
        tempMax: Math.round(raw.daily.temperature_2m_max[i]),
        tempMin: Math.round(raw.daily.temperature_2m_min[i]),
        dailyRainSum: raw.daily.precipitation_sum[i],
        dailyRainProbMax: raw.daily.precipitation_probability_max[i],
        weatherCode: raw.daily.weather_code[i],
        weatherIcon: this.parseWmo(raw.daily.weather_code[i]).icon,
        weatherLabel: this.parseWmo(raw.daily.weather_code[i]).label,
        slots: {
          slot_1: {
            id: 'slot_1',
            name: 'Slot 20h45 (20:45 - 22:15)',
            time: '20:45 - 22:15',
            temperature: slot1Temp,
            apparentTemperature: slot1Temp + 1,
            rainProbability: slot1Prob,
            rainMm: slot1Rain,
            weatherIcon: slot1Info.icon,
            weatherLabel: slot1Info.label,
            score: s1Score,
            status: s1Status,
            statusText: s1Text,
            badgeClass: s1Badge,
            pitchCondition: s1Pitch,
            bootAdvice: s1Boot
          },
          slot_2: {
            id: 'slot_2',
            name: 'Slot 22h15 (22:15 - 23:45)',
            time: '22:15 - 23:45',
            temperature: slot2Temp,
            apparentTemperature: slot2Temp + 1,
            rainProbability: slot2Prob,
            rainMm: slot2Rain,
            weatherIcon: slot2Info.icon,
            weatherLabel: slot2Info.label,
            score: s2Score,
            status: s2Status,
            statusText: s2Text,
            badgeClass: s2Badge,
            pitchCondition: s2Pitch,
            bootAdvice: s2Boot
          }
        },
        eveningTimeline: eveningHours
      });
    }

    return {
      venue: {
        name: 'Sân bóng đá AKKA',
        address: '68 Đại Lộ Chu Văn An, Thanh Liệt, Hà Nội',
        latitude: 20.9752,
        longitude: 105.8175
      },
      days,
      updatedAt: new Date().toISOString()
    };
  },

  parseWmo(code) {
    if (code === 0) return { label: 'Quang đãng', icon: '☀️' };
    if (code === 1 || code === 2) return { label: 'Ít mây', icon: '🌤️' };
    if (code === 3) return { label: 'Nhiều mây', icon: '☁️' };
    if (code >= 51 && code <= 55) return { label: 'Mưa phùn', icon: '🌦️' };
    if (code >= 61 && code <= 65) return { label: 'Mưa rào', icon: '🌧️' };
    if (code >= 80 && code <= 82) return { label: 'Mưa to', icon: '🌧️' };
    if (code >= 95) return { label: 'Dông sét', icon: '⛈️' };
    return { label: 'Bình thường', icon: '⛅' };
  },

  selectDate(dateStr) {
    this.selectedDate = dateStr;
    this.render7DayCards();
    this.renderDayDetail();
  },

  selectSlot(slotId) {
    this.selectedSlot = slotId;
    this.renderDayDetail();
  },

  render7DayCards() {
    const container = document.getElementById('weather-days-grid');
    if (!container || !this.forecastData?.days) return;

    let html = '';
    this.forecastData.days.forEach((day) => {
      const isSelected = day.date === this.selectedDate;
      const s1 = day.slots.slot_1;
      const s2 = day.slots.slot_2;
      const avgScore = Math.round((s1.score + s2.score) / 2);

      let scoreBadgeClass = 'score-ideal';
      if (avgScore < 50) scoreBadgeClass = 'score-cancel';
      else if (avgScore < 85) scoreBadgeClass = 'score-playable';

      html += `
        <div class="weather-day-card ${isSelected ? 'active' : ''}" onclick="window.weatherModule.selectDate('${day.date}')">
          <div class="weather-card-header">
            <span class="weather-day-name">${day.displayLabel}</span>
            <span class="weather-date-sub">${day.date.split('-').slice(1).reverse().join('/')}</span>
          </div>

          <div class="weather-card-center">
            <span class="weather-main-icon">${day.weatherIcon}</span>
            <div class="weather-card-temp">
              <span class="temp-max">${day.tempMax}°</span>
              <span class="temp-divider">/</span>
              <span class="temp-min">${day.tempMin}°C</span>
            </div>
            <div class="weather-card-desc">${day.weatherLabel}</div>
          </div>

          <!-- 2 Slot Badges -->
          <div class="weather-card-slots">
            <div class="slot-mini-pill ${s1.badgeClass}">
              <span class="slot-time">20h45</span>
              <span class="slot-score">${s1.score}đ</span>
            </div>
            <div class="slot-mini-pill ${s2.badgeClass}">
              <span class="slot-time">22h15</span>
              <span class="slot-score">${s2.score}đ</span>
            </div>
          </div>

          <div class="weather-card-footer">
            <span class="rain-prob">💧 ${day.dailyRainProbMax || 0}%</span>
            <span class="playability-score ${scoreBadgeClass}">🏆 ${avgScore}/100</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  renderDayDetail() {
    const detailContainer = document.getElementById('weather-selected-day-detail');
    if (!detailContainer || !this.forecastData?.days) return;

    const day = this.forecastData.days.find(d => d.date === this.selectedDate) || this.forecastData.days[0];
    if (!day) return;

    const s1 = day.slots.slot_1;
    const s2 = day.slots.slot_2;
    const activeSlot = this.selectedSlot === 'slot_1' ? s1 : s2;

    detailContainer.innerHTML = `
      <div class="day-detail-panel">
        <div class="day-detail-header">
          <div>
            <div class="detail-day-title">
              <span>📅 ${day.displayLabel} (${day.date.split('-').reverse().join('/')})</span>
              <span class="venue-tag">🏟️ Sân AKKA Chu Văn An</span>
            </div>
            <div class="detail-day-sub">Đánh giá chuyên sâu 2 khung giờ thi đấu chính & diễn biến mặt sân cỏ nhân tạo</div>
          </div>

          <!-- Slot Selector Buttons -->
          <div class="slot-toggle-group">
            <button class="slot-toggle-btn ${this.selectedSlot === 'slot_1' ? 'active' : ''}" onclick="window.weatherModule.selectSlot('slot_1')">
              ⚽ Slot 20:45 - 22:15
            </button>
            <button class="slot-toggle-btn ${this.selectedSlot === 'slot_2' ? 'active' : ''}" onclick="window.weatherModule.selectSlot('slot_2')">
              🌙 Slot 22:15 - 23:45
            </button>
          </div>
        </div>

        <!-- Slot Comparison Cards -->
        <div class="slot-detail-grid">
          <!-- Active Slot Highlight Card -->
          <div class="slot-focus-card ${activeSlot.badgeClass}">
            <div class="slot-focus-header">
              <div class="slot-title-wrap">
                <span class="slot-badge">${activeSlot.name}</span>
                <span class="slot-status-text">${activeSlot.statusText}</span>
              </div>
              <div class="slot-score-circle ${activeSlot.badgeClass}">
                <span class="score-num">${activeSlot.score}</span>
                <span class="score-label">Điểm đá</span>
              </div>
            </div>

            <div class="slot-stats-row">
              <div class="slot-stat-item">
                <span class="stat-icon">🌡️</span>
                <div>
                  <div class="stat-val">${activeSlot.temperature}°C</div>
                  <div class="stat-label">Cảm nhận ${activeSlot.apparentTemperature}°C</div>
                </div>
              </div>

              <div class="slot-stat-item">
                <span class="stat-icon">🌧️</span>
                <div>
                  <div class="stat-val">${activeSlot.rainProbability}%</div>
                  <div class="stat-label">Lượng mưa: ${activeSlot.rainMm} mm</div>
                </div>
              </div>

              <div class="slot-stat-item">
                <span class="stat-icon">🌤️</span>
                <div>
                  <div class="stat-val">${activeSlot.weatherIcon} ${activeSlot.weatherLabel}</div>
                  <div class="stat-label">Trạng thái bầu trời</div>
                </div>
              </div>
            </div>

            <div class="slot-pitch-analysis">
              <div class="analysis-box">
                <div class="analysis-title">🌱 Thẩm định mặt sân AKKA:</div>
                <div class="analysis-content">${activeSlot.pitchCondition}</div>
              </div>
              <div class="analysis-box boot">
                <div class="analysis-title">👟 Gợi ý mang giày:</div>
                <div class="analysis-content">${activeSlot.bootAdvice}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Hourly Timeline (17h -> 23h Radar) -->
        <div class="hourly-radar-section">
          <div class="radar-title-wrap">
            <h4 class="radar-title">⏱️ Radar Diễn Biến Theo Giờ (17:00 – 23:00)</h4>
            <span class="radar-sub">Theo dõi thời điểm bắt đầu mưa và thời điểm tạnh ráo để dự đoán sân</span>
          </div>

          <div class="hourly-timeline-grid">
            ${day.eveningTimeline.map(h => {
              let barColor = '#10b981'; // Xanh lá
              if (h.rainMm > 2) barColor = '#ef4444'; // Đỏ
              else if (h.rainMm > 0) barColor = '#f59e0b'; // Vàng

              return `
                <div class="hourly-col">
                  <div class="hour-tag">${h.hour}</div>
                  <div class="hour-icon">${h.weatherIcon}</div>
                  <div class="hour-temp">${h.temperature}°</div>
                  
                  <div class="rain-bar-container" title="Lượng mưa: ${h.rainMm}mm - Xác suất: ${h.rainProbability}%">
                    <div class="rain-bar-fill" style="height: ${Math.min(100, Math.max(12, h.rainProbability))}%; background-color: ${barColor};"></div>
                  </div>
                  
                  <div class="hour-rain-mm">${h.rainMm > 0 ? h.rainMm + 'mm' : '0mm'}</div>
                  <div class="hour-pitch-state">${h.pitchState}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    if (window.tntEffects && window.tntEffects.applyWeatherParticles) {
      const focusCard = detailContainer.querySelector('.slot-focus-card');
      if (focusCard) {
        window.tntEffects.applyWeatherParticles(focusCard, activeSlot.weatherCode || (activeSlot.rainMm > 0 ? 61 : 0), activeSlot.rainProbability || 0);
      }
    }
  },

  renderAiChat() {
    const chatBody = document.getElementById('weather-ai-chat-body');
    if (!chatBody) return;

    let html = '';
    this.chatMessages.forEach(msg => {
      const isAi = msg.sender === 'ai';
      html += `
        <div class="chat-message-row ${isAi ? 'ai-row' : 'user-row'}">
          <div class="chat-avatar">${isAi ? '🤖' : '⚽'}</div>
          <div class="chat-bubble ${isAi ? 'ai-bubble' : 'user-bubble'}">
            <div class="chat-bubble-text">${this.formatMarkdown(msg.text)}</div>
            <div class="chat-bubble-time">${msg.time}</div>
          </div>
        </div>
      `;
    });

    if (this.isAiTyping) {
      html += `
        <div class="chat-message-row ai-row">
          <div class="chat-avatar">🤖</div>
          <div class="chat-bubble ai-bubble">
            <div class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      `;
    }

    chatBody.innerHTML = html;
    chatBody.scrollTop = chatBody.scrollHeight;
  },

  formatMarkdown(text) {
    if (!text) return '';
    const safeText = (typeof window.escapeHtml === 'function')
      ? window.escapeHtml(text)
      : String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    return safeText
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .replace(/- (.*?)(<br>|$)/g, '• $1$2');
  },

  async askAi(questionText) {
    if (!questionText || this.isAiTyping) return;

    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    // Append user message
    this.chatMessages.push({
      sender: 'user',
      time: nowStr,
      text: questionText
    });
    this.isAiTyping = true;
    this.renderAiChat();

    try {
      let answer = '';
      try {
        const res = await fetch('/api/weather/ai-consultant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: questionText,
            forecastData: this.forecastData,
            selectedDate: this.selectedDate,
            selectedSlot: this.selectedSlot
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.answer) {
            answer = json.answer;
          }
        }
      } catch (netErr) {
        console.warn('Backend AI API fetch error, switching to Client AI NLP Engine:', netErr);
      }

      // Nếu backend chưa có hoặc chưa trả về, chạy ngay bộ phân tích AI Client-side
      if (!answer) {
        answer = this.analyzePitchWithFootballNLP(questionText, this.forecastData, this.selectedDate, this.selectedSlot);
      }

      this.chatMessages.push({
        sender: 'ai',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        text: answer
      });

    } catch (err) {
      console.error('AI chat error:', err);
      const fallbackAnswer = this.analyzePitchWithFootballNLP(questionText, this.forecastData, this.selectedDate, this.selectedSlot);
      this.chatMessages.push({
        sender: 'ai',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        text: fallbackAnswer
      });
    } finally {
      this.isAiTyping = false;
      this.renderAiChat();
    }
  },

  // Bộ não AI phân tích ngữ cảnh mặt sân AKKA Chu Văn An (Client-side Engine)
  analyzePitchWithFootballNLP(question, forecastData, selectedDate, selectedSlot) {
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
    let isSpecificSlotAsked = false;

    if (q.includes('22h15') || q.includes('10h15') || q.includes('slot 2') || q.includes('đá muộn') || q.includes('ca 2')) {
      targetSlotKey = 'slot_2';
      targetSlotName = 'Slot 22h15';
      isSpecificSlotAsked = true;
    } else if (q.includes('20h45') || q.includes('8h45') || q.includes('slot 1') || q.includes('đá sớm') || q.includes('ca 1')) {
      targetSlotKey = 'slot_1';
      targetSlotName = 'Slot 20h45';
      isSpecificSlotAsked = true;
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
        // Tìm ngày tương ứng trong 7 ngày forecast
        const match = daysList.find(f => {
          const dt = new Date(f.date);
          return dt.getDay() === d.dayNum;
        });
        if (match) {
          queriedDays.push(match);
        }
      }
    });

    // Nếu người dùng hỏi "hôm nay"
    if (q.includes('hôm nay') && daysList[0] && !queriedDays.some(d => d.date === daysList[0].date)) {
      queriedDays.unshift(daysList[0]);
    }
    // Nếu người dùng hỏi "ngày mai"
    if (q.includes('ngày mai') && daysList[1] && !queriedDays.some(d => d.date === daysList[1].date)) {
      queriedDays.push(daysList[1]);
    }

    // === TÌNH HUỐNG A: NGƯỜI DÙNG HỎI CÁC THỨ / NGÀY CỤ THỂ (Ví dụ: Thứ 4 và Thứ 5) ===
    if (queriedDays.length > 0) {
      let evaluationLines = [];
      let canPlayAny = false;
      let worstScore = 100;

      queriedDays.forEach(d => {
        const slot = d.slots[targetSlotKey];
        const dateShort = d.date.split('-').slice(1).reverse().join('/');
        let statusEmoji = '✅';
        let adviceText = '';

        if (slot.score <= 50 || slot.rainMm >= 1.5 || (slot.rainProbability >= 75 && slot.rainMm > 0)) {
          statusEmoji = '❌';
          adviceText = `**KHÔNG NÊN ĐÁ** (Mưa ${slot.rainMm}mm, xác suất mưa **${slot.rainProbability}%**, sân úng nước và rất trơn)`;
          worstScore = Math.min(worstScore, slot.score);
        } else if (slot.score <= 75 || slot.rainProbability >= 50) {
          statusEmoji = '⚠️';
          adviceText = `**CÂN NHẮC / SÂN ẨM** (Mưa nhỏ lất phất ${slot.rainMm}mm, xác suất ${slot.rainProbability}%, mặt sân hơi trơn)`;
          worstScore = Math.min(worstScore, slot.score);
        } else {
          statusEmoji = '✅';
          adviceText = `**ĐÁ RẤT TỐT** (Tạnh ráo, 0mm mưa, mát ${slot.temperature}°C, điểm đá **${slot.score}/100**)`;
          canPlayAny = true;
        }

        evaluationLines.push(`• ${statusEmoji} **${d.dayNameVi} (${dateShort}) - ${targetSlotName}:** ${adviceText}`);
      });

      // Tìm các ngày đẹp nhất khác trong tuần để đưa ra phương án thay thế
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

    // === TÌNH HUỐNG B: HỎI VỀ MƯA TRƯỚC TRẬN VÀ RÓC NƯỚC ===
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

    // === TÌNH HUỐNG C: HỎI XẾP HẠNG NGÀY ĐẸP NHẤT TRONG TUẦN ===
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

        return `🏆 **Bảng xếp hạng ngày đẹp nhất tuần này để FC TNT lên kèo (Sân AKKA):**\n\n1. 🥇 **${top1.displayLabel} (${top1.date}):** Điểm thi đấu **${Math.round((top1.slots.slot_1.score + top1.slots.slot_2.score)/2)}/100** • ${s1_desc}, mát ${top1.slots.slot_1.temperature}°C, xác suất mưa thấp (${top1.slots.slot_1.rainProbability}%).\n2. 🥈 **${top2.displayLabel} (${top2.date}):** Điểm thi đấu **${Math.round((top2.slots.slot_1.score + top2.slots.slot_2.score)/2)}/100** • ${s2_desc}, cả 2 slot 20h45 & 22h15 đều lý tưởng.\n\n💡 **Gợi ý của Trợ lý:** Anh em nên bắt đối giao hữu vào **${top1.dayNameVi}** hoặc **${top2.dayNameVi}** để có trải nghiệm sân mượt mà nhất!`;
      }
    }

    // === TÌNH HUỐNG D: HỎI VỀ CHỌN GIÀY ===
    if (q.includes('giày') || q.includes('đinh') || q.includes('tf') || q.includes('trơn') || q.includes('trượt')) {
      return `👟 **Tư vấn chọn giày đá bóng tại Sân AKKA Chu Văn An:**\n\n- **Trời khô ráo / Mát mẻ:** Đi giày đinh **TF dăm tròn hoặc dăm mỏng** (Nike Tiempo, Mercurial, Mizuno Neo...) để bứt tốc nhẹ nhàng, cảm giác bóng thật chân.\n- **Sân vừa mưa / Còn ẩm:** Khuyên dùng giày đinh **TF cao su đinh tam giác hoặc đinh sâu bám gót** (như Adidas Predator, X Speedportal, Puma Future). Tuyệt đối không mang giày đã mòn nhẵn đế vì cỏ nhân tạo ướt rất dễ bị trượt trụ gây lật sơ mi hoặc giãn dây chằng!`;
    }

    // === TÌNH HUỐNG E: DÔNG SÉT ===
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
  },

  // Render widget mini trên tab Dashboard
  renderDashboardWidget() {
    const widgetEl = document.getElementById('dash-weather-summary-widget');
    if (!widgetEl || !this.forecastData?.days || this.forecastData.days.length === 0) return;

    const today = this.forecastData.days[0];
    const s1 = today.slots.slot_1;
    const s2 = today.slots.slot_2;

    widgetEl.innerHTML = `
      <div class="dash-weather-banner" onclick="window.appModule.switchTab('weather')">
        <div class="weather-banner-left">
          <div class="weather-live-badge">🔴 LIVE VỆ TINH SÂN AKKA</div>
          <div class="weather-banner-headline">
            <span class="weather-big-icon">${today.weatherIcon}</span>
            <div>
              <div class="weather-venue-name">Sân Bóng AKKA • 68 ĐL Chu Văn An</div>
              <div class="weather-headline-desc">
                Tối nay: <strong>${s1.temperature}°C</strong> • ${s1.weatherLabel} • Khả năng mưa <strong>${s1.rainProbability}%</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="weather-banner-right">
          <div class="slot-summary-badge ${s1.badgeClass}">
            <span class="slot-label">20h45:</span>
            <span class="slot-val">${s1.score}đ • ${s1.statusText}</span>
          </div>
          <div class="slot-summary-badge ${s2.badgeClass}">
            <span class="slot-label">22h15:</span>
            <span class="slot-val">${s2.score}đ • ${s2.statusText}</span>
          </div>
          <span class="btn btn-sm btn-gold weather-cta-btn">🌦️ Xem Dự Báo 7 Ngày & Hỏi AI &rarr;</span>
        </div>
      </div>
    `;

    if (window.tntEffects && window.tntEffects.applyWeatherParticles) {
      const banner = widgetEl.querySelector('.dash-weather-banner');
      if (banner) {
        window.tntEffects.applyWeatherParticles(banner, s1.weatherCode || (s1.rainMm > 0 ? 61 : 0), s1.rainProbability || 0);
      }
    }
  }
};

if (window.TNT) {
  window.TNT.register('weather', window.weatherModule);
}

