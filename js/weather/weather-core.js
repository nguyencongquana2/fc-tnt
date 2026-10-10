/**
 * FC TNT - Weather Core Submodule (js/weather/weather-core.js)
 * Quản lý dữ liệu thời tiết thực tế từ Open-Meteo & API Sân AKKA Chu Văn An
 * Điều phối trạng thái, fallback phía Client, render lưới 7 ngày & Dashboard widget
 */

(function (root) {
  'use strict';

  function showToast(msg, type = 'info') {
    if (root.TNT && root.TNT.ui && typeof root.TNT.ui.showToast === 'function') {
      root.TNT.ui.showToast(msg, type);
    } else if (typeof root.showToast === 'function') {
      root.showToast(msg, type);
    }
  }

  const WeatherCoreMixin = {
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
          console.warn('[Weather] Backend weather API failed, fetching directly from Open-Meteo:', e.message || e);
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

        if (isManualRefresh) {
          showToast('🌤️ Đã cập nhật dự báo thời tiết mới nhất tại Sân AKKA!', 'success');
        }

      } catch (err) {
        console.error('[Weather] Failed to load weather forecast:', err);
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

      if (root.tntEffects && root.tntEffects.applyWeatherParticles) {
        const banner = widgetEl.querySelector('.dash-weather-banner');
        if (banner) {
          root.tntEffects.applyWeatherParticles(banner, s1.weatherCode || (s1.rainMm > 0 ? 61 : 0), s1.rainProbability || 0);
        }
      }
    }
  };

  root.TNTWeatherMixins = root.TNTWeatherMixins || {};
  root.TNTWeatherMixins.core = WeatherCoreMixin;

})(typeof window !== 'undefined' ? window : this);
