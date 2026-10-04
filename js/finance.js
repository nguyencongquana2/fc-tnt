/**
 * Finance & Split Bill Module for FC TNT
 * Quản lý tiền sân, chia tiền đầu người, tự tạo mã VietQR và checklist đối soát
 */

const VIET_BANKS = [
  { code: 'MB', name: 'MB Bank (Quân Đội)' },
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'ICB', name: 'VietinBank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'ACB', name: 'ACB (Á Châu)' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'STB', name: 'Sacombank' },
  { code: 'VIB', name: 'VIB' },
  { code: 'SHB', name: 'SHB' },
  { code: 'LPB', name: 'LPBank (Lộc Phát)' },
  { code: 'MSB', name: 'MSB (Hàng Hải)' },
  { code: 'HDB', name: 'HDBank' },
  { code: 'OCB', name: 'OCB' },
  { code: 'SEAB', name: 'SeABank' },
  { code: 'TIMO', name: 'Timo' },
  { code: 'NAB', name: 'Nam A Bank' },
  { code: 'BAB', name: 'Bac A Bank' },
  { code: 'PVB', name: 'PVcomBank' },
  { code: 'VCCB', name: 'BVBank (Bản Việt)' }
];

class FinanceModule {
  constructor() {
    this.currentMatchId = null;
    this.currentFinanceData = null;
    this.selectedQrPlayerId = null;
    this._socketInitialized = false;

    if (typeof window !== 'undefined') {
      setTimeout(() => this.initSocketListeners(), 1200);
    }
  }

  getBankListHTML(selectedBankCode = 'VCB') {
    return VIET_BANKS.map(b => `
      <option value="${b.code}" ${b.code === selectedBankCode ? 'selected' : ''}>
        ${b.name} (${b.code})
      </option>
    `).join('');
  }

  // Mở Modal Quản Lý Tiền Sân
  openFinanceModal(matchId) {
    this.currentMatchId = matchId;
    this.selectedQrPlayerId = null;
    const match = window.stateManager.getMatchById(matchId);
    if (!match) {
      alert('Không tìm thấy thông tin trận đấu!');
      return;
    }

    const allPlayers = window.stateManager.getPlayers();
    
    // Khởi tạo hoặc lấy cấu hình tài chính hiện tại
    let finance = match.finance;
    if (!finance || !finance.payments || finance.payments.length === 0) {
      // Lấy danh sách cầu thủ có trong trận (playerStats) hoặc tất cả nếu chưa có
      const participantIds = (match.playerStats && match.playerStats.length > 0)
        ? match.playerStats.map(ps => ps.playerId)
        : allPlayers.map(p => p.id);

      // Tìm người trả mặc định (Quân Kun p_1 hoặc người đầu tiên)
      const firstPlayer = allPlayers.find(p => p.id === 'p_1') || allPlayers.find(p => p.id === participantIds[0]) || allPlayers[0];
      
      const defaultPitchFee = 600000;
      const defaultWaterFee = 50000;
      const defaultTotal = defaultPitchFee + defaultWaterFee;
      const count = Math.max(1, participantIds.length);
      const splitEach = Math.ceil((defaultTotal / count) / 1000) * 1000; // Làm tròn LÊN nghìn đồng (vd: 23.1k -> 24k)

      finance = {
        pitchFee: defaultPitchFee,
        waterFee: defaultWaterFee,
        otherFee: 0,
        totalAmount: defaultTotal,
        payerPlayerId: firstPlayer ? firstPlayer.id : 'p_1',
        payerName: firstPlayer ? firstPlayer.name : 'Quân Kun',
        payerBankCode: (firstPlayer && firstPlayer.bankCode) ? firstPlayer.bankCode : 'VCB',
        payerAccountNumber: (firstPlayer && firstPlayer.bankAccountNumber) ? firstPlayer.bankAccountNumber : '9392139587',
        payerAccountName: (firstPlayer && firstPlayer.bankAccountName) ? firstPlayer.bankAccountName : 'NGUYEN CONG QUAN',
        splitAmountPerPerson: splitEach,
        note: '',
        payments: participantIds.map(pId => {
          const p = allPlayers.find(x => x.id === pId);
          const isPayer = (pId === (firstPlayer ? firstPlayer.id : ''));
          return {
            playerId: pId,
            playerName: p ? p.name : 'Cầu thủ',
            amount: splitEach,
            isPaid: isPayer, // Người ứng tiền luôn luôn là ĐÃ NỘP
            paidAt: isPayer ? new Date().toISOString() : null,
            note: isPayer ? 'Đã ứng tiền sân' : ''
          };
        })
      };
    }

    this.currentFinanceData = JSON.parse(JSON.stringify(finance));
    this.renderFinanceModal(match);
    
    const modal = document.getElementById('match-finance-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeFinanceModal() {
    const modal = document.getElementById('match-finance-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
    this.currentMatchId = null;
    this.currentFinanceData = null;
  }

  // Tự động điền ngân hàng khi chọn người ứng tiền
  onPayerChange(playerId) {
    const player = window.stateManager.getPlayerById(playerId);
    if (player) {
      const bankSelect = document.getElementById('fin-bank-code');
      const accNumInput = document.getElementById('fin-acc-number');
      const accNameInput = document.getElementById('fin-acc-name');

      if (player.bankCode && bankSelect) bankSelect.value = player.bankCode;
      if (player.bankAccountNumber && accNumInput) accNumInput.value = player.bankAccountNumber;
      if (accNameInput) accNameInput.value = player.bankAccountName || player.name;

      this.recalculateAndRefresh();
    }
  }

  // Tính lại chi phí khi thay đổi tiền sân, tiền nước, hoặc người tham gia
  recalculateAndRefresh() {
    const pitchFee = parseInt(document.getElementById('fin-pitch-fee')?.value || '0', 10);
    const waterFee = parseInt(document.getElementById('fin-water-fee')?.value || '0', 10);
    const otherFee = parseInt(document.getElementById('fin-other-fee')?.value || '0', 10);
    const totalAmount = pitchFee + waterFee + otherFee;

    const payerSelect = document.getElementById('fin-payer-select');
    const payerPlayerId = payerSelect ? payerSelect.value : '';
    const payerPlayer = window.stateManager.getPlayerById(payerPlayerId);

    const payerBankCode = document.getElementById('fin-bank-code')?.value || 'VCB';
    const payerAccountNumber = document.getElementById('fin-acc-number')?.value.trim() || '';
    const payerAccountName = document.getElementById('fin-acc-name')?.value.trim() || '';

    // Lấy danh sách checkbox người tham gia được chọn
    const checkedCheckboxes = document.querySelectorAll('.fin-participant-checkbox:checked');
    const selectedPlayerIds = Array.from(checkedCheckboxes).map(cb => cb.value);
    
    const count = Math.max(1, selectedPlayerIds.length);
    // Làm tròn LÊN đến hàng nghìn đồng (ví dụ 23.1k -> 24k)
    const splitEach = Math.ceil((totalAmount / count) / 1000) * 1000;

    // Giữ trạng thái isPaid cũ nếu có
    const oldPaymentsMap = {};
    if (this.currentFinanceData && this.currentFinanceData.payments) {
      this.currentFinanceData.payments.forEach(p => {
        oldPaymentsMap[p.playerId] = p;
      });
    }

    const allPlayers = window.stateManager.getPlayers();
    const newPayments = selectedPlayerIds.map(pId => {
      const p = allPlayers.find(x => x.id === pId);
      const isPayer = (pId === payerPlayerId);
      const old = oldPaymentsMap[pId];
      const isPaid = isPayer ? true : (old ? old.isPaid : false);
      return {
        playerId: pId,
        playerName: p ? p.name : 'Cầu thủ',
        amount: splitEach,
        isPaid: isPaid,
        paidAt: isPaid ? (old && old.paidAt ? old.paidAt : new Date().toISOString()) : null,
        note: isPayer ? 'Đã ứng tiền sân' : (old ? old.note : '')
      };
    });

    this.currentFinanceData = {
      pitchFee,
      waterFee,
      otherFee,
      totalAmount,
      payerPlayerId,
      payerName: payerPlayer ? payerPlayer.name : '',
      payerBankCode,
      payerAccountNumber,
      payerAccountName,
      splitAmountPerPerson: splitEach,
      note: document.getElementById('fin-note')?.value || '',
      payments: newPayments
    };

    this.updateQRAndStatsDisplay();
    this.renderChecklistTable();
  }

  // Cập nhật hiển thị mã VietQR & Thống kê tiến độ thu tiền
  updateQRAndStatsDisplay() {
    const fin = this.currentFinanceData;
    if (!fin) return;

    // 1. Cập nhật thống kê tiền
    const totalEl = document.getElementById('fin-display-total');
    const splitEl = document.getElementById('fin-display-split');
    const countEl = document.getElementById('fin-display-count');
    if (totalEl) totalEl.innerText = fin.totalAmount.toLocaleString('vi-VN') + 'đ';
    if (splitEl) splitEl.innerText = fin.splitAmountPerPerson.toLocaleString('vi-VN') + 'đ';
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
      collectedAmountEl.innerHTML = `Đã thu: <strong style="color: var(--accent-emerald);">${collectedAmount.toLocaleString('vi-VN')}đ</strong> / ${fin.totalAmount.toLocaleString('vi-VN')}đ (Còn thiếu ${(fin.totalAmount - collectedAmount).toLocaleString('vi-VN')}đ)`;
    }

    // 3. Tạo mã VietQR động có cú pháp định danh Casso
    const qrContainer = document.getElementById('fin-qr-code-box');
    const qrImg = document.getElementById('fin-qr-img');
    const qrHint = document.getElementById('fin-qr-hint');
    const memoEl = document.getElementById('fin-qr-memo-content');
    const memoDescEl = document.getElementById('fin-qr-memo-desc');

    if (fin.payerAccountNumber && fin.payerBankCode) {
      const match = window.stateManager.getMatchById(this.currentMatchId);
      const matchShortId = this.currentMatchId ? String(this.currentMatchId).replace(/^(match_|m_)/, '') : '';
      const allPlayers = window.stateManager.getPlayers();
      
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
  }

  // Render bảng Checklist cầu thủ đã nộp / chưa nộp
  renderChecklistTable() {
    const listContainer = document.getElementById('fin-checklist-tbody');
    if (!listContainer || !this.currentFinanceData) return;

    const isAdmin = window.stateManager.isAdmin;
    const allPlayers = window.stateManager.getPlayers();
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
          <td style="font-weight: 700; color: var(--accent-gold);">${p.amount.toLocaleString('vi-VN')}đ</td>
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
  }

  // 1-Chạm Toggle nộp tiền của 1 cầu thủ (Dành cho Quản trị viên)
  togglePlayerPayment(playerId) {
    if (!window.stateManager.isAdmin) {
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
  }

  // Đánh dấu tất cả đã nộp hoặc chưa nộp
  setAllPayments(isPaid) {
    if (!window.stateManager.isAdmin) {
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
    if (this.currentMatchId) this.saveCurrentFinance(false);
  }

  // Render toàn bộ nội dung trong modal
  renderFinanceModal(match) {
    const isAdmin = window.stateManager.isAdmin;
    const allPlayers = window.stateManager.getPlayers();
    const fin = this.currentFinanceData;

    const modalBody = document.getElementById('match-finance-modal-body');
    if (!modalBody) return;

    // Danh sách id người đang tham gia chia tiền
    const activeParticipantIds = new Set(fin.payments.map(p => p.playerId));
    const bankObj = VIET_BANKS.find(b => b.code === fin.payerBankCode);
    const bankDisplayName = bankObj ? bankObj.name : (fin.payerBankCode || 'Vietcombank');

    modalBody.innerHTML = `
      <!-- Match Info Header -->
      <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--accent-gold); font-weight: 700; letter-spacing: 0.5px;">⚽ TRẬN ĐẤU</div>
          <h3 style="margin: 0.2rem 0; color: #fff; font-size: 1.2rem;">FC TNT vs ${window.escapeHtml(match.opponent)}</h3>
          <div style="color: var(--text-dim); font-size: 0.85rem;">🗓️ ${match.date} (${match.time || '19:30'}) - 🏟️ ${window.escapeHtml(match.venue || 'Sân bóng')}</div>
        </div>

        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          ${!isAdmin ? `
            <span class="auth-role-badge viewer" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">
              👁️ Chế độ Thành Viên
            </span>
          ` : `
            <span class="auth-role-badge admin" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">
              👑 Quyền Quản Trị
            </span>
          `}
          <button class="btn btn-gold btn-sm" onclick="window.financeModule.copyMessengerReport()" id="btn-copy-messenger" style="font-weight: 700; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">
            📋 1 Chạm Copy Báo Cáo Messenger
          </button>
        </div>
      </div>

      <div class="fin-layout-grid">
        <!-- CỘT TRÁI: THIẾT LẬP CHI PHÍ & MÃ VIETQR -->
        <div class="fin-left-col">
          <div class="fin-card">
            
            ${isAdmin ? `
              <h4 class="fin-section-title">💰 1. Thiết Lập Chi Phí Trận</h4>
              
              <div class="fin-input-grid">
                <div class="form-group">
                  <label>Tiền sân (VNĐ):</label>
                  <input type="number" id="fin-pitch-fee" value="${fin.pitchFee}" step="10000" oninput="window.financeModule.recalculateAndRefresh()" class="form-control">
                </div>

                <div class="form-group">
                  <label>Tiền nước & đá (VNĐ):</label>
                  <input type="number" id="fin-water-fee" value="${fin.waterFee}" step="5000" oninput="window.financeModule.recalculateAndRefresh()" class="form-control">
                </div>

                <div class="form-group" style="grid-column: span 2;">
                  <label>Chi phí khác (nếu có):</label>
                  <input type="number" id="fin-other-fee" value="${fin.otherFee || 0}" step="5000" oninput="window.financeModule.recalculateAndRefresh()" class="form-control">
                </div>
              </div>

              <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--border-color);">
                <h4 class="fin-section-title" style="margin-bottom: 0.75rem;">💳 2. Người Nhận Tiền (Đã Ứng Tiền Sân)</h4>
                
                <div class="form-group" style="margin-bottom: 0.75rem;">
                  <label>Chọn cầu thủ đã thanh toán:</label>
                  <select id="fin-payer-select" class="form-control" onchange="window.financeModule.onPayerChange(this.value)">
                    ${allPlayers.map(p => `
                      <option value="${p.id}" ${p.id === fin.payerPlayerId ? 'selected' : ''}>
                        #${p.number} - ${window.escapeHtml(p.name)} ${p.bankAccountNumber ? `(${window.escapeHtml(p.bankCode || 'NH')} - ${window.escapeHtml(p.bankAccountNumber)})` : ''}
                      </option>
                    `).join('')}
                  </select>
                </div>

                <div class="fin-input-grid">
                  <div class="form-group">
                    <label>Ngân hàng nhận:</label>
                    <select id="fin-bank-code" class="form-control" onchange="window.financeModule.recalculateAndRefresh()">
                      ${this.getBankListHTML(fin.payerBankCode)}
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Số tài khoản:</label>
                    <input type="text" id="fin-acc-number" value="${fin.payerAccountNumber || ''}" placeholder="Nhập STK..." class="form-control" oninput="window.financeModule.recalculateAndRefresh()">
                  </div>

                  <div class="form-group" style="grid-column: span 2;">
                    <label>Tên chủ tài khoản (không dấu):</label>
                    <input type="text" id="fin-acc-name" value="${fin.payerAccountName || ''}" placeholder="VD: NGUYEN VAN A" class="form-control" oninput="window.financeModule.recalculateAndRefresh()">
                  </div>
                </div>
              </div>
            ` : `
              <!-- Chế độ Thành viên: Thông tin rút gọn chỉ đọc -->
              <h4 class="fin-section-title">💳 Thông Tin Thanh Toán Tiền Sân</h4>
              
              <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.9rem 1rem; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                  <span style="color: var(--text-dim); font-size: 0.85rem;">Người nhận tiền:</span>
                  <strong style="color: #fff; font-size: 0.95rem;">${window.escapeHtml(fin.payerAccountName || fin.payerName || 'Quân Kun')}</strong>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                  <span style="color: var(--text-dim); font-size: 0.85rem;">Ngân hàng:</span>
                  <strong style="color: var(--accent-gold); font-size: 0.9rem;">${bankDisplayName}</strong>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                  <span style="color: var(--text-dim); font-size: 0.85rem;">Số tài khoản:</span>
                  <strong style="color: var(--accent-cyan); font-family: monospace; font-size: 1.05rem; letter-spacing: 0.5px;">${window.escapeHtml(fin.payerAccountNumber || '9392139587')}</strong>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.4rem; border-top: 1px dashed rgba(255,255,255,0.08);">
                  <span style="color: var(--text-dim); font-size: 0.85rem;">Tổng chi phí trận:</span>
                  <strong style="color: #fff;">${fin.totalAmount.toLocaleString('vi-VN')}đ</strong>
                </div>
              </div>
            `}

            <!-- Khung Mã VietQR -->
            <div style="margin-top: 1.25rem; background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem; text-align: center;">
              <div style="font-size: 0.85rem; font-weight: 700; color: var(--accent-gold); margin-bottom: 0.5rem; text-transform: uppercase;">
                📲 Quét Mã VietQR Chuyển Tiền Tự Điền Số Tiền
              </div>

              <!-- Lựa chọn người quét QR -->
              <div style="margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem; flex-wrap: wrap;">
                <label style="font-size: 0.8rem; color: var(--text-dim);">Chọn cầu thủ quét:</label>
                <select id="fin-qr-target-player" class="form-control form-control-sm" style="width: auto; max-width: 170px; font-size: 0.8rem; padding: 2px 6px; background: rgba(0,0,0,0.4);" onchange="window.financeModule.onQrTargetPlayerChange(this.value)">
                  <option value="">-- Quét chung cả đội --</option>
                  ${fin.payments.map(p => `<option value="${p.playerId}" ${this.selectedQrPlayerId === p.playerId ? 'selected' : ''}>${window.escapeHtml(p.playerName)}</option>`).join('')}
                </select>
              </div>
              
              <div id="fin-qr-code-box" style="width: 220px; height: 220px; margin: 0 auto; border-radius: 12px; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
                <img id="fin-qr-img" src="" alt="Mã VietQR" style="width: 100%; height: 100%; object-fit: contain; display: none;">
                <div id="fin-qr-hint" style="color: var(--text-dim); font-size: 0.8rem; padding: 1rem;">Đang tạo mã QR...</div>
              </div>

              <!-- Cú pháp chuyển khoản định danh -->
              <div style="margin-top: 0.65rem; background: rgba(0,0,0,0.3); border: 1px dashed rgba(255,255,255,0.15); border-radius: 8px; padding: 0.5rem;">
                <div style="font-size: 0.78rem; color: var(--text-dim); margin-bottom: 2px;">Cú pháp chuyển khoản tự động:</div>
                <div style="display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
                  <code id="fin-qr-memo-content" style="color: var(--accent-cyan); font-weight: 800; font-size: 0.95rem; font-family: monospace; letter-spacing: 0.5px;">TNT</code>
                  <button type="button" class="btn btn-secondary btn-xs" onclick="window.financeModule.copyMemoText()" title="Sao chép cú pháp" style="font-size: 0.72rem; padding: 1px 6px;">📋 Copy</button>
                </div>
                <div id="fin-qr-memo-desc" style="font-size: 0.72rem; color: var(--accent-emerald); margin-top: 3px;">
                  ✨ Hệ thống tự động gạch nợ sau 2 giây qua Casso Webhook!
                </div>
              </div>

              <div style="margin-top: 0.75rem; font-size: 0.85rem; color: var(--text-dim);">
                Số tiền mỗi người: <strong id="fin-display-split" style="color: var(--accent-gold); font-size: 1.1rem;">0đ</strong>
                <span style="font-size: 0.75rem; color: var(--accent-emerald); display: block; margin-top: 2px;">(Đã tự động làm tròn lên nghìn đồng)</span>
              </div>

              <!-- Nút hỗ trợ Casso -->
              <div style="margin-top: 0.75rem; display: flex; gap: 0.4rem; justify-content: center;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.financeModule.showCassoGuide()" style="font-size: 0.75rem; padding: 3px 8px;">
                  ⚡ Kết Nối Casso (0đ)
                </button>
              </div>
            </div>

          </div>
        </div>

        <!-- CỘT PHẢI: CHECKLIST NỘP TIỀN & DANH SÁCH THAM GIA -->
        <div class="fin-right-col">
          <div class="fin-card">
            
            <!-- Tiến độ thu tiền -->
            <div style="margin-bottom: 1.25rem; background: rgba(15, 23, 42, 0.6); padding: 1rem; border-radius: 10px; border: 1px solid var(--border-color);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">Tiến Độ Thu Tiền</span>
                <span id="fin-paid-count-text" style="font-weight: 800; color: var(--accent-emerald);">0/0 người</span>
              </div>

              <div class="fin-progress-track">
                <div id="fin-progress-bar-fill" class="fin-progress-fill" style="width: 0%;"></div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-size: 0.85rem;">
                <span id="fin-collected-amount-text" style="color: var(--text-dim);">Đã thu: 0đ</span>
                <span id="fin-progress-percent" style="font-weight: 700; color: var(--accent-cyan);">0%</span>
              </div>
            </div>

            <!-- Header danh sách chia tiền -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
              <h4 class="fin-section-title" style="margin: 0;">👥 3. Danh Sách Đóng Tiền (<span id="fin-display-count">${fin.payments.length}</span>)</h4>
              
              ${isAdmin ? `
                <div style="display: flex; gap: 0.4rem;">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="window.financeModule.setAllPayments(true)" title="Tất cả đã chuyển">
                    ✅ Tất Cả Đã Nộp
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="window.financeModule.setAllPayments(false)" title="Reset tất cả">
                    🔄 Reset
                  </button>
                </div>
              ` : ''}
            </div>

            ${isAdmin ? `
              <!-- Accordion chọn danh sách cầu thủ tham gia (Chỉ Admin mới có) -->
              <details style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 0.6rem 0.8rem; margin-bottom: 1rem; font-size: 0.85rem;">
                <summary style="cursor: pointer; font-weight: 600; color: var(--accent-cyan);">
                  ⚙️ Tùy chỉnh danh sách người chia (Bấm để thêm/bớt cầu thủ)
                </summary>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.4rem; margin-top: 0.75rem; max-height: 140px; overflow-y: auto; padding-right: 4px;">
                  ${allPlayers.map(p => `
                    <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; background: rgba(0,0,0,0.2); padding: 4px 6px; border-radius: 4px;">
                      <input type="checkbox" class="fin-participant-checkbox" value="${p.id}" ${activeParticipantIds.has(p.id) ? 'checked' : ''} onchange="window.financeModule.recalculateAndRefresh()">
                      <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${window.escapeHtml(p.name)}</span>
                    </label>
                  `).join('')}
                </div>
              </details>
            ` : ''}

            <!-- Bảng Checklist -->
            <div class="fin-table-wrapper" style="max-height: 340px; overflow-y: auto;">
              <table class="fin-table">
                <thead>
                  <tr>
                    <th style="width: 40px; text-align: center;">#</th>
                    <th>Cầu Thủ</th>
                    <th>Số Tiền</th>
                    <th style="text-align: right;">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody id="fin-checklist-tbody">
                  <!-- Rendered dynamically -->
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid var(--border-color); flex-wrap: wrap; gap: 0.75rem;">
        <div style="color: var(--text-dim); font-size: 0.85rem;">
          ${isAdmin ? `
            💡 <em>Mẹo: Bạn đang ở quyền Quản Trị. Chạm vào nút 🔴 Chưa nộp để chuyển sang 🟢 Đã nộp.</em>
          ` : `
            💡 <em>Thành viên quét mã VietQR ở trên để nộp tiền. Quản trị viên sau khi nhận được tiền sẽ xác nhận vào hệ thống.</em>
          `}
        </div>

        <div style="display: flex; gap: 0.75rem;">
          <button type="button" class="btn btn-secondary" onclick="window.financeModule.closeFinanceModal()">Đóng</button>
          ${isAdmin ? `
            <button type="button" class="btn btn-primary" onclick="window.financeModule.saveCurrentFinance(true)">💾 Lưu Cấu Hình</button>
          ` : ''}
        </div>
      </div>
    `;

    this.updateQRAndStatsDisplay();
    this.renderChecklistTable();
  }

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
  }

  // 1-Chạm Sao chép Báo Cáo Messenger vào Clipboard
  copyMessengerReport() {
    if (!this.currentFinanceData || !this.currentMatchId) return;

    const match = window.stateManager.getMatchById(this.currentMatchId);
    const fin = this.currentFinanceData;

    const paidList = fin.payments.filter(p => p.isPaid).map(p => {
      return p.playerId === fin.payerPlayerId ? `${p.playerName} (Ứng tiền)` : p.playerName;
    });
    const unpaidList = fin.payments.filter(p => !p.isPaid).map(p => p.playerName);

    const bankName = (VIET_BANKS.find(b => b.code === fin.payerBankCode)?.name || fin.payerBankCode);

    const text = [
      `⚽ TỔNG KẾT TIỀN SÂN FC TNT - [${match ? match.date : 'Hôm nay'}]`,
      `🏟️ Trận: FC TNT vs ${match ? match.opponent : 'Đối thủ'}`,
      `💰 Tổng chi: ${fin.totalAmount.toLocaleString('vi-VN')}đ (Sân: ${fin.pitchFee.toLocaleString('vi-VN')}đ, Nước: ${fin.waterFee.toLocaleString('vi-VN')}đ)`,
      `👉 Chia đầu người: ${fin.splitAmountPerPerson.toLocaleString('vi-VN')}đ / người (${fin.payments.length} người)`,
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
      // Fallback prompt
      window.prompt('Sao chép nội dung báo cáo bên dưới:', text);
    });
  }

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
  }

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
  }

  // Xử lý khi nhận được thông báo nộp tiền từ Casso Webhook
  handlePaymentReceived(data) {
    if (!data) return;

    this.playTingTingSound();

    if (window.showToast) {
      window.showToast(`💰 Ting ting! Cầu thủ "${data.playerName}" vừa nộp ${Number(data.amount).toLocaleString('vi-VN')}đ tiền sân! Tự động gạch nợ thành công 🎉`, 'success');
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
  }

  onQrTargetPlayerChange(playerId) {
    this.selectedQrPlayerId = playerId || null;
    this.updateQRAndStatsDisplay();
  }

  selectPlayerForQr(playerId) {
    this.selectedQrPlayerId = playerId;
    const select = document.getElementById('fin-qr-target-player');
    if (select) select.value = playerId;
    this.updateQRAndStatsDisplay();
    const player = window.stateManager ? window.stateManager.getPlayerById(playerId) : null;
    if (window.showToast && player) {
      window.showToast(`📲 Đã chuyển mã VietQR sang cho "${player.name}"!`, 'info');
    }
  }

  copyMemoText() {
    const memoEl = document.getElementById('fin-qr-memo-content');
    if (!memoEl) return;
    const text = memoEl.innerText.trim();
    navigator.clipboard.writeText(text).then(() => {
      if (window.showToast) {
        window.showToast(`📋 Đã copy cú pháp: "${text}"!`, 'success');
      }
    }).catch(() => {
      window.prompt('Sao chép cú pháp chuyển khoản:', text);
    });
  }


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

      const guideText = `⚡ HƯỚNG DẪN KẾT NỐI TỰ ĐỘNG THU TIỀN QUA CASSO.VN (MIỄN PHÍ 100%):

1. Đăng ký tài khoản miễn phí tại: https://casso.vn
2. Liên kết 1 tài khoản ngân hàng của Đội trưởng/Thủ quỹ (MBBank, Vietcombank, Techcombank, ACB...).
3. Vào mục Cài đặt Webhook trên Casso và điền:
   • URL Webhook: ${webhookUrl}
   • Tạo một mã "Secure Token" (Ví dụ: tnt_casso_secret_2026)
4. Mở file .env trên máy chủ thêm dòng:
   CASSO_WEBHOOK_TOKEN=mã_bạn_vừa_tạo

Trạng thái hiện tại: ${isConfigured ? '✅ ĐÃ CẤU HÌNH CASSO_WEBHOOK_TOKEN' : '⏳ CHƯA THIẾT LẬP CASSO_WEBHOOK_TOKEN'}`;

      window.prompt('Copy thông tin Webhook bên dưới để dán vào Casso.vn:', webhookUrl);
    } catch (e) {
      alert('Không thể lấy thông tin cấu hình webhook: ' + e.message);
    }
  }
}

const financeModule = new FinanceModule();
if (window.TNT) {
  window.TNT.register('finance', financeModule);
}
window.financeModule = financeModule;
