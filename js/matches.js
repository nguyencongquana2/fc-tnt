/**
 * Matches & Sofascore Pitch Module - FC TNT
 * Hợp nhất các submodule nghiệp vụ từ thư mục js/matches/:
 * - matches-list.js: Danh sách trận đấu, modal chi tiết & CRUD trận đấu
 * - matches-pitch.js: Sơ đồ chiến thuật sân 7 Sofascore (3-1-2) & kéo thả vị trí
 * - matches-ai.js: Đánh giá trận đấu & chấm điểm bằng AI Gemini
 * - matches-live.js: Trợ lý sân cỏ Live Companion & Voice-to-Event
 */

window.matchesModule = window.matchesModule || {};

Object.assign(window.matchesModule, {
  currentMatchId: null,
  currentEditMatchId: null,
  activeViewMode: 'pitch', // 'pitch' or 'list'

  init() {
    this.bindEvents();
    this.renderMatches();
  },

  bindEvents() {
    const addMatchBtn = document.getElementById('add-match-btn');
    if (addMatchBtn) {
      addMatchBtn.addEventListener('click', () => this.openCreateMatchModal());
    }

    const matchForm = document.getElementById('match-form');
    if (matchForm) {
      matchForm.addEventListener('submit', (e) => this.handleSaveMatch(e));
    }

    const saveRatingBtn = document.getElementById('save-match-ratings-btn');
    if (saveRatingBtn) {
      saveRatingBtn.addEventListener('click', () => this.handleSaveRatings());
    }
  }
});

if (window.TNT) {
  window.TNT.register('matches', window.matchesModule);
}

