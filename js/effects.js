/**
 * FC TNT - Premium Visual Effects Engine
 * 3D Holographic Tilt, Number Counters, Pitch Radar, Ambient Particles, Floating Reactions & Neon Ripples
 */

(function () {
  'use strict';

  // ==========================================
  // 1. 3D HOLOGRAPHIC PARALLAX TILT EFFECT
  // ==========================================
  function init3DHolographicTilt() {
    const cardSelectors = '.player-fifa-card, .podium-player-card, .trophy-showcase-card, .hero-match-card, .next-match-card';

    document.addEventListener('mousemove', (e) => {
      const target = e.target.closest(cardSelectors);
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Góc nghiêng tối đa ±12 độ
      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;

      const percentX = (x / rect.width) * 100;
      const percentY = (y / rect.height) * 100;

      target.style.setProperty('--holo-x', `${percentX}%`);
      target.style.setProperty('--holo-y', `${percentY}%`);
      target.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.03, 1.03, 1.03)`;
      target.classList.add('is-tilting');
    });

    // Reset khi chuột rời khỏi thẻ
    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest(cardSelectors);
      if (target && (!e.relatedTarget || !target.contains(e.relatedTarget))) {
        target.style.transform = '';
        target.classList.remove('is-tilting');
      }
    });
  }

  // ==========================================
  // 2. NUMBER ROLL / COUNT-UP ANIMATION
  // ==========================================
  function animateNumber(element, start, end, duration = 1200, isFloat = false) {
    if (!element) return;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentVal = start + (end - start) * ease;

      if (isFloat) {
        element.textContent = currentVal.toFixed(1);
      } else {
        element.textContent = Math.floor(currentVal).toLocaleString('vi-VN');
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        if (isFloat) {
          element.textContent = end.toFixed(1);
        } else {
          element.textContent = end.toLocaleString('vi-VN');
        }
      }
    }

    requestAnimationFrame(update);
  }

  function triggerStatsCounter() {
    // Tìm các phần tử điểm số và thống kê để chạy hiệu ứng nhảy số
    const numElements = document.querySelectorAll('.hero-stat-num, .stat-value, .podium-player-stat, .mini-stat-val, .player-overall-num');
    numElements.forEach((el) => {
      if (el.dataset.animated === 'true') return;
      const rawText = el.textContent.trim().replace(/[^0-9.]/g, '');
      const num = parseFloat(rawText);
      if (!isNaN(num) && num > 0) {
        el.dataset.animated = 'true';
        const isFloat = rawText.includes('.');
        animateNumber(el, 0, num, 900, isFloat);
      }
    });
  }

  // ==========================================
  // 3. TACTICAL PITCH RADAR & PERFORMANCE AURA
  // ==========================================
  function injectPitchRadar() {
    const pitches = document.querySelectorAll('.sofascore-pitch-container, #sofascore-pitch-dropzone, .pitch-container, .sofascore-pitch');
    pitches.forEach((pitch) => {
      if (!pitch.querySelector('.tactical-pitch-radar')) {
        const radar = document.createElement('div');
        radar.className = 'tactical-pitch-radar';
        radar.innerHTML = '<div class="radar-scan-beam"></div><div class="radar-scan-trail"></div>';
        pitch.insertBefore(radar, pitch.firstChild);
      }
      if (!pitch.querySelector('.tactical-radar-live-tag')) {
        const tag = document.createElement('div');
        tag.className = 'tactical-radar-live-tag';
        tag.innerHTML = '<span class="radar-live-blip"></span><span>AI TACTICAL RADAR • LIVE</span>';
        pitch.appendChild(tag);
      }
    });

    // Thêm hào quang phát sáng thở cho các cầu thủ rating cao (>= 8.0)
    document.querySelectorAll('.sofascore-player-node').forEach(node => {
      const ratingBox = node.querySelector('.sofa-rating-box');
      if (ratingBox) {
        const rating = parseFloat(ratingBox.textContent.trim());
        if (rating >= 8.0) {
          node.classList.add('rating-high-aura');
        } else {
          node.classList.remove('rating-high-aura');
        }
      }
    });
  }

  // ==========================================
  // 4. WEATHER DYNAMIC AMBIENT PARTICLES
  // ==========================================
  function applyWeatherParticles(container, weatherCode = 0, rainProb = 0) {
    if (!container) return;
    
    // Xóa overlay cũ nếu có
    const existing = container.querySelector('.weather-particles-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'weather-particles-overlay';

    // Xác định kiểu thời tiết (Rain, Thunder, Sunny, Cloudy)
    const isThunder = weatherCode >= 95;
    const isRainy = (weatherCode >= 50 && weatherCode <= 82) || rainProb >= 45 || isThunder;
    const isSunny = (weatherCode === 0 || weatherCode === 1) && rainProb < 20;

    if (isThunder) {
      const flash = document.createElement('div');
      flash.className = 'weather-lightning-flash';
      overlay.appendChild(flash);
    }

    if (isRainy) {
      const dropCount = isThunder ? 32 : 20;
      for (let i = 0; i < dropCount; i++) {
        const drop = document.createElement('div');
        drop.className = 'weather-rain-drop';
        drop.style.left = `${Math.random() * 100}%`;
        drop.style.animationDelay = `${(Math.random() * 0.8).toFixed(2)}s`;
        drop.style.animationDuration = `${(0.5 + Math.random() * 0.4).toFixed(2)}s`;
        overlay.appendChild(drop);
      }

      // Tạo 4 vòng sóng gợn nước ở đáy
      for (let j = 0; j < 4; j++) {
        const ripple = document.createElement('div');
        ripple.className = 'weather-rain-ripple';
        ripple.style.left = `${15 + j * 22 + Math.random() * 8}%`;
        ripple.style.animationDelay = `${(j * 0.28).toFixed(2)}s`;
        overlay.appendChild(ripple);
      }
    } else if (isSunny) {
      const corona = document.createElement('div');
      corona.className = 'weather-sun-corona';
      overlay.appendChild(corona);

      const ray = document.createElement('div');
      ray.className = 'weather-sun-ray';
      overlay.appendChild(ray);
    } else {
      // Mây nhẹ / mát mẻ
      const mist = document.createElement('div');
      mist.className = 'weather-cloud-mist';
      overlay.appendChild(mist);
    }

    container.appendChild(overlay);
  }

  function initWeatherAmbientFx() {
    const banners = document.querySelectorAll('.dash-weather-banner, .slot-focus-card, .day-detail-panel');
    banners.forEach(b => {
      if (!b.querySelector('.weather-particles-overlay')) {
        applyWeatherParticles(b, 61, 60);
      }
    });
  }

  // ==========================================
  // 5. FLOATING EMOJI EXPLOSION / REACTION BURST
  // ==========================================
  function spawnFloatingReaction(originElement, reactionType) {
    if (!originElement) return;
    const rect = originElement.getBoundingClientRect();
    const emojis = {
      beer: ['🍻', '🍺', '🥂', '✨'],
      heart: ['❤️', '💖', '🔥', '✨'],
      football: ['⚽', '🥅', '🎯', '⚡'],
      fire: ['🔥', '💥', '⚡', '💣']
    };

    const pool = emojis[reactionType] || ['⭐', '✨', '🎉'];
    const count = 7;

    for (let i = 0; i < count; i++) {
      const em = document.createElement('div');
      em.className = 'floating-reaction-bubble';
      em.textContent = pool[Math.floor(Math.random() * pool.length)];

      const startX = rect.left + rect.width / 2 + (Math.random() * 20 - 10);
      const startY = rect.top + rect.height / 2;

      em.style.left = `${startX}px`;
      em.style.top = `${startY}px`;
      em.style.setProperty('--drift-x', `${(Math.random() - 0.5) * 110}px`);
      em.style.setProperty('--scale-val', `${(0.8 + Math.random() * 0.7).toFixed(2)}`);
      em.style.animationDelay = `${(i * 0.08).toFixed(2)}s`;

      document.body.appendChild(em);
      setTimeout(() => em.remove(), 1500);
    }
  }

  // ==========================================
  // 6. GLOBAL NEON RIPPLE EFFECT
  // ==========================================
  function initGlobalRippleEffect() {
    const rippleSelectors = '.btn, .tab-btn, .reaction-btn, .slot-toggle-btn, .moment-category-pill, .review-filter-btn';

    document.addEventListener('click', (e) => {
      const target = e.target.closest(rippleSelectors);
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const circle = document.createElement('span');
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.classList.add('neon-ripple-wave');

      const existingRipple = target.querySelector('.neon-ripple-wave');
      if (existingRipple) existingRipple.remove();

      target.appendChild(circle);
      setTimeout(() => circle.remove(), 600);
    });
  }

  // ==========================================
  // 7. QR LASER SCANNER INJECTOR
  // ==========================================
  function injectQRLaserScanner() {
    const qrBoxes = document.querySelectorAll('#fin-qr-code-box, .fin-qr-wrapper');
    qrBoxes.forEach(box => {
      if (!box.querySelector('.qr-laser-scanner-line')) {
        const laser = document.createElement('div');
        laser.className = 'qr-laser-scanner-line';
        box.appendChild(laser);
      }
    });
  }

  // ==========================================
  // INITIALIZE ENGINE
  // ==========================================
  function initEffects() {
    init3DHolographicTilt();
    injectPitchRadar();
    initWeatherAmbientFx();
    initGlobalRippleEffect();
    injectQRLaserScanner();

    // Quan sát thay đổi DOM để kích hoạt hiệu ứng tự động
    const observer = new MutationObserver(() => {
      injectPitchRadar();
      injectQRLaserScanner();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Lắng nghe sự kiện chuyển Tab để chạy lại hiệu ứng nhảy số
    window.addEventListener('tabChanged', () => {
      setTimeout(() => {
        document.querySelectorAll('[data-animated="true"]').forEach(el => el.removeAttribute('data-animated'));
        triggerStatsCounter();
        injectPitchRadar();
        injectQRLaserScanner();
      }, 100);
    });

    // Kích hoạt lần đầu sau khi load
    setTimeout(triggerStatsCounter, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEffects);
  } else {
    initEffects();
  }

  window.tntEffects = {
    animateNumber,
    triggerStatsCounter,
    injectPitchRadar,
    applyWeatherParticles,
    spawnFloatingReaction,
    injectQRLaserScanner
  };
})();
