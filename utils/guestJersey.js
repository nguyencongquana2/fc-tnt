/**
 * FC TNT - Guest Jersey Avatar & Utility Module (SSOT)
 * utils/guestJersey.js
 * 
 * Hỗ trợ nhận diện trực quan cho Cầu thủ Khách Mời / Viện Binh:
 * - Tạo avatar Áo Đấu Vector SVG theo màu áo (Trắng, Đỏ, Xanh, Vàng, Bra, Arg...)
 * - Nhận diện nhanh cầu thủ khách (isGuestPlayer)
 * - Tự động đồng bộ giữa Backend (Node.js) và Frontend (Browser)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TNTGuestJersey = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Bảng màu áo đấu phủi phổ biến
  const JERSEY_PALETTES = {
    white: {
      key: 'white',
      name: 'Áo Trắng',
      main: '#f8fafc',
      stroke: '#94a3b8',
      accent: '#0f172a',
      text: '#0f172a',
      badgeBg: '#e2e8f0'
    },
    red: {
      key: 'red',
      name: 'Áo Đỏ',
      main: '#ef4444',
      stroke: '#b91c1c',
      accent: '#fee2e2',
      text: '#ffffff',
      badgeBg: '#991b1b'
    },
    blue: {
      key: 'blue',
      name: 'Áo Xanh Dương',
      main: '#2563eb',
      stroke: '#1d4ed8',
      accent: '#dbeafe',
      text: '#ffffff',
      badgeBg: '#1e40af'
    },
    yellow: {
      key: 'yellow',
      name: 'Áo Vàng',
      main: '#eab308',
      stroke: '#a16207',
      accent: '#0f172a',
      text: '#0f172a',
      badgeBg: '#ca8a04'
    },
    green: {
      key: 'green',
      name: 'Áo Xanh Lá',
      main: '#10b981',
      stroke: '#047857',
      accent: '#d1fae5',
      text: '#ffffff',
      badgeBg: '#065f46'
    },
    black: {
      key: 'black',
      name: 'Áo Đen',
      main: '#1e293b',
      stroke: '#0f172a',
      accent: '#fbbf24',
      text: '#fbbf24',
      badgeBg: '#0f172a'
    },
    orange: {
      key: 'orange',
      name: 'Áo Cam',
      main: '#f97316',
      stroke: '#c2410c',
      accent: '#ffedd5',
      text: '#ffffff',
      badgeBg: '#9a3412'
    },
    purple: {
      key: 'purple',
      name: 'Áo Tím',
      main: '#8b5cf6',
      stroke: '#6d28d9',
      accent: '#ede9fe',
      text: '#ffffff',
      badgeBg: '#5b21b6'
    },
    brazil: {
      key: 'brazil',
      name: 'Áo Vàng Xanh (Brazil)',
      main: '#facc15',
      stroke: '#15803d',
      accent: '#15803d',
      text: '#15803d',
      badgeBg: '#166534',
      collar: '#15803d'
    },
    argentina: {
      key: 'argentina',
      name: 'Áo Sọc Xanh Trắng (Argentina)',
      main: '#7dd3fc',
      stroke: '#0284c7',
      accent: '#ffffff',
      text: '#0369a1',
      badgeBg: '#0369a1',
      isStriped: true
    }
  };

  /**
   * Kiểm tra một cầu thủ có phải là Khách Mời / Viện Binh không
   * Hỗ trợ tương thích ngược toàn bộ thẻ khách hiện có trong DB
   */
  function isGuestPlayer(p) {
    if (!p) return false;
    if (p.isGuest === true || p.isGuest === 'true') return true;
    if (p.invitedBy && String(p.invitedBy).trim().length > 0) return true;
    if (p.jerseyColor && String(p.jerseyColor).trim().length > 0) return true;
    const avatar = String(p.avatar || '');
    if (avatar.includes('KH%C3%81CH') || avatar.includes('GUEST') || (avatar.startsWith('data:image/svg+xml') && avatar.includes('%23f59e0b'))) return true;
    const name = String(p.name || '').trim().toLowerCase();
    const nick = String(p.nickname || '').trim().toLowerCase();
    const note = String(p.note || '').trim().toLowerCase();
    return /khách|khach|viện\s*binh|vien\s*binh/i.test(name) ||
           /khách|khach|viện\s*binh|vien\s*binh/i.test(nick) ||
           /khách|khach|viện\s*binh|vien\s*binh/i.test(note) ||
           /^bạn\s+/i.test(name);
  }

  /**
   * Tạo chuỗi SVG Data URI của áo thi đấu theo màu sắc và số áo / tên
   */
  function generateJerseyDataUri(colorKey = 'white', numberOrLabel = 'K', sponsor = '') {
    const palette = JERSEY_PALETTES[colorKey] || JERSEY_PALETTES.white;
    const numText = String(numberOrLabel || 'K').slice(0, 3);
    const subText = sponsor ? String(sponsor).slice(0, 8) : 'GUEST';

    const stripedPattern = palette.isStriped ? `
      <defs>
        <pattern id="stripes" width="16" height="120" patternUnits="userSpaceOnUse">
          <rect width="8" height="120" fill="#ffffff" />
          <rect x="8" width="8" height="120" fill="${palette.main}" />
        </pattern>
      </defs>
    ` : '';

    const bodyFill = palette.isStriped ? 'url(#stripes)' : palette.main;
    const collarColor = palette.collar || palette.stroke;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#1e293b" />
            <stop offset="100%" stop-color="#090d16" />
          </radialGradient>
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.5"/>
          </filter>
        </defs>
        ${stripedPattern}
        <!-- Nền tròn sành điệu -->
        <circle cx="60" cy="60" r="58" fill="url(#bgGrad)" stroke="#334155" stroke-width="2"/>
        
        <!-- Hình dáng chiếc áo thể thao (Jersey Vector) -->
        <g filter="url(#dropShadow)" transform="translate(10, 16) scale(0.83)">
          <!-- Cổ áo & thân áo -->
          <path d="M 30,12 L 48,22 Q 60,28 72,22 L 90,12 L 108,34 L 92,48 L 84,40 L 84,100 L 36,100 L 36,40 L 28,48 L 12,34 Z" 
                fill="${bodyFill}" 
                stroke="${palette.stroke}" 
                stroke-width="2.5" 
                stroke-linejoin="round"/>
          
          <!-- Cổ áo chữ V hiện đại -->
          <path d="M 46,22 Q 60,38 74,22" fill="none" stroke="${collarColor}" stroke-width="4" stroke-linecap="round"/>
          
          <!-- Viền tay áo trái & phải -->
          <path d="M 12,34 L 28,48" stroke="${collarColor}" stroke-width="3"/>
          <path d="M 108,34 L 92,48" stroke="${collarColor}" stroke-width="3"/>

          <!-- Số áo hoặc Ký hiệu trung tâm -->
          <text x="60" y="68" 
                text-anchor="middle" 
                font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" 
                font-size="28" 
                font-weight="900" 
                fill="${palette.text}"
                stroke="${palette.isStriped ? '#fff' : 'none'}"
                stroke-width="${palette.isStriped ? '0.5' : '0'}"
                letter-spacing="-1">${numText}</text>
          
          <!-- Nhãn GUEST / Bạn của ai -->
          <rect x="38" y="76" width="44" height="13" rx="4" fill="${palette.badgeBg}" opacity="0.9"/>
          <text x="60" y="86" 
                text-anchor="middle" 
                font-family="system-ui, -apple-system, sans-serif" 
                font-size="8" 
                font-weight="800" 
                fill="#ffffff" 
                letter-spacing="0.5">${subText}</text>
        </g>

        <!-- Huy hiệu Khách nhỏ ở góc trên -->
        <g transform="translate(78, 8)">
          <rect width="36" height="16" rx="8" fill="#f59e0b" stroke="#fff" stroke-width="1"/>
          <text x="18" y="11.5" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="900" fill="#000">KHÁCH</text>
        </g>
      </svg>
    `.trim().replace(/\s+/g, ' ');

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  /**
   * Phân giải tìm Thành viên chính thức bảo lãnh cho Cầu thủ khách
   * @param {Object} guestPlayer - Cầu thủ khách
   * @param {Array} allPlayers - Toàn bộ danh sách cầu thủ
   * @returns {Object|null} Cầu thủ bảo lãnh (Thành viên chính thức) hoặc null
   */
  function resolveGuestSponsor(guestPlayer, allPlayers) {
    if (!guestPlayer || !Array.isArray(allPlayers) || allPlayers.length === 0) return null;

    // Lọc danh sách thành viên chính thức (không phải khách)
    const official = allPlayers.filter(p => p && !isGuestPlayer(p));
    if (official.length === 0) return null;

    // 1. Khớp theo invitedById nếu có
    if (guestPlayer.invitedById) {
      const matchById = official.find(p => p.id === guestPlayer.invitedById);
      if (matchById) return matchById;
    }

    // 2. Phân giải từ chuỗi invitedBy
    const rawInvited = String(guestPlayer.invitedBy || '').trim();
    if (!rawInvited) return null;

    // Bỏ tiền tố "Bạn ", "bạn " và các hậu tố (#...), (GK), (DF)...
    const cleanInvited = rawInvited
      .replace(/^bạn\s+/i, '')
      .replace(/\s*\(#?\d+.*?\).*$/, '')
      .trim()
      .toLowerCase();

    if (!cleanInvited || cleanInvited.includes('không rõ') || cleanInvited.includes('cả đội') || cleanInvited.includes('ca doi')) {
      return null;
    }

    // 2.1. So khớp chính xác theo ID
    let match = official.find(p => p.id && p.id.toLowerCase() === cleanInvited);
    if (match) return match;

    // 2.2. So khớp chính xác theo Biệt danh (nickname) hoặc Tên (name)
    match = official.find(p => {
      const nick = (p.nickname || '').trim().toLowerCase();
      const name = (p.name || '').trim().toLowerCase();
      return (nick && nick === cleanInvited) || (name && name === cleanInvited);
    });
    if (match) return match;

    // 2.3. So khớp bao hàm (includes)
    match = official.find(p => {
      const nick = (p.nickname || '').trim().toLowerCase();
      const name = (p.name || '').trim().toLowerCase();
      return (nick && (nick.includes(cleanInvited) || cleanInvited.includes(nick))) ||
             (name && (name.includes(cleanInvited) || cleanInvited.includes(name)));
    });
    if (match) return match;

    return null;
  }

  return {
    JERSEY_PALETTES,
    isGuestPlayer,
    generateJerseyDataUri,
    resolveGuestSponsor
  };
});
