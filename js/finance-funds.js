/**
 * FC TNT - Funds & Member Wallet Module (js/finance-funds.js)
 * Quản lý ví số dư thành viên, nạp quỹ linh hoạt, kiểm soát quyền Thủ Quỹ và sao chép báo cáo Zalo
 * Đăng ký thông qua Service Locator window.TNT.funds
 */

(function (root) {
  'use strict';

  class FundsModule {
    constructor() {
      this.playersBalances = [];
      this.summary = { totalFund: 0, positiveFund: 0, negativeFund: 0, playerCount: 0 };
      this.transactions = [];
      this.currentFilterPlayerId = null;
      this.searchKeyword = '';
      this.activeFilter = 'all'; // 'all', 'debt', 'low', 'good'
      this.topupSearchQuery = '';
      this.historyFilterType = 'all';
      this.rawTransactions = [];
      this._bindGlobalEvents();
    }

    _bindGlobalEvents() {
      if (typeof window !== 'undefined' && !this._globalEventsBound) {
        window.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            this.closeTopupModal();
            this.closeHistoryModal();
            this.closeFundsModal();
          }
        });
        this._globalEventsBound = true;
      }
    }

    // Helper kiểm tra quyền Thủ Quỹ
    isTreasurer() {
      if (root.stateManager && root.stateManager.isTreasurer) {
        return true;
      }
      if (root.TNT && root.TNT.state && typeof root.TNT.state.isTreasurerUser === 'function') {
        return root.TNT.state.isTreasurerUser();
      }
      return Boolean(sessionStorage.getItem('fc_tnt_treasurer_token') || localStorage.getItem('fc_tnt_treasurer_token'));
    }

    getTreasurerToken() {
      if (root.stateManager && typeof root.stateManager.getTreasurerToken === 'function') {
        return root.stateManager.getTreasurerToken();
      }
      if (root.TNT && root.TNT.state && typeof root.TNT.state.getTreasurerToken === 'function') {
        return root.TNT.state.getTreasurerToken();
      }
      return sessionStorage.getItem('fc_tnt_treasurer_token') || localStorage.getItem('fc_tnt_treasurer_token') || '';
    }

    // Định dạng tiền tệ VNĐ - Tuyệt đối không hiển thị -0đ
    formatMoney(amount) {
      const num = Number(amount) || 0;
      if (Math.abs(num) < 0.001) return '0đ';
      return num.toLocaleString('vi-VN') + 'đ';
    }

    // Tải danh sách số dư quỹ từ Server
    async fetchBalances() {
      try {
        const res = await fetch('/api/funds/balances');
        const data = await res.json();
        if (data.success) {
          this.playersBalances = data.players || [];
          this.summary = data.summary || this.summary;
          return data;
        }
      } catch (err) {
        console.warn('[Funds] Lỗi tải số dư quỹ:', err.message);
      }
      // Fallback từ stateManager
      if (root.stateManager) {
        const players = root.stateManager.getPlayers() || [];
        this.playersBalances = players.map(p => ({
          id: p.id,
          name: p.name,
          nickname: p.nickname,
          number: p.number,
          position: p.position,
          avatar: p.avatar,
          fundBalance: p.fundBalance || 0
        }));
      }
      return { success: false, players: this.playersBalances };
    }

    // =========================================================================
    // ĐIỀU HƯỚNG TRANG CHÍNH: SỔ QUỸ ĐỘI & VÍ THÀNH VIÊN
    // =========================================================================
    async openFundsModal() {
      this.closeFundsModal();
      if (window.appModule && typeof window.appModule.switchTab === 'function') {
        window.appModule.switchTab('funds');
      } else {
        await this.renderFundsPage();
      }
    }

    getFilteredPlayers() {
      const q = (this.searchKeyword || '').trim().toLowerCase();
      return this.playersBalances.filter(p => {
        if (q) {
          const name = (p.name || '').toLowerCase();
          const nick = (p.nickname || '').toLowerCase();
          const num = String(p.number || '');
          if (!name.includes(q) && !nick.includes(q) && !num.includes(q)) {
            return false;
          }
        }
        const bal = Number(p.fundBalance) || 0;
        if (this.activeFilter === 'debt') return bal < 0;
        if (this.activeFilter === 'low') return bal >= 0 && bal <= 50000;
        if (this.activeFilter === 'good') return bal > 50000;
        return true;
      });
    }

    onSearchInput(val) {
      this.searchKeyword = val;
      this.renderTableBody();
    }

    setFilter(filter) {
      this.activeFilter = filter;
      document.querySelectorAll('.fund-filter-pill').forEach(btn => {
        if (btn.getAttribute('data-filter') === filter) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      this.renderTableBody();
    }

    renderTableBody() {
      const tbody = document.getElementById('funds-table-tbody');
      if (!tbody) return;
      const filtered = this.getFilteredPlayers();
      const isTreas = this.isTreasurer();
      const esc = window.escapeHtml || (s => s);

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-dim, #94a3b8); font-size: 0.88rem;">
              🔍 Không tìm thấy thành viên nào phù hợp với bộ lọc hiện tại.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = filtered.map(p => {
        const bal = Number(p.fundBalance) || 0;
        let badgeClass = 'badge-green';
        let statusText = '🟢 Dồi dào';
        let balColor = 'var(--accent-emerald, #10b981)';
        let balPrefix = '+';

        if (bal < 0) {
          badgeClass = 'badge-red';
          statusText = '🔴 Đang nợ quỹ';
          balColor = '#f87171';
          balPrefix = '';
        } else if (bal <= 50000) {
          badgeClass = 'badge-yellow';
          statusText = bal === 0 ? '⚪ Hết quỹ' : '🟡 Sắp hết';
          balColor = bal === 0 ? '#94a3b8' : 'var(--accent-gold, #f59e0b)';
          balPrefix = bal === 0 ? '' : '+';
        }

        return `
          <tr>
            <td style="text-align: center; width: 48px;">
              <span class="fund-player-number-badge">${p.number || '-'}</span>
            </td>
            <td>
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <img src="${esc(p.avatar || 'assets/images/default-avatar.png')}" alt="" class="fin-table-avatar" onerror="this.src='assets/images/default-avatar.png'">
                <div style="display: flex; flex-direction: column; min-width: 0;">
                  <strong style="color: #fff; font-size: 0.92rem; white-space: nowrap;">${esc(p.name)}</strong>
                  ${p.nickname ? `<span style="color: var(--text-dim, #94a3b8); font-size: 0.75rem; white-space: nowrap;">(${esc(p.nickname)})</span>` : ''}
                </div>
              </div>
            </td>
            <td style="text-align: right; font-weight: 800; font-size: 0.98rem; font-family: var(--font-display, inherit); color: ${balColor};">
              ${balPrefix}${this.formatMoney(bal)}
            </td>
            <td style="text-align: center; width: 120px;">
              <span class="fund-status-badge ${badgeClass}">${statusText}</span>
            </td>
            <td style="text-align: right; width: 130px;">
              <div class="funds-action-cell">
                <button type="button" class="btn-fund-action btn-fund-history" onclick="window.TNT.funds.openHistoryModal('${p.id}')" title="Xem lịch sử biến động số dư">
                  📜
                </button>
                ${isTreas ? `
                  <button type="button" class="btn-fund-action btn-fund-topup" onclick="window.TNT.funds.openIndividualTopup('${p.id}')" title="Nạp thêm tiền quỹ">
                    ➕
                  </button>
                  <button type="button" class="btn-fund-action btn-fund-adjust" onclick="window.TNT.funds.openAdjustModal('${p.id}')" title="Điều chỉnh số dư quỹ">
                    ⚙️
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // =========================================================================
    // RENDER TRANG CHÍNH: SỔ QUỸ ĐỘI & VÍ THÀNH VIÊN (TAB FUNDS)
    // =========================================================================
    async renderFundsPage() {
      const container = document.getElementById('funds-page-container');
      if (!container) return;

      this.closeFundsModal();
      this._renderFundsPageContent(container);

      try {
        await this.fetchBalances();
        this._renderFundsPageContent(container);
      } catch (err) {
        console.warn('[Funds] Lỗi cập nhật số dư trang quỹ:', err.message);
      }
    }

    renderFundsModal() {
      return this.renderFundsPage();
    }

    _renderFundsPageContent(container) {
      if (!container) return;

      const isTreas = this.isTreasurer();
      const esc = window.escapeHtml || (s => s);

      // Thống kê phân loại thành viên
      const totalPlayers = this.playersBalances.length;
      const debtPlayers = this.playersBalances.filter(p => (Number(p.fundBalance) || 0) < 0).length;
      const lowPlayers = this.playersBalances.filter(p => {
        const b = Number(p.fundBalance) || 0;
        return b >= 0 && b <= 50000;
      }).length;
      const goodPlayers = this.playersBalances.filter(p => (Number(p.fundBalance) || 0) > 50000).length;
      const positivePlayers = this.playersBalances.filter(p => (Number(p.fundBalance) || 0) > 0).length;
      const coveragePercent = totalPlayers > 0 ? Math.round((positivePlayers / totalPlayers) * 100) : 0;

      const negativeVal = Number(this.summary.negativeFund) || 0;
      const negativeDisplay = negativeVal > 0 ? `-${this.formatMoney(negativeVal)}` : '0đ';
      const negativeClass = negativeVal > 0 ? 'text-danger' : 'text-neutral';

      container.innerHTML = `
        <!-- 1. TOP SUMMARY CARDS (3 THẺ GRADIENT CÓ WATERMARK) -->
        <div class="funds-summary-grid">
          <div class="funds-summary-box box-total">
            <div class="box-watermark">💰</div>
            <span class="box-label">Tổng Quỹ Hiện Có</span>
            <strong class="box-value ${this.summary.totalFund >= 0 ? 'text-positive' : 'text-danger'}">
              ${this.formatMoney(this.summary.totalFund)}
            </strong>
          </div>
          <div class="funds-summary-box box-positive">
            <div class="box-watermark">🟢</div>
            <span class="box-label">Tổng Dư Có Sẵn</span>
            <strong class="box-value text-positive">${this.formatMoney(this.summary.positiveFund)}</strong>
          </div>
          <div class="funds-summary-box box-negative">
            <div class="box-watermark">🔴</div>
            <span class="box-label">Tổng Anh Em Đang Nợ</span>
            <strong class="box-value ${negativeClass}">${negativeDisplay}</strong>
          </div>
        </div>

        <!-- 2. THANH TIẾN ĐỘ ĐỘ PHỦ QUỸ -->
        <div class="funds-coverage-bar">
          <div class="coverage-info">
            <span>🛡️ Độ phủ quỹ an toàn: <strong>${positivePlayers}/${totalPlayers} anh em</strong> có số dư khả dụng</span>
            <strong style="color: var(--accent-gold, #f59e0b);">${coveragePercent}%</strong>
          </div>
          <div class="coverage-track">
            <div class="coverage-fill" style="width: ${coveragePercent}%;"></div>
          </div>
        </div>

        <!-- 3. THANH CÔNG CỤ & QUYỀN THỦ QUỸ -->
        <div class="funds-toolbar">
          <div class="treasurer-status-badge ${isTreas ? 'unlocked' : 'locked'}">
            <span>${isTreas ? '🔓 Quyền Thủ Quỹ: ĐÃ MỞ KHÓA' : '🔒 Chế độ: XEM MINH BẠCH'}</span>
            ${isTreas 
              ? `<button type="button" class="btn btn-secondary btn-xs" onclick="window.TNT.funds.logoutTreasurer()">Khóa lại</button>`
              : `<button type="button" class="btn btn-warning btn-xs" onclick="window.TNT.funds.promptTreasurerLogin()">Mở khóa Thủ Quỹ</button>`
            }
          </div>

          <div class="funds-actions-group">
            <button type="button" class="btn btn-gold btn-sm" onclick="window.TNT.funds.openTopupModal()">
              ➕ Nạp Quỹ / Thu Tiền
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.TNT.funds.copyZaloReport()">
              📋 Copy Báo Cáo Zalo
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.TNT.funds.openHistoryModal()">
              📜 Lịch Sử Giao Dịch
            </button>
          </div>
        </div>

        <!-- 4. CARD BẢNG DANH SÁCH THÀNH VIÊN VÀ BỘ LỌC -->
        <div class="funds-page-card">
          <!-- THANH TÌM KIẾM & BỘ LỌC THÀNH VIÊN -->
          <div class="funds-filter-toolbar">
            <div class="funds-search-wrapper">
              <span class="funds-search-icon">🔍</span>
              <input type="text" id="funds-search-input" value="${esc(this.searchKeyword)}" placeholder="Tìm theo tên, biệt danh, số áo..." class="funds-search-input" oninput="window.TNT.funds.onSearchInput(this.value)">
            </div>
            <div class="funds-filter-pills">
              <button type="button" class="fund-filter-pill ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all" onclick="window.TNT.funds.setFilter('all')">
                Tất cả (${totalPlayers})
              </button>
              <button type="button" class="fund-filter-pill ${this.activeFilter === 'debt' ? 'active' : ''}" data-filter="debt" onclick="window.TNT.funds.setFilter('debt')">
                🔴 Đang nợ (${debtPlayers})
              </button>
              <button type="button" class="fund-filter-pill ${this.activeFilter === 'low' ? 'active' : ''}" data-filter="low" onclick="window.TNT.funds.setFilter('low')">
                🟡 Sắp hết (${lowPlayers})
              </button>
              <button type="button" class="fund-filter-pill ${this.activeFilter === 'good' ? 'active' : ''}" data-filter="good" onclick="window.TNT.funds.setFilter('good')">
                🟢 Dồi dào (${goodPlayers})
              </button>
            </div>
          </div>

          <!-- BẢNG DANH SÁCH THÀNH VIÊN VÀ SỐ DƯ -->
          <div class="funds-table-container">
            <table class="fin-table funds-table">
              <thead>
                <tr>
                  <th style="width: 48px; text-align: center;">#</th>
                  <th>Cầu Thủ</th>
                  <th style="text-align: right;">Số Dư Ví</th>
                  <th style="text-align: center; width: 120px;">Trạng Thái</th>
                  <th style="text-align: right; width: 130px;">Thao Tác</th>
                </tr>
              </thead>
              <tbody id="funds-table-tbody">
                <!-- Render động qua renderTableBody() -->
              </tbody>
            </table>
          </div>
        </div>
      `;

      this.renderTableBody();
    }

    closeFundsModal() {
      const modal = document.getElementById('modal-funds-management');
      if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
      }
    }

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
    }

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
                <input type="text" id="topup-bulk-note" value="Nạp quỹ tháng ${new Date().getMonth() + 1}" class="form-control" style="flex: 1; min-width: 200px;" placeholder="VD: Nạp quỹ tháng 10">
              </div>
            </div>

            <!-- CÔNG CỤ CHỌN DANH SÁCH & TÌM KIẾM NHANH -->
            <div class="topup-select-toolbar">
              <div class="topup-search-box">
                <span class="topup-search-icon">🔍</span>
                <input type="text" id="topup-search-input" placeholder="Tìm nhanh cầu thủ để tick..." oninput="window.TNT.funds.onTopupSearch(this.value)">
              </div>
              <div style="display: flex; gap: 0.4rem;">
                <button type="button" class="btn btn-secondary btn-xs" onclick="window.TNT.funds.toggleSelectAllTopup(true)">✓ Chọn tất cả</button>
                <button type="button" class="btn btn-secondary btn-xs" onclick="window.TNT.funds.toggleSelectAllTopup(false)">✗ Bỏ chọn</button>
              </div>
            </div>

            <!-- DANH SÁCH CẦU THỦ & Ô TIỀN RIÊNG -->
            <div class="topup-players-list" id="topup-players-list">
              ${this.playersBalances.map(p => {
                const isChecked = preSelectedPlayerId ? (p.id === preSelectedPlayerId) : false;
                const bal = Number(p.fundBalance) || 0;
                return `
                  <div class="topup-player-row ${isChecked ? 'active' : ''}" id="topup-row-${p.id}" data-name="${esc(p.name)}" data-nickname="${esc(p.nickname || '')}" data-number="${p.number || ''}">
                    <label class="topup-player-info">
                      <input type="checkbox" class="topup-chk" value="${p.id}" ${isChecked ? 'checked' : ''} onchange="window.TNT.funds.onTopupCheckboxChange(this)">
                      <span class="fund-player-number-badge" style="width: 24px; height: 24px; font-size: 0.75rem;">${p.number || '-'}</span>
                      <img src="${esc(p.avatar || 'assets/images/default-avatar.png')}" alt="" class="topup-player-avatar" onerror="this.src='assets/images/default-avatar.png'">
                      <div style="min-width: 0;">
                        <strong style="color: #fff; font-size: 0.88rem; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${esc(p.name)}
                          ${p.nickname ? `<span style="color: var(--text-dim, #94a3b8); font-size: 0.75rem; font-weight: normal;">(${esc(p.nickname)})</span>` : ''}
                        </strong>
                        <span style="color: var(--text-dim, #94a3b8); font-size: 0.74rem; display: block;">
                          Dư: <b style="color: ${bal >= 0 ? 'var(--accent-emerald, #10b981)' : '#f87171'}">${bal >= 0 ? '+' : ''}${this.formatMoney(bal)}</b>
                        </span>
                      </div>
                    </label>

                    <div style="display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0;">
                      <span style="font-size: 0.74rem; color: var(--text-dim, #94a3b8);">Nạp:</span>
                      <input type="number" class="form-control form-control-sm topup-amount-input" data-player-id="${p.id}" value="${defaultAmount}" step="10000" style="width: 110px; font-weight: 700; color: var(--accent-gold, #f59e0b); text-align: right;" oninput="window.TNT.funds.updateTopupSummary()">
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 3. STICKY FOOTER LUÔN DÍNH CHẶT Ở ĐÁY MODAL -->
          <div class="funds-modal-footer">
            <div class="topup-footer-summary">
              <span class="summary-label">Đang chọn:</span>
              <strong id="topup-summary-count" class="summary-count">0 người</strong>
              <span class="summary-sep">|</span>
              <span class="summary-label">Tổng tiền:</span>
              <strong id="topup-summary-total" class="summary-total">0đ</strong>
            </div>

            <button type="button" class="btn btn-gold btn-submit-topup" onclick="window.TNT.funds.submitTopup()" id="btn-submit-topup">
              ⚡ Xác Nhận Nạp Quỹ
            </button>
          </div>
        </div>
      `;

      modal.className = 'modal-backdrop modal-funds-overlay active';
      modal.style.display = 'flex';
      document.body.classList.add('no-scroll');
      this.updateTopupSummary();
    }

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
    }

    openIndividualTopup(playerId) {
      this.openTopupModal(playerId);
    }

    setDefaultAmount(amount) {
      const input = document.getElementById('topup-default-amount');
      if (input) {
        input.value = amount;
        this.onDefaultAmountChange(amount);
      }
    }

    onDefaultAmountChange(val) {
      const num = Number(val) || 0;
      document.querySelectorAll('.topup-chk:checked').forEach(chk => {
        const pId = chk.value;
        const amountInput = document.querySelector(`.topup-amount-input[data-player-id="${pId}"]`);
        if (amountInput) amountInput.value = num;
      });
      this.updateTopupSummary();
    }

    toggleSelectAllTopup(selectAll) {
      const defaultAmount = Number(document.getElementById('topup-default-amount')?.value) || 100000;
      document.querySelectorAll('.topup-player-row').forEach(row => {
        // Nếu đang tìm kiếm, chỉ ảnh hưởng đến các dòng đang hiển thị
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
    }

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
    }

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
    }

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
        if (amount <= 0) {
          alert(`Số tiền nạp của cầu thủ không hợp lệ (> 0đ)!`);
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

    // =========================================================================
    // MODAL ĐIỀU CHỈNH SỐ DƯ THỦ CÔNG
    // =========================================================================
    openAdjustModal(playerId) {
      if (!this.isTreasurer()) {
        this.promptTreasurerLogin(() => this.openAdjustModal(playerId));
        return;
      }

      const player = this.playersBalances.find(p => p.id === playerId);
      if (!player) return;

      const newBalStr = prompt(`Điều chỉnh số dư cho "${player.name}":\nSố dư hiện tại: ${this.formatMoney(player.fundBalance)}\nNhập số dư mới (VNĐ):`, player.fundBalance);
      if (newBalStr === null) return;

      const newBal = Number(newBalStr);
      if (isNaN(newBal)) {
        alert('Số tiền không hợp lệ!');
        return;
      }

      const reason = prompt('Nhập lý do điều chỉnh:', 'Điều chỉnh số dư quỹ');
      if (reason === null) return;

      this.submitAdjust(playerId, newBal, reason);
    }

    async submitAdjust(playerId, newBalance, reason) {
      try {
        const res = await fetch('/api/funds/adjust', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-treasurer-token': this.getTreasurerToken()
          },
          body: JSON.stringify({ playerId, newBalance, reason })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (root.showToast) root.showToast(data.message, 'success');
          else alert(data.message);
          await this.openFundsModal();
        } else {
          alert(data.error || 'Điều chỉnh số dư thất bại!');
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ: ' + err.message);
      }
    }

    // =========================================================================
    // MODAL LỊCH SỬ GIAO DỊCH (AUDIT LOG)
    // =========================================================================
    closeHistoryModal() {
      const modal = document.getElementById('modal-funds-history');
      if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
      }
      document.body.classList.remove('no-scroll');
    }

    async openHistoryModal(playerId = null) {
      this.currentFilterPlayerId = playerId;
      if (!this.playersBalances || this.playersBalances.length === 0) {
        await this.fetchBalances();
      }
      let url = '/api/funds/transactions?limit=100';
      if (playerId) url += `&playerId=${encodeURIComponent(playerId)}`;

      let transactions = [];
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) transactions = data.transactions || [];
      } catch (e) {
        console.warn('[Funds] Lỗi tải lịch sử:', e.message);
      }

      this.rawTransactions = transactions;
      this.historyFilterType = 'all';

      let modal = document.getElementById('modal-funds-history');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-funds-history';
        modal.className = 'modal-backdrop modal-funds-overlay';
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeHistoryModal();
        });
        document.body.appendChild(modal);
      } else if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
      }

      const esc = window.escapeHtml || (s => s);
      const filteredPlayer = playerId ? this.playersBalances.find(p => p.id === playerId) : null;

      const totalCount = transactions.length;
      const topupCount = transactions.filter(t => t.type === 'TOPUP').length;
      const matchCount = transactions.filter(t => t.type === 'MATCH_DEDUCT').length;
      const adjustCount = transactions.filter(t => t.type === 'ADJUSTMENT').length;

      modal.innerHTML = `
        <div class="modal-card modal-funds-card" style="max-width: 820px; width: 95%;">
          <!-- 1. HEADER (CỐ ĐỊNH Ở TRÊN) -->
          <div class="modal-header funds-modal-header">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span style="font-size: 1.4rem;">📜</span>
              <div>
                <h3 style="margin: 0; font-size: 1.15rem; color: #fff; font-weight: 800;">
                  Lịch Sử Biến Động Số Dư
                </h3>
                ${filteredPlayer 
                  ? `<span style="font-size: 0.78rem; color: var(--accent-gold, #f59e0b); font-weight: 700;">Lọc theo: #${filteredPlayer.number} ${esc(filteredPlayer.name)}</span>` 
                  : '<span style="font-size: 0.78rem; color: var(--text-dim, #94a3b8);">Nhật ký thu chi & biến động ví toàn đội bóng</span>'
                }
              </div>
            </div>
            <button type="button" class="modal-close-btn" onclick="window.TNT.funds.closeHistoryModal()">&times;</button>
          </div>

          <!-- 2. BODY (CUỘN ĐỘC LẬP BÊN TRONG) -->
          <div class="modal-body funds-modal-body">
            <!-- Nút quay lại toàn đội nếu đang lọc theo cá nhân -->
            ${playerId ? `
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <button type="button" class="btn btn-secondary btn-xs" onclick="window.TNT.funds.openHistoryModal()">
                  ← Xem toàn bộ giao dịch cả đội
                </button>
              </div>
            ` : ''}

            <!-- THANH BỘ LỌC THEO LOẠI GIAO DỊCH -->
            <div class="history-filter-pills">
              <button type="button" class="history-filter-pill active" data-type="all" onclick="window.TNT.funds.setHistoryFilter('all')">
                Tất cả (${totalCount})
              </button>
              <button type="button" class="history-filter-pill" data-type="TOPUP" onclick="window.TNT.funds.setHistoryFilter('TOPUP')">
                🟢 Nạp Quỹ (${topupCount})
              </button>
              <button type="button" class="history-filter-pill" data-type="MATCH_DEDUCT" onclick="window.TNT.funds.setHistoryFilter('MATCH_DEDUCT')">
                🔴 Tiền Sân (${matchCount})
              </button>
              <button type="button" class="history-filter-pill" data-type="ADJUSTMENT" onclick="window.TNT.funds.setHistoryFilter('ADJUSTMENT')">
                🟡 Điều Chỉnh (${adjustCount})
              </button>
            </div>

            <!-- BẢNG LỊCH SỬ GIAO DỊCH -->
            <div class="history-table-container">
              <table class="fin-table history-table">
                <thead>
                  <tr>
                    <th>Thời Gian</th>
                    <th>Cầu Thủ</th>
                    <th style="text-align: center;">Loại Giao Dịch</th>
                    <th style="text-align: right;">Biến Động</th>
                    <th style="text-align: right;">Số Dư Sau</th>
                    <th>Nội Dung</th>
                  </tr>
                </thead>
                <tbody id="history-table-tbody">
                  <!-- Render động qua _renderHistoryRows() -->
                </tbody>
              </table>
            </div>
          </div>

          <!-- 3. STICKY FOOTER Ở ĐÁY MODAL -->
          <div class="funds-modal-footer">
            <span style="font-size: 0.8rem; color: var(--text-dim, #94a3b8);" id="history-footer-count">
              Tổng cộng: ${totalCount} giao dịch
            </span>
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.TNT.funds.closeHistoryModal()">
              Đóng
            </button>
          </div>
        </div>
      `;

      modal.className = 'modal-backdrop modal-funds-overlay active';
      modal.style.display = 'flex';
      document.body.classList.add('no-scroll');
      this._renderHistoryRows();
    }

    setHistoryFilter(type) {
      this.historyFilterType = type;
      document.querySelectorAll('.history-filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-type') === type);
      });
      this._renderHistoryRows();
    }

    _renderHistoryRows() {
      const tbody = document.getElementById('history-table-tbody');
      if (!tbody) return;

      const esc = window.escapeHtml || (s => s);
      const filter = this.historyFilterType || 'all';
      const list = (this.rawTransactions || []).filter(t => {
        if (filter === 'all') return true;
        return t.type === filter;
      });

      const footerCount = document.getElementById('history-footer-count');
      if (footerCount) {
        footerCount.textContent = `Hiển thị: ${list.length} / ${this.rawTransactions.length} giao dịch`;
      }

      if (list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-dim, #94a3b8); font-size: 0.88rem;">
              🔍 Không tìm thấy giao dịch nào phù hợp với bộ lọc hiện tại.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = list.map(t => {
        const isPositive = Number(t.amount) > 0;
        const dateStr = new Date(t.createdAt).toLocaleString('vi-VN', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });

        let typeBadge = '<span class="fund-status-badge badge-green">🟢 Nạp quỹ</span>';
        if (t.type === 'MATCH_DEDUCT') typeBadge = '<span class="fund-status-badge badge-red">🔴 Tiền sân</span>';
        if (t.type === 'ADJUSTMENT') typeBadge = '<span class="fund-status-badge badge-yellow">🟡 Điều chỉnh</span>';

        const pAvatar = t.playerAvatar || 'assets/images/default-avatar.png';
        const pNum = t.playerNumber ? `<span class="fund-player-number-badge" style="width: 22px; height: 22px; font-size: 0.72rem;">${t.playerNumber}</span>` : '';

        return `
          <tr>
            <td style="font-size: 0.76rem; color: var(--text-dim, #94a3b8); white-space: nowrap;">${dateStr}</td>
            <td>
              <div class="history-player-cell">
                ${pNum}
                <img src="${esc(pAvatar)}" alt="" class="history-player-avatar" onerror="this.src='assets/images/default-avatar.png'">
                <strong style="color: #fff; font-size: 0.88rem;">${esc(t.playerName || 'Thành viên')}</strong>
              </div>
            </td>
            <td style="text-align: center;">${typeBadge}</td>
            <td style="text-align: right; font-weight: 800; font-family: var(--font-display, monospace); color: ${isPositive ? 'var(--accent-emerald, #10b981)' : '#f87171'};">
              ${isPositive ? '+' : ''}${this.formatMoney(t.amount)}
            </td>
            <td style="text-align: right; color: var(--text-dim, #94a3b8); font-size: 0.85rem; font-family: monospace;">
              ${this.formatMoney(t.balanceAfter)}
            </td>
            <td style="font-size: 0.82rem; color: var(--text-main, #e2e8f0); max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
              ${esc(t.note || '-')}
            </td>
          </tr>
        `;
      }).join('');
    }

    // =========================================================================
    // XÁC THỰC MÃ PIN THỦ QUỸ
    // =========================================================================
    promptTreasurerLogin(callback = null) {
      const pin = prompt('🔐 Nhập Mã PIN Thủ Quỹ (Chỉ Thủ Quỹ mới có quyền can thiệp số dư):');
      if (!pin) return;

      this.loginTreasurer(pin, callback);
    }

    async loginTreasurer(pin, callback = null) {
      try {
        const res = await fetch('/api/auth/treasurer/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          localStorage.setItem('fc_tnt_treasurer_token', data.token);
          if (root.stateManager) {
            root.stateManager.isTreasurer = true;
          }
          if (root.TNT && root.TNT.state) {
            root.TNT.state.isTreasurer = true;
          }
          if (root.appModule && typeof root.appModule.updateAuthUI === 'function') {
            root.appModule.updateAuthUI();
          }
          if (root.showToast) root.showToast('🔓 Đã mở khóa quyền Thủ Quỹ thành công!', 'success');
          else alert('🔓 Đã mở khóa quyền Thủ Quỹ!');

          this.renderFundsPage();
          if (typeof callback === 'function') callback();
        } else {
          alert(data.error || 'Mã PIN Thủ Quỹ không chính xác!');
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ: ' + err.message);
      }
    }

    logoutTreasurer() {
      localStorage.removeItem('fc_tnt_treasurer_token');
      sessionStorage.removeItem('fc_tnt_treasurer_token');
      if (root.stateManager) {
        root.stateManager.isTreasurer = false;
      }
      if (root.TNT && root.TNT.state) {
        root.TNT.state.isTreasurer = false;
      }
      if (root.appModule && typeof root.appModule.updateAuthUI === 'function') {
        root.appModule.updateAuthUI();
      }
      if (root.showToast) root.showToast('🔒 Đã khóa quyền Thủ Quỹ.', 'info');
      this.renderFundsPage();
    }

    // =========================================================================
    // ĐIỀU CHỈNH SỐ DƯ CÁ NHÂN THỦ CÔNG (ADJUST MODAL)
    // =========================================================================
    async openAdjustModal(playerId) {
      if (!this.isTreasurer()) {
        this.promptTreasurerLogin(() => this.openAdjustModal(playerId));
        return;
      }

      const player = (this.playersBalances || []).find(p => p.id === playerId);
      if (!player) {
        alert('Không tìm thấy thông tin cầu thủ!');
        return;
      }

      const currentBal = Number(player.fundBalance) || 0;
      const input = prompt(
        `⚙️ ĐIỀU CHỈNH SỐ DƯ QUỸ:\nCầu thủ: ${player.name} (#${player.number || '?'})\nSố dư hiện tại: ${this.formatMoney(currentBal)}\n\nNhập số dư mới mong muốn (VNĐ):`,
        currentBal
      );

      if (input === null) return;
      const cleanNum = parseInt(String(input).replace(/[^0-9-]/g, ''), 10);
      if (isNaN(cleanNum) || cleanNum < -20000000 || cleanNum > 50000000) {
        alert('Số tiền không hợp lệ! Vui lòng nhập số nguyên từ -20.000.000đ đến 50.000.000đ.');
        return;
      }

      const reason = prompt('Lý do điều chỉnh số dư (nhật ký giao dịch):', 'Điều chỉnh số dư quỹ thủ công');
      if (reason === null) return;

      try {
        const res = await fetch('/api/funds/adjust', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-treasurer-token': this.getTreasurerToken()
          },
          body: JSON.stringify({
            playerId,
            newBalance: cleanNum,
            reason: String(reason || '').trim() || 'Điều chỉnh thủ công'
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          if (root.showToast) root.showToast(`✅ ${data.message}`, 'success');
          else alert(data.message);
          await this.fetchBalances();
          this.renderFundsPage();
        } else {
          alert(data.error || 'Điều chỉnh số dư thất bại!');
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ: ' + err.message);
      }
    }

    // =========================================================================
    // SAO CHÉP BÁO CÁO ZALO 1 CHẠM
    // =========================================================================
    // =========================================================================
    copyZaloReport() {
      const now = new Date();
      const monthStr = `${now.getMonth() + 1}/${now.getFullYear()}`;
      
      const goodList = [];
      const lowList = [];
      const debtList = [];

      this.playersBalances.forEach(p => {
        const bal = Number(p.fundBalance) || 0;
        const line = `- #${p.number} ${p.name}: ${bal >= 0 ? '+' : ''}${this.formatMoney(bal)}`;
        if (bal < 0) debtList.push(line);
        else if (bal <= 50000) lowList.push(line);
        else goodList.push(line);
      });

      let report = `⚽ FC TNT - BÁO CÁO QUỸ ĐỘI BÓNG (Tháng ${monthStr})\n`;
      report += `💰 Tổng quỹ hiện có: ${this.formatMoney(this.summary.totalFund)}\n`;
      report += `------------------------------------\n`;

      if (debtList.length > 0) {
        report += `🔴 NỢ QUỸ / CẦN NỘP THÊM:\n${debtList.join('\n')}\n\n`;
      }

      if (lowList.length > 0) {
        report += `🟡 SẮP HẾT QUỸ (< 50k):\n${lowList.join('\n')}\n\n`;
      }

      if (goodList.length > 0) {
        report += `🟢 SỐ DƯ TỐT:\n${goodList.join('\n')}\n\n`;
      }

      report += `------------------------------------\n`;
      report += `💳 STK Quỹ: VCB 9392139587 - NGUYEN CONG QUAN\n`;
      report += `📝 Cú pháp: TNT [Tên bạn] nop quy`;

      navigator.clipboard.writeText(report).then(() => {
        if (root.showToast) root.showToast('📋 Đã sao chép báo cáo Zalo vào Clipboard!', 'success');
        else alert('Đã sao chép báo cáo Zalo!');
      }).catch(err => {
        console.warn('Lỗi copy clipboard:', err.message);
        alert('Không thể tự động copy. Vui lòng thử lại!');
      });
    }
  }

  const fundsModule = new FundsModule();

  // Đăng ký qua Service Locator window.TNT
  if (root.TNT) {
    root.TNT.register('funds', fundsModule);
    root.TNT.funds = fundsModule;
  }
  root.fundsModule = fundsModule;

})(typeof window !== 'undefined' ? window : this);
