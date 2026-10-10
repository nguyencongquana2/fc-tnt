/**
 * FC TNT - Match Player Reviews UI Controller (js/matches/matches-ai-review.js)
 * Quản lý cuộn tới khu vực nhận xét phong độ, mở rộng/thu gọn và bộ lọc Filter Pills
 */

(function (root) {
  'use strict';

  root.matchesModule = root.matchesModule || {};

  Object.assign(root.matchesModule, {
    scrollToReviews() {
      const section = document.getElementById('match-player-reviews-section');
      if (section) {
        const grid = document.getElementById('match-reviews-grid-body');
        if (grid && grid.style.display === 'none') {
          grid.style.display = 'grid';
        }
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        section.classList.add('review-pulse-highlight');
        setTimeout(() => section.classList.remove('review-pulse-highlight'), 1800);
      }
    },

    toggleReviewsCollapse() {
      const grid = document.getElementById('match-reviews-grid-body');
      const btnText = document.getElementById('reviews-collapse-btn-text');
      if (!grid) return;

      if (grid.style.display === 'none') {
        grid.style.display = 'grid';
        if (btnText) btnText.innerText = '🔽 Thu gọn';
      } else {
        grid.style.display = 'none';
        if (btnText) btnText.innerText = '▶️ Mở rộng xem nhận xét';
      }
    },

    filterReviews(filterType, btnEl) {
      if (btnEl) {
        document.querySelectorAll('#reviews-filter-container .review-filter-btn').forEach(b => b.classList.remove('active'));
        btnEl.classList.add('active');
      }

      const grid = document.getElementById('match-reviews-grid-body');
      if (grid && grid.style.display === 'none') {
        grid.style.display = 'grid';
        const btnText = document.getElementById('reviews-collapse-btn-text');
        if (btnText) btnText.innerText = '🔽 Thu gọn';
      }

      const cards = document.querySelectorAll('.match-review-card');
      cards.forEach(card => {
        const isStarter = card.getAttribute('data-is-starter') === 'true';
        const hasNote = card.getAttribute('data-has-note') === 'true';
        const isMotm = card.getAttribute('data-is-motm') === 'true';

        let show = false;
        if (filterType === 'all') show = true;
        else if (filterType === 'has-note') show = hasNote;
        else if (filterType === 'starter') show = isStarter;
        else if (filterType === 'bench') show = !isStarter;
        else if (filterType === 'motm') show = isMotm;

        card.style.display = show ? 'flex' : 'none';
      });
    }
  });

})(typeof window !== 'undefined' ? window : this);
