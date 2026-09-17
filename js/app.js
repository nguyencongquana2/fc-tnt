/**
 * Main Application Orchestrator - FC TNT
 */

window.appModule = {
  currentTab: 'dashboard',

  init() {
    this.bindNavigation();
    this.bindBackupRestore();
    this.bindTeamSettings();
    this.bindAuth();
    this.updateAuthUI();
    this.renderDashboard();

    // Initial render of sub-modules
    if (window.playersModule) window.playersModule.init();
    if (window.matchesModule) window.matchesModule.init();
    if (window.awardsModule) window.awardsModule.init();
    if (window.posterModule) window.posterModule.init();
    if (window.momentsModule) window.momentsModule.init();
    if (window.weatherModule) window.weatherModule.init();

    // Re-render when state updates
    window.stateManager.subscribe(() => {
      this.updateAuthUI();
      this.renderDashboard();
      if (window.playersModule) window.playersModule.renderPlayers();
      if (window.matchesModule) window.matchesModule.renderMatches();
      if (window.awardsModule) window.awardsModule.renderAwards();
      if (window.momentsModule) window.momentsModule.renderMoments();
      if (window.weatherModule) window.weatherModule.renderDashboardWidget();
    });
  },

  bindAuth() {
    const loginBtn = document.getElementById('auth-login-btn');
    const logoutBtn = document.getElementById('auth-logout-btn');
    const pinForm = document.getElementById('admin-pin-form');
    const togglePinBtn = document.getElementById('toggle-pin-visibility-btn');
    const pinInput = document.getElementById('admin-pin-input');

    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.openAdminModal());
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        window.stateManager.logoutAdmin();
        window.showToast('🚪 Đã đăng xuất khỏi chế độ Quản trị viên. Bạn đang ở chế độ Xem!', 'info');
        this.updateAuthUI();
        if (window.matchesModule) window.matchesModule.renderMatches();
        if (window.playersModule) window.playersModule.renderPlayers();
      });
    }

    if (togglePinBtn && pinInput) {
      togglePinBtn.addEventListener('click', () => {
        if (pinInput.type === 'password') {
          pinInput.type = 'text';
          togglePinBtn.innerText = '🙈';
        } else {
          pinInput.type = 'password';
          togglePinBtn.innerText = '👁️';
        }
      });
    }

    if (pinForm) {
      pinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pin = pinInput.value.trim();
        const errorEl = document.getElementById('admin-pin-error');
        if (errorEl) errorEl.innerText = '';

        if (!pin) {
          if (errorEl) errorEl.innerText = 'Vui lòng nhập mã PIN!';
          return;
        }

        const submitBtn = pinForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = '⏳ Đang xác thực...';
        }

        const res = await window.stateManager.loginAdmin(pin);

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = '🔑 Xác Nhận Mở Khóa';
        }

        if (res.success) {
          this.closeAdminModal();
          window.showToast('🎉 Đăng nhập Quản trị viên thành công! Bạn có toàn quyền quản lý đội bóng.');
          this.updateAuthUI();
          if (window.matchesModule) window.matchesModule.renderMatches();
          if (window.playersModule) window.playersModule.renderPlayers();
        } else {
          if (errorEl) errorEl.innerText = res.error || 'Mã PIN không đúng!';
          pinInput.focus();
        }
      });
    }
  },

  openAdminModal() {
    const modal = document.getElementById('admin-pin-modal');
    const pinInput = document.getElementById('admin-pin-input');
    const errorEl = document.getElementById('admin-pin-error');
    if (errorEl) errorEl.innerText = '';
    if (pinInput) {
      pinInput.value = '';
      pinInput.type = 'password';
    }
    const toggleBtn = document.getElementById('toggle-pin-visibility-btn');
    if (toggleBtn) toggleBtn.innerText = '👁️';

    if (modal) {
      modal.classList.add('active');
      setTimeout(() => pinInput && pinInput.focus(), 150);
    }
  },

  closeAdminModal() {
    const modal = document.getElementById('admin-pin-modal');
    if (modal) modal.classList.remove('active');
  },

  updateAuthUI() {
    const isAdmin = window.stateManager.isAdmin;
    const badge = document.getElementById('auth-role-badge');
    const loginBtn = document.getElementById('auth-login-btn');
    const logoutBtn = document.getElementById('auth-logout-btn');

    if (badge) {
      if (isAdmin) {
        badge.className = 'auth-role-badge admin';
        badge.innerHTML = '👑 <span>Quản Trị</span>';
        badge.title = 'Bạn đang đăng nhập với quyền Quản trị viên FC TNT';
      } else {
        badge.className = 'auth-role-badge viewer';
        badge.innerHTML = '👁️ <span>Thành Viên</span>';
        badge.title = 'Chế độ chỉ xem cho thành viên trong đội';
      }
    }

    if (loginBtn) loginBtn.style.display = isAdmin ? 'none' : 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = isAdmin ? 'inline-flex' : 'none';

    // Show or hide admin-only elements
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = isAdmin ? '' : 'none';
    });
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
    if (tabName === 'weather' && window.weatherModule) {
      window.weatherModule.render7DayCards();
      window.weatherModule.renderDayDetail();
      window.weatherModule.renderAiChat();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  renderDashboard() {
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

// Global Toast Notification System
window.showToast = function (msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'error') {
    toast.style.borderColor = '#ef4444';
    toast.innerHTML = `⚠️ <span>${msg}</span>`;
  } else if (type === 'info') {
    toast.style.borderColor = '#06b6d4';
    toast.innerHTML = `ℹ️ <span>${msg}</span>`;
  } else {
    toast.innerHTML = `✨ <span>${msg}</span>`;
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
  window.appModule.init();
});
