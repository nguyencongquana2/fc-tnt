/**
 * FC TNT - Finance Modal & Calculations Submodule (js/finance/finance-modal.js)
 * Quản lý khởi tạo cấu hình chia tiền trận đấu, form thiết lập chi phí & render Modal
 */

(function (root) {
  'use strict';

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
    { code: 'PVB', name: 'PVcomBank' }
  ];

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

  const FinanceModalMixin = {
    getBankListHTML(selectedBankCode = 'VCB') {
      return VIET_BANKS.map(b => `
        <option value="${b.code}" ${b.code === selectedBankCode ? 'selected' : ''}>
          ${b.name} (${b.code})
        </option>
      `).join('');
    },

    // Mở Modal Quản Lý Tiền Sân
    openFinanceModal(matchId) {
      this.currentMatchId = matchId;
      this.selectedQrPlayerId = null;
      const match = window.stateManager ? window.stateManager.getMatchById(matchId) : null;
      if (!match) {
        alert('Không tìm thấy thông tin trận đấu!');
        return;
      }

      const allPlayers = window.stateManager ? window.stateManager.getPlayers() : [];
      
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
        const splitEach = Math.ceil((defaultTotal / count) / 1000) * 1000; // Làm tròn LÊN nghìn đồng

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
    },

    closeFinanceModal() {
      const modal = document.getElementById('match-finance-modal');
      if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
      this.currentMatchId = null;
      this.currentFinanceData = null;
    },

    // Tự động điền ngân hàng khi chọn người ứng tiền
    onPayerChange(playerId) {
      const player = window.stateManager ? window.stateManager.getPlayerById(playerId) : null;
      if (player) {
        const bankSelect = document.getElementById('fin-bank-code');
        const accNumInput = document.getElementById('fin-acc-number');
        const accNameInput = document.getElementById('fin-acc-name');

        if (player.bankCode && bankSelect) bankSelect.value = player.bankCode;
        if (player.bankAccountNumber && accNumInput) accNumInput.value = player.bankAccountNumber;
        if (accNameInput) accNameInput.value = player.bankAccountName || player.name;

        this.recalculateAndRefresh();
      }
    },

    // Tính lại chi phí khi thay đổi tiền sân, tiền nước, hoặc người tham gia
    recalculateAndRefresh() {
      const pitchFee = parseInt(document.getElementById('fin-pitch-fee')?.value || '0', 10);
      const waterFee = parseInt(document.getElementById('fin-water-fee')?.value || '0', 10);
      const otherFee = parseInt(document.getElementById('fin-other-fee')?.value || '0', 10);
      const totalAmount = pitchFee + waterFee + otherFee;

      const payerSelect = document.getElementById('fin-payer-select');
      const payerPlayerId = payerSelect ? payerSelect.value : '';
      const payerPlayer = window.stateManager ? window.stateManager.getPlayerById(payerPlayerId) : null;

      const payerBankCode = document.getElementById('fin-bank-code')?.value || 'VCB';
      const payerAccountNumber = document.getElementById('fin-acc-number')?.value.trim() || '';
      const payerAccountName = document.getElementById('fin-acc-name')?.value.trim() || '';

      // Lấy danh sách checkbox người tham gia được chọn
      const checkedCheckboxes = document.querySelectorAll('.fin-participant-checkbox:checked');
      const selectedPlayerIds = Array.from(checkedCheckboxes).map(cb => cb.value);
      
      const count = Math.max(1, selectedPlayerIds.length);
      // Làm tròn LÊN đến hàng nghìn đồng
      const splitEach = Math.ceil((totalAmount / count) / 1000) * 1000;

      // Giữ trạng thái isPaid cũ nếu có
      const oldPaymentsMap = {};
      if (this.currentFinanceData && this.currentFinanceData.payments) {
        this.currentFinanceData.payments.forEach(p => {
          oldPaymentsMap[p.playerId] = p;
        });
      }

      const allPlayers = window.stateManager ? window.stateManager.getPlayers() : [];
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
    },

    // Render toàn bộ nội dung trong modal
    renderFinanceModal(match) {
      const isAdmin = window.stateManager ? window.stateManager.isAdmin : false;
      const allPlayers = window.stateManager ? window.stateManager.getPlayers() : [];
      const fin = this.currentFinanceData;

      const modalBody = document.getElementById('match-finance-modal-body');
      if (!modalBody) return;

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
                    <strong style="color: #fff;">${formatMoney(fin.totalAmount)}</strong>
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
                  <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                    <button type="button" class="btn btn-gold btn-sm" onclick="window.financeModule.deductFromMemberFunds()" id="btn-deduct-fund" title="Trừ trực tiếp tiền sân vào ví số dư quỹ của các cầu thủ tham gia" style="font-weight: 700; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);">
                      ⚡ Trừ Ví Số Dư Quỹ
                    </button>
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
  };

  root.TNTFinanceMixins = root.TNTFinanceMixins || {};
  root.TNTFinanceMixins.modal = FinanceModalMixin;

})(typeof window !== 'undefined' ? window : this);
