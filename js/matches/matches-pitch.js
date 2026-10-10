/**
 * Matches Module - Sofascore Pitch Tactical Board (3-1-2) Slot Renderer
 * js/matches/matches-pitch.js
 * 
 * Render thẻ cầu thủ trên sa bàn sân 7:
 * - Vị trí đá chính theo sơ đồ 3-1-2
 * - Slot trống hỗ trợ kéo-thả
 * - Huy hiệu bàn thắng ⚽, kiến tạo 👟, thẻ phạt 🟨🟥, đánh giá Sofascore & ngôi sao MOTM ✪
 * - Phân tách các sub-module:
 *   + js/matches/matches-pitch-dnd.js: Drag & Drop Engine & Quick Edit Card
 */

(function (root) {
  'use strict';

  root.matchesModule = root.matchesModule || {};

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

  Object.assign(root.matchesModule, {
    renderPitchSlot(slotId, roleLabel, ps, motmId) {
      if (!ps) {
        // Vị trí trống trên sân
        return `
          <div class="sofascore-player-node empty-slot" 
               id="pitch-slot-${slotId}"
               ondragover="window.matchesModule.handleSlotDragOver(event)"
               ondragleave="window.matchesModule.handleSlotDragLeave(event)"
               ondrop="window.matchesModule.handleSlotDrop(event, '${slotId}')"
               style="border: 2px dashed rgba(255,255,255,0.3); border-radius: 50%; width: 52px; height: 52px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.25); cursor: pointer;"
               title="Kéo cầu thủ vào vị trí này">
            <span style="font-size: 1.2rem; opacity: 0.6;">➕</span>
            <div style="font-size: 0.58rem; color: rgba(255,255,255,0.7); font-weight:700; position: absolute; bottom: -18px; white-space: nowrap;">${roleLabel}</div>
          </div>
        `;
      }

      const p = window.stateManager ? window.stateManager.getPlayerById(ps.playerId) : null;
      if (!p) return '';

      const rating = Number(ps.rating) || 7.0;
      const ratingClass = typeof this.getRatingClass === 'function' ? this.getRatingClass(rating) : '';
      const isMOTM = ps.playerId === motmId && rating >= 7.0;
      const displayName = (p.nickname && p.nickname.trim()) ? p.nickname.trim() : p.name;

      return `
        <div class="sofascore-player-node" 
             id="pitch-player-${p.id}"
             draggable="true"
             ondragstart="window.matchesModule.handleDragStart(event, '${p.id}', '${slotId}')"
             ondragend="window.matchesModule.handleDragEnd(event)"
             ondragover="window.matchesModule.handleSlotDragOver(event)"
             ondragleave="window.matchesModule.handleSlotDragLeave(event)"
             ondrop="window.matchesModule.handleSlotDrop(event, '${slotId}', '${p.id}')"
             onclick="window.matchesModule.openQuickEdit('${p.id}')"
             title="Kéo để đổi vị trí hoặc bấm để chấm điểm">
          
          <div class="sofascore-avatar-box">
            <img class="sofascore-avatar-img" src="${p.avatar}" alt="${escapeHtml(displayName)}">
            ${ps.note ? `<div class="sofa-speech-indicator" title="Nhận xét: ${escapeHtml(ps.note)}">💬</div>` : ''}
            
            <!-- HUY HIỆU BÊN PHẢI (⚽ BÀN THẮNG & 👟 KIẾN TẠO CHUẨN SOFASCORE) -->
            <div class="sofa-right-badges">
              ${ps.goals > 0 ? `
                <div class="sofa-event-badge ${ps.goals === 1 ? 'is-single' : ''}" title="${ps.goals} Bàn Thắng">
                  <span class="sofa-icon-img">⚽</span>
                  ${ps.goals > 1 ? `<span class="sofa-badge-count">${ps.goals}</span>` : ''}
                </div>
              ` : ''}

              ${ps.assists > 0 ? `
                <div class="sofa-event-badge ${ps.assists === 1 ? 'is-single' : ''}" title="${ps.assists} Kiến Tạo">
                  <span class="sofa-icon-img">👟</span>
                  ${ps.assists > 1 ? `<span class="sofa-badge-count">${ps.assists}</span>` : ''}
                </div>
              ` : ''}
            </div>

            <!-- HUY HIỆU BÊN TRÁI (THẺ PHẠT) -->
            <div class="sofa-left-badges">
              ${ps.redCards > 0 ? `<div class="sofa-card-badge sofa-card-red" title="Thẻ Đỏ"></div>` :
          ps.yellowCards > 0 ? `<div class="sofa-card-badge sofa-card-yellow" title="Thẻ Vàng"></div>` : ''}
            </div>

            <!-- RATING BOX VÀ NGÔI SAO MOTM ĐẶT DƯỚI AVATAR -->
            <div class="sofa-rating-container">
              ${isMOTM ? `<div class="sofa-motm-star" title="Cầu thủ xuất sắc nhất trận">✪</div>` : ''}
              <div class="sofa-rating-box ${ratingClass}">${rating.toFixed(1)}</div>
            </div>
          </div>

          <div class="sofascore-player-name">${p.number} ${escapeHtml(displayName)}</div>
          <div style="font-size: 0.62rem; color: rgba(255,255,255,0.85); text-shadow: 0 1px 2px #000; font-weight:700;">${escapeHtml(roleLabel)}</div>
        </div>
      `;
    },

    getRatingClass(rating) {
      if (rating >= 9.8) return 'rating-blue';
      if (rating >= 8.5) return 'rating-emerald';
      if (rating >= 7.0) return 'rating-green';
      if (rating >= 6.5) return 'rating-gold';
      if (rating >= 6.0) return 'rating-yellow';
      return 'rating-red';
    }
  });

})(typeof window !== 'undefined' ? window : this);
