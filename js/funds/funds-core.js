/**
 * FC TNT - Funds Submodule: Core State & Table UI (js/funds/funds-core.js)
 * Quản lý trạng thái số dư, bảng danh sách ví, điều chỉnh số dư, xuất báo cáo Zalo và xác thực Thủ Quỹ
 */

(function (root) {
  'use strict';

  class FundsModule {
    constructor() {
      this.playersBalances = [];
      this.summary = {
        totalFund: 0,
        positiveFund: 0,
        negativeFund: 0,
        playerCount: 0
      };
      this.filterStatus = 'all'; // all, good, low, debt
      this.sortBy = 'default'; // default, balance_desc, balance_asc, jersey_asc
      this.searchQuery = '';
      this.topupSearchQuery = '';
      this.historyFilterType = 'all';
      this.rawTransactions = [];
      this.isTreasurerLoggedIn = false;

      // Nạp các submodule mixin (topup, history) nếu có
      if (root.TNTFundsMixins) {
        if (root.TNTFundsMixins.topup) Object.assign(this, root.TNTFundsMixins.topup);
        if (root.TNTFundsMixins.history) Object.assign(this, root.TNTFundsMixins.history);
        if (root.TNTFundsMixins.adjust) Object.assign(this, root.TNTFundsMixins.adjust);
      }

      this.init();
    }

    init() {
      this.bindGlobalEvents();
      this.listenRealtime();
    }

    bindGlobalEvents() {
      // Đóng modal khi nhấn ESC
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (typeof this.closeTopupModal === 'function') this.closeTopupModal();
          if (typeof this.closeHistoryModal === 'function') this.closeHistoryModal();
          this.closeFundsModal();
        }
      });
    }

    listenRealtime() {
      // Tự động đồng bộ số dư quỹ khi có sự kiện Socket.IO từ server
      if (typeof window !== 'undefined') {
        window.addEventListener('tnt:data_updated', (e) => {
          if (e.detail && e.detail.type === 'funds') {
            this.fetchBalances().then(() => this.renderFundsPage());
          }
        });
      }
    }

    // =========================================================================
    // DỮ LIỆU & API SỐ DƯ QUỸ
    // =========================================================================
    async fetchBalances() {
      try {
        const res = await fetch('/api/funds/balances');
        const data = await res.json();
        if (data.success) {
          this.summary = data.summary || this.summary;
          this.playersBalances = data.players || [];
        }
      } catch (err) {
        console.warn('[Funds] Không thể tải dữ liệu số dư quỹ:', err.message);
      }
    }

    setFilterStatus(status) {
      this.filterStatus = status;
      document.querySelectorAll('.funds-filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === status);
      });
      const tbody = document.getElementById('funds-table-tbody');
      if (tbody) this._renderPlayersTable(tbody);
    }

    onSearchInput(val) {
      this.searchQuery = (val || '').trim().toLowerCase();
      const clearBtn = document.querySelector('.funds-search-clear-btn');
      if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';
      const tbody = document.getElementById('funds-table-tbody');
      if (tbody) this._renderPlayersTable(tbody);
    }

    clearSearch() {
      this.searchQuery = '';
      const input = document.querySelector('.funds-search-input');
      if (input) input.value = '';
      const clearBtn = document.querySelector('.funds-search-clear-btn');
      if (clearBtn) clearBtn.style.display = 'none';
      const tbody = document.getElementById('funds-table-tbody');
      if (tbody) this._renderPlayersTable(tbody);
    }

    setSortBy(val) {
      const validSorts = ['default', 'balance_desc', 'balance_asc', 'jersey_asc'];
      this.sortBy = validSorts.includes(val) ? val : 'default';
      const sortSelect = document.querySelector('.funds-sort-select');
      if (sortSelect) {
        sortSelect.value = this.sortBy;
        sortSelect.classList.toggle('is-sorted', this.sortBy !== 'default');
      }
      this._updateSortHeaders();
      const tbody = document.getElementById('funds-table-tbody');
      if (tbody) this._renderPlayersTable(tbody);
    }

    toggleBalanceSort() {
      const nextSort = this.sortBy === 'balance_desc' ? 'balance_asc' : (this.sortBy === 'balance_asc' ? 'default' : 'balance_desc');
      this.setSortBy(nextSort);
    }

    toggleJerseySort() {
      this.setSortBy(this.sortBy === 'jersey_asc' ? 'default' : 'jersey_asc');
    }

    _getSortIndicator(field) {
      if (field === 'balance') return this.sortBy === 'balance_desc' ? '▼' : (this.sortBy === 'balance_asc' ? '▲' : '⇅');
      if (field === 'jersey') return this.sortBy === 'jersey_asc' ? '▲' : '⇅';
      return '';
    }

    _updateSortHeaders() {
      const balTh = document.querySelector('.funds-table th.col-balance');
      const balInd = document.getElementById('th-sort-balance');
      if (balTh && balInd) {
        balTh.classList.toggle('active-sort', this.sortBy === 'balance_desc' || this.sortBy === 'balance_asc');
        balInd.textContent = this._getSortIndicator('balance');
      }

      const jerTh = document.querySelector('.funds-table th.col-jersey');
      const jerInd = document.getElementById('th-sort-jersey');
      if (jerTh && jerInd) {
        jerTh.classList.toggle('active-sort', this.sortBy === 'jersey_asc');
        jerInd.textContent = this._getSortIndicator('jersey');
      }
    }

    _renderPlayersTable(tbody) {
      if (!tbody) return;

      const esc = window.escapeHtml || (s => s);
      const isTreas = this.isTreasurer();

      let filtered = [...this.playersBalances];

      // Sổ quỹ chỉ tính và hiển thị thành viên chính thức của đội bóng (loại bỏ hoàn toàn viện binh / khách mời)
      const isGuestFn = (root.TNTGuestJersey && typeof root.TNTGuestJersey.isGuestPlayer === 'function')
        ? root.TNTGuestJersey.isGuestPlayer
        : (p => Boolean(p && (p.isGuest || p.invitedBy)));

      filtered = filtered.filter(p => !isGuestFn(p));

      // 1. Lọc theo trạng thái quỹ
      if (this.filterStatus === 'debt') {
        filtered = filtered.filter(p => (Number(p.fundBalance) || 0) < 0);
      } else if (this.filterStatus === 'low') {
        filtered = filtered.filter(p => {
          const b = Number(p.fundBalance) || 0;
          return b >= 0 && b <= 50000;
        });
      } else if (this.filterStatus === 'good') {
        filtered = filtered.filter(p => (Number(p.fundBalance) || 0) > 50000);
      }

      // 2. Tìm kiếm theo tên / số áo
      if (this.searchQuery) {
        filtered = filtered.filter(p => {
          const name = (p.name || '').toLowerCase();
          const nick = (p.nickname || '').toLowerCase();
          const num = String(p.number || '');
          return name.includes(this.searchQuery) || nick.includes(this.searchQuery) || num.includes(this.searchQuery);
        });
      }

      // 3. Sắp xếp danh sách ví (an toàn số âm, NaN và số áo 0)
      const parseJersey = (p) => {
        const n = parseInt(p.number, 10);
        return Number.isNaN(n) ? 999 : n;
      };

      if (this.sortBy === 'balance_desc') {
        filtered.sort((a, b) => {
          const diff = (Number(b.fundBalance) || 0) - (Number(a.fundBalance) || 0);
          return diff !== 0 ? diff : (parseJersey(a) - parseJersey(b));
        });
      } else if (this.sortBy === 'balance_asc') {
        filtered.sort((a, b) => {
          const diff = (Number(a.fundBalance) || 0) - (Number(b.fundBalance) || 0);
          return diff !== 0 ? diff : (parseJersey(a) - parseJersey(b));
        });
      } else if (this.sortBy === 'jersey_asc') {
        filtered.sort((a, b) => parseJersey(a) - parseJersey(b));
      }

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
          <tr class="fund-player-item-row">
            <td class="col-jersey">
              <span class="fund-player-number-badge">${p.number || '-'}</span>
            </td>
            <td class="col-player-info">
              <div class="fund-player-identity">
                <img src="${esc(p.avatar || 'assets/images/default-avatar.png')}" alt="" class="fin-table-avatar" onerror="this.src='assets/images/default-avatar.png'">
                <div class="fund-player-name-wrap">
                  <div class="fund-player-name-row">
                    <strong class="fund-player-name">${esc(p.name)}</strong>
                    ${p.nickname ? `<span class="fund-player-nickname">(${esc(p.nickname)})</span>` : ''}
                  </div>
                  <span class="fund-status-badge fund-status-badge-inline ${badgeClass}">${statusText}</span>
                </div>
              </div>
            </td>
            <td class="col-balance">
              <span class="mobile-col-label">Số dư:</span>
              <span class="fund-balance-amount" style="color: ${balColor};">
                ${balPrefix}${this.formatMoney(bal)}
              </span>
            </td>
            <td class="col-status">
              <span class="fund-status-badge ${badgeClass}">${statusText}</span>
            </td>
            <td class="col-actions">
              <div class="funds-action-cell">
                <button type="button" class="btn-fund-action btn-fund-history" onclick="window.TNT.funds.openHistoryModal('${p.id}')" title="Xem lịch sử biến động số dư">
                  <span>📜</span><span class="mobile-action-text">Lịch sử</span>
                </button>
                ${isTreas ? `
                  <button type="button" class="btn-fund-action btn-fund-topup" onclick="window.TNT.funds.openIndividualTopup('${p.id}')" title="Nạp thêm tiền quỹ">
                    <span>➕</span><span class="mobile-action-text">Nạp quỹ</span>
                  </button>
                  <button type="button" class="btn-fund-action btn-fund-adjust" onclick="window.TNT.funds.openAdjustModal('${p.id}')" title="Điều chỉnh số dư quỹ">
                    <span>⚙️</span><span class="mobile-action-text">Sửa</span>
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

    _renderFundsPageContent(container) {
      if (!container) return;

      const isTreas = this.isTreasurer();
      const esc = window.escapeHtml || (s => s);

      // Thống kê phân loại thành viên (Sổ quỹ chỉ dành riêng cho thành viên chính thức)
      const isGuestFn = (root.TNTGuestJersey && typeof root.TNTGuestJersey.isGuestPlayer === 'function')
        ? root.TNTGuestJersey.isGuestPlayer
        : (p => Boolean(p && (p.isGuest || p.invitedBy)));
      const activeBalances = this.playersBalances.filter(p => !isGuestFn(p));

      let calcTotalFund = 0, calcPositiveFund = 0, calcNegativeFund = 0;
      activeBalances.forEach(p => {
        const bal = Number(p.fundBalance) || 0;
        if (bal >= 0) calcPositiveFund += bal; else calcNegativeFund += Math.abs(bal);
        calcTotalFund += bal;
      });

      const totalPlayers = activeBalances.length;
      const debtPlayers = activeBalances.filter(p => (Number(p.fundBalance) || 0) < 0).length;
      const lowPlayers = activeBalances.filter(p => {
        const b = Number(p.fundBalance) || 0;
        return b >= 0 && b <= 50000;
      }).length;
      const goodPlayers = activeBalances.filter(p => (Number(p.fundBalance) || 0) > 50000).length;
      const positivePlayers = activeBalances.filter(p => (Number(p.fundBalance) || 0) > 0).length;
      const coveragePercent = totalPlayers > 0 ? Math.round((positivePlayers / totalPlayers) * 100) : 0;

      const negativeDisplay = calcNegativeFund > 0 ? `-${this.formatMoney(calcNegativeFund)}` : '0đ';
      const negativeClass = calcNegativeFund > 0 ? 'text-danger' : 'text-neutral';

      container.innerHTML = `
        <!-- 1. TOP SUMMARY CARDS (3 THẺ GRADIENT CÓ WATERMARK) -->
        <div class="funds-summary-grid">
          <div class="funds-summary-box box-total">
            <div class="box-watermark">💰</div>
            <span class="box-label">Tổng Quỹ Hiện Có</span>
            <strong class="box-value ${calcTotalFund >= 0 ? 'text-positive' : 'text-danger'}">
              ${this.formatMoney(calcTotalFund)}
            </strong>
          </div>
          <div class="funds-summary-box box-positive">
            <div class="box-watermark">🟢</div>
            <span class="box-label">Tổng Dư Có Sẵn</span>
            <strong class="box-value text-positive">${this.formatMoney(calcPositiveFund)}</strong>
          </div>
          <div class="funds-summary-box box-negative">
            <div class="box-watermark">🔴</div>
            <span class="box-label">Tổng Anh Em Đang Nợ</span>
            <strong class="box-value ${negativeClass}">${negativeDisplay}</strong>
          </div>
        </div>

        <!-- 2. HEALTH & COVERAGE BAR -->
        <div class="funds-health-card">
          <div class="funds-health-header">
            <div class="funds-health-title">
              <span style="font-size: 1.1rem;">🛡️</span>
              <div>
                <strong>Chỉ Số An Toàn Quỹ Đội</strong>
                <span class="funds-health-sub">Tỉ lệ thành viên có số dư dương trong ví cá nhân</span>
              </div>
            </div>
            <span class="funds-health-badge">${coveragePercent}% An toàn</span>
          </div>
          <div class="funds-progress-track">
            <div class="funds-progress-fill" style="width: ${coveragePercent}%;"></div>
          </div>
          <div class="funds-stats-pills">
            <span class="funds-stat-pill pill-good">🟢 Dồi dào: <strong>${goodPlayers}</strong></span>
            <span class="funds-stat-pill pill-low">🟡 Sắp hết (< 50k): <strong>${lowPlayers}</strong></span>
            <span class="funds-stat-pill pill-debt">🔴 Đang nợ: <strong>${debtPlayers}</strong></span>
          </div>
        </div>

        <!-- 3. ACTIONS & CONTROLS TOOLBAR -->
        <div class="funds-toolbar">
          <div class="funds-toolbar-left">
            <div class="funds-search-box">
              <span class="funds-search-icon">🔍</span>
              <input type="text" class="funds-search-input" placeholder="Tìm theo tên, số áo..." value="${esc(this.searchQuery)}" oninput="window.TNT.funds.onSearchInput(this.value)">
              <button type="button" class="funds-search-clear-btn" style="${this.searchQuery ? 'display:flex;' : 'display:none;'}" onclick="window.TNT.funds.clearSearch()" title="Xóa tìm kiếm">&times;</button>
            </div>
            <div class="funds-sort-box">
              <span class="funds-sort-icon">⇅</span>
              <select class="funds-sort-select ${this.sortBy !== 'default' ? 'is-sorted' : ''}" onchange="window.TNT.funds.setSortBy(this.value)" aria-label="Sắp xếp danh sách ví">
                <option value="default" ${this.sortBy === 'default' ? 'selected' : ''}>Sắp xếp: Mặc định</option>
                <option value="balance_desc" ${this.sortBy === 'balance_desc' ? 'selected' : ''}>Số dư: Cao ➔ Thấp (Giảm dần)</option>
                <option value="balance_asc" ${this.sortBy === 'balance_asc' ? 'selected' : ''}>Số dư: Thấp ➔ Cao (Tăng dần)</option>
                <option value="jersey_asc" ${this.sortBy === 'jersey_asc' ? 'selected' : ''}>Số áo: Nhỏ ➔ Lớn</option>
              </select>
            </div>
            <div class="funds-filter-pills">
              <button type="button" class="funds-filter-pill ${this.filterStatus === 'all' ? 'active' : ''}" data-filter="all" onclick="window.TNT.funds.setFilterStatus('all')">
                <span class="pill-title">Tất cả</span> <strong class="pill-count">(${totalPlayers})</strong>
              </button>
              <button type="button" class="funds-filter-pill pill-good ${this.filterStatus === 'good' ? 'active' : ''}" data-filter="good" onclick="window.TNT.funds.setFilterStatus('good')">
                <span class="pill-dot">🟢</span> <span class="pill-title">Dồi dào</span> <strong class="pill-count">(${goodPlayers})</strong>
              </button>
              <button type="button" class="funds-filter-pill pill-low ${this.filterStatus === 'low' ? 'active' : ''}" data-filter="low" onclick="window.TNT.funds.setFilterStatus('low')">
                <span class="pill-dot">🟡</span> <span class="pill-title">Sắp hết</span> <strong class="pill-count">(${lowPlayers})</strong>
              </button>
              <button type="button" class="funds-filter-pill pill-debt ${this.filterStatus === 'debt' ? 'active' : ''}" data-filter="debt" onclick="window.TNT.funds.setFilterStatus('debt')">
                <span class="pill-dot">🔴</span> <span class="pill-title">Đang nợ</span> <strong class="pill-count">(${debtPlayers})</strong>
              </button>
            </div>
          </div>

          <div class="funds-toolbar-actions ${isTreas ? 'is-treasurer' : 'not-treasurer'}">
            ${isTreas ? `
              <button type="button" class="btn btn-fund-topup-main" onclick="window.TNT.funds.openTopupModal()">
                <span>➕</span> <span class="btn-text-full">Nạp / Thu Tiền</span><span class="btn-text-short">Nạp Quỹ</span>
              </button>
              <button type="button" class="btn btn-fund-history-main" onclick="window.TNT.funds.openHistoryModal()">
                <span>📜</span> <span class="btn-text-full">Lịch Sử Giao Dịch</span><span class="btn-text-short">Lịch Sử</span>
              </button>
              <button type="button" class="btn btn-fund-zalo" onclick="window.TNT.funds.copyZaloReport()" title="Sao chép báo cáo chi tiết gửi Zalo">
                <span>📋</span> <span class="btn-text-full">Copy Zalo</span><span class="btn-text-short">Báo Cáo</span>
              </button>
              <button type="button" class="btn btn-fund-treasurer-active" onclick="window.TNT.funds.logoutTreasurer()" title="Bấm để khóa quyền Thủ Quỹ">
                <span>🔐</span> <span class="btn-text-full">Khóa Thủ Quỹ</span><span class="btn-text-short">Khóa Quỹ</span>
              </button>
            ` : `
              <button type="button" class="btn btn-fund-treasurer" onclick="window.TNT.funds.promptTreasurerLogin()">
                <span>🔑</span> <span class="btn-text-full">Mở Khóa Thủ Quỹ</span><span class="btn-text-short">Mở Khóa Thủ Quỹ</span>
              </button>
              <button type="button" class="btn btn-fund-history-main" onclick="window.TNT.funds.openHistoryModal()">
                <span>📜</span> <span class="btn-text-full">Lịch Sử Giao Dịch</span><span class="btn-text-short">Lịch Sử</span>
              </button>
              <button type="button" class="btn btn-fund-zalo" onclick="window.TNT.funds.copyZaloReport()" title="Sao chép báo cáo chi tiết gửi Zalo">
                <span>📋</span> <span class="btn-text-full">Copy Zalo</span><span class="btn-text-short">Báo Cáo</span>
              </button>
            `}
          </div>
        </div>

        <!-- 4. MAIN PLAYERS BALANCE TABLE -->
        <div class="funds-table-container">
          <table class="fin-table funds-table">
            <thead>
              <tr>
                <th class="col-jersey th-sortable ${this.sortBy === 'jersey_asc' ? 'active-sort' : ''}" onclick="window.TNT.funds.toggleJerseySort()" title="Bấm để sắp xếp theo số áo">
                  <div class="th-sort-inner">
                    <span>Số Áo</span>
                    <span class="sort-indicator" id="th-sort-jersey">${this._getSortIndicator('jersey')}</span>
                  </div>
                </th>
                <th class="col-player-info">Cầu Thủ</th>
                <th class="col-balance th-sortable ${this.sortBy === 'balance_desc' || this.sortBy === 'balance_asc' ? 'active-sort' : ''}" onclick="window.TNT.funds.toggleBalanceSort()" title="Bấm để đổi sắp xếp: Cao ➔ Thấp / Thấp ➔ Cao">
                  <div class="th-sort-inner th-sort-inner-right">
                    <span>Số Dư Ví</span>
                    <span class="sort-indicator" id="th-sort-balance">${this._getSortIndicator('balance')}</span>
                  </div>
                </th>
                <th class="col-status">Trạng Thái</th>
                <th class="col-actions">Thao Tác</th>
              </tr>
            </thead>
            <tbody id="funds-table-tbody">
              <!-- Render bởi _renderPlayersTable -->
            </tbody>
          </table>
        </div>
      `;

      const tbody = document.getElementById('funds-table-tbody');
      if (tbody) this._renderPlayersTable(tbody);
    }

    closeFundsModal() {
      const modal = document.getElementById('modal-funds-overview');
      if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
      }
    }

    formatMoney(amount) {
      if (root.TNT && root.TNT.utils && typeof root.TNT.utils.formatMoney === 'function') {
        return root.TNT.utils.formatMoney(amount);
      }
      const num = Number(amount) || 0;
      return num.toLocaleString('vi-VN') + 'đ';
    }
  }

  root.FundsModule = FundsModule;

})(typeof window !== 'undefined' ? window : this);
