/**
 * FC TNT - Finance Checklist & Settlement Submodule (js/finance/finance-checklist.js)
 * Quản lý checklist nộp tiền từng cầu thủ, trừ ví số dư quỹ, lưu cấu hình & xuất báo cáo Messenger/Zalo
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

  const FinanceChecklistMixin = {
    // Render bảng Checklist cầu thủ đã nộp / chưa nộp
    renderChecklistTable() {
      const listContainer = document.getElementById('fin-checklist-tbody');
      if (!listContainer || !this.currentFinanceData) return;

      const isAdmin = window.stateManager ? window.stateManager.isAdmin : false;
      const allPlayers = window.stateManager ? window.stateManager.getPlayers() : [];
      const payments = this.currentFinanceData.payments;

      if (payments.length === 0) {
        listContainer.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 1.5rem; color: var(--text-dim);">Chưa có cầu thủ nào được chọn tham gia chia tiền.</td></tr>`;
        return;
      }

      listContainer.innerHTML = payments.map((p, idx) => {
        const player = allPlayers.find(x => x.id === p.playerId);
        const avatar = player ? player.avatar : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
        const isPayer = (p.playerId === this.currentFinanceData.payerPlayerId);

        return `
          <tr class="fin-payment-row ${p.isPaid ? 'paid' : 'unpaid'}">
            <td style="width: 40px; text-align: center; color: var(--text-dim); font-weight: 600;">${idx + 1}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <img src="${avatar}" alt="${window.escapeHtml(p.playerName)}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1.5px solid ${p.isPaid ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.1)'};">
                <div>
                  <strong style="color: var(--text-main); font-size: 0.95rem;">${window.escapeHtml(p.playerName)}</strong>
                  ${isPayer ? '<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: var(--accent-gold); font-size: 0.7rem; margin-left: 4px; padding: 2px 6px; border-radius: 4px;">Người ứng tiền</span>' : ''}
                </div>
              </div>
            </td>
            <td style="font-weight: 700; color: var(--accent-gold);">${formatMoney(p.amount)}</td>
            <td style="text-align: right;">
              ${isPayer ? `
                <span class="fin-toggle-paid-btn btn-paid" style="cursor: default; opacity: 0.95; user-select: none;" title="Người ứng tiền mặc định đã hoàn tất">
                  🟢 ĐÃ ỨNG TIỀN
                </span>
              ` : `
                <div style="display: inline-flex; align-items: center; gap: 0.35rem; justify-content: flex-end;">
                  ${!p.isPaid ? `
                    <button 
                      type="button" 
                      class="btn btn-secondary btn-sm" 
                      onclick="window.financeModule.selectPlayerForQr('${p.playerId}')" 
                      title="Tạo mã VietQR riêng cho cầu thủ này"
                      style="padding: 2px 7px; font-size: 0.75rem; border-radius: 4px;"
                    >
                      📱 QR
                    </button>
                  ` : ''}
                  ${isAdmin ? `
                    <button 
                      type="button" 
                      class="fin-toggle-paid-btn ${p.isPaid ? 'btn-paid' : 'btn-unpaid'}"
                      onclick="window.financeModule.togglePlayerPayment('${p.playerId}')"
                      title="Nhấp để đổi trạng thái nộp tiền"
                    >
                      ${p.isPaid ? '🟢 ĐÃ NỘP' : '🔴 CHƯA NỘP'}
                    </button>
                  ` : `
                    <span 
                      class="fin-toggle-paid-btn ${p.isPaid ? 'btn-paid' : 'btn-unpaid'}" 
                      style="cursor: default; opacity: 0.9; user-select: none;"
                      title="Trạng thái xác nhận bởi Quản Trị Viên"
                    >
                      ${p.isPaid ? '🟢 ĐÃ NỘP' : '🔴 CHƯA NỘP'}
                    </span>
                  `}
                </div>
              `}
            </td>
          </tr>
        `;
      }).join('');
    },

    // 1-Chạm Toggle nộp tiền của 1 cầu thủ (Dành cho Quản trị viên)
    togglePlayerPayment(playerId) {
      if (!window.stateManager || !window.stateManager.isAdmin) {
        alert('🔒 Bạn đang ở chế độ Thành Viên (Chỉ Xem). Vui lòng đăng nhập Quản Trị Viên (Mã PIN) để tick xác nhận nộp tiền!');
        return;
      }

      if (!this.currentFinanceData || !this.currentFinanceData.payments) return;
      
      // Nếu là người ứng tiền thì luôn là đã nộp
      if (playerId === this.currentFinanceData.payerPlayerId) {
        alert('ℹ️ Cầu thủ này là người đã đứng ra ứng tiền sân nên luôn ở trạng thái ĐÃ NỘP.');
        return;
      }

      const item = this.currentFinanceData.payments.find(p => p.playerId === playerId);
      if (item) {
        item.isPaid = !item.isPaid;
        item.paidAt = item.isPaid ? new Date().toISOString() : null;
        
        this.updateQRAndStatsDisplay();
        this.renderChecklistTable();

        // Tự động lưu ngầm trạng thái thanh toán lên server nếu trận đã có ID
        if (this.currentMatchId) {
          this.saveCurrentFinance(false); // Lưu im lặng
        }
      }
    },

    // Đánh dấu tất cả đã nộp hoặc chưa nộp
    setAllPayments(isPaid) {
      if (!window.stateManager || !window.stateManager.isAdmin) {
        alert('🔒 Chỉ Quản Trị Viên mới có quyền thực hiện thao tác này!');
        return;
      }

      if (!this.currentFinanceData || !this.currentFinanceData.payments) return;
      
      this.currentFinanceData.payments.forEach(p => {
        const isPayer = (p.playerId === this.currentFinanceData.payerPlayerId);
        // Người ứng tiền luôn luôn giữ trạng thái ĐÃ NỘP (true)
        p.isPaid = isPayer ? true : isPaid;
        p.paidAt = p.isPaid ? (p.paidAt || new Date().toISOString()) : null;
      });

      this.updateQRAndStatsDisplay();
      this.renderChecklistTable();

      // Tự động lưu ngầm lên server
      if (this.currentMatchId) {
        this.saveCurrentFinance(false);
      }
    },

    // Trừ trực tiếp tiền sân vào ví số dư quỹ của các cầu thủ tham gia
    async deductFromMemberFunds() {
      if (!this.currentFinanceData || !this.currentFinanceData.payments || this.currentFinanceData.payments.length === 0) {
        alert('Không có danh sách cầu thủ để trừ tiền quỹ!');
        return;
      }

      const fin = this.currentFinanceData;
      const splitAmount = fin.splitAmountPerPerson;
      if (!splitAmount || splitAmount <= 0) {
        alert('Số tiền chia mỗi người phải lớn hơn 0đ!');
        return;
      }

      const participantIds = fin.payments.map(p => p.playerId);
      const count = participantIds.length;

      let treasurerToken = window.TNT && window.TNT.funds && typeof window.TNT.funds.getTreasurerToken === 'function'
        ? window.TNT.funds.getTreasurerToken()
        : (sessionStorage.getItem('fc_tnt_treasurer_token') || localStorage.getItem('fc_tnt_treasurer_token') || '');

      if (!treasurerToken) {
        const pin = prompt('🔐 Thao tác này yêu cầu quyền Thủ Quỹ!\nVui lòng nhập Mã PIN Thủ Quỹ để thực hiện trừ tiền vào ví:');
        if (!pin) return;

        try {
          const authRes = await fetch('/api/auth/treasurer/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin })
          });
          const authData = await authRes.json();
          if (authRes.ok && authData.success) {
            treasurerToken = authData.token;
            localStorage.setItem('fc_tnt_treasurer_token', treasurerToken);
            if (window.TNT && window.TNT.state) window.TNT.state.isTreasurer = true;
          } else {
            alert(authData.error || 'Mã PIN Thủ Quỹ không chính xác!');
            return;
          }
        } catch (err) {
          alert('Lỗi kết nối xác thực Thủ Quỹ: ' + err.message);
          return;
        }
      }

      const match = window.stateManager ? window.stateManager.getMatchById(this.currentMatchId) : null;
      const opponent = match ? match.opponent : 'Đối thủ';

      const confirmMsg = `Xác nhận TRỪ TIỀN SÂN VÀO VÍ SỐ DƯ QUỸ:\n` +
        `- Số tiền trừ mỗi người: ${formatMoney(splitAmount)}\n` +
        `- Số cầu thủ áp dụng: ${count} người\n` +
        `- Trận đấu: FC TNT vs ${opponent}\n\n` +
        `Hệ thống sẽ trừ thẳng vào ví của ${count} cầu thủ và tự động đánh dấu ĐÃ NỘP. Bạn có chắc chắn không?`;

      if (!confirm(confirmMsg)) return;

      try {
        const res = await fetch('/api/funds/deduct-match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-treasurer-token': treasurerToken
          },
          body: JSON.stringify({
            matchId: this.currentMatchId,
            splitAmount,
            participantIds,
            matchOpponent: opponent,
            note: `Tiền sân trận vs ${opponent}`
          })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          fin.payments.forEach(p => {
            if (participantIds.includes(p.playerId)) {
              p.isPaid = true;
              p.paidAt = new Date().toISOString();
              p.note = 'Trừ vào ví quỹ đội';
            }
          });

          this.updateQRAndStatsDisplay();
          this.renderChecklistTable();
          if (typeof this.playTingTingSound === 'function') {
            this.playTingTingSound();
          }

          if (window.showToast) {
            window.showToast(`🎉 ${data.message}`, 'success');
          } else {
            alert(data.message);
          }

          if (this.currentMatchId) {
            this.saveCurrentFinance(false);
          }
        } else {
          alert(data.error || 'Trừ tiền quỹ thất bại!');
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ: ' + err.message);
      }
    },

    // Lưu thông tin tài chính trận đấu
    async saveCurrentFinance(showToast = true) {
      if (!this.currentMatchId || !this.currentFinanceData) return;

      try {
        await window.stateManager.updateMatch(this.currentMatchId, {
          finance: this.currentFinanceData
        });

        if (showToast) {
          alert('✅ Đã lưu cấu hình tiền sân và danh sách đóng tiền thành công!');
          if (window.matchesModule && typeof window.matchesModule.renderMatches === 'function') {
            window.matchesModule.renderMatches();
          }
        }
      } catch (err) {
        console.error('Lỗi lưu tài chính trận:', err);
        if (showToast) alert('❌ Có lỗi xảy ra khi lưu: ' + err.message);
      }
    },

    // 1-Chạm Sao chép Báo Cáo Messenger vào Clipboard
    copyMessengerReport() {
      if (!this.currentFinanceData || !this.currentMatchId) return;

      const match = window.stateManager ? window.stateManager.getMatchById(this.currentMatchId) : null;
      const fin = this.currentFinanceData;

      const paidList = fin.payments.filter(p => p.isPaid).map(p => {
        return p.playerId === fin.payerPlayerId ? `${p.playerName} (Ứng tiền)` : p.playerName;
      });
      const unpaidList = fin.payments.filter(p => !p.isPaid).map(p => p.playerName);

      const VIET_BANKS = (root.TNTFinanceMixins && root.TNTFinanceMixins.modal && root.TNTFinanceMixins.modal.VIET_BANKS) || [];
      const bankName = fin.payerBankCode;

      const text = [
        `⚽ TỔNG KẾT TIỀN SÂN FC TNT - [${match ? match.date : 'Hôm nay'}]`,
        `🏟️ Trận: FC TNT vs ${match ? match.opponent : 'Đối thủ'}`,
        `💰 Tổng chi: ${formatMoney(fin.totalAmount)} (Sân: ${formatMoney(fin.pitchFee)}, Nước: ${formatMoney(fin.waterFee)})`,
        `👉 Chia đầu người: ${formatMoney(fin.splitAmountPerPerson)} / người (${fin.payments.length} người)`,
        `─────────────────────────`,
        `💳 THÔNG TIN NHẬN TIỀN:`,
        `• Người nhận: ${fin.payerAccountName || fin.payerName}`,
        `• Ngân hàng: ${bankName}`,
        `• Số tài khoản: ${fin.payerAccountNumber}`,
        `• Cú pháp: TNT [Ten_Ban] Tran ${match ? match.date.replace(/-/g, '') : ''}`,
        `─────────────────────────`,
        `✅ ĐÃ CHUYỂN (${paidList.length}/${fin.payments.length}): ${paidList.length > 0 ? paidList.join(', ') : 'Chưa có ai'}`,
        `⏳ CHƯA CHUYỂN (${unpaidList.length}): ${unpaidList.length > 0 ? unpaidList.join(', ') : 'Đã thu đủ 100%! 🎉'}`,
        unpaidList.length > 0 ? `\n👉 Anh em chưa chuyển quét mã QR hoặc bắn nốt giúp mình nhé!` : `\n🎉 Cảm ơn anh em đã đóng đủ tiền sân!`
      ].join('\n');

      if (root.TNT && root.TNT.utils && typeof root.TNT.utils.copyToClipboard === 'function') {
        root.TNT.utils.copyToClipboard(text, '📋 Đã sao chép nội dung báo cáo thu tiền vào Clipboard!').then(() => {
          const btn = document.getElementById('btn-copy-messenger');
          if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Đã Copy Tin Nhắn!';
            btn.style.background = 'var(--accent-emerald)';
            setTimeout(() => {
              btn.innerHTML = originalText;
              btn.style.background = '';
            }, 2500);
          }
        }).catch(() => {
          window.prompt('Sao chép nội dung báo cáo bên dưới:', text);
        });
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          const btn = document.getElementById('btn-copy-messenger');
          if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Đã Copy Tin Nhắn!';
            btn.style.background = 'var(--accent-emerald)';
            setTimeout(() => {
              btn.innerHTML = originalText;
              btn.style.background = '';
            }, 2500);
          }
          alert('📋 Đã sao chép nội dung báo cáo thu tiền vào Clipboard! Bạn có thể dán (Paste) ngay vào nhóm chat Messenger.');
        }).catch(err => {
          console.warn('Lỗi copy clipboard:', err);
          window.prompt('Sao chép nội dung báo cáo bên dưới:', text);
        });
      }
    }
  };

  root.TNTFinanceMixins = root.TNTFinanceMixins || {};
  root.TNTFinanceMixins.checklist = FinanceChecklistMixin;

})(typeof window !== 'undefined' ? window : this);
