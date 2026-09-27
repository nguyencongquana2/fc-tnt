/**
 * Matches Module - Live Pitch Voice-to-Event Engine
 * Trợ lý ghi nhận sự kiện sân cỏ bằng giọng nói tự nhiên (Web Speech API + Smart NLP)
 */
window.matchesModule = window.matchesModule || {};

Object.assign(window.matchesModule, {
  // =========================================================================
  // 🎙️ VOICE-TO-EVENT ENGINE (WEB SPEECH API + FALLBACK)
  // =========================================================================
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
      } catch (err) {
        console.debug('[SpeechRecognition] Lỗi khi dừng nhận diện:', err);
      }
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
        try {
          this.livePitchState.speechRecognition.abort();
        } catch (err) {
          console.debug('[SpeechRecognition] Lỗi hủy bỏ instance cũ:', err);
        }
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
            try {
              this.livePitchState.speechRecognition.stop();
            } catch (err) {
              console.debug('[SpeechRecognition] Lỗi timeout dừng nhận diện:', err);
            }
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
  }
});
