/**
 * FC TNT - State Submodule: Matches & Team Overview (state-matches.js)
 * Quản lý lịch sử trận đấu, ghi nhận kết quả và tính toán phong độ toàn đội
 */

(function (root) {
  'use strict';

  const API_BASE = '/api';

  root.TNTStateMixins = root.TNTStateMixins || {};

  root.TNTStateMixins.matches = {
    getMatches() {
      return (this.data.matches || []).sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    getMatchById(id) {
      return (this.data.matches || []).find(m => m.id === id);
    },

    addMatch(match) {
      const newMatch = {
        ...match,
        id: match.id || ('m_' + Date.now()),
        playerStats: match.playerStats || []
      };
      if (!this.data.matches) this.data.matches = [];
      this.data.matches.unshift(newMatch);
      this.saveData();

      // Gửi API lên server MongoDB
      this._syncToServer(`${API_BASE}/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': this.getAdminToken()
        },
        body: JSON.stringify(newMatch)
      }, 'addMatch');

      return newMatch;
    },

    async updateMatch(id, updatedFields) {
      const index = (this.data.matches || []).findIndex(m => m.id === id);
      if (index !== -1) {
        this.data.matches[index] = { ...this.data.matches[index], ...updatedFields };
        this.saveData();

        // Gửi API cập nhật lên server MongoDB
        this._syncToServer(`${API_BASE}/matches/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': this.getAdminToken()
          },
          body: JSON.stringify(this.data.matches[index])
        }, 'updateMatch');

        return this.data.matches[index];
      }
      return null;
    },

    async deleteMatch(id) {
      this.data.matches = (this.data.matches || []).filter(m => m.id !== id);
      this.saveData();

      // Gửi API xóa lên server MongoDB
      this._syncToServer(`${API_BASE}/matches/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': this.getAdminToken()
        }
      }, 'deleteMatch');
    },

    async clearAllMatches() {
      this.data.matches = [];
      this.saveData();

      // Gửi API xóa tất cả trận lên server MongoDB
      this._syncToServer(`${API_BASE}/matches`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': this.getAdminToken()
        }
      }, 'clearAllMatches');
    },

    getTeamOverview() {
      const matches = this.getMatches();
      const players = this.getPlayers ? this.getPlayers() : (this.data.players || []);

      let totalMatches = matches.length;
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let goalsFor = 0;
      let goalsAgainst = 0;

      matches.forEach(m => {
        const h = Number(m.homeScore) || 0;
        const a = Number(m.awayScore) || 0;
        goalsFor += h;
        goalsAgainst += a;

        if (h > a) wins++;
        else if (h === a) draws++;
        else losses++;
      });

      const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

      return {
        teamName: this.data.teamInfo?.name || 'FC TNT',
        slogan: this.data.teamInfo?.slogan || 'Đá hết mình - Thắng cùng mừng, Thua cùng uống',
        totalPlayers: players.length,
        totalMatches,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst,
        winRate
      };
    }
  };
})(typeof self !== 'undefined' ? self : this);
