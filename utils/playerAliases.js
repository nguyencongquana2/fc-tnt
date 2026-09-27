/**
 * FC TNT - Shared Player Aliases & Nickname Matching Engine
 * Dùng chung giữa Backend (routes/ai.js) và Frontend (Live Companion & AI Rating)
 * Đảm bảo Single Source of Truth (SSOT) và tuân thủ nguyên tắc DRY
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js CommonJS
    module.exports = factory();
  } else {
    // Browser Global
    const exports = factory();
    root.getPlayerAliases = exports.getPlayerAliases;
    root.FC_TNT_KNOWN_ALIASES = exports.FC_TNT_KNOWN_ALIASES;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Bảng ánh xạ biệt danh phủi đặc trưng của các thành viên FC TNT
  const FC_TNT_KNOWN_ALIASES = [
    { match: ['vinh'], aliases: ['duy vinh', 'vinh lê', 'vinh'] },
    { match: ['todiu', 'diu', 'diệu', 'tố'], aliases: ['tố địu', 'tố điệu', 'tố', 'địu', 'todiu'] },
    { match: ['quang', 'voi'], aliases: ['quang', 'voi'] },
    { match: ['bắc'], aliases: ['đức bắc', 'bắc'] },
    { match: ['giang'], aliases: ['trường giang', 'giang'] },
    { match: ['dũng'], aliases: ['công dũng', 'dũng'] },
    { match: ['hoàn'], aliases: ['trí hoàn', 'hoàn'] },
    { match: ['quân'], aliases: ['quân kun', 'quân', 'công quân'] },
    { match: ['tài'], aliases: ['tài thọ', 'tài', 'tấn tài', 'lê tấn tài'] },
    { match: ['hùng'], aliases: ['hùng sứt', 'hùng', 'lường hùng'] },
    { match: ['thành nam', 'nam cao'], aliases: ['thành nam', 'nam cao', 'nam'] },
    { match: ['sỹ nam', 'nam thấp'], aliases: ['sỹ nam', 'nam thấp', 'nam'] },
    { match: ['chiến'], aliases: ['đình chiến', 'chiến'] },
    { match: ['đình anh', 'anh'], aliases: ['đình anh', 'anh'] },
    { match: ['công tiến', 'tiếnn'], aliases: ['công tiến', 'tiếnn', 'tiến'] },
    { match: ['thắng', 'ct'], aliases: ['công thắng', 'thắng', 'ct'] }
  ];

  /**
   * Trích xuất danh sách tất cả các biến thể tên, biệt danh, số áo của cầu thủ
   * @param {Object} p - Cầu thủ
   * @returns {string[]} Danh sách các alias viết thường (độ dài >= 2)
   */
  function getPlayerAliases(p) {
    if (!p) return [];
    const aliases = new Set();
    const rawName = (p.name || '').toLowerCase().trim();
    const rawNick = (p.nickname || '').toLowerCase().trim();
    const numStr = String(p.number || '').trim();

    if (rawName) aliases.add(rawName);
    if (rawNick) aliases.add(rawNick);
    if (numStr) {
      aliases.add(`số ${numStr}`);
      aliases.add(`#${numStr}`);
    }

    const nameParts = rawName.split(/\s+/);
    if (nameParts.length > 1) {
      aliases.add(nameParts[nameParts.length - 1]);
    }
    const nickParts = rawNick.split(/\s+/);
    if (nickParts.length > 1) {
      aliases.add(nickParts[0]);
      aliases.add(nickParts[nickParts.length - 1]);
    }

    for (const item of FC_TNT_KNOWN_ALIASES) {
      if (item.match.some(m => rawName.includes(m) || rawNick.includes(m))) {
        item.aliases.forEach(a => aliases.add(a));
      }
    }

    // Alias fallback cho Sỹ Nam (thủ môn) nếu có
    if (rawName.includes('nam') || rawNick.includes('nam')) {
      if (p.position === 'GK' || rawName.includes('sỹ') || rawNick.includes('thấp')) {
        aliases.add('sỹ nam');
        aliases.add('nam thấp');
      }
    }

    return Array.from(aliases).filter(a => a.length >= 2);
  }

  return {
    getPlayerAliases,
    FC_TNT_KNOWN_ALIASES
  };
});
