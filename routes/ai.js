/**
 * FC TNT - AI Performance Rating & Match Evaluation Router (Facade)
 * routes/ai.js
 * 
 * Bộ điều phối trung tâm các dịch vụ AI FC TNT:
 * - routes/ai/ai-engine.js: Bộ não phân tích AI cục bộ (Smart Football Rules & NLP Engine)
 * - routes/ai/ai-gemini.js: Tích hợp Google Gemini Cloud LLM (2.0-flash / 1.5-flash / 2.5-flash)
 * 
 * Đảm bảo 100% tương thích ngược với server.js và routes/matches.js:
 * exports: { createAiRouter, analyzeMatchWithNLP, getPlayerAliases }
 */

const express = require('express');
const { aiRateLimiter } = require('../utils/rateLimiter');
const { analyzeMatchWithNLP, getPlayerAliases } = require('./ai/ai-engine');
const { evaluateWithGemini } = require('./ai/ai-gemini');

function createAiRouter() {
  const router = express.Router();

  router.post('/rate-match', aiRateLimiter, async (req, res) => {
    try {
      const { matchInfo, playerList, matchNarration, liveEvents, apiKey } = req.body;

      if (!playerList || !Array.isArray(playerList) || playerList.length === 0) {
        return res.status(400).json({ success: false, error: 'Danh sách cầu thủ không hợp lệ!' });
      }

      const geminiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

      // 1. Thử gọi Google Gemini Cloud LLM nếu có API Key
      if (geminiKey) {
        const geminiResult = await evaluateWithGemini({
          matchInfo,
          playerList,
          matchNarration,
          liveEvents,
          geminiKey
        });

        if (geminiResult) {
          return res.json({
            success: true,
            ...geminiResult
          });
        }
      }

      // 2. Tự động Fallback sang Smart Football Analysis Engine phía backend
      const fallbackResult = analyzeMatchWithNLP({
        matchInfo,
        playerList,
        matchNarration,
        liveEvents
      });

      return res.json({
        success: true,
        ...fallbackResult
      });

    } catch (err) {
      console.error('[AI Router] Error in /api/ai/rate-match:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

module.exports = {
  createAiRouter,
  analyzeMatchWithNLP,
  getPlayerAliases
};
