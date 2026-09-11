/**
 * Match Card & Poster Generator Module - FC TNT
 * Tạo poster ảnh khoe mạng xã hội (Facebook, Zalo, Story) chuẩn nét HD với HTML5 Canvas
 */

window.posterModule = {
  currentMatchId: null,
  aspectRatio: '1:1', // '1:1' (1080x1080) | '9:16' (1080x1920)
  theme: 'cyber', // 'cyber' | 'gold' | 'emerald' | 'fire'
  options: {
    showMotm: true,
    showScorers: true,
    showAssists: true,
    showLineup: true,
    showSlogan: true
  },
  cachedImages: new Map(),

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Ratio buttons
    document.querySelectorAll('.poster-ratio-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.poster-ratio-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.aspectRatio = btn.getAttribute('data-ratio');
        this.renderPoster();
      });
    });

    // Theme buttons
    document.querySelectorAll('.poster-theme-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.poster-theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.theme = btn.getAttribute('data-theme');
        this.renderPoster();
      });
    });

    // Option checkboxes
    const optionKeys = ['showMotm', 'showScorers', 'showAssists', 'showLineup', 'showSlogan'];
    optionKeys.forEach(key => {
      const el = document.getElementById(`poster-opt-${key}`);
      if (el) {
        el.addEventListener('change', (e) => {
          this.options[key] = e.target.checked;
          this.renderPoster();
        });
      }
    });
  },

  openPosterModal(matchId) {
    this.currentMatchId = matchId;
    const match = window.stateManager.getMatchById(matchId);
    if (!match) {
      if (window.appModule && window.appModule.showToast) {
        window.appModule.showToast('Không tìm thấy dữ liệu trận đấu!', 'error');
      }
      return;
    }

    const modal = document.getElementById('poster-generator-modal');
    if (modal) {
      modal.classList.add('active');
      // Set active default controls
      document.querySelectorAll('.poster-ratio-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-ratio') === this.aspectRatio);
      });
      document.querySelectorAll('.poster-theme-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-theme') === this.theme);
      });
      
      const optionKeys = ['showMotm', 'showScorers', 'showAssists', 'showLineup', 'showSlogan'];
      optionKeys.forEach(key => {
        const el = document.getElementById(`poster-opt-${key}`);
        if (el) el.checked = this.options[key];
      });

      this.renderPoster();
    }
  },

  closePosterModal() {
    const modal = document.getElementById('poster-generator-modal');
    if (modal) modal.classList.remove('active');
  },

  async preloadImage(url) {
    if (!url) return null;
    if (this.cachedImages.has(url)) return this.cachedImages.get(url);

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.cachedImages.set(url, img);
        resolve(img);
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = url;
    });
  },

  async renderPoster() {
    const canvas = document.getElementById('poster-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const match = window.stateManager.getMatchById(this.currentMatchId);
    if (!match) return;

    const teamInfo = window.stateManager.data.teamInfo || { name: 'FC TNT', slogan: 'Đá hết mình - Thắng cùng mừng, Thua cùng uống' };
    const playerStats = match.playerStats || [];

    // Kích thước chuẩn HD
    const isSquare = this.aspectRatio === '1:1';
    const width = 1080;
    const height = isSquare ? 1080 : 1920;

    canvas.width = width;
    canvas.height = height;

    // Tìm MVP
    let motm = null;
    let highestRating = -1;
    playerStats.forEach(ps => {
      const r = Number(ps.rating) || 0;
      if (r > highestRating) {
        highestRating = r;
        motm = { ...window.stateManager.getPlayerById(ps.playerId), rating: r, stat: ps };
      }
    });

    // Tiền tải avatar MVP nếu có
    let motmImg = null;
    if (motm && motm.avatar) {
      motmImg = await this.preloadImage(motm.avatar);
    }

    // 1. VẼ HÌNH NỀN THEO THEME
    this.drawBackground(ctx, width, height, this.theme);

    // 2. VẼ HEADER (LOGO & GIẢI ĐẤU/LỊCH TRẬN)
    const headerY = isSquare ? 70 : 120;
    this.drawHeader(ctx, width, headerY, match, teamInfo);

    // 3. VẼ SCOREBOARD BẢNG ĐIỂM HOÀNG GIA
    const scoreY = isSquare ? 230 : 380;
    this.drawScoreboard(ctx, width, scoreY, match, teamInfo);

    // 4. VẼ MOTM / CẦU THỦ XUẤT SẮC NHẤT
    let currentY = isSquare ? 470 : 700;
    if (this.options.showMotm && motm && highestRating > 0) {
      const motmHeight = isSquare ? 170 : 250;
      this.drawMotmCard(ctx, width, currentY, motm, motmImg, isSquare);
      currentY += motmHeight + (isSquare ? 25 : 45);
    }

    // 5. VẼ BÀN THẮNG & KIẾN TẠO
    if ((this.options.showScorers || this.options.showAssists) && playerStats.length > 0) {
      const statsY = currentY;
      const statsHeight = this.drawMatchEvents(ctx, width, statsY, playerStats, isSquare);
      currentY += statsHeight + (isSquare ? 25 : 45);
    }

    // 6. VẼ DANH SÁCH ĐỘI HÌNH NẾU LÀ DỌNG STORY (9:16)
    if (!isSquare && this.options.showLineup && playerStats.length > 0) {
      this.drawLineupSection(ctx, width, currentY, playerStats);
    }

    // 7. VẼ FOOTER & WATERMARK
    this.drawFooter(ctx, width, height, teamInfo);
  },

  drawBackground(ctx, width, height, theme) {
    // Gradient nền chính
    let bgGrad = ctx.createLinearGradient(0, 0, width, height);
    if (theme === 'gold') {
      bgGrad.addColorStop(0, '#0a0b10');
      bgGrad.addColorStop(0.5, '#1e190d');
      bgGrad.addColorStop(1, '#0c0a06');
    } else if (theme === 'emerald') {
      bgGrad.addColorStop(0, '#06120d');
      bgGrad.addColorStop(0.5, '#0d251a');
      bgGrad.addColorStop(1, '#040b08');
    } else if (theme === 'fire') {
      bgGrad.addColorStop(0, '#150608');
      bgGrad.addColorStop(0.5, '#280c10');
      bgGrad.addColorStop(1, '#0e0405');
    } else {
      // Cyber Neon Stadium
      bgGrad.addColorStop(0, '#0a0f1d');
      bgGrad.addColorStop(0.4, '#0f172a');
      bgGrad.addColorStop(0.8, '#1e1b4b');
      bgGrad.addColorStop(1, '#090d16');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Vẽ họa tiết sân bóng & ánh đèn pha Neon Glow
    ctx.save();
    
    // Đèn pha đỉnh
    const topGlow = ctx.createRadialGradient(width / 2, 0, 50, width / 2, 0, width * 0.7);
    if (theme === 'gold') {
      topGlow.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
    } else if (theme === 'emerald') {
      topGlow.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
    } else if (theme === 'fire') {
      topGlow.addColorStop(0, 'rgba(244, 63, 94, 0.3)');
    } else {
      topGlow.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
    }
    topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, width, height * 0.6);

    // Đường line sân bóng mờ nghệ thuật
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 2;
    // Vòng tròn trung tâm
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, width * 0.32, 0, Math.PI * 2);
    ctx.stroke();
    // Vạch giữa sân
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Họa tiết góc khung viền thể thao
    const borderPadding = 30;
    const cornerSize = 40;
    ctx.strokeStyle = theme === 'gold' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)';
    ctx.lineWidth = 3;

    // Top Left
    ctx.beginPath();
    ctx.moveTo(borderPadding, borderPadding + cornerSize);
    ctx.lineTo(borderPadding, borderPadding);
    ctx.lineTo(borderPadding + cornerSize, borderPadding);
    ctx.stroke();

    // Top Right
    ctx.beginPath();
    ctx.moveTo(width - borderPadding - cornerSize, borderPadding);
    ctx.lineTo(width - borderPadding, borderPadding);
    ctx.lineTo(width - borderPadding, borderPadding + cornerSize);
    ctx.stroke();

    // Bottom Left
    ctx.beginPath();
    ctx.moveTo(borderPadding, height - borderPadding - cornerSize);
    ctx.lineTo(borderPadding, height - borderPadding);
    ctx.lineTo(borderPadding + cornerSize, height - borderPadding);
    ctx.stroke();

    // Bottom Right
    ctx.beginPath();
    ctx.moveTo(width - borderPadding - cornerSize, height - borderPadding);
    ctx.lineTo(width - borderPadding, height - borderPadding);
    ctx.lineTo(width - borderPadding, height - borderPadding - cornerSize);
    ctx.stroke();

    ctx.restore();
  },

  drawHeader(ctx, width, y, match, teamInfo) {
    ctx.save();
    ctx.textAlign = 'center';

    // Badge nhỏ trên đỉnh
    const tagText = '⚽ FC TNT MATCHDAY POSTER ⚽';
    ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(tagText, width / 2, y);

    // Ngày đấu & Địa điểm
    ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillStyle = '#94a3b8';
    const venueText = match.venue ? ` • 📍 ${match.venue}` : '';
    ctx.fillText(`📅 ${match.date} ${match.time ? `(${match.time})` : ''}${venueText}`, width / 2, y + 36);

    ctx.restore();
  },

  drawScoreboard(ctx, width, y, match, teamInfo) {
    ctx.save();

    const homeScore = match.homeScore || 0;
    const awayScore = match.awayScore || 0;
    const isWin = homeScore > awayScore;
    const isDraw = homeScore === awayScore;

    // Hộp chứa bảng điểm Glassmorphism
    const boxW = width - 100;
    const boxH = 180;
    const boxX = 50;
    const boxY = y;

    this.roundRect(ctx, boxX, boxY, boxW, boxH, 24);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fill();
    ctx.strokeStyle = isWin ? 'rgba(16, 185, 129, 0.4)' : isDraw ? 'rgba(245, 158, 11, 0.3)' : 'rgba(244, 63, 94, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 1. Tên đội nhà (FC TNT)
    const homeTeamX = boxX + boxW * 0.24;
    const centerY = boxY + boxH / 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Logo tròn đội nhà
    ctx.beginPath();
    ctx.arc(homeTeamX, centerY - 28, 30, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '28px sans-serif';
    ctx.fillText('⚽', homeTeamX, centerY - 26);

    ctx.font = '800 26px "Outfit", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(teamInfo.name || 'FC TNT', homeTeamX, centerY + 28);

    // 2. Tỉ số trung tâm
    const scoreCenterX = boxX + boxW / 2;
    
    // Khung tỉ số
    this.roundRect(ctx, scoreCenterX - 90, centerY - 45, 180, 70, 16);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();

    ctx.font = '900 48px "Outfit", sans-serif';
    ctx.fillStyle = isWin ? '#10b981' : '#ffffff';
    ctx.fillText(homeScore, scoreCenterX - 45, centerY - 5);
    
    ctx.fillStyle = '#64748b';
    ctx.fillText(':', scoreCenterX, centerY - 9);

    ctx.fillStyle = awayScore > homeScore ? '#f43f5e' : '#ffffff';
    ctx.fillText(awayScore, scoreCenterX + 45, centerY - 5);

    // Badge trạng thái kết quả
    let resultTag = '🏆 CHIẾN THẮNG';
    let tagBg = 'rgba(16, 185, 129, 0.25)';
    let tagColor = '#10b981';

    if (isDraw) {
      resultTag = '🤝 HÒA';
      tagBg = 'rgba(245, 158, 11, 0.25)';
      tagColor = '#f59e0b';
    } else if (!isWin) {
      resultTag = '⚽ KẾT QUẢ TRẬN';
      tagBg = 'rgba(244, 63, 94, 0.25)';
      tagColor = '#f43f5e';
    }

    const tagW = 140;
    const tagH = 26;
    this.roundRect(ctx, scoreCenterX - tagW / 2, centerY + 38, tagW, tagH, 13);
    ctx.fillStyle = tagBg;
    ctx.fill();
    ctx.font = '800 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = tagColor;
    ctx.fillText(resultTag, scoreCenterX, centerY + 52);

    // 3. Tên đội khách / Đối thủ
    const awayTeamX = boxX + boxW * 0.76;

    // Logo tròn đối thủ
    ctx.beginPath();
    ctx.arc(awayTeamX, centerY - 28, 30, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '28px sans-serif';
    ctx.fillText('🛡️', awayTeamX, centerY - 26);

    ctx.font = '800 24px "Outfit", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    
    // Cắt bớt tên đối thủ nếu quá dài
    let oppName = match.opponent || 'Đối Thủ';
    if (oppName.length > 14) oppName = oppName.substring(0, 12) + '...';
    ctx.fillText(oppName, awayTeamX, centerY + 28);

    ctx.restore();
  },

  drawMotmCard(ctx, width, y, motm, motmImg, isSquare) {
    ctx.save();

    const boxW = width - 100;
    const boxH = isSquare ? 150 : 210;
    const boxX = 50;
    const boxY = y;

    // Nền Card MOTM
    const motmGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
    motmGrad.addColorStop(0, 'rgba(245, 158, 11, 0.16)');
    motmGrad.addColorStop(1, 'rgba(245, 158, 11, 0.04)');

    this.roundRect(ctx, boxX, boxY, boxW, boxH, 20);
    ctx.fillStyle = motmGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tiêu đề nhỏ MOTM
    ctx.font = '800 14px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('👑 CẦU THỦ XUẤT SẮC NHẤT (MAN OF THE MATCH)', boxX + 24, boxY + 30);

    const avatarSize = isSquare ? 80 : 110;
    const avatarX = boxX + 30 + avatarSize / 2;
    const avatarY = boxY + 45 + avatarSize / 2;

    // Vẽ Avatar Cầu Thủ
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (motmImg) {
      ctx.drawImage(motmImg, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.font = '36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', avatarX, avatarY);
    }
    ctx.restore();

    // Viền sáng vàng quanh avatar
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Thông tin tên & Điểm số MOTM
    const infoX = avatarX + avatarSize / 2 + 25;
    const infoCenterY = avatarY;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Tên cầu thủ
    ctx.font = '800 28px "Outfit", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${motm.name || 'Cầu thủ'} #${motm.number || ''}`, infoX, infoCenterY - 18);

    // Điểm rating & Thành tích
    const statText = [];
    if (motm.stat) {
      if (motm.stat.goals > 0) statText.push(`⚽ ${motm.stat.goals} Bàn`);
      if (motm.stat.assists > 0) statText.push(`👟 ${motm.stat.assists} Kiến tạo`);
    }

    ctx.font = '600 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`${motm.position ? `Vị trí: ${motm.position}` : ''} ${statText.length ? ' • ' + statText.join(' • ') : ''}`, infoX, infoCenterY + 16);

    // Rating Badge lớn bên phải
    const ratingBoxW = 90;
    const ratingBoxH = isSquare ? 70 : 80;
    const ratingBoxX = boxX + boxW - ratingBoxW - 25;
    const ratingBoxY = avatarY - ratingBoxH / 2;

    this.roundRect(ctx, ratingBoxX, ratingBoxY, ratingBoxW, ratingBoxH, 16);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '900 32px "Outfit", sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(Number(motm.rating).toFixed(1), ratingBoxX + ratingBoxW / 2, ratingBoxY + ratingBoxH / 2 - 2);

    ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#fde68a';
    ctx.fillText('RATING ⭐', ratingBoxX + ratingBoxW / 2, ratingBoxY + ratingBoxH - 12);

    ctx.restore();
  },

  wrapItems(ctx, items, maxWidth) {
    if (!items || items.length === 0) return [];
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const separator = currentLine ? ', ' : '';
      const testLine = currentLine + separator + item;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine + ',');
        currentLine = item;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  },

  drawMatchEvents(ctx, width, y, playerStats, isSquare) {
    ctx.save();

    const scorers = [];
    const assists = [];

    playerStats.forEach(ps => {
      const p = window.stateManager.getPlayerById(ps.playerId);
      const name = p ? p.name : 'Cầu thủ';
      if (Number(ps.goals) > 0) {
        scorers.push(`${name}${Number(ps.goals) > 1 ? ` (${ps.goals} ⚽)` : ''}`);
      }
      if (Number(ps.assists) > 0) {
        assists.push(`${name}${Number(ps.assists) > 1 ? ` (${ps.assists} 👟)` : ''}`);
      }
    });

    if (scorers.length === 0 && assists.length === 0) {
      ctx.restore();
      return 0;
    }

    const boxW = width - 100;
    const boxX = 50;
    const boxY = y;
    const halfW = boxW / 2;
    const textMaxWidth = halfW - 40;

    // Tính toán số dòng thực tế để co giãn chiều cao khung
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    const scorerLines = this.wrapItems(ctx, scorers, textMaxWidth);
    const assistLines = this.wrapItems(ctx, assists, textMaxWidth);

    const maxLines = Math.max(scorerLines.length, assistLines.length, 1);
    const lineSpacing = isSquare ? 23 : 25;
    const boxH = Math.max(isSquare ? 110 : 130, 52 + maxLines * lineSpacing);

    // Vẽ khung chứa
    this.roundRect(ctx, boxX, boxY, boxW, boxH, 18);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Cột ghi bàn
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#f43f5e';
    ctx.fillText('⚽ GHI BÀN THẮNG', boxX + 25, boxY + 18);

    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    if (scorerLines.length > 0) {
      scorerLines.forEach((line, idx) => {
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(line, boxX + 25, boxY + 44 + idx * lineSpacing);
      });
    } else {
      ctx.fillStyle = '#64748b';
      ctx.fillText('Không có', boxX + 25, boxY + 44);
    }

    // Vạch ngăn giữa
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(boxX + halfW, boxY + 15);
    ctx.lineTo(boxX + halfW, boxY + boxH - 15);
    ctx.stroke();

    // Cột kiến tạo
    ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#06b6d4';
    ctx.fillText('👟 KIẾN TẠO THÀNH BÀN', boxX + halfW + 25, boxY + 18);

    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    if (assistLines.length > 0) {
      assistLines.forEach((line, idx) => {
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(line, boxX + halfW + 25, boxY + 44 + idx * lineSpacing);
      });
    } else {
      ctx.fillStyle = '#64748b';
      ctx.fillText('Không có', boxX + halfW + 25, boxY + 44);
    }

    ctx.restore();
    return boxH;
  },

  drawLineupSection(ctx, width, y, playerStats) {
    ctx.save();
    const boxW = width - 100;
    const boxH = 220;
    const boxX = 50;
    const boxY = y;

    this.roundRect(ctx, boxX, boxY, boxW, boxH, 18);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillStyle = '#10b981';
    ctx.fillText('👥 ĐỘI HÌNH RA SÂN (SÂN 7 • 3-1-2)', boxX + 25, boxY + 20);

    // Vẽ danh sách chip cầu thủ
    const names = playerStats.map(ps => {
      const p = window.stateManager.getPlayerById(ps.playerId);
      return {
        name: p ? p.name : 'Cầu thủ',
        rating: ps.rating,
        pos: p ? p.position : ''
      };
    });

    let currentX = boxX + 25;
    let currentLineY = boxY + 55;
    const chipHeight = 34;

    names.forEach(n => {
      const text = `${n.name} (${n.rating}⭐)`;
      ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
      const textW = ctx.measureText(text).width;
      const chipW = textW + 24;

      if (currentX + chipW > boxX + boxW - 25) {
        currentX = boxX + 25;
        currentLineY += chipHeight + 10;
      }

      this.roundRect(ctx, currentX, currentLineY, chipW, chipHeight, 10);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(text, currentX + 12, currentLineY + 9);

      currentX += chipW + 10;
    });

    ctx.restore();
  },

  drawFooter(ctx, width, height, teamInfo) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const footerY = height - 40;

    if (this.options.showSlogan && teamInfo.slogan) {
      ctx.font = 'italic 500 17px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText(`"${teamInfo.slogan}"`, width / 2, footerY - 26);
    }

    ctx.font = '800 14px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillStyle = '#10b981';
    ctx.fillText(`FC TNT • SOFASCORE PITCH RATING SYSTEM`, width / 2, footerY);

    ctx.restore();
  },

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  },

  downloadPoster() {
    const canvas = document.getElementById('poster-canvas');
    if (!canvas) return;

    const match = window.stateManager.getMatchById(this.currentMatchId);
    const dateStr = match ? match.date.replace(/[\/\\]/g, '-') : 'match';
    const oppName = match ? match.opponent.replace(/\s+/g, '_') : 'opponent';
    const filename = `FC_TNT_Poster_${dateStr}_vs_${oppName}_${this.aspectRatio.replace(':', 'x')}.png`;

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();

    if (window.appModule && window.appModule.showToast) {
      window.appModule.showToast('🎉 Đã tải ảnh Poster HD về máy thành công!', 'success');
    }
  },

  async copyPosterToClipboard() {
    const canvas = document.getElementById('poster-canvas');
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error('Không thể tạo blob ảnh');
        }
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          if (window.appModule && window.appModule.showToast) {
            window.appModule.showToast('📋 Đã sao chép ảnh Poster! Dán trực tiếp vào Zalo/Facebook ngay.', 'success');
          }
        } else {
          // Fallback download if clipboard API is not available
          this.downloadPoster();
        }
      }, 'image/png');
    } catch (err) {
      console.warn('Clipboard write failed:', err);
      this.downloadPoster();
    }
  },

  async sharePoster() {
    const canvas = document.getElementById('poster-canvas');
    if (!canvas) return;

    if (navigator.share) {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'fctnt-match-poster.png', { type: 'image/png' });
        try {
          await navigator.share({
            title: 'FC TNT Matchday Poster',
            text: 'Ảnh tổng kết trận đấu FC TNT!',
            files: [file]
          });
        } catch (e) {
          console.log('Share canceled or not supported', e);
        }
      });
    } else {
      this.copyPosterToClipboard();
    }
  }
};
