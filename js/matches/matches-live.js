/**
 * Matches Module - Live Pitch Companion Orchestrator
 * Điều phối chính modal Trợ lý Sân Cỏ, đồng bộ đám mây realtime đa thiết bị và xuất dữ liệu trận
 */
window.matchesModule = window.matchesModule || {};

Object.assign(window.matchesModule, {
  // =========================================================================
  // 🏟️ LIVE PITCH COMPANION (TRỢ LÝ SÂN CỎ TRỰC TIẾP & REALTIME SYNC)
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

  closeLiveCompanionModal() {
    const modal = document.getElementById('live-companion-modal');
    if (modal) modal.classList.remove('active');
    if (typeof this.closeLivePlayerPicker === 'function') {
      this.closeLivePlayerPicker();
    }
    if (typeof this.closeLiveRosterModal === 'function') {
      this.closeLiveRosterModal();
    }
    this.saveLiveDraft();
  },

  updateLiveCompanionUI() {
    const teamInfo = window.stateManager?.data?.teamInfo;
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

    if (typeof this.updateTimerDisplay === 'function') this.updateTimerDisplay();
    if (typeof this.updateRosterPreview === 'function') this.updateRosterPreview();
    if (typeof this.renderLiveTimeline === 'function') this.renderLiveTimeline();
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
    if (typeof this.initLiveRoster === 'function') this.initLiveRoster();
    this.updateLiveCompanionUI();
  },

  getPlayerShortName(p) {
    if (!p) return '';
    if (p.nickname && p.nickname.trim()) return p.nickname.trim();
    return p.name || '';
  },

  // =========================================================================
  // EXPORT & AI RATING INTEGRATION
  // =========================================================================
  copyLiveSummaryToZalo() {
    const teamInfo = window.stateManager?.data?.teamInfo;
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

    if (this.livePitchState.isTimerRunning && typeof this.toggleLiveTimer === 'function') {
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
    const teamInfo = window.stateManager?.data?.teamInfo;
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
      const sortedEvents = [...liveEventsSnapshot].sort((a, b) => (a.minute || 0) - (b.minute || 0));
      sortedEvents.forEach(evt => {
        narration += `- Phút ${evt.minute}': [${evt.typeLabel || evt.type}] ${evt.playerName || 'Đội bóng'} ${evt.assistPlayerName ? `(Kiến tạo: ${evt.assistPlayerName})` : ''}${evt.note ? ` - ${evt.note}` : ''}\n`;
      });

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

    setTimeout(() => {
      this.executeAiRating(liveEventsSnapshot);
    }, 250);
  },

  saveAndPublishLiveMatch(showSuccessToast = true) {
    if (this.livePitchState.isTimerRunning && typeof this.toggleLiveTimer === 'function') {
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

  // =========================================================================
  // AUTO-SAVE & MULTI-DEVICE CLOUD DRAFT SYNC
  // =========================================================================
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

      // 2. Đồng bộ lên Cloud Server cho các thiết bị khác (yêu cầu token Admin)
      if (this._syncDebounceTimer) clearTimeout(this._syncDebounceTimer);
      this._syncDebounceTimer = setTimeout(() => {
        const token = window.stateManager?.getAdminToken ? window.stateManager.getAdminToken() : '';
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
          headers['x-admin-token'] = token;
        }

        fetch('/api/live-match/sync', {
          method: 'POST',
          headers,
          body: JSON.stringify(draft)
        }).catch(err => console.warn('Cloud live draft sync error:', err.message || err));
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
      if (typeof this.initLiveRoster === 'function') this.initLiveRoster();
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
    if (typeof this.updateTimerDisplay === 'function') this.updateTimerDisplay();

    // Xóa trên Cloud (yêu cầu quyền Admin)
    const token = window.stateManager?.getAdminToken ? window.stateManager.getAdminToken() : '';
    const headers = {};
    if (token) {
      headers['x-admin-token'] = token;
    }

    fetch('/api/live-match/clear', {
      method: 'POST',
      headers
    }).catch(err => {
      console.warn('[LiveMatch] Failed to clear cloud live match draft:', err.message);
    });
  }
});
