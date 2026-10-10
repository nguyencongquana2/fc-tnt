/**
 * FC TNT - Funds Submodule: Top-up Modal (js/funds/funds-topup.js)
 * Quản lý Modal Nạp Quỹ / Thu Tiền (#modal-funds-topup), thiết lập nhanh, tìm kiếm và tính tổng tiền
 */

(function (root) {
  'use strict';

  root.TNTFundsMixins = root.TNTFundsMixins || {};

  root.TNTFundsMixins.topup = {
    // =========================================================================
    // MODAL NẠP QUỸ LINH HOẠT (BULK & INDIVIDUAL TOP-UP)
    // =========================================================================
    closeTopupModal() {
      const modal = document.getElementById('modal-funds-topup');
      if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
      }
      this.topupSearchQuery = '';
      document.body.classList.remove('no-scroll');
    },

    openTopupModal(preSelectedPlayerId = null) {
      if (!this.isTreasurer()) {
        this.promptTreasurerLogin(() => this.openTopupModal(preSelectedPlayerId));
        return;
      }

      let modal = document.getElementById('modal-funds-topup');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-funds-topup';
        modal.className = 'modal-backdrop modal-funds-overlay';
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeTopupModal();
        });
        document.body.appendChild(modal);
      } else if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
      }

      const esc = window.escapeHtml || (s => s);
      const defaultAmount = 100000;
      this.topupSearchQuery = '';

      modal.innerHTML = `
        <div class="modal-card modal-funds-card" style="max-width: 680px; width: 95%;">
          <!-- 1. MODAL HEADER (CỐ ĐỊNH Ở TRÊN) -->
          <div class="modal-header funds-modal-header">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span style="font-size: 1.4rem;">➕</span>
              <div>
                <h3 style="margin: 0; font-size: 1.15rem; color: #fff; font-weight: 800;">Nạp Quỹ Đội Bóng</h3>
                <span style="font-size: 0.76rem; color: var(--text-dim, #94a3b8);">Nạp số dư ví cá nhân để tự động trừ tiền sân sau trận</span>
              </div>
            </div>
            <button type="button" class="modal-close-btn" onclick="window.TNT.funds.closeTopupModal()">&times;</button>
          </div>

          <!-- 2. MODAL BODY (CUỘN ĐỘC LẬP BÊN TRONG) -->
          <div class="modal-body funds-modal-body">
            <!-- THANH THIẾT LẬP NHANH -->
            <div class="topup-config-box">
              <div class="topup-config-row">
                <span class="topup-config-label">Số tiền mặc định:</span>
                <input type="number" id="topup-default-amount" value="${defaultAmount}" step="10000" class="form-control" style="width: 135px; font-weight: 700; color: var(--accent-gold, #f59e0b);" oninput="window.TNT.funds.onDefaultAmountChange(this.value)">
                <div class="topup-amount-chips">
                  <button type="button" class="topup-chip-btn" onclick="window.TNT.funds.setDefaultAmount(50000)">+50k</button>
                  <button type="button" class="topup-chip-btn" onclick="window.TNT.funds.setDefaultAmount(100000)">+100k</button>
                  <button type="button" class="topup-chip-btn" onclick="window.TNT.funds.setDefaultAmount(200000)">+200k</button>
                  <button type="button" class="topup-chip-btn" onclick="window.TNT.funds.setDefaultAmount(500000)">+500k</button>
                </div>
              </div>
              <div class="topup-config-row">
                <span class="topup-config-label">Nội dung thu:</span>
                <input type="text" id="topup-bulk-note" class="form-control" placeholder="VD: Nạp quỹ tháng 10" value="Nạp quỹ tháng ${new Date().getMonth() + 1}" style="flex: 1;">
              </div>
            </div>

            <!-- THANH CÔNG CỤ TÌM KIẾM & CHỌN NHANH -->
            <div class="topup-select-toolbar">
              <div class="topup-search-box">
                <span style="font-size: 0.9rem; color: var(--text-dim, #94a3b8);">🔍</span>
                <input type="text" class="topup-search-input" placeholder="Tìm nhanh cầu thủ để tick..." oninput="window.TNT.funds.onTopupSearch(this.value)">
              </div>
              <div style="display: flex; gap: 0.4rem;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.TNT.funds.toggleSelectAllTopup(true)">✓ Chọn tất cả</button>
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.TNT.funds.toggleSelectAllTopup(false)">✗ Bỏ chọn</button>
              </div>
            </div>

            <!-- DANH SÁCH CẦU THỦ CÓ CHECKBOX -->
            <div class="topup-players-list">
              ${this.playersBalances.map(p => {
                const isPre = preSelectedPlayerId && p.id === preSelectedPlayerId;
                const bal = Number(p.fundBalance) || 0;
                const balClass = bal >= 0 ? 'text-positive' : 'text-danger';
                const balPrefix = bal >= 0 ? '+' : '';
                return `
                  <div class="topup-player-row ${isPre ? 'active' : ''}" id="topup-row-${p.id}" data-name="${esc(p.name)}" data-nickname="${esc(p.nickname || '')}" data-number="${p.number || ''}">
                    <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0;">
                      <input type="checkbox" value="${p.id}" class="topup-chk" id="chk-topup-${p.id}" ${isPre ? 'checked' : ''} onchange="window.TNT.funds.onTopupCheckboxChange(this)">
                      <span class="fund-player-number-badge" style="width: 24px; height: 24px; font-size: 0.75rem;">${p.number || '-'}</span>
                      <img src="${esc(p.avatar || 'assets/images/default-avatar.png')}" alt="" class="fin-table-avatar" style="width: 32px; height: 32px;" onerror="this.src='assets/images/default-avatar.png'">
                      <div style="display: flex; flex-direction: column; min-width: 0;">
                        <strong style="color: #fff; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${esc(p.name)} ${p.nickname ? `<span style="color: var(--text-dim, #94a3b8); font-size: 0.75rem; font-weight: normal;">(${esc(p.nickname)})</span>` : ''}
                        </strong>
                        <span style="font-size: 0.72rem; color: var(--text-dim, #94a3b8);">
                          Dư: <strong class="${balClass}">${balPrefix}${this.formatMoney(bal)}</strong>
                        </span>
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                      <span style="font-size: 0.75rem; color: var(--text-dim, #94a3b8);">Nạp:</span>
                      <input type="number" class="form-control topup-amount-input" data-player-id="${p.id}" value="${defaultAmount}" step="10000" style="width: 110px; text-align: right; font-weight: 700; color: var(--accent-gold, #f59e0b);" oninput="window.TNT.funds.updateTopupSummary()">
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 3. STICKY FOOTER Ở ĐÁY MODAL (LUÔN DÍNH CHẶT DƯỚI ĐÁY) -->
          <div class="funds-modal-footer">
            <div class="topup-footer-summary">
              <span>Đang chọn: <strong id="topup-summary-count" style="color: #38bdf8;">0 người</strong></span>
              <span>| Tổng tiền: <strong id="topup-summary-total" style="color: var(--accent-gold, #f59e0b);">0đ</strong></span>
            </div>
            <button type="button" class="btn btn-submit-topup" id="btn-submit-topup" onclick="window.TNT.funds.submitTopup()">
              ⚡ Xác Nhận Nạp Quỹ
            </button>
          </div>
        </div>
      `;

      modal.className = 'modal-backdrop modal-funds-overlay active';
      modal.style.display = 'flex';
      document.body.classList.add('no-scroll');
      this.updateTopupSummary();
    },

    onTopupSearch(val) {
      const q = (val || '').trim().toLowerCase();
      this.topupSearchQuery = q;
      document.querySelectorAll('.topup-player-row').forEach(row => {
        const name = (row.getAttribute('data-name') || '').toLowerCase();
        const nick = (row.getAttribute('data-nickname') || '').toLowerCase();
        const num = (row.getAttribute('data-number') || '').toLowerCase();
        if (!q || name.includes(q) || nick.includes(q) || num.includes(q)) {
          row.style.display = 'flex';
        } else {
          row.style.display = 'none';
        }
      });
    },

    openIndividualTopup(playerId) {
      this.openTopupModal(playerId);
    },

    setDefaultAmount(amount) {
      const input = document.getElementById('topup-default-amount');
      if (input) {
        input.value = amount;
        this.onDefaultAmountChange(amount);
      }
    },

    onDefaultAmountChange(val) {
      const num = Number(val) || 0;
      document.querySelectorAll('.topup-chk:checked').forEach(chk => {
        const pId = chk.value;
        const amountInput = document.querySelector(`.topup-amount-input[data-player-id="${pId}"]`);
        if (amountInput) amountInput.value = num;
      });
      this.updateTopupSummary();
    },

    toggleSelectAllTopup(selectAll) {
      const defaultAmount = Number(document.getElementById('topup-default-amount')?.value) || 100000;
      document.querySelectorAll('.topup-player-row').forEach(row => {
        if (row.style.display === 'none') return;
        const chk = row.querySelector('.topup-chk');
        if (chk) {
          chk.checked = selectAll;
          row.classList.toggle('active', selectAll);
          const amountInput = document.querySelector(`.topup-amount-input[data-player-id="${chk.value}"]`);
          if (amountInput && selectAll && !amountInput.value) {
            amountInput.value = defaultAmount;
          }
        }
      });
      this.updateTopupSummary();
    },

    onTopupCheckboxChange(chk) {
      const row = document.getElementById(`topup-row-${chk.value}`);
      if (row) row.classList.toggle('active', chk.checked);
      if (chk.checked) {
        const defaultAmount = Number(document.getElementById('topup-default-amount')?.value) || 100000;
        const amountInput = document.querySelector(`.topup-amount-input[data-player-id="${chk.value}"]`);
        if (amountInput && (!amountInput.value || Number(amountInput.value) <= 0)) {
          amountInput.value = defaultAmount;
        }
      }
      this.updateTopupSummary();
    },

    updateTopupSummary() {
      let count = 0;
      let total = 0;
      document.querySelectorAll('.topup-chk:checked').forEach(chk => {
        count++;
        const amountInput = document.querySelector(`.topup-amount-input[data-player-id="${chk.value}"]`);
        if (amountInput) {
          total += (Number(amountInput.value) || 0);
        }
      });

      const countEl = document.getElementById('topup-summary-count');
      const totalEl = document.getElementById('topup-summary-total');
      if (countEl) countEl.textContent = `${count} người`;
      if (totalEl) totalEl.textContent = this.formatMoney(total);
    },

    async submitTopup() {
      const checkedBoxes = Array.from(document.querySelectorAll('.topup-chk:checked'));
      if (checkedBoxes.length === 0) {
        alert('Vui lòng tích chọn ít nhất 1 thành viên để nạp quỹ!');
        return;
      }

      const bulkNote = document.getElementById('topup-bulk-note')?.value || 'Nạp quỹ đội bóng';
      const items = [];

      for (const chk of checkedBoxes) {
        const pId = chk.value;
        const amountInput = document.querySelector(`.topup-amount-input[data-player-id="${pId}"]`);
        const amount = Number(amountInput?.value) || 0;
        if (!Number.isInteger(amount) || amount < 1000 || amount > 50000000) {
          alert(`Số tiền nạp của cầu thủ không hợp lệ (từ 1.000đ đến 50.000.000đ)!`);
          return;
        }
        items.push({ playerId: pId, amount, note: bulkNote });
      }

      const btn = document.getElementById('btn-submit-topup');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Đang nạp quỹ...';
      }

      try {
        const res = await fetch('/api/funds/topup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-treasurer-token': this.getTreasurerToken()
          },
          body: JSON.stringify({ items, bulkNote })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (root.showToast) root.showToast(`🎉 ${data.message}`, 'success');
          else alert(data.message);

          this.closeTopupModal();
          await this.fetchBalances();
          this.renderFundsPage();
        } else {
          alert(data.error || 'Nạp quỹ thất bại!');
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ khi nạp quỹ: ' + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '⚡ Xác Nhận Nạp Quỹ';
        }
      }
    }
  };

})(typeof window !== 'undefined' ? window : this);
