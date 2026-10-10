/**
 * FC TNT - Poster Elements Engine (js/poster/poster-elements.js)
 * Chuyên trách kết xuất các khối nội dung thi đấu trên Canvas:
 * Bảng điểm scoreboard hoàng gia, thẻ vinh danh MOTM, danh sách ghi bàn/kiến tạo & đội hình ra sân
 */

(function (root) {
  'use strict';

  const PosterElementsMixin = {
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
        const p = window.stateManager ? window.stateManager.getPlayerById(ps.playerId) : null;
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
        const p = window.stateManager ? window.stateManager.getPlayerById(ps.playerId) : null;
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
    }
  };

  root.TNTPosterMixins = root.TNTPosterMixins || {};
  root.TNTPosterMixins.elements = PosterElementsMixin;

})(typeof window !== 'undefined' ? window : this);
