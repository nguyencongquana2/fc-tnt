/**
 * FC TNT - Funds Submodule: Transaction History Modal (js/funds/funds-history.js)
 * Quản lý Modal Lịch Sử Biến Động Số Dư (#modal-funds-history), bộ lọc Filter Pills & bảng lịch sử
 */

(function (root) {
  'use strict';

  root.TNTFundsMixins = root.TNTFundsMixins || {};

  root.TNTFundsMixins.history = {
    // =========================================================================
    // MODAL XEM LỊCH SỬ BIẾN ĐỘNG SỐ DƯ (TRANSACTION HISTORY)
    // =========================================================================
    closeHistoryModal() {
      const modal = document.getElementById('modal-funds-history');
      if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
      }
      this.historyFilterType = 'all';
      document.body.classList.remove('no-scroll');
    },

    async openHistoryModal(playerId = null) {
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

      this.historyFilterType = 'all';
      this.rawTransactions = [];

      // Hiển thị khung chờ tải
      modal.className = 'modal-backdrop modal-funds-overlay active';
      modal.style.display = 'flex';
      document.body.classList.add('no-scroll');
      modal.innerHTML = `
        <div class="modal-card modal-funds-card" style="max-width: 820px; width: 95%;">
          <div class="modal-header funds-modal-header">
            <h3 style="margin: 0; font-size: 1.15rem; color: #fff; font-weight: 800;">📜 Đang tải lịch sử giao dịch...</h3>
            <button type="button" class="modal-close-btn" onclick="window.TNT.funds.closeHistoryModal()">&times;</button>
          </div>
          <div class="modal-body funds-modal-body" style="padding: 2.5rem; text-align: center; color: var(--text-dim, #94a3b8);">
            ⏳ Đang nạp danh sách biến động số dư từ máy chủ...
          </div>
        </div>
      `;

      try {
        let url = '/api/funds/transactions?limit=100';
        if (playerId) url += `&playerId=${encodeURIComponent(playerId)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && Array.isArray(data.transactions)) {
          this.rawTransactions = data.transactions;
        }
      } catch (err) {
        console.warn('[Funds] Không thể tải lịch sử giao dịch:', err.message);
      }

      // Đếm số lượng theo loại giao dịch
      const totalCount = this.rawTransactions.length;
      const topupCount = this.rawTransactions.filter(t => t.type === 'TOPUP').length;
      const matchCount = this.rawTransactions.filter(t => t.type === 'MATCH_DEDUCT').length;
      const adjustCount = this.rawTransactions.filter(t => t.type === 'ADJUSTMENT').length;

      modal.innerHTML = `
        <div class="modal-card modal-funds-card" style="max-width: 820px; width: 95%;">
          <!-- 1. MODAL HEADER Ở TRÊN CÙNG -->
          <div class="modal-header funds-modal-header">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span style="font-size: 1.4rem;">📜</span>
              <div>
                <h3 style="margin: 0; font-size: 1.15rem; color: #fff; font-weight: 800;">Lịch Sử Biến Động Số Dư</h3>
                <span style="font-size: 0.76rem; color: var(--text-dim, #94a3b8);">Nhật ký thu chi & biến động ví toàn đội bóng</span>
              </div>
            </div>
            <button type="button" class="modal-close-btn" onclick="window.TNT.funds.closeHistoryModal()">&times;</button>
          </div>

          <!-- 2. MODAL BODY CUỘN ĐỘC LẬP BÊN TRONG -->
          <div class="modal-body funds-modal-body">
            <!-- THANH FILTER PILLS -->
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
    },

    setHistoryFilter(type) {
      this.historyFilterType = type;
      document.querySelectorAll('.history-filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-type') === type);
      });
      this._renderHistoryRows();
    },

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
  };

})(typeof window !== 'undefined' ? window : this);
