/**
 * FC TNT - Players List Submodule (js/players/players-list.js)
 * Chuyên trách render danh sách thẻ cầu thủ chuẩn phong cách thẻ FIFA (#players-grid-container)
 * Hiển thị số áo, vị trí, số dư ví quỹ, thống kê trận/bàn/kiến tạo và phân quyền Admin/Thành viên
 */

(function (root) {
  'use strict';

  function escapeHtml(str) {
    if (root.TNT && root.TNT.utils && typeof root.TNT.utils.escapeHtml === 'function') {
      return root.TNT.utils.escapeHtml(str);
    }
    if (typeof root.escapeHtml === 'function') {
      return root.escapeHtml(str);
    }
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatMoney(amount) {
    if (root.TNT && root.TNT.utils && typeof root.TNT.utils.formatMoney === 'function') {
      return root.TNT.utils.formatMoney(amount);
    }
    if (typeof root.formatMoney === 'function') {
      return root.formatMoney(amount);
    }
    return (Number(amount) || 0).toLocaleString('vi-VN') + 'đ';
  }

  const PlayersListMixin = {
    renderPlayers() {
      const container = document.getElementById('players-grid-container');
      if (!container) return;

      const isAdmin = window.stateManager ? window.stateManager.isAdmin : false;
      const players = window.stateManager ? window.stateManager.getPlayers() : [];
      const statsList = (window.stateManager && typeof window.stateManager.getPlayerOverallStats === 'function') 
        ? window.stateManager.getPlayerOverallStats() 
        : [];
      const statsMap = {};
      statsList.forEach(s => {
        if (s && s.player) statsMap[s.player.id] = s;
      });

      if (players.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-xl);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🏃‍♂️</div>
            <h3>Chưa có cầu thủ nào trong đội</h3>
            <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Hãy thêm các thành viên trong đội bóng của bạn để bắt đầu tính điểm và trao thưởng.</p>
            ${isAdmin ? `<button class="btn btn-primary" onclick="window.playersModule.openPlayerModal()">+ Thêm Cầu Thủ Đầu Tiên</button>` : ''}
          </div>
        `;
        return;
      }

      container.innerHTML = players.map(p => {
        const stats = statsMap[p.id] || { matchesPlayed: 0, avgRating: 0, totalGoals: 0, totalAssists: 0, motmCount: 0 };
        const canEditAvatar = window.stateManager ? window.stateManager.canEditPlayerAvatar(p.id) : false;
        const posClass = `pos-${(p.position || 'FW').toLowerCase()}`;
        const primaryDisplayName = escapeHtml((p.nickname && p.nickname.trim()) ? p.nickname.trim() : p.name);
        const secondaryRealName = escapeHtml((p.name && p.name.trim() && p.name.trim().toLowerCase() !== primaryDisplayName.toLowerCase()) ? p.name.trim() : '');
        
        const hasFund = (p.fundBalance !== undefined && p.fundBalance !== null);
        const bal = Number(p.fundBalance) || 0;
        const fundBadgeClass = bal < 0 ? 'fund-neg' : (bal <= 50000 ? 'fund-warn' : 'fund-pos');
        const fundIcon = bal < 0 ? '⚠️' : '💳';
        const fundValText = (bal > 0 ? '+' : '') + (bal / 1000).toFixed(0) + 'k';
        
        return `
          <div class="player-fifa-card" onclick="window.playersModule.viewPlayerProfile('${p.id}')">
            <div class="player-card-bg-number">${p.number || ''}</div>
            
            <div class="player-card-top">
              <div class="player-rating-badge">
                <span class="player-overall-num" style="color: ${this.getRatingColor(stats.avgRating)}">
                  ${stats.matchesPlayed > 0 ? stats.avgRating : '--'}
                </span>
                <span class="pos-tag ${posClass}">${p.position || 'FW'}</span>
              </div>
              
              <div class="player-card-header-badge">
                ${hasFund ? `
                  <span class="player-fund-pill ${fundBadgeClass}" title="Số dư ví quỹ: ${formatMoney(p.fundBalance)}">
                    <span class="fund-pill-icon">${fundIcon}</span>
                    <span class="fund-pill-val">${fundValText}</span>
                  </span>
                ` : ''}
              </div>

              ${canEditAvatar ? `
                <div style="position: relative; cursor: pointer;" onclick="window.playersModule.quickUploadAvatar('${p.id}', event)" title="Bấm để tải ảnh đại diện từ điện thoại/máy tính">
                  <img class="player-avatar-large" src="${p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}" alt="${primaryDisplayName}" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'">
                  <div style="position: absolute; bottom: -2px; right: -2px; background: var(--accent-emerald); color: #000; font-size: 0.65rem; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border: 2px solid #111; box-shadow: 0 2px 4px rgba(0,0,0,0.6);">
                    📷
                  </div>
                </div>
              ` : `
                <div style="position: relative;">
                  <img class="player-avatar-large" src="${p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}" alt="${primaryDisplayName}" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'">
                </div>
              `}
            </div>

            <div class="player-jersey-section">
              <div class="player-jersey-name" title="${primaryDisplayName}">${primaryDisplayName}</div>
              ${secondaryRealName ? `<div class="player-card-realname-sub" title="Họ và tên: ${secondaryRealName}">${secondaryRealName}</div>` : ''}
              <div class="player-jersey-number">${p.number !== undefined && p.number !== null ? p.number : '-'}</div>
            </div>

            <div class="player-mini-stats">
              <div class="mini-stat-item">
                <div class="mini-stat-label">Trận</div>
                <div class="mini-stat-val">${stats.matchesPlayed}</div>
              </div>
              <div class="mini-stat-item">
                <div class="mini-stat-label">Bàn</div>
                <div class="mini-stat-val" style="color: var(--accent-ruby);">${stats.totalGoals}</div>
              </div>
              <div class="mini-stat-item">
                <div class="mini-stat-label">Kiến tạo</div>
                <div class="mini-stat-val" style="color: var(--accent-cyan);">${stats.totalAssists}</div>
              </div>
            </div>

            ${isAdmin ? `
              <div class="player-card-footer" onclick="event.stopPropagation()">
                <button class="btn btn-secondary btn-sm player-footer-btn-photo" onclick="window.playersModule.quickUploadAvatar('${p.id}', event)" title="Tải ảnh đại diện mới từ máy">
                  📷 <span class="btn-label">Đổi Ảnh</span>
                </button>
                <button class="btn btn-secondary btn-sm player-footer-btn-key" onclick="window.playersModule.openProvisionModal('${p.id}')" title="${p.username ? 'Đổi mật khẩu / tài khoản' : 'Cấp tài khoản thành viên'}">
                  🔑 <span class="btn-label">${p.username ? 'Đổi MK' : 'Cấp TK'}</span>
                </button>
                <button class="btn btn-secondary btn-sm player-footer-btn-edit" onclick="window.playersModule.openPlayerModal('${p.id}')" title="Chỉnh sửa thông tin">
                  ✏️ <span class="btn-label">Sửa</span>
                </button>
                <button class="btn btn-danger btn-sm player-footer-btn-del" onclick="window.playersModule.deletePlayer('${p.id}')" title="Xóa">
                  🗑️
                </button>
              </div>
            ` : (canEditAvatar ? `
              <div class="player-card-footer" onclick="event.stopPropagation()">
                <button class="btn btn-secondary btn-sm player-footer-btn-photo" onclick="window.playersModule.quickUploadAvatar('${p.id}', event)" title="Tải ảnh đại diện mới của bạn" style="color: var(--accent-emerald);">
                  📷 <span class="btn-label">Đổi Ảnh</span>
                </button>
                <button class="btn btn-secondary btn-sm player-footer-btn-view" onclick="window.playersModule.viewPlayerProfile('${p.id}')">
                  👁️ Chi Tiết
                </button>
              </div>
            ` : `
              <div class="player-card-footer" onclick="event.stopPropagation()">
                <button class="btn btn-secondary btn-sm player-footer-btn-view" style="width: 100%;" onclick="window.playersModule.viewPlayerProfile('${p.id}')">
                  👁️ Xem Chi Tiết
                </button>
              </div>
            `)}
          </div>
        `;
      }).join('');
    }
  };

  root.TNTPlayersMixins = root.TNTPlayersMixins || {};
  root.TNTPlayersMixins.list = PlayersListMixin;

})(typeof window !== 'undefined' ? window : this);
