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
      const tbody = document.getElementById('funds-table-tbody');
      if (tbody) this._renderPlayersTable(tbody);
    }

    _renderPlayersTable(tbody) {
      if (!tbody) return;

      const esc = window.escapeHtml || (s => s);
      const isTreas = this.isTreasurer();

      let filtered = [...this.playersBalances];

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
            </div>
            <div class="funds-filter-pills">
              <button type="button" class="funds-filter-pill ${this.filterStatus === 'all' ? 'active' : ''}" data-filter="all" onclick="window.TNT.funds.setFilterStatus('all')">
                Tất cả (${totalPlayers})
              </button>
              <button type="button" class="funds-filter-pill ${this.filterStatus === 'good' ? 'active' : ''}" data-filter="good" onclick="window.TNT.funds.setFilterStatus('good')">
                🟢 Dồi dào (${goodPlayers})
              </button>
              <button type="button" class="funds-filter-pill ${this.filterStatus === 'low' ? 'active' : ''}" data-filter="low" onclick="window.TNT.funds.setFilterStatus('low')">
                🟡 Sắp hết (${lowPlayers})
              </button>
              <button type="button" class="funds-filter-pill ${this.filterStatus === 'debt' ? 'active' : ''}" data-filter="debt" onclick="window.TNT.funds.setFilterStatus('debt')">
                🔴 Đang nợ (${debtPlayers})
              </button>
            </div>
          </div>

          <div class="funds-toolbar-actions">
            ${isTreas ? `
              <button type="button" class="btn btn-fund-topup-main" onclick="window.TNT.funds.openTopupModal()">
                ➕ Nạp / Thu Tiền
              </button>
              <button type="button" class="btn btn-fund-treasurer-active" onclick="window.TNT.funds.logoutTreasurer()" title="Bấm để khóa quyền Thủ Quỹ">
                🔐 Khóa Thủ Quỹ
              </button>
            ` : `
              <button type="button" class="btn btn-fund-treasurer" onclick="window.TNT.funds.promptTreasurerLogin()">
                🔑 Mở Khóa Thủ Quỹ
              </button>
            `}
            <button type="button" class="btn btn-fund-history-main" onclick="window.TNT.funds.openHistoryModal()">
              📜 Lịch Sử Giao Dịch
            </button>
            <button type="button" class="btn btn-fund-zalo" onclick="window.TNT.funds.copyZaloReport()" title="Sao chép báo cáo chi tiết gửi Zalo">
              📋 Copy Zalo
            </button>
          </div>
        </div>

        <!-- 4. MAIN PLAYERS BALANCE TABLE -->
        <div class="funds-table-container">
          <table class="fin-table funds-table">
            <thead>
              <tr>
                <th style="width: 48px; text-align: center;">Số Áo</th>
                <th>Cầu Thủ</th>
                <th style="text-align: right;">Số Dư Ví</th>
                <th style="text-align: center; width: 120px;">Trạng Thái</th>
                <th style="text-align: right; width: 130px;">Thao Tác</th>
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
