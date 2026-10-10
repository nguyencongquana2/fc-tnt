/**
 * FC TNT - Weather Radar Submodule (js/weather/weather-radar.js)
 * Quản lý giao diện chi tiết ngày thi đấu & Radar diễn biến theo giờ (17:00 – 23:00)
 * Đánh giá chuyên sâu 2 khung giờ 20h45 & 22h15, tình trạng thoát nước mặt cỏ & gợi ý giày đinh TF
 */

(function (root) {
  'use strict';

  const WeatherRadarMixin = {
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

      if (root.tntEffects && root.tntEffects.applyWeatherParticles) {
        const focusCard = detailContainer.querySelector('.slot-focus-card');
        if (focusCard) {
          root.tntEffects.applyWeatherParticles(
            focusCard,
            activeSlot.weatherCode || (activeSlot.rainMm > 0 ? 61 : 0),
            activeSlot.rainProbability || 0
          );
        }
      }
    }
  };

  root.TNTWeatherMixins = root.TNTWeatherMixins || {};
  root.TNTWeatherMixins.radar = WeatherRadarMixin;

})(typeof window !== 'undefined' ? window : this);
