/**
 * FC TNT - Finance VietQR & Realtime Sync Submodule (js/finance/finance-qr.js)
 * Quản lý sinh mã VietQR động, cú pháp nộp tiền tự động, âm thanh ting ting & Webhook Casso Socket.IO
 */

(function (root) {
  'use strict';

  function formatMoney(amount) {
    if (root.TNT && root.TNT.utils && typeof root.TNT.utils.formatMoney === 'function') {
      return root.TNT.utils.formatMoney(amount);
    }
    if (typeof root.formatMoney === 'function') {
      return root.formatMoney(amount);
    }
    const num = Number(amount) || 0;
    return num.toLocaleString('vi-VN') + 'đ';
  }

  const FinanceQrMixin = {
    // Cập nhật hiển thị mã VietQR & Thống kê tiến độ thu tiền
    updateQRAndStatsDisplay() {
      const fin = this.currentFinanceData;
      if (!fin) return;

      // 1. Cập nhật thống kê tiền
      const totalEl = document.getElementById('fin-display-total');
      const splitEl = document.getElementById('fin-display-split');
      const countEl = document.getElementById('fin-display-count');
      if (totalEl) totalEl.innerText = formatMoney(fin.totalAmount);
      if (splitEl) splitEl.innerText = formatMoney(fin.splitAmountPerPerson);
      if (countEl) countEl.innerText = `${fin.payments.length} người`;

      // 2. Tính tiến độ đã thu
      const paidCount = fin.payments.filter(p => p.isPaid).length;
      const totalParticipants = fin.payments.length;
      const collectedAmount = fin.payments.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount, 0);

      const paidCountEl = document.getElementById('fin-paid-count-text');
      const progressFill = document.getElementById('fin-progress-bar-fill');
      const progressPercentText = document.getElementById('fin-progress-percent');
      const collectedAmountEl = document.getElementById('fin-collected-amount-text');

      const pct = totalParticipants > 0 ? Math.round((paidCount / totalParticipants) * 100) : 0;
      if (paidCountEl) paidCountEl.innerText = `${paidCount}/${totalParticipants} người`;
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (progressPercentText) progressPercentText.innerText = `${pct}%`;
      if (collectedAmountEl) {
        collectedAmountEl.innerHTML = `Đã thu: <strong style="color: var(--accent-emerald);">${formatMoney(collectedAmount)}</strong> / ${formatMoney(fin.totalAmount)} (Còn thiếu ${formatMoney(fin.totalAmount - collectedAmount)})`;
      }

      // 3. Tạo mã VietQR động có cú pháp định danh Casso
      const qrContainer = document.getElementById('fin-qr-code-box');
      const qrImg = document.getElementById('fin-qr-img');
      const qrHint = document.getElementById('fin-qr-hint');
      const memoEl = document.getElementById('fin-qr-memo-content');
      const memoDescEl = document.getElementById('fin-qr-memo-desc');

      if (fin.payerAccountNumber && fin.payerBankCode) {
        const matchShortId = this.currentMatchId ? String(this.currentMatchId).replace(/^(match_|m_)/, '') : '';
        const allPlayers = window.stateManager ? window.stateManager.getPlayers() : [];
        
        let memo = `TNT M${matchShortId}`;
        let targetPlayer = null;

        if (this.selectedQrPlayerId) {
          targetPlayer = allPlayers.find(p => p.id === this.selectedQrPlayerId);
          if (targetPlayer) {
            const pIdentifier = targetPlayer.number !== undefined ? targetPlayer.number : targetPlayer.id.replace('p_', '');
            memo = `TNT M${matchShortId} P${pIdentifier}`;
          }
        }
        
        const qrUrl = `https://img.vietqr.io/image/${fin.payerBankCode}-${fin.payerAccountNumber}-compact2.png?amount=${fin.splitAmountPerPerson}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(fin.payerAccountName || '')}`;
        
        if (qrImg) {
          qrImg.src = qrUrl;
          qrImg.style.display = 'block';
        }
        if (qrHint) qrHint.style.display = 'none';
        if (qrContainer) qrContainer.style.background = '#ffffff';

        if (memoEl) {
          memoEl.innerText = memo;
        }
        if (memoDescEl) {
          if (targetPlayer) {
            memoDescEl.innerHTML = `Mã riêng cho <strong>${window.escapeHtml(targetPlayer.name)}</strong> • Web tự động gạch nợ sau 2 giây!`;
          } else {
            memoDescEl.innerHTML = `Mã chuyển khoản chung • Ghi số áo để web tự nhận diện!`;
          }
        }
      } else {
        if (qrImg) qrImg.style.display = 'none';
        if (qrHint) {
          qrHint.style.display = 'flex';
          qrHint.innerHTML = '<span>⚠️ Vui lòng nhập Số tài khoản & chọn Ngân hàng để tạo mã QR</span>';
        }
      }
    },

    onQrTargetPlayerChange(playerId) {
      this.selectedQrPlayerId = playerId || null;
      this.updateQRAndStatsDisplay();
    },

    selectPlayerForQr(playerId) {
      this.selectedQrPlayerId = playerId;
      const select = document.getElementById('fin-qr-target-player');
      if (select) select.value = playerId;
      this.updateQRAndStatsDisplay();
      const player = window.stateManager ? window.stateManager.getPlayerById(playerId) : null;
      if (window.showToast && player) {
        window.showToast(`📲 Đã chuyển mã VietQR sang cho "${player.name}"!`, 'info');
      }
    },

    copyMemoText() {
      const memoEl = document.getElementById('fin-qr-memo-content');
      if (!memoEl) return;
      const text = memoEl.innerText.trim();

      if (root.TNT && root.TNT.utils && typeof root.TNT.utils.copyToClipboard === 'function') {
        root.TNT.utils.copyToClipboard(text, `📋 Đã copy cú pháp: "${text}"!`);
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          if (window.showToast) {
            window.showToast(`📋 Đã copy cú pháp: "${text}"!`, 'success');
          }
        }).catch(() => {
          window.prompt('Sao chép cú pháp chuyển khoản:', text);
        });
      }
    },

    // Khởi tạo lắng nghe Socket.IO sự kiện nộp tiền realtime
    initSocketListeners() {
      if (this._socketInitialized) return;
      const socket = window.stateManager && window.stateManager.socket;
      if (socket && typeof socket.on === 'function') {
        this._socketInitialized = true;
        socket.on('payment_received', (data) => {
          this.handlePaymentReceived(data);
        });
        console.log('⚡ FinanceModule: Đã kết nối lắng nghe Casso Payment Webhook');
      }
    },

    // Phát âm thanh Ting ting chuông đôi qua Web Audio API (Zero-dependency)
    playTingTingSound() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        // Nốt 1: E6 (1318.5 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1318.5, now);
        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.55);

        // Nốt 2: B6 (1975.5 Hz) sau 120ms
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1975.5, now + 0.12);
        gain2.gain.setValueAtTime(0.25, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.85);
      } catch (e) {
        console.warn('[Finance] Audio ting ting error:', e.message);
      }
    },

    // Xử lý khi nhận được thông báo nộp tiền từ Casso Webhook
    handlePaymentReceived(data) {
      if (!data) return;

      this.playTingTingSound();

      if (window.showToast) {
        window.showToast(`💰 Ting ting! Cầu thủ "${data.playerName}" vừa nộp ${formatMoney(data.amount)} tiền sân! Tự động gạch nợ thành công 🎉`, 'success');
      }

      // Nếu modal tài chính đang mở và đúng trận đấu đó:
      const modal = document.getElementById('match-finance-modal');
      if (modal && modal.classList.contains('active') && this.currentFinanceData) {
        const matchIdClean = String(this.currentMatchId || '').replace(/^(match_|m_)/, '');
        const eventMatchClean = String(data.matchId || '').replace(/^(match_|m_)/, '');

        if (matchIdClean === eventMatchClean || !data.matchId) {
          const item = this.currentFinanceData.payments.find(p => p.playerId === data.playerId);
          if (item) {
            item.isPaid = true;
            item.paidAt = new Date().toISOString();
            item.note = item.note ? `${item.note} • Auto Casso` : 'Auto Casso';
            this.updateQRAndStatsDisplay();
            this.renderChecklistTable();
          }
        }
      }
    },

    async showCassoGuide() {
      try {
        const headers = {};
        const adminToken = window.stateManager && typeof window.stateManager.getAdminToken === 'function'
          ? window.stateManager.getAdminToken()
          : '';
        if (adminToken) headers['x-admin-token'] = adminToken;

        const res = await fetch('/api/payments/config', { headers });
        const config = await res.json();
        if (!res.ok) {
          alert(config.error || config.message || 'Không thể lấy thông tin cấu hình webhook');
          return;
        }
        const webhookUrl = config.webhookUrl || `${window.location.origin}/api/payments/casso-webhook`;
        const isConfigured = config.configured;

        window.prompt('Copy thông tin Webhook bên dưới để dán vào Casso.vn:', webhookUrl);
      } catch (e) {
        alert('Không thể lấy thông tin cấu hình webhook: ' + e.message);
      }
    }
  };

  root.TNTFinanceMixins = root.TNTFinanceMixins || {};
  root.TNTFinanceMixins.qr = FinanceQrMixin;

})(typeof window !== 'undefined' ? window : this);
