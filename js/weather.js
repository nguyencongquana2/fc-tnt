/**
 * FC TNT - Weather & Pitch AI Consultant Module (js/weather.js - Facade Pattern)
 * Tọa độ Sân bóng đá AKKA - 68 Đại Lộ Chu Văn An, Thanh Liệt, Hà Nội
 *
 * Phân tách thành các sub-module chuyên biệt theo chuẩn Clean Architecture:
 * - js/weather/weather-core.js: Dữ liệu thời tiết, fallback Open-Meteo, thẻ 7 ngày & widget
 * - js/weather/weather-radar.js: Chi tiết ngày, phân tích 2 slot thi đấu & Radar diễn biến 17h-23h
 * - js/weather/weather-ai.js: Cố vấn AI thời tiết & Bộ não Football NLP tiếng Việt thẩm định sân
 *
 * Đăng ký qua Service Locator: window.TNT.weather & tương thích ngược window.weatherModule
 */

(function (root) {
  'use strict';

  // Khởi tạo đối tượng Weather Module trung tâm
  const weatherModule = root.weatherModule || {};

  // Hợp nhất các submodule mixins
  if (root.TNTWeatherMixins) {
    if (root.TNTWeatherMixins.core) {
      Object.assign(weatherModule, root.TNTWeatherMixins.core);
    }
    if (root.TNTWeatherMixins.radar) {
      Object.assign(weatherModule, root.TNTWeatherMixins.radar);
    }
    if (root.TNTWeatherMixins.ai) {
      Object.assign(weatherModule, root.TNTWeatherMixins.ai);
    }
  }

  // Đăng ký qua Service Locator window.TNT
  if (root.TNT && typeof root.TNT.register === 'function') {
    root.TNT.register('weather', weatherModule);
  }

  // Tương thích ngược toàn cục
  root.weatherModule = weatherModule;

})(typeof window !== 'undefined' ? window : this);
