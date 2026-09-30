/**
 * FC TNT - Default Tactics Pieces & Whiteboard Setup (SSOT)
 * Dùng chung giữa Backend (server.js / sockets) và Frontend (js/tactics/tactics-pieces.js)
 * Chuẩn Universal Module Definition (UMD)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js CommonJS
    module.exports = factory();
  } else {
    // Browser Global
    const exp = factory();
    root.DEFAULT_TACTICS_PIECES = exp;
    root.getDefaultTacticsPieces = exp.getDefaultTacticsPieces;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULT_HOME_PIECES = [
    { id: 'home_gk', team: 'home', number: 8, name: 'Giang', role: 'GK', x: 6, y: 50 },
    { id: 'home_df_l', team: 'home', number: 6, name: 'Vinh', role: 'DF', x: 26, y: 18 },
    { id: 'home_df_c', team: 'home', number: 5, name: 'Quân', role: 'DF', x: 22, y: 50 },
    { id: 'home_df_r', team: 'home', number: 10, name: 'Hùng', role: 'DF', x: 26, y: 82 },
    { id: 'home_mf', team: 'home', number: 88, name: 'Thành Nam', role: 'MF', x: 42, y: 50 },
    { id: 'home_fw_l', team: 'home', number: 7, name: 'Tài', role: 'FW', x: 65, y: 32 },
    { id: 'home_fw_r', team: 'home', number: 24, name: 'Tố', role: 'FW', x: 65, y: 68 }
  ];

  const DEFAULT_AWAY_PIECES = [
    { id: 'away_gk', team: 'away', number: 'GK', name: 'GK Bạn', role: 'GK', x: 94, y: 50 },
    { id: 'away_df_l', team: 'away', number: 2, name: 'HV Bạn 1', role: 'DF', x: 74, y: 22 },
    { id: 'away_df_c', team: 'away', number: 4, name: 'Thòng Bạn', role: 'DF', x: 78, y: 50 },
    { id: 'away_df_r', team: 'away', number: 3, name: 'HV Bạn 2', role: 'DF', x: 74, y: 78 },
    { id: 'away_mf', team: 'away', number: 6, name: 'TV Bạn', role: 'MF', x: 58, y: 50 },
    { id: 'away_fw_l', team: 'away', number: 9, name: 'TĐ Bạn 1', role: 'FW', x: 35, y: 32 },
    { id: 'away_fw_r', team: 'away', number: 11, name: 'TĐ Bạn 2', role: 'FW', x: 35, y: 68 }
  ];

  const DEFAULT_BALL = {
    id: 'ball',
    team: 'ball',
    number: '⚽',
    name: 'Bóng',
    role: 'ball',
    x: 50,
    y: 50
  };

  function getDefaultTacticsPieces() {
    return [
      ...DEFAULT_HOME_PIECES.map(p => ({ ...p })),
      ...DEFAULT_AWAY_PIECES.map(p => ({ ...p })),
      { ...DEFAULT_BALL }
    ];
  }

  return {
    DEFAULT_HOME_PIECES,
    DEFAULT_AWAY_PIECES,
    DEFAULT_BALL,
    getDefaultTacticsPieces
  };
});
