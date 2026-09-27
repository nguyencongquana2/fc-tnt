/**
 * Matches Module - Live Pitch Timer, Screen Wake Lock & Roster Attendance
 * Quản lý đồng hồ thi đấu, điểm danh cầu thủ ra sân và giữ sáng màn hình
 */
window.matchesModule = window.matchesModule || {};

Object.assign(window.matchesModule, {
  // =========================================================================
  // ROSTER ATTENDANCE (ĐIỂM DANH CẦU THỦ CÓ MẶT THI ĐẤU)
  // =========================================================================
  initLiveRoster() {
    const allPlayers = window.stateManager.getPlayers();
    if (!Array.isArray(this.livePitchState.registeredPlayerIds) || this.livePitchState.registeredPlayerIds.length === 0) {
      // Mặc định lấy 7 cầu thủ đầu tiên (đá chính)
      this.livePitchState.registeredPlayerIds = allPlayers.slice(0, Math.min(allPlayers.length, 7)).map(p => p.id);
    }
  },

  updateRosterPreview() {
    const countBadge = document.getElementById('live-roster-count-badge');
    const previewEl = document.getElementById('live-roster-names-preview');
    const regIds = this.livePitchState.registeredPlayerIds || [];

    if (countBadge) countBadge.innerText = regIds.length;

    if (previewEl) {
      if (regIds.length === 0) {
        previewEl.innerText = 'Chưa chọn cầu thủ có mặt. Hãy bấm để điểm danh!';
        previewEl.style.color = '#f87171';
      } else {
        const names = regIds.map(id => {
          const p = window.stateManager.getPlayerById(id);
          if (!p) return null;
          return (p.nickname && p.nickname.trim()) ? p.nickname.trim() : p.name;
        }).filter(Boolean);

        previewEl.innerText = names.join(', ');
        previewEl.style.color = '#e2e8f0';
      }
    }
  },

  // Modal Điểm Danh Đội Hình
  openLiveRosterModal() {
    const allPlayers = window.stateManager.getPlayers();
    this.livePitchState.tempRosterSelection = [...(this.livePitchState.registeredPlayerIds || [])];

    // Nếu rỗng, mặc định chọn 7 người đầu
    if (this.livePitchState.tempRosterSelection.length === 0) {
      this.livePitchState.tempRosterSelection = allPlayers.slice(0, 7).map(p => p.id);
    }

    this.renderRosterGrid();
    const modal = document.getElementById('live-roster-modal');
    if (modal) modal.style.display = 'flex';
  },

  closeLiveRosterModal() {
    const modal = document.getElementById('live-roster-modal');
    if (modal) modal.style.display = 'none';
  },

  renderRosterGrid() {
    const grid = document.getElementById('live-roster-player-grid');
    if (!grid) return;

    const allPlayers = window.stateManager.getPlayers();
    const selectedSet = new Set(this.livePitchState.tempRosterSelection);

    grid.innerHTML = allPlayers.map(p => {
      const isSelected = selectedSet.has(p.id);
      const displayName = (p.nickname && p.nickname.trim()) ? p.nickname.trim() : p.name;
      return `
        <div class="live-roster-card ${isSelected ? 'active' : ''}" onclick="window.matchesModule.togglePlayerInRoster('${p.id}')">
          <img class="live-roster-avatar" src="${p.avatar}" alt="${window.escapeHtml(displayName)}">
          <div class="live-roster-card-info">
            <div class="live-roster-card-name">${window.escapeHtml(displayName)}</div>
            <div class="live-roster-card-sub">#${p.number} • ${p.position}</div>
          </div>
          <div class="live-roster-check-icon">✓</div>
        </div>
      `;
    }).join('');

    const countSelected = document.getElementById('live-roster-selected-count');
    const countConfirm = document.getElementById('live-roster-confirm-count');
    if (countSelected) countSelected.innerText = selectedSet.size;
    if (countConfirm) countConfirm.innerText = selectedSet.size;
  },

  togglePlayerInRoster(playerId) {
    const sel = this.livePitchState.tempRosterSelection;
    const idx = sel.indexOf(playerId);
    if (idx >= 0) {
      sel.splice(idx, 1);
    } else {
      sel.push(playerId);
    }
    this.renderRosterGrid();
  },

  selectRosterPreset(type) {
    const allPlayers = window.stateManager.getPlayers();
    if (type === 'all') {
      this.livePitchState.tempRosterSelection = allPlayers.map(p => p.id);
    } else if (type === 'starters') {
      this.livePitchState.tempRosterSelection = allPlayers.slice(0, Math.min(allPlayers.length, 7)).map(p => p.id);
    } else if (type === 'clear') {
      this.livePitchState.tempRosterSelection = [];
    }
    this.renderRosterGrid();
  },

  saveLiveRosterSelection() {
    if (this.livePitchState.tempRosterSelection.length === 0) {
      if (!confirm('Bạn chưa chọn cầu thủ nào đi đá hôm nay. Bạn có chắc muốn tiếp tục không?')) {
        return;
      }
    }

    this.livePitchState.registeredPlayerIds = [...this.livePitchState.tempRosterSelection];
    this.updateRosterPreview();
    this.saveLiveDraft();
    this.closeLiveRosterModal();
    window.showToast(`✅ Đã lưu danh sách ${this.livePitchState.registeredPlayerIds.length} cầu thủ có mặt hôm nay!`);
  },

  // =========================================================================
  // SCREEN WAKE LOCK (GIỮ SÁNG MÀN HÌNH NGOÀI SÂN)
  // =========================================================================
  async toggleScreenWakeLock() {
    if (this.livePitchState.wakeLockSentinel) {
      this.releaseWakeLock();
      window.showToast('Đã tắt chế độ giữ sáng màn hình');
    } else {
      await this.acquireWakeLock();
      if (this.livePitchState.wakeLockSentinel) {
        window.showToast('☀️ Đã bật giữ sáng màn hình ngoài sân bóng!');
      }
    }
  },

  async acquireWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.livePitchState.wakeLockSentinel = await navigator.wakeLock.request('screen');
        this.livePitchState.isScreenWakeOn = true;
        const btn = document.getElementById('live-wakelock-toggle');
        const text = document.getElementById('live-wakelock-text');
        if (btn) btn.classList.add('active');
        if (text) text.innerText = 'Màn hình: LUÔN SÁNG ☀️';

        this.livePitchState.wakeLockSentinel.addEventListener('release', () => {
          this.livePitchState.wakeLockSentinel = null;
          this.livePitchState.isScreenWakeOn = false;
          if (btn) btn.classList.remove('active');
          if (text) text.innerText = 'Giữ sáng: TẮT';
        });
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    }
  },

  releaseWakeLock() {
    if (this.livePitchState.wakeLockSentinel) {
      this.livePitchState.wakeLockSentinel.release();
      this.livePitchState.wakeLockSentinel = null;
    }
    this.livePitchState.isScreenWakeOn = false;
    const btn = document.getElementById('live-wakelock-toggle');
    const text = document.getElementById('live-wakelock-text');
    if (btn) btn.classList.remove('active');
    if (text) text.innerText = 'Giữ sáng: TẮT';
  },

  // =========================================================================
  // MATCH TIMER (ĐỒNG HỒ BẤM GIỜ LIỀN MẠCH SÂN PHỦI)
  // =========================================================================
  toggleLiveTimer() {
    const btn = document.getElementById('live-timer-toggle-btn');
    const periodBadge = document.getElementById('live-timer-period');

    if (this.livePitchState.isTimerRunning) {
      // Pause
      clearInterval(this.livePitchState.timerInterval);
      this.livePitchState.timerInterval = null;
      this.livePitchState.isTimerRunning = false;
      if (btn) {
        btn.innerHTML = '▶️ Tiếp Tục';
        btn.style.background = 'rgba(16, 185, 129, 0.2)';
      }
      if (periodBadge) {
        periodBadge.innerText = '⏸️ TẠM DỪNG';
        periodBadge.style.color = '#fbbf24';
        periodBadge.style.background = 'rgba(245, 158, 11, 0.15)';
      }
    } else {
      // Start
      this.livePitchState.isTimerRunning = true;
      if (btn) {
        btn.innerHTML = '⏸️ Tạm Dừng';
        btn.style.background = 'rgba(239, 68, 68, 0.25)';
      }
      if (periodBadge) {
        periodBadge.innerText = '🟢 ĐANG THI ĐẤU';
        periodBadge.style.color = 'var(--accent-emerald)';
        periodBadge.style.background = 'rgba(16, 185, 129, 0.15)';
      }
      this.livePitchState.timerInterval = setInterval(() => {
        this.livePitchState.timerSeconds++;
        this.updateTimerDisplay();
        if (this.livePitchState.timerSeconds % 10 === 0) {
          this.saveLiveDraft();
        }
      }, 1000);
    }
  },

  finishLiveMatchTime() {
    if (this.livePitchState.isTimerRunning) {
      this.toggleLiveTimer();
    }
    const periodBadge = document.getElementById('live-timer-period');
    if (periodBadge) {
      periodBadge.innerText = '🏁 ĐÃ KẾT THÚC';
      periodBadge.style.color = '#f87171';
      periodBadge.style.background = 'rgba(239, 68, 68, 0.15)';
    }
    const mins = Math.floor(this.livePitchState.timerSeconds / 60);
    this.recordLiveEvent('NOTE', null, null, `🏁 Trọng tài / Hai đội kết thúc trận đấu (Tổng thời gian: ${mins} phút)`);
    this.saveLiveDraft();

    if (confirm(`🏁 Hết giờ thi đấu (${mins} phút)!\n\nBạn có muốn chuyển sang AI Chấm Điểm và lưu trận ngay bây giờ không?`)) {
      this.finishAndGenerateAiRatings();
    } else {
      window.showToast(`🏁 Đã ghi nhận kết thúc (${mins} phút)! Bạn có thể bấm "🤖 AI Chấm Điểm" hoặc "💾 Hoàn Tất & Lưu".`);
    }
  },

  resetLiveTimer() {
    if (confirm('Bạn có chắc muốn đặt lại đồng hồ bấm giờ về 00:00?')) {
      if (this.livePitchState.isTimerRunning) {
        this.toggleLiveTimer();
      }
      this.livePitchState.timerSeconds = 0;
      const periodBadge = document.getElementById('live-timer-period');
      const btn = document.getElementById('live-timer-toggle-btn');
      if (periodBadge) {
        periodBadge.innerText = '⏱️ CHƯA BẮT ĐẦU';
        periodBadge.style.color = 'var(--accent-gold)';
        periodBadge.style.background = 'rgba(245, 158, 11, 0.15)';
      }
      if (btn) {
        btn.innerHTML = '▶️ Bắt Đầu';
        btn.style.background = 'rgba(16, 185, 129, 0.2)';
      }
      this.updateTimerDisplay();
      this.saveLiveDraft();
    }
  },

  updateTimerDisplay() {
    const display = document.getElementById('live-timer-display');
    if (!display) return;
    const mins = Math.floor(this.livePitchState.timerSeconds / 60);
    const secs = this.livePitchState.timerSeconds % 60;
    display.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  getCurrentMatchMinute() {
    if (this.livePitchState.timerSeconds > 0) {
      return Math.floor(this.livePitchState.timerSeconds / 60) + 1;
    }
    return 1;
  },

  // =========================================================================
  // SCORE STEPPER & SYNC
  // =========================================================================
  adjustLiveScore(team, delta) {
    if (team === 'home') {
      this.livePitchState.homeScore = Math.max(0, this.livePitchState.homeScore + delta);
      const el = document.getElementById('live-home-score');
      if (el) el.innerText = this.livePitchState.homeScore;
    } else {
      this.livePitchState.awayScore = Math.max(0, this.livePitchState.awayScore + delta);
      const el = document.getElementById('live-away-score');
      if (el) el.innerText = this.livePitchState.awayScore;
    }
    this.saveLiveDraft();
  }
});
