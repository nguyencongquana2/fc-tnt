/**
 * FC TNT - Sport Splash Screen & Preloader with Interactive Soccer Ball & Fun Facts
 */

(function () {
  const TNT_FACTS = [
    {
      category: '💡 Mẹo Bóng Phủi',
      text: 'Đi bóng qua 3 người không bằng chuyền chuẩn 1 quả rồi dắt nhau đi uống bia!',
      author: 'Triết lý Phủi TNT'
    },
    {
      category: '⭐ Hồ Sơ Cầu Thủ',
      text: 'Quân Kun - Hậu vệ cánh trái: Tỷ lệ xoạc bóng 99% trúng chân bạn, 1% trúng bóng!',
      author: 'Số 5 • Quân Kun'
    },
    {
      category: '🎯 Nhạc Trưởng Tuyến Giữa',
      text: 'Vinh Lê điều tiết nhịp độ trận đấu: Khi cần nhanh thì nhanh, khi mệt thì... đứng thở!',
      author: 'Số 6 • Vinh Lê'
    },
    {
      category: '🧤 Phản Xạ Bàn Thờ',
      text: 'ToDiu bắt bóng dính như keo 502, sẵn sàng bay người cản phá mọi cú sút hiểm hóc!',
      author: 'Số 24 • ToDiu'
    },
    {
      category: '🚀 Cơn Lốc Đường Biên',
      text: 'Tài Thọ bứt tốc xé gió làm náo loạn hàng thủ đối phương lẫn... đồng đội!',
      author: 'Số 7 • Tài Thọ'
    },
    {
      category: '🏰 Hòn Đá Tảng',
      text: 'Quang Voi - Trung vệ thòng không chiến dũng mãnh, lá chắn thép trước khung thành!',
      author: 'Số 69 • Quang Voi'
    },
    {
      category: '🎩 Nghệ Sĩ Sân Cỏ',
      text: 'ct với kỹ thuật hoa mỹ: Đảo chân 8 vòng liên tiếp rồi chuyền về an toàn cho thủ môn!',
      author: 'Số 11 • ct'
    },
    {
      category: '🔥 Sát Thủ Vòng Cấm',
      text: 'Hùng Sứt: Cơ hội 10 mươi có thể bắn chim, nhưng góc 0 độ thì sút bóng găm nóc lưới!',
      author: 'Số 10 • Hùng Sứt'
    },
    {
      category: '⚡ Máy Chạy Miệt Mài',
      text: 'Trường Giang & Tiếnn: Nguồn năng lượng vô tận, chạy từ đầu sân tới cuối quán bia!',
      author: 'Bộ Đôi Tuyến Giữa'
    },
    {
      category: '🍻 Luật Bất Thành Văn',
      text: 'Thắng trả tiền bia, Thua trả tiền sân, Hòa thì chia đôi đi ăn lẩu!',
      author: 'Quy tắc vàng FC TNT'
    },
    {
      category: '🌦️ AI AKKA Thẩm Định',
      text: 'Thời tiết đẹp hay mưa bão không quan trọng, quan trọng là đủ 7 người ra sân!',
      author: 'Hội đồng sân cỏ'
    },
    {
      category: '📊 Thang Điểm 10',
      text: 'Ghi bàn được +1 điểm, kiến tạo +1 điểm, bao tiền nước cả đội được +5 điểm MVP!',
      author: 'Ban trọng tài TNT'
    },
    {
      category: '⚡ Vũ Khí Bí Mật',
      text: 'Đức Bắc & Đình Anh: Cặp hậu vệ chuyên trị những tiền đạo thích múa may!',
      author: 'Thép Vùng Biên'
    },
    {
      category: '🎯 Siêu Phẩm Không Chiến',
      text: 'Thành Nam chọn vị trí đánh đầu chuẩn xác như gắn định vị GPS!',
      author: 'Số 88 • Thành Nam'
    }
  ];

  let kickCount = 0;
  let isDismissed = false;
  let factIndex = Math.floor(Math.random() * TNT_FACTS.length);

  function renderFact() {
    const factTextEl = document.getElementById('splash-fact-text');
    const factCategoryEl = document.getElementById('splash-fact-category');
    const factAuthorEl = document.getElementById('splash-fact-author');
    if (!factTextEl) return;

    const currentFact = TNT_FACTS[factIndex];
    if (factCategoryEl) factCategoryEl.textContent = currentFact.category;
    if (factTextEl) factTextEl.textContent = `"${currentFact.text}"`;
    if (factAuthorEl) factAuthorEl.textContent = `— ${currentFact.author}`;
  }

  function nextFact() {
    factIndex = (factIndex + 1) % TNT_FACTS.length;
    const factBox = document.getElementById('splash-fact-box');
    if (factBox) {
      factBox.classList.add('fade-switch');
      setTimeout(() => {
        renderFact();
        factBox.classList.remove('fade-switch');
      }, 180);
    } else {
      renderFact();
    }
  }

  function spawnConfetti(container, count = 25) {
    if (!container) return;
    const colors = ['#f59e0b', '#10b981', '#38bdf8', '#ec4899', '#fbbf24', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.className = 'splash-confetti-piece';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.left = `${50 + (Math.random() * 60 - 30)}%`;
      piece.style.top = '40%';
      piece.style.setProperty('--vx', `${(Math.random() - 0.5) * 240}px`);
      piece.style.setProperty('--vy', `${-Math.random() * 200 - 80}px`);
      piece.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
      piece.style.animationDelay = `${Math.random() * 0.1}s`;
      container.appendChild(piece);
      setTimeout(() => piece.remove(), 1200);
    }
  }

  function spawnKickSparkle(e, ballEl) {
    const parent = ballEl.parentElement;
    if (!parent) return;
    const spark = document.createElement('div');
    spark.className = 'splash-kick-spark';
    const offsetX = (Math.random() - 0.5) * 50;
    spark.style.left = `calc(50% + ${offsetX}px)`;
    spark.style.top = `30%`;
    parent.appendChild(spark);
    setTimeout(() => spark.remove(), 600);
  }

  function kickBall(e) {
    kickCount++;
    const countEl = document.getElementById('splash-kick-count');
    const ballEl = document.getElementById('splash-interactive-ball');
    const comboEl = document.getElementById('splash-kick-feedback');
    const container = document.querySelector('.splash-container');

    if (countEl) countEl.textContent = kickCount;
    if (ballEl) {
      ballEl.classList.remove('kicked');
      void ballEl.offsetWidth; // trigger reflow
      ballEl.classList.add('kicked');

      // Tiers of flame & lightning aura
      ballEl.classList.remove('aura-spark', 'aura-fire', 'aura-super-saiyan');
      if (kickCount >= 15) {
        ballEl.classList.add('aura-super-saiyan');
      } else if (kickCount >= 10) {
        ballEl.classList.add('aura-fire');
      } else if (kickCount >= 5) {
        ballEl.classList.add('aura-spark');
      }

      spawnKickSparkle(e, ballEl);
    }

    if (comboEl) {
      let msg = '+1 ⚽';
      if (kickCount === 5) {
        msg = '🔥 Bắt đầu nóng máy! 5 quả!';
        if (container) spawnConfetti(container, 15);
      } else if (kickCount === 10) {
        msg = '⚡ Siêu sao tâng bóng! 10 quả!';
        if (container) spawnConfetti(container, 30);
      } else if (kickCount >= 15 && kickCount % 5 === 0) {
        msg = `🏆 Huyền thoại sân phủi! ${kickCount} quả!`;
        if (container) spawnConfetti(container, 45);
      }
      comboEl.textContent = msg;
      comboEl.classList.remove('pop');
      void comboEl.offsetWidth;
      comboEl.classList.add('pop');
    }
  }

  const SPLASH_SESSION_KEY = 'tnt_splash_viewed_session';

  function dismissSplash(immediate = false) {
    if (isDismissed) return;
    isDismissed = true;
    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    } catch (e) {
      console.warn('[Splash] sessionStorage unavailable:', e.message);
    }

    const splash = document.getElementById('tnt-splash-screen');
    if (splash) {
      if (immediate) {
        splash.style.display = 'none';
        splash.remove();
      } else {
        splash.classList.add('splash-fade-out');
        setTimeout(() => {
          splash.style.display = 'none';
          splash.remove();
        }, 350);
      }
    }
  }

  function initSplash() {
    // 1. Kiểm tra session: Nếu người dùng đã xem splash trong phiên duyệt web -> đóng ngay lập tức (0.0s)
    try {
      if (sessionStorage.getItem(SPLASH_SESSION_KEY) === '1') {
        dismissSplash(true);
        return;
      }
    } catch (e) {
      console.warn('[Splash] sessionStorage check warning:', e.message);
    }

    renderFact();

    const ball = document.getElementById('splash-interactive-ball');
    if (ball) {
      ball.addEventListener('click', kickBall);
      ball.addEventListener('touchstart', (e) => {
        e.preventDefault();
        kickBall(e);
      }, { passive: false });
    }

    const nextFactBtn = document.getElementById('splash-next-fact-btn');
    if (nextFactBtn) {
      nextFactBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nextFact();
      });
    }

    const skipBtn = document.getElementById('splash-skip-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => dismissSplash(false));
    }

    // Dynamic progress bar simulation (~1.2s - 1.4s duration cho cảm giác mượt mà, siêu tốc)
    const progressBar = document.getElementById('splash-progress-fill');
    const percentBadge = document.getElementById('splash-percent-badge');
    const statusText = document.getElementById('splash-status-text');
    let progress = 0;

    const interval = setInterval(() => {
      // Tăng đều và nhanh (~2.8% đến 4.2% mỗi 35ms -> tổng thời gian khoảng ~1.2s)
      const increment = Math.random() * 1.4 + 2.8;
      progress = Math.min(100, progress + increment);
      const rounded = Math.floor(progress);

      if (progressBar) progressBar.style.width = rounded + '%';
      if (percentBadge) percentBadge.textContent = rounded + '%';

      if (statusText) {
        if (progress < 30) {
          statusText.textContent = '⏳ Đang kết nối phòng thay đồ FC TNT...';
        } else if (progress < 65) {
          statusText.textContent = '📋 Đang đồng bộ bảng vinh danh & chiến thuật...';
        } else if (progress < 90) {
          statusText.textContent = '👟 Cầu thủ đang xỏ giày và khởi động...';
        } else {
          statusText.textContent = '🔥 Đội hình sẵn sàng ra sân!';
        }
      }

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => dismissSplash(false), 200);
      }
    }, 35);

    // Keyboard shortcut (Space / Enter to skip)
    window.addEventListener('keydown', function (e) {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (!isDismissed) {
          dismissSplash(false);
        }
      }
    }, { once: true });

    // Fallback max timeout (1.8s)
    setTimeout(() => dismissSplash(false), 1800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSplash);
  } else {
    initSplash();
  }

  if (window.TNT) {
    window.TNT.register('splash', {
      dismiss: dismissSplash,
      nextFact: nextFact
    });
  }
  window.dismissTNTSplash = dismissSplash;
  window.nextTNTFact = nextFact;
})();
