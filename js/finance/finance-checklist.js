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

  function canManageFinance() {
    const sm = window.stateManager;
    return Boolean((sm && (sm.isAdmin || sm.isTreasurer))
      || (root.TNT && root.TNT.funds && typeof root.TNT.funds.isTreasurer === 'function' && root.TNT.funds.isTreasurer())
      || sessionStorage.getItem('fc_tnt_treasurer_token')
      || localStorage.getItem('fc_tnt_treasurer_token'));
  }

  const FinanceChecklistMixin = {
    // Render bảng Checklist cầu thủ đã nộp / chưa nộp
    renderChecklistTable() {
      const listContainer = document.getElementById('fin-checklist-tbody');
      if (!listContainer || !this.currentFinanceData) return;

      const canManage = canManageFinance();
      const allPlayers = window.stateManager ? window.stateManager.getPlayers() : [];
      const payments = this.currentFinanceData.payments;

      if (payments.length === 0) {
        listContainer.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 1.5rem; color: var(--text-dim);">Chưa có cầu thủ nào được chọn tham gia chia tiền.</td></tr>`;
        return;
      }

      listContainer.innerHTML = payments.map((p, idx) => {
        const player = allPlayers.find(x => x.id === p.playerId);
        const isGuestFn = (root.TNTGuestJersey && typeof root.TNTGuestJersey.isGuestPlayer === 'function')
          ? root.TNTGuestJersey.isGuestPlayer
          : (pl => Boolean(pl && (pl.isGuest || pl.invitedBy)));
        const isGuest = isGuestFn(player);
        let avatar = player ? player.avatar : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
        if (isGuest && root.TNTGuestJersey && (!avatar || avatar.includes('unsplash'))) {
          avatar = root.TNTGuestJersey.generateJerseyDataUri(player?.jerseyColor || 'white', player?.number || 'K', player?.invitedBy);
        }
        const isPayer = (p.playerId === this.currentFinanceData.payerPlayerId);

        return `
          <tr class="fin-payment-row ${p.isPaid ? 'paid' : 'unpaid'}">
            <td style="width: 40px; text-align: center; color: var(--text-dim); font-weight: 600;">${idx + 1}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <img src="${avatar}" alt="${window.escapeHtml(p.playerName)}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1.5px solid ${p.isPaid ? 'var(--accent-emerald)' : (isGuest ? 'rgba(245, 158, 11, 0.7)' : 'rgba(255,255,255,0.1)')};">
                <div>
                  <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                    <strong style="color: var(--text-main); font-size: 0.95rem;">${window.escapeHtml(p.playerName)}</strong>
                    ${isPayer ? '<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: var(--accent-gold); font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;">Người ứng tiền</span>' : ''}
                    ${isGuest ? `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.35); font-size: 0.68rem; padding: 1px 5px; border-radius: 4px;" title="${p.isPaid ? 'Cầu thủ Khách (Đã nộp)' : (player && player.invitedBy ? 'Cầu thủ Khách có bảo lãnh: Sẽ trừ vào ví người bảo lãnh khi trừ quỹ' : 'Cầu thủ Khách: Vui lòng nộp qua VietQR hoặc tiền mặt')}">🤝 Khách${player && player.invitedBy ? ` (${window.escapeHtml(player.invitedBy)})` : ''}</span>` : ''}
                  </div>
                  ${p.note ? `<div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 1px;">${window.escapeHtml(p.note)}</div>` : ''}
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
                  ${canManage ? `
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
                      title="Trạng thái xác nhận bởi Quản Trị Viên / Thủ Quỹ"
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

    // 1-Chạm Toggle nộp tiền của 1 cầu thủ (Dành cho Quản trị viên HOẶC Thủ Quỹ)
    togglePlayerPayment(playerId) {
      if (!canManageFinance()) {
        alert('🔒 Bạn đang ở chế độ Thành Viên (Chỉ Xem). Vui lòng đăng nhập Quản Trị Viên hoặc Thủ Quỹ để tick xác nhận nộp tiền!');
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

    // Đánh dấu tất cả đã nộp hoặc chưa nộp (Quản trị viên HOẶC Thủ Quỹ)
    setAllPayments(isPaid) {
      if (!canManageFinance()) {
        alert('🔒 Thao tác này yêu cầu quyền Quản Trị Viên hoặc Thủ Quỹ!');
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

    // Trừ trực tiếp tiền sân vào ví số dư quỹ của các cầu thủ tham gia (Quyền Thủ Quỹ - 1 Chạm)
    // Hỗ trợ tự động trừ ví người bảo lãnh cho khách mời
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

      const payerId = fin.payerPlayerId;
      const allPlayers = window.stateManager ? window.stateManager.getPlayers() : [];
      const isGuestFn = (root.TNTGuestJersey && typeof root.TNTGuestJersey.isGuestPlayer === 'function')
        ? root.TNTGuestJersey.isGuestPlayer
        : (pl => Boolean(pl && (pl.isGuest || pl.invitedBy)));
      const resolveSponsorFn = (root.TNTGuestJersey && typeof root.TNTGuestJersey.resolveGuestSponsor === 'function')
        ? root.TNTGuestJersey.resolveGuestSponsor
        : null;

      // Phân nhóm: Thành viên chính thức vs Khách có bảo lãnh vs Khách chưa có bảo lãnh
      const unpaidOfficial = [];
      const sponsoredGuests = [];
      const unsponsoredGuests = [];

      (fin.payments || []).forEach(p => {
        if (p.isPaid || p.playerId === payerId) return;
        const pl = allPlayers.find(x => x.id === p.playerId);
        if (isGuestFn(pl) || (p.note && p.note.includes('Khách'))) {
          const sponsor = resolveSponsorFn ? resolveSponsorFn(pl, allPlayers) : null;
          if (sponsor) {
            sponsoredGuests.push({ payment: p, guestPlayer: pl, sponsorPlayer: sponsor });
          } else {
            unsponsoredGuests.push({ payment: p, guestPlayer: pl });
          }
        } else {
          unpaidOfficial.push({ payment: p, player: pl });
        }
      });

      if (unpaidOfficial.length === 0 && sponsoredGuests.length === 0) {
        if (unsponsoredGuests.length > 0) {
          const guestNames = unsponsoredGuests.map(g => g.payment.playerName).join(', ');
          alert(
            `ℹ️ Tất cả THÀNH VIÊN và KHÁCH CÓ BẢO LÃNH đều đã nộp (hoặc ứng tiền)!\n\n` +
            `⚠️ Còn ${unsponsoredGuests.length} KHÁCH MỜI CHƯA CÓ BẢO LÃNH:\n👉 ${guestNames}\n\n` +
            `💡 Vui lòng cho khách quét mã VietQR hoặc thu tiền mặt trực tiếp!`
          );
        } else {
          alert('✅ Tất cả thành viên trong trận đấu này đều ĐÃ NỘP TIỀN SÂN (hoặc là người ứng tiền)!\nKhông còn ai chưa nộp để trừ ví.');
        }
        return;
      }

      let treasurerToken = window.TNT && window.TNT.funds && typeof window.TNT.funds.getTreasurerToken === 'function'
        ? window.TNT.funds.getTreasurerToken()
        : (sessionStorage.getItem('fc_tnt_treasurer_token') || localStorage.getItem('fc_tnt_treasurer_token') || '');

      // Nếu chưa có token trong phiên, yêu cầu nhập PIN Thủ Quỹ (chỉ nhập 1 lần)
      if (!treasurerToken) {
        const pin = prompt('🔐 Thao tác trừ ví yêu cầu quyền THỦ QUỸ!\nVui lòng nhập Mã PIN Thủ Quỹ:');
        if (!pin) return;

        try {
          const authRes = await fetch('/api/auth/treasurer/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: pin.trim() })
          });
          const authData = await authRes.json();
          if (authRes.ok && authData.success) {
            treasurerToken = authData.token;
            localStorage.setItem('fc_tnt_treasurer_token', treasurerToken);
            if (window.stateManager) window.stateManager.isTreasurer = true;
            if (window.TNT?.state) window.TNT.state.isTreasurer = true;
            if (window.TNT?.bus) window.TNT.bus.emit('auth:treasurer_changed', { isTreasurer: true, token: treasurerToken });
            if (window.app?.updateAuthUI) window.app.updateAuthUI();
            const match = window.stateManager?.getMatchById(this.currentMatchId);
            if (match && typeof this.renderFinanceModal === 'function') this.renderFinanceModal(match);
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

      // Gom nhóm số tiền trừ theo từng thành viên
      const sponsorSummaryMap = new Map();
      unpaidOfficial.forEach(item => {
        const p = item.player || { id: item.payment.playerId, name: item.payment.playerName };
        if (!sponsorSummaryMap.has(p.id)) {
          sponsorSummaryMap.set(p.id, { player: p, selfDeduct: splitAmount, guestDeducts: [] });
        } else {
          sponsorSummaryMap.get(p.id).selfDeduct = splitAmount;
        }
      });

      sponsoredGuests.forEach(sg => {
        const s = sg.sponsorPlayer;
        if (!sponsorSummaryMap.has(s.id)) {
          sponsorSummaryMap.set(s.id, { player: s, selfDeduct: 0, guestDeducts: [] });
        }
        sponsorSummaryMap.get(s.id).guestDeducts.push({
          guestPlayerId: sg.payment.playerId,
          guestName: sg.payment.playerName
        });
      });

      let confirmMsg = `📋 XÁC NHẬN TRỪ TIỀN SÂN VÀO VÍ SỐ DƯ QUỸ:\n` +
        `- Trận đấu: FC TNT vs ${opponent}\n` +
        `- Số tiền chia mỗi suất: ${formatMoney(splitAmount)}\n` +
        `- Thành viên chính thức (${unpaidOfficial.length} người): ${formatMoney(unpaidOfficial.length * splitAmount)}\n\n`;

      if (sponsoredGuests.length > 0) {
        confirmMsg += `🤝 SUẤT BẢO LÃNH KHÁCH (${sponsoredGuests.length} người):\n`;
        sponsoredGuests.forEach(sg => {
          const s = sg.sponsorPlayer;
          const sLabel = s.nickname ? `${s.nickname} (#${s.number})` : `${s.name} (#${s.number})`;
          confirmMsg += `• ${sg.payment.playerName} -> Trừ vào ví người bảo lãnh: ${sLabel} (-${formatMoney(splitAmount)})\n`;
        });
        confirmMsg += `\n`;
      }

      confirmMsg += `👉 TỔNG HỢP TRỪ VÍ TỪNG THÀNH VIÊN:\n`;
      sponsorSummaryMap.forEach(info => {
        const s = info.player;
        const sLabel = s.nickname ? `${s.nickname} (#${s.number})` : `${s.name} (#${s.number})`;
        const total = info.selfDeduct + (info.guestDeducts.length * splitAmount);
        const parts = [];
        if (info.selfDeduct > 0) parts.push(`1 suất mình: -${formatMoney(splitAmount)}`);
        info.guestDeducts.forEach(gd => parts.push(`1 suất khách ${gd.guestName}: -${formatMoney(splitAmount)}`));
        confirmMsg += `• ${sLabel} sẽ bị trừ: ${formatMoney(total)} (${parts.join(', ')})\n`;
      });
      confirmMsg += `\n`;

      if (unsponsoredGuests.length > 0) {
        const unNames = unsponsoredGuests.map(g => g.payment.playerName).join(', ');
        confirmMsg += `⚠️ KHÁCH CHƯA CÓ BẢO LÃNH (${unsponsoredGuests.length} người - Cần thu VietQR/tiền mặt):\n• ${unNames}\n\n`;
      }

      confirmMsg += `Bạn có chắc chắn muốn thực hiện trừ ví ngay bây giờ?`;

      if (!confirm(confirmMsg)) return;

      const participantIds = unpaidOfficial.map(item => item.payment.playerId);
      const guestPayload = sponsoredGuests.map(sg => ({
        guestPlayerId: sg.payment.playerId,
        sponsorPlayerId: sg.sponsorPlayer.id,
        guestName: sg.payment.playerName,
        sponsorName: sg.sponsorPlayer.nickname || sg.sponsorPlayer.name
      }));

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
            sponsoredGuests: guestPayload,
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
            } else {
              const sgMatch = sponsoredGuests.find(sg => sg.payment.playerId === p.playerId);
              if (sgMatch) {
                p.isPaid = true;
                p.paidAt = new Date().toISOString();
                p.note = `Trừ vào ví người bảo lãnh (${sgMatch.sponsorPlayer.nickname || sgMatch.sponsorPlayer.name})`;
              }
            }
          });

          if (Array.isArray(data.updatedPlayers) && window.stateManager) {
            data.updatedPlayers.forEach(up => {
              const pl = window.stateManager.getPlayerById(up.playerId);
              if (pl) pl.fundBalance = up.balanceAfter;
            });
          }

          if (window.TNT?.bus) {
            window.TNT.bus.emit('funds:updated', data);
            window.TNT.bus.emit('players:updated');
          }

          this.updateQRAndStatsDisplay();
          this.renderChecklistTable();
          if (typeof this.playTingTingSound === 'function') this.playTingTingSound();
          if (window.showToast) window.showToast(`🎉 ${data.message}`, 'success'); else alert(data.message);
          if (this.currentMatchId) this.saveCurrentFinance(false);
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
        await window.stateManager.updateMatch(this.currentMatchId, { finance: this.currentFinanceData });
        if (showToast) {
          const msg = '✅ Đã lưu cấu hình tiền sân và danh sách đóng tiền thành công!';
          if (window.showToast) window.showToast(msg, 'success'); else alert(msg);
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
      const allPlayers = window.stateManager ? window.stateManager.getPlayers() : [];
      const isGuestFn = (root.TNTGuestJersey && typeof root.TNTGuestJersey.isGuestPlayer === 'function')
        ? root.TNTGuestJersey.isGuestPlayer
        : (pl => Boolean(pl && (pl.isGuest || pl.invitedBy)));

      const paidList = fin.payments.filter(p => p.isPaid).map(p => {
        const pl = allPlayers.find(x => x.id === p.playerId);
        const guestTag = isGuestFn(pl) ? ' (Khách)' : '';
        return p.playerId === fin.payerPlayerId ? `${p.playerName} (Ứng tiền)` : `${p.playerName}${guestTag}`;
      });

      const unpaidOfficial = [];
      const unpaidGuests = [];
      fin.payments.filter(p => !p.isPaid).forEach(p => {
        const pl = allPlayers.find(x => x.id === p.playerId);
        (isGuestFn(pl) ? unpaidGuests : unpaidOfficial).push(p.playerName);
      });

      const unpaidSummary = [];
      if (unpaidOfficial.length > 0) unpaidSummary.push(`• Thành viên (${unpaidOfficial.length}): ${unpaidOfficial.join(', ')}`);
      if (unpaidGuests.length > 0) unpaidSummary.push(`• Khách mời (${unpaidGuests.length}): ${unpaidGuests.join(', ')} (Quét QR / chuyển khoản)`);

      const text = [
        `⚽ TỔNG KẾT TIỀN SÂN FC TNT - [${match ? match.date : 'Hôm nay'}]`,
        `🏟️ Trận: FC TNT vs ${match ? match.opponent : 'Đối thủ'}`,
        `💰 Tổng chi: ${formatMoney(fin.totalAmount)} (Sân: ${formatMoney(fin.pitchFee)}, Nước: ${formatMoney(fin.waterFee)})`,
        `👉 Chia đầu người: ${formatMoney(fin.splitAmountPerPerson)} / người (${fin.payments.length} người)`,
        `─────────────────────────`,
        `💳 THÔNG TIN NHẬN TIỀN:`,
        `• Người nhận: ${fin.payerAccountName || fin.payerName}`,
        `• Ngân hàng: ${fin.payerBankCode}`,
        `• Số tài khoản: ${fin.payerAccountNumber}`,
        `• Cú pháp: TNT [Ten_Ban] Tran ${match ? match.date.replace(/-/g, '') : ''}`,
        `─────────────────────────`,
        `✅ ĐÃ CHUYỂN (${paidList.length}/${fin.payments.length}): ${paidList.length > 0 ? paidList.join(', ') : 'Chưa có ai'}`,
        `⏳ CHƯA CHUYỂN (${unpaidOfficial.length + unpaidGuests.length}):`,
        ...(unpaidSummary.length > 0 ? unpaidSummary : ['🎉 Đã thu đủ 100%! Cảm ơn anh em!']),
        (unpaidOfficial.length === 0 && unpaidGuests.length === 0) ? `\n🎉 Cảm ơn anh em & khách mời đã đóng đủ tiền sân!` : `\n👉 Anh em & khách mời chưa chuyển quét mã QR hoặc bắn nốt giúp mình nhé!`
      ].filter(Boolean).join('\n');

      const notifyCopySuccess = () => {
        const btn = document.getElementById('btn-copy-messenger');
        if (btn) {
          const originalText = btn.innerHTML;
          btn.innerHTML = '✅ Đã Copy Tin Nhắn!';
          btn.style.background = 'var(--accent-emerald)';
          setTimeout(() => { btn.innerHTML = originalText; btn.style.background = ''; }, 2500);
        }
      };

      if (root.TNT && root.TNT.utils && typeof root.TNT.utils.copyToClipboard === 'function') {
        root.TNT.utils.copyToClipboard(text, '📋 Đã sao chép nội dung báo cáo thu tiền vào Clipboard!')
          .then(notifyCopySuccess)
          .catch(() => window.prompt('Sao chép nội dung báo cáo bên dưới:', text));
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
          .then(() => {
            notifyCopySuccess();
            alert('📋 Đã sao chép nội dung báo cáo thu tiền vào Clipboard!');
          })
          .catch(err => {
            console.warn('Lỗi copy clipboard:', err);
            window.prompt('Sao chép nội dung báo cáo bên dưới:', text);
          });
      }
    }
  };

  root.TNTFinanceMixins = root.TNTFinanceMixins || {};
  root.TNTFinanceMixins.checklist = FinanceChecklistMixin;

})(typeof window !== 'undefined' ? window : this);
