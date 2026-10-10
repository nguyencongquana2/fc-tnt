/**
 * Matches Module - AI Match Rating & Review Coordinator (js/matches/matches-ai.js)
 * Quản lý Modal Chấm Điểm AI (#ai-match-rating-modal), kết nối Gemini API & áp dụng rating vào trận đấu
 * Phân tách các submodule chuyên biệt:
 * - js/matches/matches-ai-client.js: Bộ não phân tích AI cục bộ phía client & Football NLP
 * - js/matches/matches-ai-review.js: Điều khiển UI bảng nhận xét phong độ từng cầu thủ
 */

(function (root) {
  'use strict';

  root.matchesModule = root.matchesModule || {};

  function showToast(msg, type = 'info') {
    if (root.TNT && root.TNT.ui && typeof root.TNT.ui.showToast === 'function') {
      root.TNT.ui.showToast(msg, type);
    } else if (typeof root.showToast === 'function') {
      root.showToast(msg, type);
    }
  }

  function escapeHtml(str) {
    if (root.TNT && root.TNT.utils && typeof root.TNT.utils.escapeHtml === 'function') {
      return root.TNT.utils.escapeHtml(str);
    }
    if (typeof root.escapeHtml === 'function') {
      return root.escapeHtml(str);
    }
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  Object.assign(root.matchesModule, {
    currentAiRatingData: null,

    openAiRatingModal(matchId) {
      if (!window.stateManager || !window.stateManager.isAdmin) {
        showToast('🔒 Hãy đăng nhập Quản trị viên để sử dụng AI chấm điểm!', 'info');
        return;
      }

      const m = window.stateManager ? window.stateManager.getMatchById(matchId || this.currentMatchId) : null;
      if (!m) return;
      this.currentMatchId = m.id;

      // Tránh rò rỉ sự kiện sân cỏ live sang trận đấu khác nếu người dùng mở chấm điểm trận khác
      if (this.pendingLiveMatchId && this.pendingLiveMatchId !== m.id) {
        this.pendingLiveEvents = null;
        this.pendingLiveMatchId = null;
      }

      const modal = document.getElementById('ai-match-rating-modal');
      if (!modal) return;

      // Hiển thị pill tóm tắt thông tin trận
      const contextPill = document.getElementById('ai-match-context-pill');
      const teamInfo = window.stateManager?.data?.teamInfo;
      const playerStats = m.playerStats || [];
      const startersCount = playerStats.filter(ps => ps.isStarter !== false).length;
      const subsCount = playerStats.filter(ps => ps.isStarter === false).length;

      if (contextPill) {
        contextPill.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <span style="font-weight: 800; color: #fff; font-size: 1.05rem;">
                ${teamInfo?.name || 'FC TNT'} <span style="color: var(--accent-emerald);">${m.homeScore}</span> - <span style="color: #f87171;">${m.awayScore}</span> ${m.opponent}
              </span>
              <span style="font-size: 0.8rem; color: var(--text-dim); margin-left: 0.5rem;">
                📅 ${m.date} • Sơ đồ 3-1-2 • ${startersCount} đá chính • ${subsCount} dự bị
              </span>
            </div>
            <div style="font-size: 0.78rem; background: rgba(255,255,255,0.08); padding: 0.2rem 0.6rem; border-radius: 999px; color: var(--accent-gold);">
              ${m.result === 'WIN' ? '🏆 Thắng' : m.result === 'LOSS' ? '💔 Thua' : '🤝 Hòa'}
            </div>
          </div>
        `;
      }

      // Load saved API Key if any
      const savedKey = localStorage.getItem('gemini_api_key') || '';
      const keyInput = document.getElementById('ai-user-gemini-key');
      if (keyInput) keyInput.value = savedKey;

      // Reset Steps
      const inputStep = document.getElementById('ai-rating-input-step');
      const loadingState = document.getElementById('ai-rating-loading-state');
      const resultStep = document.getElementById('ai-rating-result-step');
      const btnApply = document.getElementById('btn-apply-ai-ratings');

      if (inputStep) inputStep.style.display = 'block';
      if (loadingState) loadingState.style.display = 'none';
      if (resultStep) resultStep.style.display = 'none';
      if (btnApply) btnApply.style.display = 'none';

      // Pre-fill existing note if textarea is empty
      const textarea = document.getElementById('ai-match-narration-input');
      if (textarea && !textarea.value.trim() && m.note) {
        textarea.value = m.note;
      }

      modal.classList.add('active');
    },

    closeAiRatingModal() {
      const modal = document.getElementById('ai-match-rating-modal');
      if (modal) modal.classList.remove('active');
      this.currentAiRatingData = null;
      this.pendingLiveEvents = null;
      this.pendingLiveMatchId = null;
    },

    saveGeminiKey() {
      const keyInput = document.getElementById('ai-user-gemini-key');
      const val = (keyInput ? keyInput.value : '').trim();
      if (val) {
        localStorage.setItem('gemini_api_key', val);
        showToast('✅ Đã lưu Gemini API Key trên trình duyệt của bạn!', 'success');
      } else {
        localStorage.removeItem('gemini_api_key');
        showToast('Đã xóa Gemini API Key (Hệ thống sẽ dùng AI mặc định)', 'info');
      }
    },

    insertAiSample(type) {
      const textarea = document.getElementById('ai-match-narration-input');
      if (!textarea) return;

      if (type === 'clear') {
        textarea.value = '';
        return;
      }

      const m = window.stateManager ? window.stateManager.getMatchById(this.currentMatchId) : null;
      const opponent = m ? m.opponent : 'đối thủ';

      if (type === 'win') {
        textarea.value = `Hôm nay FC TNT có chiến thắng tưng bừng trước ${opponent}. 
ToDiu bắt rất chắc tay, cản phá 3 pha đối mặt xuất sắc giữ vững thế trận.
Quân Kun leo biên dẻo, tạt bóng như đặt có 1 kiến tạo và phòng ngự bọc lót chắc chắn.
Quang Voi đá thòng cực hay, không chiến và tranh chấp dũng mãnh.
Vinh Lê cầm nhịp tuyến giữa xuất sắc, chia bài đỉnh cao và có 2 kiến tạo.
Tài Thọ bứt tốc cánh phải lập cú đúp siêu phẩm, quấy phá hàng thủ đối phương.
Hùng Sứt vào sân thay người đá năng nổ ghi 1 bàn ấn định chiến thắng.
Toàn đội đá pressing rực lửa, phối hợp ăn ý và tinh thần đoàn kết tuyệt vời!`;
      } else if (type === 'comeback') {
        textarea.value = `Trận cầu kịch tính nghẹt thở trước ${opponent}.
Hiệp 1 đội bị dẫn trước do hàng thủ thoáng mất tập trung.
Sang hiệp 2 toàn đội vùng lên rực lửa:
Vinh Lê làm chủ hoàn toàn tuyến giữa, chọc khe cho Tài Thọ bứt tốc ghi bàn rút ngắn tỉ số.
Tiếp đó Quân Kun tạt bóng chuẩn xác để Thành Nam đánh đầu gỡ hòa.
Phút cuối, Hùng Sứt tung cú sút sấm sét ấn định màn lội ngược dòng cảm xúc.
ToDiu có 2 pha cứu thua mười mươi trong hiệp 2 giúp toàn đội giữ vững chiến thắng!`;
      } else if (type === 'draw') {
        textarea.value = `Trận đấu giằng co kịch tính từng phút trước ${opponent}.
Tài Thọ mở tỉ số từ pha bứt tốc dứt điểm góc hẹp hiểm hóc.
Vinh Lê điều tiết nhịp độ và hỗ trợ phòng ngự tốt.
Quân Kun và Đức Bắc tranh chấp quyết liệt ở 2 hành lang cánh.
ToDiu có nhiều pha bay người cản phá ấn tượng.
Cuối trận đối thủ ép sân và gỡ hòa đáng tiếc, hai đội chia điểm sau màn rượt đuổi tỉ số hấp dẫn.`;
      }
    },

    editAiInput() {
      const inputStep = document.getElementById('ai-rating-input-step');
      const loadingState = document.getElementById('ai-rating-loading-state');
      const resultStep = document.getElementById('ai-rating-result-step');
      const btnApply = document.getElementById('btn-apply-ai-ratings');

      if (inputStep) inputStep.style.display = 'block';
      if (loadingState) loadingState.style.display = 'none';
      if (resultStep) resultStep.style.display = 'none';
      if (btnApply) btnApply.style.display = 'none';
    },

    async executeAiRating(liveEventsParam = null) {
      const m = window.stateManager ? window.stateManager.getMatchById(this.currentMatchId) : null;
      if (!m) return;

      const textarea = document.getElementById('ai-match-narration-input');
      const narration = (textarea ? textarea.value : '').trim();

      const playerStats = m.playerStats || [];
      if (playerStats.length === 0) {
        showToast('⚠️ Trận đấu chưa có danh sách cầu thủ ra sân để chấm điểm!', 'info');
        return;
      }

      const liveEvents = liveEventsParam || (this.pendingLiveMatchId === this.currentMatchId ? this.pendingLiveEvents : null) || null;

      // Prepare player list with details
      const playerList = playerStats.map(ps => {
        const p = window.stateManager ? window.stateManager.getPlayerById(ps.playerId) : null;
        return {
          id: ps.playerId,
          name: p ? p.name : ps.playerId,
          nickname: p ? p.nickname : '',
          number: p ? p.number : 0,
          position: p ? p.position : 'MF',
          isStarter: ps.isStarter !== false,
          pitchSlot: ps.pitchSlot,
          currentStats: {
            rating: ps.rating || 7.0,
            goals: ps.goals || 0,
            assists: ps.assists || 0,
            yellowCards: ps.yellowCards || 0,
            redCards: ps.redCards || 0,
            note: ps.note || ''
          }
        };
      });

      const apiKey = localStorage.getItem('gemini_api_key') || '';

      // Switch to Loading View
      const inputStep = document.getElementById('ai-rating-input-step');
      const loadingState = document.getElementById('ai-rating-loading-state');
      const resultStep = document.getElementById('ai-rating-result-step');
      const btnApply = document.getElementById('btn-apply-ai-ratings');

      if (inputStep) inputStep.style.display = 'none';
      if (loadingState) loadingState.style.display = 'block';
      if (resultStep) resultStep.style.display = 'none';
      if (btnApply) btnApply.style.display = 'none';

      try {
        const adminToken = (window.stateManager && typeof window.stateManager.getAdminToken === 'function' ? window.stateManager.getAdminToken() : null)
          || (window.TNT?.state && typeof window.TNT.state.getAdminToken === 'function' ? window.TNT.state.getAdminToken() : null)
          || localStorage.getItem('fc_tnt_admin_token') || '';

        const headers = { 'Content-Type': 'application/json' };
        if (adminToken) headers['x-admin-token'] = adminToken;

        const response = await fetch('/api/ai/rate-match', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            matchInfo: {
              opponent: m.opponent,
              homeScore: m.homeScore,
              awayScore: m.awayScore,
              date: m.date,
              venue: m.venue,
              result: m.result
            },
            playerList,
            matchNarration: narration,
            liveEvents,
            apiKey
          })
        });

        let data;
        if (response.ok) {
          data = await response.json();
        } else {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'API server returned error');
        }

        this.currentAiRatingData = data;
        this.renderAiResultPreview(data);

      } catch (err) {
        console.warn('[Matches AI] Backend AI API error, falling back to local client evaluation:', err.message || err);
        // Client-side instant evaluation fallback
        const mockResult = this.clientSideAiEvaluation(m, playerList, narration, liveEvents);
        this.currentAiRatingData = mockResult;
        this.renderAiResultPreview(mockResult);
      }
    },

    renderAiResultPreview(data) {
      const loadingState = document.getElementById('ai-rating-loading-state');
      const resultStep = document.getElementById('ai-rating-result-step');
      const btnApply = document.getElementById('btn-apply-ai-ratings');
      const btnEdit = document.getElementById('btn-edit-ai-narration');

      if (loadingState) loadingState.style.display = 'none';
      if (resultStep) resultStep.style.display = 'block';
      if (btnApply) btnApply.style.display = 'inline-flex';
      if (btnEdit) btnEdit.style.display = 'inline-flex';

      // Set Headline & Summary
      const headlineEl = document.getElementById('ai-result-headline');
      const summaryEl = document.getElementById('ai-result-summary');
      const sourceEl = document.getElementById('ai-source-label');

      if (headlineEl) headlineEl.innerText = data.matchHeadline || '⚽ Tổng Quan Màn Trình Diễn';
      if (summaryEl) summaryEl.innerText = data.matchSummary || '';
      if (sourceEl) sourceEl.innerText = `Engine: ${data.source || 'FC TNT AI Intelligence'}`;

      // MOTM Spotlight
      const motmBox = document.getElementById('ai-result-motm-box');
      if (motmBox) {
        if (data.motmPlayerId) {
          const motmPlayer = window.stateManager ? window.stateManager.getPlayerById(data.motmPlayerId) : null;
          const motmRating = data.ratings?.find(r => r.playerId === data.motmPlayerId);
          if (motmPlayer && motmRating) {
            motmBox.innerHTML = `
              <div class="ai-motm-card">
                <div class="ai-motm-crown">👑 CẦU THỦ XUẤT SẮC NHẤT TRẬN (MOTM)</div>
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-top: 0.35rem;">
                  <img src="${motmPlayer.avatar}" style="width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--accent-gold); object-fit: cover;">
                  <div>
                    <div style="font-weight: 800; font-size: 1.05rem; color: #fff;">${escapeHtml(motmPlayer.name)} #${motmPlayer.number}</div>
                    <div style="font-size: 0.78rem; color: var(--accent-gold);">${motmPlayer.position} • "${escapeHtml(motmRating.note)}"</div>
                  </div>
                  <div style="margin-left: auto; font-family: var(--font-display); font-size: 1.6rem; font-weight: 900; color: var(--accent-gold);">
                    ${Number(motmRating.rating).toFixed(1)} ⭐
                  </div>
                </div>
              </div>
            `;
          } else {
            motmBox.innerHTML = '';
          }
        } else {
          motmBox.innerHTML = '';
        }
      }

      // Player Ratings Preview List
      const previewContainer = document.getElementById('ai-rating-preview-list');
      const ratings = data.ratings || [];

      if (previewContainer) {
        previewContainer.innerHTML = ratings.map(r => {
          const p = window.stateManager ? window.stateManager.getPlayerById(r.playerId) : null;
          if (!p) return '';

          const ratingClass = typeof this.getRatingClass === 'function' ? this.getRatingClass(r.rating) : '';
          return `
            <div class="ai-player-row">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1.2; min-width: 150px;">
                <img src="${p.avatar}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover;">
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem; color: #fff;">${escapeHtml(p.name)} #${p.number}</div>
                  <div style="display: flex; align-items: center; gap: 0.35rem; margin-top: 0.1rem;">
                    <span style="font-size: 0.7rem; color: var(--text-dim);">${p.position}</span>
                    ${r.tag ? `<span class="ai-role-tag-pill">${escapeHtml(r.tag)}</span>` : ''}
                  </div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 0.5rem;">
                ${r.goals > 0 ? `<span class="ai-stat-badge stat-badge-goal">⚽ ${r.goals}</span>` : ''}
                ${r.assists > 0 ? `<span class="ai-stat-badge stat-badge-assist">👟 ${r.assists}</span>` : ''}
                ${r.yellowCards > 0 ? `<span class="ai-stat-badge stat-badge-card" style="background: rgba(245,158,11,0.2); color: #fbbf24;">🟨 ${r.yellowCards}</span>` : ''}
                ${r.redCards > 0 ? `<span class="ai-stat-badge stat-badge-card" style="background: rgba(239,68,68,0.2); color: #ef4444;">🟥 ${r.redCards}</span>` : ''}
                
                <span class="sofa-rating-box ${ratingClass}" style="min-width: 38px; text-align: center; font-size: 0.88rem; font-weight: 900; padding: 0.2rem 0.45rem;">
                  ${Number(r.rating).toFixed(1)}
                </span>
              </div>

              <div class="ai-note-text" title="${escapeHtml(r.note)}">
                💬 ${escapeHtml(r.note)}
              </div>
            </div>
          `;
        }).join('');
      }
    },

    applyAiRatingsToMatch() {
      if (!this.currentAiRatingData || !this.currentMatchId) return;

      const m = window.stateManager ? window.stateManager.getMatchById(this.currentMatchId) : null;
      if (!m) return;

      const aiRatings = this.currentAiRatingData.ratings || [];
      const existingStats = m.playerStats || [];

      // Merge AI generated values into player stats
      const updatedStats = existingStats.map(ps => {
        const aiStat = aiRatings.find(r => r.playerId === ps.playerId);
        if (aiStat) {
          return {
            ...ps,
            rating: Number(aiStat.rating) || ps.rating || 7.0,
            goals: aiStat.goals !== undefined ? (Number(aiStat.goals) || 0) : (ps.goals || 0),
            assists: aiStat.assists !== undefined ? (Number(aiStat.assists) || 0) : (ps.assists || 0),
            yellowCards: aiStat.yellowCards !== undefined ? (Number(aiStat.yellowCards) || 0) : (ps.yellowCards || 0),
            redCards: aiStat.redCards !== undefined ? (Number(aiStat.redCards) || 0) : (ps.redCards || 0),
            note: aiStat.note || ps.note || ''
          };
        }
        return ps;
      });

      // Update match note with AI commentary if match note was empty
      const updatedNote = m.note || this.currentAiRatingData.matchHeadline || '';

      window.stateManager.updateMatch(this.currentMatchId, {
        playerStats: updatedStats,
        note: updatedNote
      });

      showToast('🎉 Đã áp dụng toàn bộ điểm số & nhận xét AI vào sơ đồ sân 3-1-2!', 'success');
      this.closeAiRatingModal();
      if (window.awardsModule && typeof window.awardsModule.renderAwards === 'function') {
        window.awardsModule.renderAwards();
      }
      if (window.playersModule && typeof window.playersModule.renderPlayers === 'function') {
        window.playersModule.renderPlayers();
      }
      if (window.appModule && typeof window.appModule.renderDashboard === 'function') {
        window.appModule.renderDashboard();
      }
    }
  });

})(typeof window !== 'undefined' ? window : this);
