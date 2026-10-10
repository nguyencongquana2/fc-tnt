/**
 * FC TNT - Main Application Orchestrator & Dashboard (js/app.js - Facade)
 * Quản lý khởi tạo ứng dụng, điều hướng tab, trang chủ Dashboard & cấu hình hệ thống
 * Phân tách sub-modules chuyên biệt:
 * - js/app/app-auth.js: Quản lý đăng nhập PIN Admin, Thủ Quỹ, Cầu Thủ, đổi mật khẩu & cập nhật thanh header
 * - js/app/app-profile.js: Quản lý Modal hồ sơ cá nhân, cập nhật avatar, thông số thống kê & liên kết ví quỹ
 */

window.appModule = {
  currentTab: 'dashboard',

  init() {
    this.bindNavigation();
    this.bindBackupRestore();
    this.bindTeamSettings();
    if (typeof this.bindAuth === 'function') this.bindAuth();
    if (typeof this.bindProfileEvents === 'function') this.bindProfileEvents();
    if (typeof this.updateAuthUI === 'function') this.updateAuthUI();
    this.renderDashboard();

    // Initial render of sub-modules
    if (window.playersModule) window.playersModule.init();
    if (window.matchesModule) window.matchesModule.init();
    if (window.awardsModule) window.awardsModule.init();
    if (window.posterModule) window.posterModule.init();
    if (window.momentsModule) window.momentsModule.init();
    if (window.weatherModule) window.weatherModule.init();
    if (window.tacticsModule) window.tacticsModule.init();

    // Re-render when state updates
    if (window.stateManager && typeof window.stateManager.subscribe === 'function') {
      window.stateManager.subscribe(() => {
        if (typeof this.updateAuthUI === 'function') this.updateAuthUI();
        this.renderDashboard();
        if (window.playersModule) window.playersModule.renderPlayers();
        if (window.matchesModule) window.matchesModule.renderMatches();
        if (window.awardsModule) window.awardsModule.renderAwards();
        if (window.momentsModule) window.momentsModule.renderMoments();
        if (window.weatherModule) window.weatherModule.renderDashboardWidget();
        if (window.tacticsModule) window.tacticsModule.renderPlaybookList();
      });
    }
  },

  bindNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });
  },

  switchTab(tabName) {
    this.currentTab = tabName;

    // Update Tab Buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Cập nhật trạng thái active cho nút Sổ Quỹ Đội trên thanh điều hướng
    const fundsNavBtn = document.getElementById('btn-open-funds');
    if (fundsNavBtn) {
      if (tabName === 'funds') {
        fundsNavBtn.classList.add('active');
        fundsNavBtn.style.boxShadow = '0 0 16px rgba(245, 158, 11, 0.6)';
      } else {
        fundsNavBtn.classList.remove('active');
        fundsNavBtn.style.boxShadow = '';
      }
    }

    // Update Tab Content Panels
    document.querySelectorAll('.tab-content').forEach(panel => {
      if (panel.id === `tab-${tabName}`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // Refresh view data when switching
    if (tabName === 'dashboard') this.renderDashboard();
    if (tabName === 'awards' && window.awardsModule) window.awardsModule.renderAwards();
    if (tabName === 'matches' && window.matchesModule) window.matchesModule.renderMatches();
    if (tabName === 'players' && window.playersModule) window.playersModule.renderPlayers();
    if (tabName === 'moments' && window.momentsModule) window.momentsModule.renderMoments();
    if (tabName === 'tactics' && window.tacticsModule) {
      window.tacticsModule.renderPlaybookList();
      window.tacticsModule.initCanvas();
    }
    if (tabName === 'weather' && window.weatherModule) {
      window.weatherModule.render7DayCards();
      window.weatherModule.renderDayDetail();
      window.weatherModule.renderAiChat();
    }
    if (tabName === 'funds' && window.TNT && window.TNT.funds && typeof window.TNT.funds.renderFundsPage === 'function') {
      window.TNT.funds.renderFundsPage();
    }

    // Bắn sự kiện chuyển tab cho hệ thống hiệu ứng & animation
    window.dispatchEvent(new CustomEvent('tabChanged', { detail: { tab: tabName } }));
    if (window.TNT && window.TNT.events) {
      window.TNT.events.emit('tab:changed', tabName);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  renderDashboard() {
    if (!window.stateManager) return;
    const overview = window.stateManager.getTeamOverview();
    const leaderboards = window.stateManager.getLeaderboards();

    if (window.weatherModule) {
      window.weatherModule.renderDashboardWidget();
    }

    // Update Team Hero Info
    const heroName = document.getElementById('hero-team-name-text');
    const heroSlogan = document.getElementById('hero-team-slogan-text');
    if (heroName) heroName.innerText = overview.teamName;
    if (heroSlogan) heroSlogan.innerText = `"${overview.slogan}"`;

    // Update Stat Cards
    const totalMatchesEl = document.getElementById('dash-total-matches');
    const winRateEl = document.getElementById('dash-win-rate');
    const totalGoalsEl = document.getElementById('dash-total-goals');
    const totalPlayersEl = document.getElementById('dash-total-players');

    if (totalMatchesEl) totalMatchesEl.innerText = overview.totalMatches;
    if (winRateEl) winRateEl.innerText = `${overview.winRate}% (${overview.wins}T-${overview.draws}H-${overview.losses}B)`;
    if (totalGoalsEl) totalGoalsEl.innerText = `${overview.goalsFor} ⚽`;
    if (totalPlayersEl) totalPlayersEl.innerText = overview.totalPlayers;

    // Update Dashboard Mini Spotlight (Top MVP, Top Scorer, Top Assist)
    const mvpSpotlight = document.getElementById('dash-mvp-spotlight');
    const scorerSpotlight = document.getElementById('dash-scorer-spotlight');
    const assistSpotlight = document.getElementById('dash-assist-spotlight');

    const topMVP = leaderboards.topRatings[0];
    const topScorer = leaderboards.topScorers[0];
    const topAssist = leaderboards.topAssists[0];

    if (mvpSpotlight && topMVP) {
      mvpSpotlight.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <img src="${topMVP.player.avatar}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-gold);">
          <div>
            <div style="font-weight: 800; color: #fff;">${topMVP.player.name}</div>
            <div style="font-size: 0.8rem; color: var(--accent-gold);">Điểm TB: ${topMVP.avgRating}/10 (${topMVP.matchesPlayed} trận)</div>
          </div>
        </div>
      `;
    }

    if (scorerSpotlight && topScorer) {
      scorerSpotlight.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <img src="${topScorer.player.avatar}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-ruby);">
          <div>
            <div style="font-weight: 800; color: #fff;">${topScorer.player.name}</div>
            <div style="font-size: 0.8rem; color: var(--accent-ruby);">${topScorer.totalGoals} bàn thắng</div>
          </div>
        </div>
      `;
    }

    if (assistSpotlight && topAssist) {
      assistSpotlight.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <img src="${topAssist.player.avatar}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-cyan);">
          <div>
            <div style="font-weight: 800; color: #fff;">${topAssist.player.name}</div>
            <div style="font-size: 0.8rem; color: var(--accent-cyan);">${topAssist.totalAssists} kiến tạo</div>
          </div>
        </div>
      `;
    }

    // Render Recent Matches preview on dashboard
    const recentMatchesContainer = document.getElementById('dash-recent-matches');
    if (recentMatchesContainer) {
      const recentMatches = window.stateManager.getMatches().slice(0, 2);
      if (recentMatches.length === 0) {
        recentMatchesContainer.innerHTML = '<p style="color: var(--text-dim);">Chưa có trận đấu nào gần đây.</p>';
      } else {
        recentMatchesContainer.innerHTML = recentMatches.map(m => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem; background: rgba(0,0,0,0.25); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); cursor: pointer;" onclick="window.matchesModule.openMatchDetailModal('${m.id}')">
            <div>
              <div style="font-weight: 700; color: #fff;">vs ${m.opponent}</div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">${m.date} • ${m.venue}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 900; color: ${m.homeScore > m.awayScore ? 'var(--accent-emerald)' : m.homeScore === m.awayScore ? 'var(--accent-gold)' : 'var(--accent-ruby)'};">
                ${m.homeScore} - ${m.awayScore}
              </span>
              <span class="btn btn-secondary btn-sm">Chấm điểm →</span>
            </div>
          </div>
        `).join('');
      }
    }
  },

  bindBackupRestore() {
    // Export Data JSON
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const jsonStr = window.stateManager.exportDataJSON();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const teamName = (window.stateManager.data.teamInfo?.name || 'FC').replace(/\s+/g, '_');
        a.href = url;
        a.download = `FC_TNT_${teamName}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        window.showToast('📁 Đã xuất file sao lưu dữ liệu thành công!');
      });
    }

    // Import Data JSON
    const importInput = document.getElementById('import-file-input');
    const importBtn = document.getElementById('import-data-btn');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const res = window.stateManager.importDataJSON(event.target.result);
          if (res.success) {
            window.showToast('✅ Đã khôi phục dữ liệu thành công!');
            setTimeout(() => location.reload(), 800);
          } else {
            window.showToast(res.error, 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    // Reset Sample Data
    const resetBtn = document.getElementById('reset-sample-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn nạp lại dữ liệu mẫu của đội bóng (Dữ liệu hiện tại sẽ được thay thế)?')) {
          window.stateManager.resetToSampleData();
          window.showToast('🔄 Đã nạp lại dữ liệu mẫu!');
          setTimeout(() => location.reload(), 600);
        }
      });
    }
  },

  bindTeamSettings() {
    const editTeamBtn = document.getElementById('edit-team-btn');
    const teamModal = document.getElementById('team-modal');
    const teamForm = document.getElementById('team-form');

    if (editTeamBtn && teamModal) {
      editTeamBtn.addEventListener('click', () => {
        if (!window.stateManager.isAdmin) {
          window.showToast('Chỉ Quản trị viên mới có quyền đổi thông tin đội!', 'error');
          return;
        }
        const info = window.stateManager.data.teamInfo;
        document.getElementById('team-name-input').value = info.name || '';
        document.getElementById('team-slogan-input').value = info.slogan || '';
        teamModal.classList.add('active');
      });
    }

    if (teamForm) {
      teamForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!window.stateManager.isAdmin) {
          window.showToast('Chỉ Quản trị viên mới có quyền đổi thông tin đội!', 'error');
          return;
        }
        const name = document.getElementById('team-name-input').value.trim();
        const slogan = document.getElementById('team-slogan-input').value.trim();
        if (!name) {
          window.showToast('Vui lòng nhập tên đội bóng!', 'error');
          return;
        }

        window.stateManager.updateTeamInfo({ name, slogan });
        window.showToast('Đã lưu thông tin đội bóng!');
        document.getElementById('team-modal').classList.remove('active');
        this.renderDashboard();
      });
    }
  }
};

// Hợp nhất các sub-modules vào appModule (Facade Pattern)
if (typeof window !== 'undefined' && window.TNTAppMixins) {
  Object.assign(
    window.appModule,
    window.TNTAppMixins.auth,
    window.TNTAppMixins.profile
  );
}

if (typeof window !== 'undefined' && window.TNT) {
  window.TNT.register('app', window.appModule);
}

// Global Toast Notification System (Ủy thác qua TNT.ui)
window.showToast = function (msg, type = 'success') {
  if (window.TNT && window.TNT.ui && typeof window.TNT.ui.showToast === 'function') {
    return window.TNT.ui.showToast(msg, type);
  }
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  const cleanMsg = (window.TNT && window.TNT.utils && typeof window.TNT.utils.escapeHtml === 'function')
    ? window.TNT.utils.escapeHtml(msg)
    : String(msg);

  if (type === 'error') {
    toast.style.borderColor = '#ef4444';
    toast.innerHTML = `⚠️ <span>${cleanMsg}</span>`;
  } else if (type === 'info') {
    toast.style.borderColor = '#06b6d4';
    toast.innerHTML = `ℹ️ <span>${cleanMsg}</span>`;
  } else if (type === 'warning') {
    toast.style.borderColor = '#f59e0b';
    toast.innerHTML = `🔔 <span>${cleanMsg}</span>`;
  } else {
    toast.innerHTML = `✨ <span>${cleanMsg}</span>`;
  }

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
};

// Start app on DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
  if (window.TNT && !window.TNT.app) {
    window.TNT.register('app', window.appModule);
  }
  window.appModule.init();
});
