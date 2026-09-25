/**
 * Matches Module - Live Pitch Companion (Trợ lý sân cỏ trực tiếp, Voice-to-Event & Realtime Sync)
 */
window.matchesModule = window.matchesModule || {};

Object.assign(window.matchesModule, {
  // =========================================================================
  // 🏟️ LIVE PITCH COMPANION (TRỢ LÝ SÂN CỎ TRỰC TIẾP & VOICE-TO-EVENT)
  // =========================================================================
  // LIVE PITCH COMPANION (TRỢ LÝ TRỰC TIẾP NGOÀI SÂN CỎ)
  // =========================================================================
  livePitchState: {
    matchId: null,
    opponent: 'FC Đối Thủ',
    venue: 'Sân bóng Tân Triều',
    homeScore: 0,
    awayScore: 0,
    timerSeconds: 0,
    timerInterval: null,
    isTimerRunning: false,
    period: 1, // 1: H1, 2: H2, 3: Full-time
    events: [],
    registeredPlayerIds: [], // Danh sách ID cầu thủ có mặt đi đá hôm nay
    tempRosterSelection: [], // State tạm khi đang mở modal điểm danh
    currentAction: null,
    pendingGoalPlayerId: null,
    wakeLockSentinel: null,
    isScreenWakeOn: false,
    speechRecognition: null,
    isRecordingVoice: false
  },

  async openLiveCompanionModal() {
    if (!window.stateManager.isAdmin) {
      window.showToast('🔒 Hãy đăng nhập Quản trị viên để ghi nhận trực tiếp trên sân!', 'info');
      return;
    }

    const modal = document.getElementById('live-companion-modal');
    if (!modal) return;

    // Trợ lý Sân Cỏ chỉ dành riêng cho việc ghi nhận trận đấu trực tiếp ngoài sân
    // Tuyệt đối không can thiệp hay liên kết vào bất kỳ trận đấu cũ nào đã kết thúc
    this.livePitchState.matchId = null;
    this.livePitchState.date = new Date().toISOString().split('T')[0];

    // Đọc bản nháp từ Cloud/Local để tiếp tục trận đấu dở dang ngoài sân (nếu có)
    await this.loadLiveDraft();

    // Luôn bảo đảm không gán matchId cũ
    this.livePitchState.matchId = null;

    // Khởi tạo danh sách cầu thủ có mặt nếu chưa có
    this.initLiveRoster();

    // Cập nhật giao diện
    this.updateLiveCompanionUI();

    // Tự động bật giữ sáng màn hình
    this.acquireWakeLock();

    modal.classList.add('active');
  },

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

  updateLiveCompanionUI() {
    const teamInfo = window.stateManager.data.teamInfo;
    const homeNameEl = document.getElementById('live-home-team-name');
    if (homeNameEl) homeNameEl.innerText = teamInfo?.name || 'FC TNT';

    const opponentLabel = document.getElementById('live-match-opponent-label');
    if (opponentLabel) opponentLabel.innerText = 'vs ' + (this.livePitchState.opponent || 'FC Đối Thủ');

    const awayInput = document.getElementById('live-away-team-input');
    if (awayInput) {
      awayInput.value = this.livePitchState.opponent || 'FC Đối Thủ';
      awayInput.onchange = (e) => {
        this.livePitchState.opponent = e.target.value.trim() || 'FC Đối Thủ';
        if (opponentLabel) opponentLabel.innerText = 'vs ' + this.livePitchState.opponent;
        this.saveLiveDraft();
      };
    }

    const homeScoreEl = document.getElementById('live-home-score');
    if (homeScoreEl) homeScoreEl.innerText = this.livePitchState.homeScore;

    const awayScoreEl = document.getElementById('live-away-score');
    if (awayScoreEl) awayScoreEl.innerText = this.livePitchState.awayScore;

    this.updateTimerDisplay();
    this.updateRosterPreview();
    this.renderLiveTimeline();
  },

  handleRemoteLiveMatchSync(draftData) {
    if (!draftData) return;
    const modal = document.getElementById('live-companion-modal');
    const isModalActive = modal && modal.classList.contains('active');

    // Cập nhật state nội bộ
    this.applyLiveDraftData(draftData);

    if (isModalActive) {
      window.showToast('📡 Đã nhận đồng bộ trực tiếp từ thiết bị khác!', 'info');
    }
  },

  handleRemoteLiveMatchClear() {
    localStorage.removeItem('fctnt_live_pitch_draft');
    this.livePitchState.events = [];
    this.livePitchState.registeredPlayerIds = [];
    this.livePitchState.homeScore = 0;
    this.livePitchState.awayScore = 0;
    this.livePitchState.timerSeconds = 0;
    this.livePitchState.period = 1;
    this.initLiveRoster();
    this.updateLiveCompanionUI();
  },

  closeLiveCompanionModal() {
    const modal = document.getElementById('live-companion-modal');
    if (modal) modal.classList.remove('active');
    this.closeLivePlayerPicker();
    this.closeLiveRosterModal();
    this.saveLiveDraft();
  },

  // ==========================================
  // SCREEN WAKE LOCK (GIỮ SÁNG MÀN HÌNH NGOÀI SÂN)
  // ==========================================
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

  // ==========================================
  // MATCH TIMER (ĐỒNG HỒ BẤM GIỜ LIỀN MẠCH SÂN PHỦI)
  // ==========================================
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

  // ==========================================
  // SCORE STEPPER & SYNC
  // ==========================================
  adjustLiveScore(team, delta) {
    if (team === 'home') {
      this.livePitchState.homeScore = Math.max(0, this.livePitchState.homeScore + delta);
      document.getElementById('live-home-score').innerText = this.livePitchState.homeScore;
    } else {
      this.livePitchState.awayScore = Math.max(0, this.livePitchState.awayScore + delta);
      document.getElementById('live-away-score').innerText = this.livePitchState.awayScore;
    }
    this.saveLiveDraft();
  },

  // ==========================================
  // 🎙️ VOICE-TO-EVENT ENGINE (WEB SPEECH API + FALLBACK)
  // ==========================================
  async toggleVoiceRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    const micBtn = document.getElementById('live-voice-mic-btn');
    const statusText = document.getElementById('live-voice-status');
    const transcriptText = document.getElementById('live-voice-transcript');
    const controlsRow = document.getElementById('live-voice-controls-row');
    const inputEdit = document.getElementById('live-voice-input-edit');

    // Nếu đang ghi âm -> Dừng lại và mở ô duyệt
    if (this.livePitchState.isRecordingVoice && this.livePitchState.speechRecognition) {
      try {
        this.livePitchState.speechRecognition.stop();
      } catch (e) { }
      this.livePitchState.isRecordingVoice = false;
      if (micBtn) micBtn.classList.remove('recording');
      if (statusText) statusText.innerText = '🎙️ Đã dừng thu! Bấm "Ghi Nhận"';
      return;
    }

    // Trường hợp trình duyệt không hỗ trợ Web Speech API (Firefox, In-app Browser,...)
    if (!SpeechRecognition) {
      if (controlsRow) controlsRow.style.display = 'flex';
      if (inputEdit) {
        inputEdit.focus();
        inputEdit.placeholder = 'Nhập câu sự kiện (hoặc bấm biểu tượng Mic 🎙️ trên bàn phím điện thoại)...';
      }
      if (statusText) statusText.innerText = '⌨️ Dùng Mic bàn phím';
      if (transcriptText) transcriptText.innerText = 'Trình duyệt chưa hỗ trợ Speech API trực tiếp.';
      window.showToast('Bạn có thể nhập câu lệnh hoặc dùng phím Micro 🎙️ trên bàn phím điện thoại!', 'info');
      return;
    }

    try {
      // Hủy bỏ instance cũ nếu còn tồn tại
      if (this.livePitchState.speechRecognition) {
        try { this.livePitchState.speechRecognition.abort(); } catch (e) { }
        this.livePitchState.speechRecognition = null;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      // Trên Android Chrome, continuous=false ổn định hơn nhiều và không bị ngắt audio stream
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      this.livePitchState.speechRecognition = recognition;
      this.livePitchState.isRecordingVoice = true;

      if (micBtn) micBtn.classList.add('recording');
      if (statusText) statusText.innerText = '🔴 Đang nghe... Hãy nói sự kiện sân cỏ';
      if (transcriptText) {
        transcriptText.style.display = 'block';
        transcriptText.innerText = 'Đang nhận diện...';
      }
      if (inputEdit) inputEdit.value = '';
      if (controlsRow) controlsRow.style.display = 'flex';

      let speechTimeout = null;

      recognition.onstart = () => {
        this.livePitchState.isRecordingVoice = true;
        if (micBtn) micBtn.classList.add('recording');
        if (statusText) statusText.innerText = '🔴 Đang nghe... Hãy nói sự kiện sân cỏ';
        // Tự động dừng sau 12 giây nếu người dùng không bấm nút dừng
        speechTimeout = setTimeout(() => {
          if (this.livePitchState.isRecordingVoice && this.livePitchState.speechRecognition) {
            try { this.livePitchState.speechRecognition.stop(); } catch (e) { }
          }
        }, 12000);
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          if (transcriptText) transcriptText.innerText = `"${currentText}"`;
          if (inputEdit) inputEdit.value = currentText;
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (speechTimeout) clearTimeout(speechTimeout);
        if (micBtn) micBtn.classList.remove('recording');
        this.livePitchState.isRecordingVoice = false;

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          window.showToast('Quyền Micro bị từ chối! Hãy bấm vào biểu tượng 🔒 trên thanh địa chỉ để BẬT Micro.', 'error');
          if (statusText) statusText.innerText = '⚠️ Quyền Micro bị chặn';
        } else if (event.error === 'no-speech') {
          if (statusText) statusText.innerText = 'Chưa nghe thấy, hãy nói lại!';
        } else if (event.error === 'network') {
          window.showToast('Lỗi kết nối mạng dịch vụ giọng nói Google. Bạn có thể gõ nhanh!', 'warning');
          if (statusText) statusText.innerText = 'Lỗi mạng, hãy gõ nhanh';
        } else if (event.error === 'audio-capture') {
          window.showToast('Không tìm thấy thiết bị thu âm Micro hoặc Micro đang bận bởi ứng dụng khác!', 'error');
          if (statusText) statusText.innerText = '⚠️ Micro đang bận';
        } else {
          if (statusText) statusText.innerText = 'Chạm mic để nói sự kiện...';
        }
      };

      recognition.onend = () => {
        if (speechTimeout) clearTimeout(speechTimeout);
        if (micBtn) micBtn.classList.remove('recording');
        this.livePitchState.isRecordingVoice = false;
        const currentVal = inputEdit ? inputEdit.value.trim() : '';
        if (statusText) {
          statusText.innerText = currentVal ? '✅ Bấm "Ghi Nhận" để xác nhận' : 'Chạm mic để nói sự kiện...';
        }
        if (transcriptText && !currentVal) {
          transcriptText.style.display = 'none';
        }
      };

      recognition.start();
    } catch (err) {
      console.error('Speech recognition start failed:', err);
      this.livePitchState.isRecordingVoice = false;
      if (micBtn) micBtn.classList.remove('recording');
      if (controlsRow) controlsRow.style.display = 'flex';
      if (inputEdit) inputEdit.focus();
      window.showToast('Không thể bật ghi âm tự động: ' + (err.message || 'Lỗi khởi động'), 'warning');
    }
  },

  toggleVoiceManualInput() {
    const controlsRow = document.getElementById('live-voice-controls-row');
    const inputEdit = document.getElementById('live-voice-input-edit');
    const statusText = document.getElementById('live-voice-status');

    if (!controlsRow) return;

    if (controlsRow.style.display === 'none' || !controlsRow.style.display) {
      controlsRow.style.display = 'flex';
      if (inputEdit) {
        inputEdit.focus();
        inputEdit.placeholder = 'Nhập câu sự kiện (hoặc dùng mic bàn phím)...';
      }
      if (statusText) statusText.innerText = '⌨️ Đang gõ...';
    } else {
      controlsRow.style.display = 'none';
      if (statusText) statusText.innerText = 'Chạm mic để nói sự kiện...';
    }
  },

  cancelVoiceRecording() {
    if (this.livePitchState.speechRecognition && this.livePitchState.isRecordingVoice) {
      this.livePitchState.speechRecognition.stop();
    }
    this.livePitchState.isRecordingVoice = false;

    const micBtn = document.getElementById('live-voice-mic-btn');
    const statusText = document.getElementById('live-voice-status');
    const transcriptText = document.getElementById('live-voice-transcript');
    const controlsRow = document.getElementById('live-voice-controls-row');
    const inputEdit = document.getElementById('live-voice-input-edit');

    if (micBtn) micBtn.classList.remove('recording');
    if (statusText) statusText.innerText = 'Chạm mic để nói sự kiện...';
    if (transcriptText) {
      transcriptText.innerText = '';
      transcriptText.style.display = 'none';
    }
    if (inputEdit) inputEdit.value = '';
    if (controlsRow) controlsRow.style.display = 'none';

    window.showToast('Đã hủy bỏ câu nói');
  },

  submitVoiceRecording() {
    if (this.livePitchState.speechRecognition && this.livePitchState.isRecordingVoice) {
      this.livePitchState.speechRecognition.stop();
    }
    this.livePitchState.isRecordingVoice = false;

    const micBtn = document.getElementById('live-voice-mic-btn');
    const statusText = document.getElementById('live-voice-status');
    const transcriptText = document.getElementById('live-voice-transcript');
    const controlsRow = document.getElementById('live-voice-controls-row');
    const inputEdit = document.getElementById('live-voice-input-edit');

    const textToSubmit = inputEdit ? inputEdit.value.trim() : '';

    if (!textToSubmit || textToSubmit === 'Đang nghe bạn nói...') {
      window.showToast('Chưa có nội dung sự kiện để ghi nhận!', 'info');
      return;
    }

    this.parseVoiceTranscript(textToSubmit);

    if (micBtn) micBtn.classList.remove('recording');
    if (statusText) statusText.innerText = '🎙️ Chạm Mic & Nói Tự Nhiên (Tiếng Việt)';
    if (transcriptText) transcriptText.innerText = `Đã ghi nhận: "${textToSubmit}"`;
    if (inputEdit) inputEdit.value = '';
    if (controlsRow) controlsRow.style.display = 'none';
  },

  getPlayerShortName(p) {
    if (!p) return '';
    if (p.nickname && p.nickname.trim()) return p.nickname.trim();
    return p.name || '';
  },

  getPlayerAliases(p) {
    if (typeof window.getPlayerAliases === 'function') {
      return window.getPlayerAliases(p);
    }
    const rawName = (p.name || '').toLowerCase().trim();
    const rawNick = (p.nickname || '').toLowerCase().trim();
    return [rawName, rawNick, `#${p.number}`].filter(Boolean);
  },

  parseVoiceTranscript(text) {
    const raw = text.toLowerCase().trim();
    if (!raw) return;

    const allPlayers = window.stateManager.getPlayers();
    const minute = this.getCurrentMatchMinute();

    // 1. Quét tìm tất cả các đề cập cầu thủ trong câu nói theo vị trí
    const mentions = [];
    allPlayers.forEach(p => {
      const aliases = this.getPlayerAliases(p);
      aliases.forEach(alias => {
        let startIndex = 0;
        while ((startIndex = raw.indexOf(alias, startIndex)) !== -1) {
          const prevChar = startIndex > 0 ? raw[startIndex - 1] : ' ';
          const nextChar = startIndex + alias.length < raw.length ? raw[startIndex + alias.length] : ' ';
          const isWordBoundary = /[\s,.;!?:()\n\r\t\[\]'"]/.test(prevChar) && /[\s,.;!?:()\n\r\t\[\]'"]/.test(nextChar);

          if (isWordBoundary || startIndex === 0 || startIndex + alias.length === raw.length) {
            mentions.push({
              player: p,
              alias,
              startIndex,
              endIndex: startIndex + alias.length
            });
          }
          startIndex += alias.length;
        }
      });
    });

    // Sắp xếp theo vị trí xuất hiện trong câu; nếu cùng vị trí thì ưu tiên alias dài hơn
    mentions.sort((a, b) => a.startIndex - b.startIndex || b.alias.length - a.alias.length);

    // Lọc trùng lặp
    const cleanMentions = [];
    mentions.forEach(m => {
      if (!cleanMentions.some(existing =>
        (m.startIndex >= existing.startIndex && m.startIndex < existing.endIndex) ||
        (m.player.id === existing.player.id && Math.abs(m.startIndex - existing.startIndex) < 6)
      )) {
        cleanMentions.push(m);
      }
    });

    // 2. Phân tích ngữ nghĩa bóng đá thông minh (Grammar & Intent Parsing)
    let handled = false;

    // A. Mẫu: [A] kiến tạo / chuyền / tạt / dọn cỗ cho [B] ghi bàn / sút vào / lập công
    if (!handled && cleanMentions.length >= 2) {
      const p1 = cleanMentions[0];
      const p2 = cleanMentions[1];
      const betweenText = raw.substring(p1.endIndex, p2.startIndex);
      const afterText = raw.substring(p2.endIndex);

      const isP1AssistP2 = /kiến\s*tạo|chuyền|tạt|dọn\s*cỗ|đưa\s*bóng|nhả\s*bóng/i.test(betweenText) &&
        /cho|để|tới/i.test(betweenText);
      const isP2Score = /ghi\s*bàn|sút\s*vào|lập\s*công|đánh\s*đầu|đệm\s*bóng|vào\s*rồi|lưới/i.test(afterText) ||
        /ghi\s*bàn|sút\s*vào|lập\s*công/i.test(raw);

      if (isP1AssistP2 && isP2Score) {
        const assistPlayer = p1.player;
        const scorerPlayer = p2.player;
        const scorerName = this.getPlayerShortName(scorerPlayer);
        const assistName = this.getPlayerShortName(assistPlayer);

        this.recordLiveEvent('GOAL', scorerPlayer.id, assistPlayer.id, `${assistName} kiến tạo cho ${scorerName} ghi bàn`);
        this.adjustLiveScore('home', 1);
        window.showToast(`⚽ +1 Bàn thắng cho ${scorerName} (Kiến tạo: ${assistName})!`);
        handled = true;
      }
    }

    // B. Mẫu: [B] ghi bàn từ đường chuyền / kiến tạo của [A] hoặc [B] ghi bàn, [A] kiến tạo
    if (!handled && cleanMentions.length >= 2) {
      const p1 = cleanMentions[0];
      const p2 = cleanMentions[1];
      const betweenText = raw.substring(p1.endIndex, p2.startIndex);
      const afterText = raw.substring(p2.endIndex);

      const isP1Scorer = /ghi\s*bàn|sút\s*vào|lập\s*công|đánh\s*đầu/i.test(betweenText);
      const isP2Assist = /kiến\s*tạo|chuyền|dọn\s*cỗ|tạt/i.test(betweenText) || /kiến\s*tạo|chuyền|dọn\s*cỗ/i.test(afterText);

      if (isP1Scorer && isP2Assist) {
        const scorerPlayer = p1.player;
        const assistPlayer = p2.player;
        const scorerName = this.getPlayerShortName(scorerPlayer);
        const assistName = this.getPlayerShortName(assistPlayer);

        this.recordLiveEvent('GOAL', scorerPlayer.id, assistPlayer.id, `${scorerName} ghi bàn (Kiến tạo: ${assistName})`);
        this.adjustLiveScore('home', 1);
        window.showToast(`⚽ +1 Bàn thắng cho ${scorerName} (Kiến tạo: ${assistName})!`);
        handled = true;
      }
    }

    // C. Siêu phẩm / Solo qua người
    if (!handled && (raw.includes('siêu phẩm') || raw.includes('solo') || raw.includes('qua 3 người') || raw.includes('góc chữ a') || raw.includes('móc bóng') || raw.includes('xe đạp chổng ngược') || raw.includes('sút xa đỉnh'))) {
      const primary = cleanMentions[0]?.player;
      const secondary = cleanMentions[1]?.player;
      if (primary) {
        const pName = this.getPlayerShortName(primary);
        const assistName = secondary ? this.getPlayerShortName(secondary) : null;
        this.recordLiveEvent('WONDERGOAL', primary.id, secondary ? secondary.id : null, `${pName} lập siêu phẩm: "${text}"`);
        this.adjustLiveScore('home', 1);
        window.showToast(`🌟 Siêu phẩm cho ${pName}! Quá đỉnh!`);
      } else {
        this.recordLiveEvent('WONDERGOAL', null, null, `🌟 ${minute}': Siêu phẩm - "${text}"`);
        this.adjustLiveScore('home', 1);
        window.showToast(`🌟 Siêu phẩm từ giọng nói!`);
      }
      handled = true;
    }

    // D. Bàn thắng đơn lẻ
    if (!handled && (raw.includes('ghi bàn') || raw.includes('sút vào') || raw.includes('bàn thắng') || raw.includes('lập công') || raw.includes('vào rồi'))) {
      const primary = cleanMentions[0]?.player;
      const secondary = cleanMentions[1]?.player;
      if (primary) {
        const pName = this.getPlayerShortName(primary);
        const assistName = secondary ? this.getPlayerShortName(secondary) : null;
        this.recordLiveEvent('GOAL', primary.id, secondary ? secondary.id : null, `🎙️ Giọng nói: "${text}"`);
        this.adjustLiveScore('home', 1);
        window.showToast(`⚽ +1 Bàn thắng cho ${pName}${assistName ? ` (Kiến tạo: ${assistName})` : ''}!`);
      } else {
        this.recordLiveEvent('NOTE', null, null, `⚽ ${minute}': Bàn thắng - "${text}"`);
        this.adjustLiveScore('home', 1);
        window.showToast(`⚽ +1 Bàn thắng từ giọng nói!`);
      }
      handled = true;
    }

    // E. Kiến tạo đơn lẻ
    if (!handled && (raw.includes('kiến tạo') || raw.includes('dọn cỗ') || raw.includes('chuyền đẹp') || raw.includes('tạt bóng chuẩn'))) {
      const primary = cleanMentions[0]?.player;
      if (primary) {
        const pName = this.getPlayerShortName(primary);
        this.recordLiveEvent('ASSIST', primary.id, null, `${pName} có đường kiến tạo đẹp`);
        window.showToast(`👟 +1 Kiến tạo cho ${pName}!`);
        handled = true;
      }
    }

    // F. Cứu thua / Cản phá
    if (!handled && (raw.includes('cứu thua') || raw.includes('cản phá') || raw.includes('bắt dính') || raw.includes('xuất thần') || raw.includes('đẩy bóng'))) {
      const p = cleanMentions[0]?.player || allPlayers.find(pl => pl.position === 'GK') || allPlayers[0];
      const pName = this.getPlayerShortName(p);
      this.recordLiveEvent('SAVE', p ? p.id : null, null, `${pName} cản phá cứu thua xuất thần`);
      window.showToast(`🧤 Cứu thua xuất thần: ${pName}!`);
      handled = true;
    }

    // G. Xà ngang / Cột dọc
    if (!handled && (raw.includes('xà ngang') || raw.includes('cột dọc') || raw.includes('trúng xà') || raw.includes('trúng cột') || raw.includes('khung gỗ'))) {
      const primary = cleanMentions[0]?.player;
      const pName = primary ? this.getPlayerShortName(primary) : 'Cầu thủ';
      this.recordLiveEvent('WOODWORK', primary ? primary.id : null, null, `${pName} dứt điểm trúng khung gỗ`);
      window.showToast(`🪵 Sút trúng xà/cột: ${pName}!`);
      handled = true;
    }

    // H. Bỏ lỡ cơ hội
    if (!handled && (raw.includes('bỏ lỡ') || raw.includes('đệm ra ngoài') || raw.includes('lên trời') || raw.includes('bắn chim') || raw.includes('gỗ'))) {
      const primary = cleanMentions[0]?.player;
      const pName = primary ? this.getPlayerShortName(primary) : 'Cầu thủ';
      this.recordLiveEvent('MISS', primary ? primary.id : null, null, `${pName} bỏ lỡ cơ hội ngon ăn`);
      window.showToast(`💨 Bỏ lỡ đáng tiếc: ${pName}!`);
      handled = true;
    }

    // I. Tấu hài
    if (!handled && (raw.includes('tấu hài') || raw.includes('hài hước') || raw.includes('vấp cỏ') || raw.includes('trượt chân') || raw.includes('ngã'))) {
      const primary = cleanMentions[0]?.player;
      const pName = primary ? this.getPlayerShortName(primary) : 'Cầu thủ';
      this.recordLiveEvent('FUNNY', primary ? primary.id : null, null, `${pName} tạo khoảnh khắc tấu hài`);
      window.showToast(`😂 Pha tấu hài: ${pName}!`);
      handled = true;
    }

    // J. Phòng ngự / Bọc lót
    if (!handled && (raw.includes('phòng ngự') || raw.includes('bọc lót') || raw.includes('cắt bóng') || raw.includes('thủ hay') || raw.includes('xoạc bóng'))) {
      const primary = cleanMentions[0]?.player;
      const pName = primary ? this.getPlayerShortName(primary) : 'Cầu thủ';
      this.recordLiveEvent('DEFENSE', primary ? primary.id : null, null, `${pName} phòng ngự chắc chắn`);
      window.showToast(`🧱 Phòng ngự hay: ${pName}!`);
      handled = true;
    }

    // K. Mặc định: Ghi chú diễn biến
    if (!handled) {
      const primary = cleanMentions[0]?.player;
      this.recordLiveEvent('NOTE', primary ? primary.id : null, null, `🎙️ "${text}"`);
      window.showToast(`📝 Đã ghi nhận diễn biến: "${text}"`);
    }
  },

  // ==========================================
  // QUICK TOUCH ACTION MATRIX & PLAYER PICKER
  // ==========================================
  openLivePlayerPicker(actionType) {
    this.livePitchState.currentAction = actionType;
    this.livePitchState.pendingGoalPlayerId = null;

    const overlay = document.getElementById('live-player-picker-overlay');
    const tagEl = document.getElementById('live-picker-action-tag');
    const titleEl = document.getElementById('live-picker-title');
    const assistBox = document.getElementById('live-assist-prompt-box');
    const grid = document.getElementById('live-picker-player-grid');

    if (assistBox) assistBox.style.display = 'none';

    const actionConfig = {
      GOAL: { tag: '⚽ BÀN THẮNG (+1)', title: 'Ai là người ghi bàn?', color: '#ef4444' },
      OWN_GOAL: { tag: '🤦‍♂️ PHẢN LƯỚI NHÀ (OG)', title: 'Ai vô tình phản lưới nhà (+1 cho đội bạn)?', color: '#f87171' },
      ASSIST: { tag: '👟 KIẾN TẠO (+1)', title: 'Ai là người kiến tạo?', color: '#06b6d4' },
      SAVE: { tag: '🧤 CỨU THUA XUẤT THẦN', title: 'Ai là người cản phá cứu thua?', color: '#f59e0b' },
      GK_BLUNDER: { tag: '🧤❌ SAI LẦM THỦ MÔN', title: 'Thủ môn nào mắc sai lầm bắt bóng lỗi?', color: '#fb7185' },
      WONDERGOAL: { tag: '🌟 SIÊU PHẨM / SOLO', title: 'Ai vừa lập siêu phẩm / solo qua người?', color: '#fbbf24' },
      LONG_SHOT: { tag: '🚀 NÃ ĐẠI BÁC / SÚT XA', title: 'Ai vừa tung cú sút xa / nã đại bác uy lực?', color: '#f97316' },
      WOODWORK: { tag: '🪵 SÚT XÀ / CỘT DỌC', title: 'Ai sút bóng trúng khung gỗ?', color: '#d97706' },
      MISS: { tag: '💨 BỎ LỠ ĐÁNG TIẾC', title: 'Ai vừa bỏ lỡ cơ hội ngon ăn?', color: '#94a3b8' },
      KEYPASS: { tag: '🎯 CHỌC KHE XÉ GIÓ', title: 'Ai vừa tung đường chuyền chọc khe xé gió?', color: '#38bdf8' },
      PRESSING_ESCAPE: { tag: '🌪️ THOÁT PRESSING', title: 'Ai vừa xoay sở thoát pressing đẳng cấp?', color: '#a78bfa' },
      INTERCEPT: { tag: '🧲 ĐÁNH CHẶN TRỤC GIỮA', title: 'Ai vừa phán đoán cắt bóng / đánh chặn trục giữa?', color: '#2dd4bf' },
      DEFENSE: { tag: '🧱 BỌC LÓT / CẮT BÓNG HAY', title: 'Ai vừa phòng ngự / bọc lót hay?', color: '#10b981' },
      TACKLE: { tag: '💥 TRANH CHẤP LỬA / XOẠC', title: 'Ai vừa lăn xả tranh chấp / xoạc bóng đoạt lại bóng?', color: '#eab308' },
      TACTICAL_FOUL: { tag: '🛑 PHẠM LỖI CHIẾN THUẬT', title: 'Ai vừa phạm lỗi chiến thuật bẻ gãy phản công?', color: '#fb923c' },
      WON_FOUL: { tag: '🤕 KIẾM ĐÁ PHẠT / PEN', title: 'Ai vừa bị phạm lỗi mang về quả phạt nguy hiểm?', color: '#34d399' },
      TURNOVER: { tag: '⚠️ MẤT BÓNG NGUY HIỂM', title: 'Ai vừa để mất bóng nguy hiểm sân nhà?', color: '#f43f5e' },
      FUNNY: { tag: '😂 PHA TẤU HÀI SÂN CỎ', title: 'Ai vừa tạo khoảnh khắc tấu hài mang lại tiếng cười?', color: '#c084fc' }
    };

    const cfg = actionConfig[actionType] || { tag: '⚡ SỰ KIỆN', title: 'Chọn cầu thủ liên quan:', color: '#fff' };
    if (tagEl) {
      tagEl.innerText = cfg.tag;
      tagEl.style.color = cfg.color;
    }
    if (titleEl) titleEl.innerText = cfg.title;

    const allPlayers = window.stateManager.getPlayers();
    let eligiblePlayers = allPlayers.filter(p => (this.livePitchState.registeredPlayerIds || []).includes(p.id));
    if (eligiblePlayers.length === 0) eligiblePlayers = allPlayers;

    if (grid) {
      grid.innerHTML = eligiblePlayers.map(p => {
        const displayName = this.getPlayerShortName(p);
        return `
          <div class="live-picker-card" onclick="window.matchesModule.selectPlayerForLiveAction('${p.id}')">
            <img class="live-picker-avatar" src="${p.avatar}" alt="${window.escapeHtml(displayName)}">
            <div style="overflow: hidden;">
              <div class="live-picker-name">${window.escapeHtml(displayName)}</div>
              <div class="live-picker-sub">#${p.number} • ${p.position}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    if (overlay) overlay.style.display = 'flex';
  },

  closeLivePlayerPicker() {
    const overlay = document.getElementById('live-player-picker-overlay');
    if (overlay) overlay.style.display = 'none';
    this.livePitchState.currentAction = null;
    this.livePitchState.pendingGoalPlayerId = null;
  },

  selectPlayerForLiveAction(playerId) {
    const p = window.stateManager.getPlayerById(playerId);
    if (!p) return;
    const pShort = this.getPlayerShortName(p);

    if (this.livePitchState.currentAction === 'GOAL') {
      if (!this.livePitchState.pendingGoalPlayerId) {
        // Bước 1: Đã chọn người ghi bàn -> chuyển sang chọn người kiến tạo
        this.livePitchState.pendingGoalPlayerId = playerId;
        const tagEl = document.getElementById('live-picker-action-tag');
        const titleEl = document.getElementById('live-picker-title');
        const assistBox = document.getElementById('live-assist-prompt-box');

        if (tagEl) {
          tagEl.innerText = `⚽ BÀN THẮNG: ${pShort}`;
          tagEl.style.color = '#ef4444';
        }
        if (titleEl) titleEl.innerText = '👟 Ai là người kiến tạo đường chuyền?';
        if (assistBox) assistBox.style.display = 'block';

        // Lọc bớt người ghi bàn ra khỏi danh sách kiến tạo (ưu tiên người trong danh sách có mặt)
        const allPlayers = window.stateManager.getPlayers();
        let eligiblePlayers = allPlayers.filter(pl => (this.livePitchState.registeredPlayerIds || []).includes(pl.id));
        if (eligiblePlayers.length === 0) eligiblePlayers = allPlayers;

        const grid = document.getElementById('live-picker-player-grid');
        if (grid) {
          grid.innerHTML = eligiblePlayers.filter(pl => pl.id !== playerId).map(pl => {
            const displayName = this.getPlayerShortName(pl);
            return `
              <div class="live-picker-card" onclick="window.matchesModule.selectPlayerForLiveAction('${pl.id}')">
                <img class="live-picker-avatar" src="${pl.avatar}" alt="${window.escapeHtml(displayName)}">
                <div style="overflow: hidden;">
                  <div class="live-picker-name">${window.escapeHtml(displayName)}</div>
                  <div class="live-picker-sub">#${pl.number} • ${pl.position}</div>
                </div>
              </div>
            `;
          }).join('');
        }
        return;
      } else {
        // Bước 2: Đã chọn người kiến tạo
        const scorer = window.stateManager.getPlayerById(this.livePitchState.pendingGoalPlayerId);
        const scorerShort = this.getPlayerShortName(scorer);
        this.recordLiveEvent('GOAL', scorer.id, p.id, `${scorerShort} ghi bàn (Kiến tạo: ${pShort})`);
        this.adjustLiveScore('home', 1);
        window.showToast(`⚽ +1 Bàn thắng cho ${scorerShort} (Kiến tạo: ${pShort})!`);
        this.closeLivePlayerPicker();
        return;
      }
    }

    // Các sự kiện khác
    const action = this.livePitchState.currentAction;
    if (action === 'WONDERGOAL') {
      this.recordLiveEvent('WONDERGOAL', p.id, null, `${pShort} lập siêu phẩm solo / sút xa đẹp mắt`);
      this.adjustLiveScore('home', 1);
      window.showToast(`🌟 +1 Siêu phẩm cho ${pShort}! Quá đẳng cấp!`);
    } else if (action === 'OWN_GOAL') {
      this.recordLiveEvent('OWN_GOAL', p.id, null, `${pShort} vô tình phản lưới nhà (OG)`);
      this.adjustLiveScore('away', 1);
      window.showToast(`🤦‍♂️ Bàn phản lưới nhà của ${pShort}! (+1 bàn cho đối thủ)`, 'warning');
    } else if (action === 'ASSIST') {
      this.recordLiveEvent('ASSIST', p.id, null, `${pShort} có đường chuyền dọn cỗ`);
      window.showToast(`👟 +1 Kiến tạo cho ${pShort}!`);
    } else if (action === 'SAVE') {
      this.recordLiveEvent('SAVE', p.id, null, `${pShort} cản phá xuất thần cứu thua mười mươi`);
      window.showToast(`🧤 Cứu thua xuất thần: ${pShort}!`);
    } else if (action === 'GK_BLUNDER') {
      this.recordLiveEvent('GK_BLUNDER', p.id, null, `Thủ môn ${pShort} mắc sai lầm bắt bóng lỗi`);
      window.showToast(`🧤❌ Sai lầm thủ môn: ${pShort}!`, 'warning');
    } else if (action === 'LONG_SHOT') {
      this.recordLiveEvent('LONG_SHOT', p.id, null, `${pShort} nã đại bác sút xa uy lực`);
      window.showToast(`🚀 Nã đại bác sút xa: ${pShort}!`);
    } else if (action === 'WOODWORK') {
      this.recordLiveEvent('WOODWORK', p.id, null, `${pShort} dứt điểm dội xà ngang / cột dọc`);
      window.showToast(`🪵 Sút trúng xà/cột: ${pShort}!`);
    } else if (action === 'MISS') {
      this.recordLiveEvent('MISS', p.id, null, `${pShort} bỏ lỡ cơ hội đáng tiếc trước gôn`);
      window.showToast(`💨 Bỏ lỡ đáng tiếc: ${pShort}!`);
    } else if (action === 'KEYPASS') {
      this.recordLiveEvent('KEYPASS', p.id, null, `${pShort} có đường chọc khe vượt tuyến sắc lẹm`);
      window.showToast(`🎯 Chọc khe xé gió: ${pShort}!`);
    } else if (action === 'PRESSING_ESCAPE') {
      this.recordLiveEvent('PRESSING_ESCAPE', p.id, null, `${pShort} xoay sở thoát pressing đẳng cấp`);
      window.showToast(`🌪️ Thoát pressing: ${pShort}!`);
    } else if (action === 'INTERCEPT') {
      this.recordLiveEvent('INTERCEPT', p.id, null, `${pShort} phán đoán đánh chặn trục giữa chuẩn xác`);
      window.showToast(`🧲 Đánh chặn trục giữa: ${pShort}!`);
    } else if (action === 'DEFENSE') {
      this.recordLiveEvent('DEFENSE', p.id, null, `${pShort} bọc lót và cắt bóng chuẩn xác`);
      window.showToast(`🧱 Phòng ngự chắc chắn: ${pShort}!`);
    } else if (action === 'TACKLE') {
      this.recordLiveEvent('TACKLE', p.id, null, `${pShort} tranh chấp lăn xả quyết liệt đoạt lại bóng`);
      window.showToast(`💥 Tranh chấp lửa: ${pShort}!`);
    } else if (action === 'TACTICAL_FOUL') {
      this.recordLiveEvent('TACTICAL_FOUL', p.id, null, `${pShort} phạm lỗi chiến thuật bẻ gãy đợt phản công`);
      window.showToast(`🛑 Phạm lỗi chiến thuật: ${pShort}!`);
    } else if (action === 'WON_FOUL') {
      this.recordLiveEvent('WON_FOUL', p.id, null, `${pShort} bị phạm lỗi mang về quả đá phạt nguy hiểm`);
      window.showToast(`🤕 Kiếm đá phạt: ${pShort}!`);
    } else if (action === 'TURNOVER') {
      this.recordLiveEvent('TURNOVER', p.id, null, `${pShort} để mất bóng nguy hiểm`);
      window.showToast(`⚠️ Mất bóng nguy hiểm: ${pShort}!`, 'warning');
    } else if (action === 'FUNNY') {
      this.recordLiveEvent('FUNNY', p.id, null, `${pShort} có pha xử lý tấu hài mang lại tiếng cười`);
      window.showToast(`😂 Pha tấu hài: ${pShort}!`);
    }

    this.closeLivePlayerPicker();
  },

  skipAssistSelection() {
    if (this.livePitchState.pendingGoalPlayerId) {
      const scorer = window.stateManager.getPlayerById(this.livePitchState.pendingGoalPlayerId);
      if (scorer) {
        const scorerShort = this.getPlayerShortName(scorer);
        this.recordLiveEvent('GOAL', scorer.id, null, `${scorerShort} solo lập công (Không có kiến tạo)`);
        this.adjustLiveScore('home', 1);
        window.showToast(`⚽ +1 Bàn thắng solo cho ${scorerShort}!`);
      }
    }
    this.closeLivePlayerPicker();
  },

  recordLiveEvent(type, playerId, assistId = null, extraNote = '') {
    const minute = this.getCurrentMatchMinute();
    const p = playerId ? window.stateManager.getPlayerById(playerId) : null;
    const assistP = assistId ? window.stateManager.getPlayerById(assistId) : null;

    const typeConfig = {
      GOAL: { label: '⚽ Bàn Thắng', badgeColor: '#ef4444' },
      OWN_GOAL: { label: '🤦‍♂️ Phản Lưới', badgeColor: '#f87171' },
      ASSIST: { label: '👟 Kiến Tạo', badgeColor: '#06b6d4' },
      SAVE: { label: '🧤 Cứu Thua', badgeColor: '#f59e0b' },
      GK_BLUNDER: { label: '🧤❌ Lỗi Thủ Môn', badgeColor: '#fb7185' },
      WONDERGOAL: { label: '🌟 Siêu Phẩm', badgeColor: '#fbbf24' },
      LONG_SHOT: { label: '🚀 Sút Xa', badgeColor: '#f97316' },
      WOODWORK: { label: '🪵 Xà/Cột', badgeColor: '#d97706' },
      MISS: { label: '💨 Bỏ Lỡ', badgeColor: '#94a3b8' },
      KEYPASS: { label: '🎯 Chọc Khe', badgeColor: '#38bdf8' },
      PRESSING_ESCAPE: { label: '🌪️ Thoát Press', badgeColor: '#a78bfa' },
      INTERCEPT: { label: '🧲 Đánh Chặn', badgeColor: '#2dd4bf' },
      DEFENSE: { label: '🧱 Bọc Lót', badgeColor: '#10b981' },
      TACKLE: { label: '💥 Tranh Chấp', badgeColor: '#eab308' },
      TACTICAL_FOUL: { label: '🛑 Phạm Lỗi', badgeColor: '#fb923c' },
      WON_FOUL: { label: '🤕 Kiếm Phạt', badgeColor: '#34d399' },
      TURNOVER: { label: '⚠️ Mất Bóng', badgeColor: '#f43f5e' },
      FUNNY: { label: '😂 Tấu Hài', badgeColor: '#c084fc' },
      NOTE: { label: '📝 Ghi Chú', badgeColor: '#64748b' }
    };

    const cfg = typeConfig[type] || { label: '⚡ Sự kiện', badgeColor: '#fff' };

    const newEvent = {
      id: 'evt_' + Date.now() + Math.random(),
      minute,
      type,
      typeLabel: cfg.label,
      badgeColor: cfg.badgeColor,
      playerId: p ? p.id : null,
      playerName: p ? this.getPlayerShortName(p) : null,
      playerAvatar: p ? p.avatar : null,
      assistPlayerId: assistP ? assistP.id : null,
      assistPlayerName: assistP ? this.getPlayerShortName(assistP) : null,
      note: extraNote,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    this.livePitchState.events.unshift(newEvent);
    this.renderLiveTimeline();
    this.saveLiveDraft();
  },

  renderLiveTimeline() {
    const list = document.getElementById('live-timeline-events-list');
    const countEl = document.getElementById('live-event-count');
    if (countEl) countEl.innerText = this.livePitchState.events.length;
    if (!list) return;

    if (this.livePitchState.events.length === 0) {
      list.innerHTML = `
        <div class="live-empty-timeline" id="live-empty-timeline">
          ⏳ Chưa có sự kiện nào. Hãy bấm nút sự kiện bên trên hoặc giữ Mic để nói!
        </div>
      `;
      return;
    }

    list.innerHTML = this.livePitchState.events.map((evt, idx) => `
      <div class="live-event-card">
        <span class="live-event-minute">${evt.minute}'</span>
        <div class="live-event-body">
          <span class="live-event-badge" style="background: ${evt.badgeColor}22; color: ${evt.badgeColor}; border: 1px solid ${evt.badgeColor}44;">
            ${evt.typeLabel}
          </span>
          ${evt.playerAvatar ? `<img src="${evt.playerAvatar}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover;">` : ''}
          <span style="font-weight: 700; color: #fff;">${window.escapeHtml(evt.playerName || '')}</span>
          ${evt.assistPlayerName ? `<span style="font-size: 0.76rem; color: var(--accent-cyan);">(👟 ${window.escapeHtml(evt.assistPlayerName)})</span>` : ''}
          ${evt.note && evt.note !== `${evt.playerName} ghi bàn` ? `<span style="font-size: 0.78rem; color: #94a3b8; font-style: italic;">• ${window.escapeHtml(evt.note)}</span>` : ''}
        </div>
        <button type="button" class="live-event-del-btn" onclick="window.matchesModule.deleteLiveEvent(${idx})" title="Xóa sự kiện">&times;</button>
      </div>
    `).join('');
  },

  deleteLiveEvent(index) {
    const evt = this.livePitchState.events[index];
    if (!evt) return;

    if (evt.type === 'GOAL' || evt.type === 'WONDERGOAL') {
      if (confirm(`Sự kiện này là bàn thắng của ${evt.playerName || 'cầu thủ'}. Bạn có muốn giảm 1 bàn của đội nhà trên bảng tỉ số không?`)) {
        this.adjustLiveScore('home', -1);
      }
    }

    this.livePitchState.events.splice(index, 1);
    this.renderLiveTimeline();
    this.saveLiveDraft();
  },

  addCustomNotePrompt() {
    const note = prompt('Nhập diễn biến / ghi chú trực tiếp trên sân:', '');
    if (note && note.trim()) {
      this.recordLiveEvent('NOTE', null, null, note.trim());
      window.showToast('Đã lưu ghi chú diễn biến!');
    }
  },

  // ==========================================
  // EXPORT & AI RATING INTEGRATION
  // ==========================================
  copyLiveSummaryToZalo() {
    const teamInfo = window.stateManager.data.teamInfo;
    const teamName = teamInfo?.name || 'FC TNT';
    const opponent = this.livePitchState.opponent;
    const homeScore = this.livePitchState.homeScore;
    const awayScore = this.livePitchState.awayScore;
    const dateStr = new Date().toLocaleDateString('vi-VN');

    // Gom bàn thắng & siêu phẩm
    const goals = this.livePitchState.events.filter(e => e.type === 'GOAL' || e.type === 'WONDERGOAL');
    const assists = this.livePitchState.events.filter(e => e.type === 'ASSIST' || e.assistPlayerName);
    const saves = this.livePitchState.events.filter(e => e.type === 'SAVE');
    const funny = this.livePitchState.events.filter(e => e.type === 'FUNNY');

    let text = `🔥 [KẾT QUẢ TRẬN ĐẤU ${teamName.toUpperCase()}] 🔥\n`;
    text += `⚽ ${teamName} ${homeScore} - ${awayScore} ${opponent}\n`;
    text += `📅 Ngày: ${dateStr} • 📍 Sân: ${this.livePitchState.venue}\n\n`;

    if (goals.length > 0) {
      text += `⚽ Bàn thắng & Highlight:\n`;
      goals.forEach(g => {
        text += `• ${g.minute}' - ${g.type === 'WONDERGOAL' ? '🌟 ' : ''}${g.playerName}${g.assistPlayerName ? ` (Kiến tạo: ${g.assistPlayerName})` : ''}\n`;
      });
      text += `\n`;
    }

    if (saves.length > 0) {
      text += `🧤 Cứu thua xuất thần: ${saves.map(s => s.playerName).filter(Boolean).join(', ')}\n`;
    }

    if (funny.length > 0) {
      text += `😂 Khoảnh khắc tấu hài: ${funny.map(f => `${f.playerName} (${f.note || ''})`).join('; ')}\n`;
    }

    text += `\n👉 Xem sơ đồ sân & chi tiết điểm số: ${window.location.origin}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        window.showToast('📋 Đã copy tóm tắt trận đấu! Dán ngay vào nhóm Zalo nhé.');
      }).catch(() => {
        prompt('Copy nội dung gửi Zalo:', text);
      });
    } else {
      prompt('Copy nội dung gửi Zalo:', text);
    }
  },

  finishAndGenerateAiRatings() {
    if (this.livePitchState.events.length === 0) {
      if (!confirm('Chưa có sự kiện nào được ghi nhận trực tiếp trên sân. Bạn vẫn muốn AI chấm điểm dựa trên kết quả tỉ số chứ?')) {
        return;
      }
    }

    if (this.livePitchState.isTimerRunning) {
      this.toggleLiveTimer();
    }

    // Sao chép sự kiện thực tế để đưa vào đánh giá AI
    const liveEventsSnapshot = [...this.livePitchState.events];
    this.pendingLiveEvents = liveEventsSnapshot;

    // Tự động lưu trận trước
    const savedMatch = this.saveAndPublishLiveMatch(false);
    if (!savedMatch || !savedMatch.id) {
      window.showToast('⚠️ Không thể khởi tạo trận đấu để chấm điểm AI', 'error');
      return;
    }

    // Tổng hợp narration phong phú từ toàn bộ sự kiện trên sân
    const teamInfo = window.stateManager.data.teamInfo;
    const teamName = teamInfo?.name || 'FC TNT';
    const opponent = this.livePitchState.opponent || 'FC Đối Thủ';
    const homeScore = Number(this.livePitchState.homeScore) || 0;
    const awayScore = Number(this.livePitchState.awayScore) || 0;
    const isWin = homeScore > awayScore;
    const isLoss = homeScore < awayScore;
    const resultStr = isWin ? 'Thắng' : isLoss ? 'Thua' : 'Hòa';

    let narration = `Trận đấu giữa ${teamName} và ${opponent} (${resultStr} ${homeScore} - ${awayScore}).\n`;
    narration += `Địa điểm: ${this.livePitchState.venue || 'Sân bóng Tân Triều'}.\n\n`;

    if (liveEventsSnapshot.length > 0) {
      narration += `DIỄN BIẾN THỰC TẾ TRỰC TIẾP TRÊN SÂN:\n`;
      // Sắp xếp sự kiện theo phút tăng dần
      const sortedEvents = [...liveEventsSnapshot].sort((a, b) => (a.minute || 0) - (b.minute || 0));
      sortedEvents.forEach(evt => {
        narration += `- Phút ${evt.minute}': [${evt.typeLabel || evt.type}] ${evt.playerName || 'Đội bóng'} ${evt.assistPlayerName ? `(Kiến tạo: ${evt.assistPlayerName})` : ''}${evt.note ? ` - ${evt.note}` : ''}\n`;
      });

      // Tóm tắt theo từng cầu thủ
      narration += `\nTỔNG HỢP NỔI BẬT:\n`;
      const playerHighlights = {};
      sortedEvents.forEach(evt => {
        const name = evt.playerName || 'Đội bóng';
        if (!playerHighlights[name]) playerHighlights[name] = [];
        playerHighlights[name].push(`${evt.typeLabel || evt.type}${evt.note ? ` (${evt.note})` : ''}`);
        if (evt.assistPlayerName) {
          if (!playerHighlights[evt.assistPlayerName]) playerHighlights[evt.assistPlayerName] = [];
          playerHighlights[evt.assistPlayerName].push(`👟 Kiến tạo cho ${evt.playerName}`);
        }
      });

      Object.entries(playerHighlights).forEach(([pName, acts]) => {
        narration += `• ${pName}: ${acts.join(', ')}\n`;
      });
    }

    this.closeLiveCompanionModal();
    this.openAiRatingModal(savedMatch.id);

    // Điền văn bản sự kiện trực tiếp vào ô nhập AI và kích hoạt chấm điểm ngay lập tức
    const textarea = document.getElementById('ai-match-narration-input');
    if (textarea) {
      textarea.value = narration;
    }

    window.showToast('🤖 AI đang phân tích toàn bộ diễn biến sân cỏ và tự động chấm điểm...', 'info');

    // Tự động chạy chấm điểm ngay lập tức
    setTimeout(() => {
      this.executeAiRating(liveEventsSnapshot);
    }, 250);
  },

  saveAndPublishLiveMatch(showSuccessToast = true) {
    if (this.livePitchState.isTimerRunning) {
      this.toggleLiveTimer();
    }

    const allPlayers = window.stateManager.getPlayers();
    const opponent = (this.livePitchState.opponent || 'FC Đối Thủ').trim();
    const homeScore = Number(this.livePitchState.homeScore) || 0;
    const awayScore = Number(this.livePitchState.awayScore) || 0;

    let result = 'DRAW';
    if (homeScore > awayScore) result = 'WIN';
    else if (homeScore < awayScore) result = 'LOSS';

    // Lọc danh sách cầu thủ có mặt đi đá hôm nay
    let attendingPlayerIds = this.livePitchState.registeredPlayerIds;
    if (!Array.isArray(attendingPlayerIds) || attendingPlayerIds.length === 0) {
      // Nếu chưa chọn, lấy các cầu thủ có sự kiện hoặc 7 cầu thủ đầu tiên
      const activeFromEvents = new Set();
      (this.livePitchState.events || []).forEach(e => {
        if (e.playerId) activeFromEvents.add(e.playerId);
        if (e.assistPlayerId) activeFromEvents.add(e.assistPlayerId);
      });
      if (activeFromEvents.size > 0) {
        attendingPlayerIds = Array.from(activeFromEvents);
      } else {
        attendingPlayerIds = allPlayers.slice(0, Math.min(allPlayers.length, 7)).map(p => p.id);
      }
    }

    const attendingPlayers = allPlayers.filter(p => attendingPlayerIds.includes(p.id));

    // Thống kê bàn thắng, kiến tạo từ events CHỈ CHO CẦU THỦ CÓ MẶT
    const playerStatsMap = {};
    attendingPlayers.forEach((p, idx) => {
      playerStatsMap[p.id] = {
        playerId: p.id,
        isStarter: idx < 7,
        rating: 7.0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        note: ''
      };
    });

    (this.livePitchState.events || []).forEach(evt => {
      if (evt.playerId && playerStatsMap[evt.playerId]) {
        if (evt.type === 'GOAL' || evt.type === 'WONDERGOAL') playerStatsMap[evt.playerId].goals += 1;
        if (evt.type === 'ASSIST') playerStatsMap[evt.playerId].assists += 1;
        if (evt.note && !playerStatsMap[evt.playerId].note) {
          playerStatsMap[evt.playerId].note = evt.note;
        }
      }
      if (evt.assistPlayerId && playerStatsMap[evt.assistPlayerId]) {
        playerStatsMap[evt.assistPlayerId].assists += 1;
      }
    });

    // Trích xuất danh sách thống kê cầu thủ hợp lệ
    const playerStats = Object.values(playerStatsMap);

    const matchId = 'm_' + Date.now();
    const matchPayload = {
      id: matchId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      opponent,
      venue: this.livePitchState.venue || 'Sân bóng Tân Triều',
      type: '7',
      formation: '3-1-2',
      homeScore,
      awayScore,
      result,
      note: `Ghi nhận trực tiếp ngoài sân (${attendingPlayers.length} cầu thủ có mặt • ${(this.livePitchState.events || []).length} sự kiện)`,
      playerStats
    };

    // Luôn luôn tạo một trận đấu mới đã hoàn tất vào kho Lịch Sử
    const savedMatch = window.stateManager.addMatch(matchPayload);
    const finalMatch = (savedMatch && savedMatch.id) ? savedMatch : matchPayload;

    this.clearLiveDraft();
    this.renderMatches();
    if (window.awardsModule) window.awardsModule.renderAwards();
    if (window.appModule) window.appModule.renderDashboard();

    if (showSuccessToast) {
      window.showToast('🎉 Đã kết thúc và lưu trận đấu thành công vào kho Lịch Sử!');
      this.closeLiveCompanionModal();
      this.openMatchDetailModal(finalMatch.id);
    }

    return finalMatch;
  },

  // ==========================================
  // AUTO-SAVE & MULTI-DEVICE CLOUD DRAFT SYNC
  // ==========================================
  saveLiveDraft() {
    try {
      const draft = {
        opponent: this.livePitchState.opponent || 'FC Đối Thủ',
        venue: this.livePitchState.venue || 'Sân bóng',
        homeScore: Number(this.livePitchState.homeScore) || 0,
        awayScore: Number(this.livePitchState.awayScore) || 0,
        timerSeconds: Number(this.livePitchState.timerSeconds) || 0,
        timerRunning: Boolean(this.livePitchState.isTimerRunning),
        period: Number(this.livePitchState.period) || 1,
        events: Array.isArray(this.livePitchState.events) ? this.livePitchState.events : [],
        registeredPlayerIds: Array.isArray(this.livePitchState.registeredPlayerIds) ? this.livePitchState.registeredPlayerIds : [],
        matchId: this.livePitchState.matchId || null,
        savedAt: Date.now()
      };

      // 1. Lưu tức thời tại Local Storage của thiết bị hiện tại
      localStorage.setItem('fctnt_live_pitch_draft', JSON.stringify(draft));

      // 2. Đồng bộ lên Cloud Server cho các thiết bị khác
      if (this._syncDebounceTimer) clearTimeout(this._syncDebounceTimer);
      this._syncDebounceTimer = setTimeout(() => {
        fetch('/api/live-match/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft)
        }).catch(err => console.warn('Cloud live draft sync error:', err));
      }, 250);

    } catch (e) {
      console.warn('Draft save error:', e);
    }
  },

  async loadLiveDraft() {
    // 1. Thử tải từ Cloud Server trước để lấy dữ liệu mới nhất nếu đổi thiết bị
    try {
      const res = await fetch('/api/live-match/current');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.active && data.draft) {
          console.log('☁️ Đã khôi phục trận đấu Live từ Cloud Server:', data.draft);
          this.applyLiveDraftData(data.draft);
          localStorage.setItem('fctnt_live_pitch_draft', JSON.stringify(data.draft));
          return;
        }
      }
    } catch (err) {
      console.warn('Cloud live draft fetch failed, switching to local storage:', err);
    }

    // 2. Fallback sang Local Storage
    try {
      const raw = localStorage.getItem('fctnt_live_pitch_draft');
      if (raw) {
        const draft = JSON.parse(raw);
        // Nếu draft lưu trong vòng 12 tiếng
        if (draft && (Date.now() - (draft.savedAt || 0) < 12 * 3600 * 1000)) {
          this.applyLiveDraftData(draft);
        }
      }
    } catch (e) {
      console.warn('Draft load error:', e);
    }
  },

  applyLiveDraftData(draft) {
    if (!draft) return;
    this.livePitchState.opponent = draft.opponent || 'FC Đối Thủ';
    this.livePitchState.venue = draft.venue || 'Sân bóng';
    this.livePitchState.homeScore = Number(draft.homeScore) || 0;
    this.livePitchState.awayScore = Number(draft.awayScore) || 0;
    this.livePitchState.timerSeconds = Number(draft.timerSeconds) || 0;
    this.livePitchState.period = Number(draft.period) || 1;
    this.livePitchState.matchId = draft.matchId || null;
    this.livePitchState.events = Array.isArray(draft.events) ? draft.events : [];
    if (Array.isArray(draft.registeredPlayerIds) && draft.registeredPlayerIds.length > 0) {
      this.livePitchState.registeredPlayerIds = draft.registeredPlayerIds;
    } else if (!this.livePitchState.registeredPlayerIds || this.livePitchState.registeredPlayerIds.length === 0) {
      this.initLiveRoster();
    }
    this.updateLiveCompanionUI();
  },

  clearLiveDraft() {
    localStorage.removeItem('fctnt_live_pitch_draft');
    if (this.livePitchState.timerInterval) {
      clearInterval(this.livePitchState.timerInterval);
      this.livePitchState.timerInterval = null;
    }
    this.livePitchState.isTimerRunning = false;
    this.livePitchState.events = [];
    this.livePitchState.homeScore = 0;
    this.livePitchState.awayScore = 0;
    this.livePitchState.timerSeconds = 0;
    this.livePitchState.period = 1;
    this.livePitchState.matchId = null;

    const periodBadge = document.getElementById('live-timer-period');
    const timerBtn = document.getElementById('live-timer-toggle-btn');
    if (periodBadge) {
      periodBadge.innerText = '⏱️ CHƯA BẮT ĐẦU';
      periodBadge.style.color = 'var(--accent-gold)';
      periodBadge.style.background = 'rgba(245, 158, 11, 0.15)';
    }
    if (timerBtn) {
      timerBtn.innerHTML = '▶️ Bắt Đầu';
      timerBtn.style.background = 'rgba(16, 185, 129, 0.2)';
    }
    this.updateTimerDisplay();

    // Xóa trên Cloud
    fetch('/api/live-match/clear', { method: 'POST' }).catch(e => { });
  }
});
