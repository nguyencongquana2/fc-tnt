/**
 * Awards, Hall of Fame & Leaderboards Module - FC TNT
 */

window.awardsModule = {
  init() {
    this.renderAwards();
  },

  renderAwards() {
    const leaderboards = window.stateManager.getLeaderboards();

    // 1. Render MVP (Cầu Thủ Xuất Sắc Nhất - Điểm TB Cao Nhất)
    this.renderCategoryPodiumAndList(
      'mvp-container',
      leaderboards.topRatings,
      'avgRating',
      '⭐',
      'Điểm TB',
      'mvp'
    );

    // 2. Render Vua Phá Lưới (Top Bàn Thắng)
    this.renderCategoryPodiumAndList(
      'scorers-container',
      leaderboards.topScorers,
      'totalGoals',
      '⚽',
      'Bàn',
      'scorer'
    );

    // 3. Render Vua Kiến Tạo (Top Kiến Tạo)
    this.renderCategoryPodiumAndList(
      'assists-container',
      leaderboards.topAssists,
      'totalAssists',
      '👟',
      'Kiến tạo',
      'assist'
    );

    // 4. Render All-Stars Full Leaderboard Table
    this.renderFullStatsTable(leaderboards.allStats);
  },

  renderCategoryPodiumAndList(containerId, list, statKey, statIcon, statLabel, categoryType) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-dim);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📊</div>
          Chưa có đủ dữ liệu trận đấu để trao giải danh mục này.
        </div>
      `;
      return;
    }

    const top1 = list[0] || null;
    const top2 = list[1] || null;
    const top3 = list[2] || null;
    const restList = list.slice(3, 10); // Positions 4 to 10

    let podiumHtml = `
      <div class="podium-wrapper">
        <!-- Rank 2 -->
        ${top2 ? `
          <div class="podium-step rank-2" onclick="window.playersModule.viewPlayerProfile('${top2.player.id}')" style="cursor: pointer;">
            <div class="podium-player-card">
              <div class="podium-avatar-wrap">
                <img class="podium-avatar" src="${top2.player.avatar}" alt="${top2.player.name}">
                <div class="podium-rank-badge">2</div>
              </div>
              <div class="podium-player-name">${top2.player.nickname || top2.player.name}</div>
              <div class="podium-player-stat" style="color: var(--accent-silver);">${top2[statKey]} ${statIcon}</div>
            </div>
            <div class="podium-base">🥈 2</div>
          </div>
        ` : '<div class="podium-step rank-2"><div class="podium-base">-</div></div>'}

        <!-- Rank 1 (Champion) -->
        ${top1 ? `
          <div class="podium-step rank-1" onclick="window.playersModule.viewPlayerProfile('${top1.player.id}')" style="cursor: pointer;">
            <div class="podium-player-card">
              <span class="podium-crown">👑</span>
              <div class="podium-avatar-wrap">
                <img class="podium-avatar" src="${top1.player.avatar}" alt="${top1.player.name}">
                <div class="podium-rank-badge">1</div>
              </div>
              <div class="podium-player-name" style="font-weight: 800; color: #fbbf24;">${top1.player.nickname || top1.player.name}</div>
              <div class="podium-player-stat" style="color: #fbbf24;">${top1[statKey]} ${statIcon}</div>
            </div>
            <div class="podium-base">🏆 1</div>
          </div>
        ` : '<div class="podium-step rank-1"><div class="podium-base">-</div></div>'}

        <!-- Rank 3 -->
        ${top3 ? `
          <div class="podium-step rank-3" onclick="window.playersModule.viewPlayerProfile('${top3.player.id}')" style="cursor: pointer;">
            <div class="podium-player-card">
              <div class="podium-avatar-wrap">
                <img class="podium-avatar" src="${top3.player.avatar}" alt="${top3.player.name}">
                <div class="podium-rank-badge">3</div>
              </div>
              <div class="podium-player-name">${top3.player.nickname || top3.player.name}</div>
              <div class="podium-player-stat" style="color: var(--accent-bronze);">${top3[statKey]} ${statIcon}</div>
            </div>
            <div class="podium-base">🥉 3</div>
          </div>
        ` : '<div class="podium-step rank-3"><div class="podium-base">-</div></div>'}
      </div>
    `;

    // Leaderboard List 4th downwards
    let listHtml = '';
    if (restList.length > 0) {
      listHtml = `
        <div class="leaderboard-list">
          ${restList.map((item, idx) => `
            <div class="leaderboard-row" onclick="window.playersModule.viewPlayerProfile('${item.player.id}')" style="cursor: pointer;">
              <div class="row-left">
                <span class="rank-num">#${idx + 4}</span>
                <img class="row-avatar" src="${item.player.avatar}" alt="${item.player.name}">
                <div class="row-info">
                  <h4>${item.player.nickname || item.player.name}</h4>
                  <span>${item.player.position} #${item.player.number} • ${item.matchesPlayed} trận</span>
                </div>
              </div>
              <div class="row-stat-value" style="color: var(--accent-emerald);">
                ${item[statKey]} ${statIcon}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    container.innerHTML = podiumHtml + listHtml;
  },

  renderFullStatsTable(allStats) {
    const tableBody = document.getElementById('full-stats-table-body');
    if (!tableBody) return;

    // Sort by rating desc
    const sorted = [...allStats].sort((a, b) => b.avgRating - a.avgRating || b.totalGoals - a.totalGoals);

    if (sorted.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-dim);">Chưa có dữ liệu thống kê cầu thủ</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = sorted.map((st, index) => {
      let rankBadge = `#${index + 1}`;
      if (index === 0) rankBadge = '🥇 Top 1';
      else if (index === 1) rankBadge = '🥈 Top 2';
      else if (index === 2) rankBadge = '🥉 Top 3';

      const displayName = (st.player.nickname && st.player.nickname.trim()) ? st.player.nickname.trim() : st.player.name;
      const realName = (st.player.name && st.player.name.trim() && st.player.name.trim().toLowerCase() !== displayName.toLowerCase()) ? st.player.name.trim() : '';

      return `
        <tr style="border-bottom: 1px solid var(--border-subtle); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'">
          <td style="padding: 1rem; font-weight: 800; font-family: var(--font-display); color: ${index < 3 ? 'var(--accent-gold)' : 'var(--text-dim)'};">${rankBadge}</td>
          <td style="padding: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;" onclick="window.playersModule.viewPlayerProfile('${st.player.id}')">
              <img src="${st.player.avatar}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-subtle);">
              <div>
                <div style="font-weight: 700; color: #fff;">${displayName}</div>
                <div style="font-size: 0.75rem; color: var(--text-dim);">#${st.player.number} ${realName ? `• ${realName}` : `• ${st.player.position}`}</div>
              </div>
            </div>
          </td>
          <td style="padding: 1rem; text-align: center;"><span class="pos-tag pos-${st.player.position.toLowerCase()}">${st.player.position}</span></td>
          <td style="padding: 1rem; text-align: center; font-weight: 700;">${st.matchesPlayed}</td>
          <td style="padding: 1rem; text-align: center; font-weight: 800; color: var(--accent-ruby);">${st.totalGoals}</td>
          <td style="padding: 1rem; text-align: center; font-weight: 800; color: var(--accent-cyan);">${st.totalAssists}</td>
          <td style="padding: 1rem; text-align: center; font-weight: 800; color: var(--accent-gold);">${st.motmCount} 🏆</td>
          <td style="padding: 1rem; text-align: center; font-family: var(--font-display); font-size: 1.15rem; font-weight: 900; color: ${window.playersModule ? window.playersModule.getRatingColor(st.avgRating) : 'var(--accent-emerald)'};">
            ${st.avgRating > 0 ? st.avgRating : '--'}
          </td>
        </tr>
      `;
    }).join('');
  }
};
