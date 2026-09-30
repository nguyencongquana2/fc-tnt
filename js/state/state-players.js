/**
 * FC TNT - State Submodule: Players & Performance Stats (state-players.js)
 * Quản lý danh sách cầu thủ, avatar, tính toán thống kê phong độ & bảng vinh danh (Top Goals, Assists, MOTM)
 */

(function (root) {
  'use strict';

  const API_BASE = '/api';

  root.TNTStateMixins = root.TNTStateMixins || {};

  root.TNTStateMixins.players = {
    getPlayers() {
      return this.data.players || [];
    },

    getPlayerById(id) {
      return (this.data.players || []).find(p => p.id === id);
    },

    async addPlayer(player) {
      const newPlayer = {
        ...player,
        id: player.id || ('p_' + Date.now()),
        joinDate: player.joinDate || new Date().toISOString().split('T')[0]
      };
      this.data.players.push(newPlayer);
      this.saveData();

      // Gửi API lên server MongoDB
      this._syncToServer(`${API_BASE}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': this.getAdminToken()
        },
        body: JSON.stringify(newPlayer)
      }, 'addPlayer');

      return newPlayer;
    },

    async updatePlayer(id, updatedFields) {
      const index = this.data.players.findIndex(p => p.id === id);
      if (index !== -1) {
        this.data.players[index] = { ...this.data.players[index], ...updatedFields };
        this.saveData();

        // Gửi API cập nhật lên server MongoDB
        this._syncToServer(`${API_BASE}/players/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': this.getAdminToken()
          },
          body: JSON.stringify(this.data.players[index])
        }, 'updatePlayer');

        return this.data.players[index];
      }
      return null;
    },

    canEditPlayerAvatar(playerId) {
      if (this.isAdmin) return true;
      if (this.isPlayerLoggedIn() && this.currentPlayer && this.currentPlayer.id === playerId) return true;
      return false;
    },

    async updatePlayerAvatar(id, avatarBase64) {
      const index = this.data.players.findIndex(p => p.id === id);
      if (index !== -1) {
        this.data.players[index].avatar = avatarBase64;
        this.saveData();

        const headers = { 'Content-Type': 'application/json' };
        const adminToken = this.getAdminToken();
        const playerToken = this.getPlayerToken();
        if (adminToken) headers['x-admin-token'] = adminToken;
        if (playerToken) headers['x-player-token'] = playerToken;

        // Gửi API cập nhật avatar lên server MongoDB (chỉ Admin hoặc chính chủ)
        this._syncToServer(`${API_BASE}/players/${id}/avatar`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ avatar: avatarBase64 })
        }, 'updatePlayerAvatar');

        return this.data.players[index];
      }
      return null;
    },

    async deletePlayer(id) {
      this.data.players = this.data.players.filter(p => p.id !== id);
      if (this.data.matches) {
        this.data.matches.forEach(m => {
          if (m.playerStats) {
            m.playerStats = m.playerStats.filter(ps => ps.playerId !== id);
          }
        });
      }
      this.saveData();

      // Gửi API xóa lên server MongoDB
      this._syncToServer(`${API_BASE}/players/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': this.getAdminToken()
        }
      }, 'deletePlayer');
    },

    // --- STATS & COMPUTATIONS ---
    getPlayerOverallStats() {
      const players = this.getPlayers();
      const matches = this.getMatches();
      const statsMap = {};

      players.forEach(p => {
        statsMap[p.id] = {
          player: p,
          matchesPlayed: 0,
          totalRating: 0,
          avgRating: 0,
          totalGoals: 0,
          totalAssists: 0,
          goalContributions: 0,
          motmCount: 0,
          yellowCards: 0,
          redCards: 0,
          matchHistory: []
        };
      });

      matches.forEach(m => {
        let highestRating = -1;
        let motmPlayerIds = [];

        if (m.playerStats && m.playerStats.length > 0) {
          m.playerStats.forEach(ps => {
            const rating = Number(ps.rating) || 0;
            if (rating > highestRating) {
              highestRating = rating;
              motmPlayerIds = [ps.playerId];
            } else if (rating === highestRating && rating > 0) {
              motmPlayerIds.push(ps.playerId);
            }
          });

          m.playerStats.forEach(ps => {
            if (statsMap[ps.playerId]) {
              const entry = statsMap[ps.playerId];
              const rating = Number(ps.rating) || 0;
              const goals = Number(ps.goals) || 0;
              const assists = Number(ps.assists) || 0;
              const yellow = Number(ps.yellowCards) || 0;
              const red = Number(ps.redCards) || 0;

              entry.matchesPlayed += 1;
              entry.totalRating += rating;
              entry.totalGoals += goals;
              entry.totalAssists += assists;
              entry.yellowCards += yellow;
              entry.redCards += red;

              if (motmPlayerIds.includes(ps.playerId) && highestRating >= 7.0) {
                entry.motmCount += 1;
              }

              entry.matchHistory.push({
                matchId: m.id,
                date: m.date,
                opponent: m.opponent,
                result: m.result,
                score: `${m.homeScore} - ${m.awayScore}`,
                rating: rating,
                goals: goals,
                assists: assists,
                note: ps.note || ''
              });
            }
          });
        }
      });

      return Object.values(statsMap).map(st => {
        st.avgRating = st.matchesPlayed > 0 ? Number((st.totalRating / st.matchesPlayed).toFixed(2)) : 0;
        st.goalContributions = st.totalGoals + st.totalAssists;
        return st;
      });
    },

    getLeaderboards() {
      const allStats = this.getPlayerOverallStats();

      const topScorers = [...allStats]
        .filter(s => s.totalGoals > 0)
        .sort((a, b) => b.totalGoals - a.totalGoals || b.totalAssists - a.totalAssists || b.avgRating - a.avgRating);

      const topAssists = [...allStats]
        .filter(s => s.totalAssists > 0)
        .sort((a, b) => b.totalAssists - a.totalAssists || b.totalGoals - a.totalGoals || b.avgRating - a.avgRating);

      const topRatings = [...allStats]
        .filter(s => s.matchesPlayed > 0)
        .sort((a, b) => b.avgRating - a.avgRating || b.matchesPlayed - a.matchesPlayed || b.goalContributions - a.goalContributions);

      const topAppearances = [...allStats]
        .filter(s => s.matchesPlayed > 0)
        .sort((a, b) => b.matchesPlayed - a.matchesPlayed || b.avgRating - a.avgRating);

      return {
        topScorers,
        topAssists,
        topRatings,
        topAppearances,
        allStats
      };
    }
  };
})(typeof self !== 'undefined' ? self : this);
