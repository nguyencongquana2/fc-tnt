/**
 * FC TNT - Weather & Pitch Intelligence Router (Facade)
 * routes/weather.js
 * 
 * Bộ điều phối trung tâm dữ liệu thời tiết & Cố vấn sân AKKA Chu Văn An:
 * - routes/weather/weather-service.js: Kết nối Open-Meteo, cache in-memory & tính điểm Playability
 * - routes/weather/weather-ai.js: Tư vấn AI sân bóng, nhận diện kèo đấu, chọn giày & dông sét
 * 
 * Đảm bảo 100% tương thích ngược với server.js:
 * exports: { createWeatherRouter, AKKA_VENUE, parseWmoWeather, calculatePlayability, analyzePitchWithFootballNLP }
 */

const express = require('express');
const { aiRateLimiter } = require('../utils/rateLimiter');
const {
  AKKA_VENUE,
  parseWmoWeather,
  calculatePlayability,
  fetchWeatherForecast
} = require('./weather/weather-service');
const {
  analyzePitchWithFootballNLP,
  consultWeatherWithGemini
} = require('./weather/weather-ai');

function createWeatherRouter() {
  const router = express.Router();

  // GET /api/weather/forecast (Dự báo 7 ngày + 2 slot sân AKKA)
  router.get('/forecast', async (req, res) => {
    try {
      const forecast = await fetchWeatherForecast();
      res.json({
        success: true,
        ...forecast
      });
    } catch (err) {
      console.error('[Weather Router] Error in /api/weather/forecast:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/weather/ai-consultant (Tư vấn thời tiết & mặt sân có bảo vệ rate limit)
  router.post('/ai-consultant', aiRateLimiter, async (req, res) => {
    try {
      const { question, forecastData, selectedDate, selectedSlot } = req.body;
      if (!question || !String(question).trim()) {
        return res.status(400).json({ success: false, error: 'Vui lòng cung cấp câu hỏi!' });
      }

      const geminiKey = process.env.GEMINI_API_KEY;

      // 1. Thử gọi Google Gemini Cloud AI nếu có key
      if (geminiKey) {
        const geminiResult = await consultWeatherWithGemini({
          question,
          forecastData,
          selectedDate,
          selectedSlot,
          geminiKey
        });

        if (geminiResult) {
          return res.json({
            success: true,
            ...geminiResult
          });
        }
      }

      // 2. Tự động Fallback sang Football NLP Engine nội bộ
      const answer = analyzePitchWithFootballNLP(question, forecastData, selectedDate, selectedSlot);
      return res.json({
        success: true,
        answer,
        source: 'FC TNT Pitch Intelligence Engine'
      });

    } catch (err) {
      console.error('[Weather Router] Error in /api/weather/ai-consultant:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

module.exports = {
  createWeatherRouter,
  AKKA_VENUE,
  parseWmoWeather,
  calculatePlayability,
  analyzePitchWithFootballNLP
};
