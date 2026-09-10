/**
 * State Management & Data Layer for FC TNT
 * Đồng bộ hóa dữ liệu 2 chiều với Backend Node.js & MongoDB Server
 */

const STORAGE_KEY = 'fc_stats_master_data_v4';
const API_BASE = '/api';

const OFFICIAL_PLAYERS = [
  { id: 'p_1', name: 'Quân Kun', nickname: 'Quân Kun', number: 5, position: 'DF', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Hậu vệ cánh trái' },
  { id: 'p_2', name: 'Vinh Lê', nickname: 'Vinh Lê', number: 6, position: 'MF', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Tiền vệ trung tâm điều tiết' },
  { id: 'p_3', name: 'ToDiu', nickname: 'ToDiu', number: 24, position: 'GK', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Thủ môn bắt chính' },
  { id: 'p_4', name: 'Tài Thọ', nickname: 'Tài Thọ', number: 7, position: 'FW', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Tiền đạo cánh phải bứt tốc' },
  { id: 'p_5', name: 'ct', nickname: 'ct', number: 11, position: 'MF', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Kỹ thuật lắt léo' },
  { id: 'p_6', name: 'Côn 35K1', nickname: 'Côn 35K1', number: 69, position: 'DF', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Trung vệ thòng không chiến' },
  { id: 'p_7', name: 'Trường Giang', nickname: 'Trường Giang', number: 8, position: 'MF', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Tiền vệ năng động' },
  { id: 'p_8', name: 'BusCek.exe', nickname: 'BusCek.exe', number: 31, position: 'DF', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Hậu vệ bọc lót' },
  { id: 'p_9', name: 'Tiếnn', nickname: 'Tiếnn', number: 22, position: 'MF', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Tiền vệ cánh tốc độ' },
  { id: 'p_10', name: 'Đức Bắc', nickname: 'Đức Bắc', number: 4, position: 'DF', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Hậu vệ cánh phải dập khỏe' },
  { id: 'p_11', name: 'Đình Chiến', nickname: 'Đình Chiến', number: 19, position: 'MF', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Tạt bóng chuẩn xác' },
  { id: 'p_12', name: 'Hùng Sứt', nickname: 'Hùng Sứt', number: 10, position: 'FW', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Tiền đạo cánh trái sát thủ' },
  { id: 'p_13', name: 'Đình Anh', nickname: 'Đình Anh', number: 67, position: 'DF', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Hậu vệ tranh chấp tốt' },
  { id: 'p_14', name: 'Thành Nam', nickname: 'Thành Nam', number: 88, position: 'FW', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Tiền đạo đánh đầu' },
  { id: 'p_15', name: 'Sỹ Nam', nickname: 'Sỹ Nam', number: 12, position: 'GK', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Thủ môn phản xạ' }
];

const DEFAULT_DATA = {
  teamInfo: {
    name: 'FC ANH EM PHỦI',
    slogan: 'Đá hết mình - Thắng cùng mừng, Thua cùng uống',
    badge: '⚽',
    formation: '3-1-2'
  },
  players: OFFICIAL_PLAYERS,
  matches: []
};

const ADMIN_AUTH_KEY = 'fc_tnt_admin_token';

class StateManager {
  constructor() {
    this.isAdmin = !!sessionStorage.getItem(ADMIN_AUTH_KEY) || !!localStorage.getItem(ADMIN_AUTH_KEY);
    this.data = this.loadData();
    this.listeners = [];
    this.isServerSynced = false;

    // Tự động đồng bộ với backend MongoDB khi khởi chạy
    this.syncWithBackend();
  }

  getAdminToken() {
    return sessionStorage.getItem(ADMIN_AUTH_KEY) || localStorage.getItem(ADMIN_AUTH_KEY) || '';
  }

  async loginAdmin(pin, remember = true) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.isAdmin = true;
        if (remember) {
          localStorage.setItem(ADMIN_AUTH_KEY, data.token);
        } else {
          sessionStorage.setItem(ADMIN_AUTH_KEY, data.token);
        }
        this.notify();
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Mã PIN không đúng!' };
      }
    } catch (err) {
      return { success: false, error: 'Không thể kết nối máy chủ để xác thực!' };
    }
  }

  logoutAdmin() {
    this.isAdmin = false;
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    localStorage.removeItem(ADMIN_AUTH_KEY);
    this.notify();
  }

  loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.players && parsed.players.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse state from localStorage', e);
    }
    this.saveData(DEFAULT_DATA);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  saveData(dataToSave = this.data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      this.notify();
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }

  async syncWithBackend() {
    try {
      const res = await fetch(`${API_BASE}/data`);
      if (res.ok) {
        const serverData = await res.json();
        if (serverData && serverData.players && serverData.players.length > 0) {
          this.data = serverData;
          this.isServerSynced = true;
          this.saveData(this.data);
          this.notify();
          console.log('🌿 Đã đồng bộ dữ liệu thành công từ MongoDB Server!');
        }
      }
    } catch (err) {
      console.warn('Backend API offline or unreachable, using local storage cache.');
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => {
      try {
        listener(this.data);
      } catch (err) {
        console.error('Error in listener notification:', err);
      }
    });
  }

  // --- PLAYERS CRUD ---
  getPlayers() {
    return this.data.players || [];
  }

  getPlayerById(id) {
    return (this.data.players || []).find(p => p.id === id);
  }

  async addPlayer(player) {
    const newPlayer = {
      ...player,
      id: player.id || ('p_' + Date.now()),
      joinDate: player.joinDate || new Date().toISOString().split('T')[0]
    };
    this.data.players.push(newPlayer);
    this.saveData();

    // Gửi API lên server MongoDB
    try {
      fetch(`${API_BASE}/players`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-token': this.getAdminToken()
        },
        body: JSON.stringify(newPlayer)
      }).catch(err => console.warn('Sync addPlayer error:', err));
    } catch (e) { }

    return newPlayer;
  }

  async updatePlayer(id, updatedFields) {
    const index = this.data.players.findIndex(p => p.id === id);
    if (index !== -1) {
      this.data.players[index] = { ...this.data.players[index], ...updatedFields };
      this.saveData();

      // Gửi API cập nhật lên server MongoDB
      try {
        fetch(`${API_BASE}/players/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-token': this.getAdminToken()
          },
          body: JSON.stringify(this.data.players[index])
        }).catch(err => console.warn('Sync updatePlayer error:', err));
      } catch (e) { }

      return this.data.players[index];
    }
    return null;
  }

  async updatePlayerAvatar(id, avatarBase64) {
    const index = this.data.players.findIndex(p => p.id === id);
    if (index !== -1) {
      this.data.players[index].avatar = avatarBase64;
      this.saveData();

      // Gửi API cập nhật avatar lên server MongoDB (mở cho cả thành viên)
      try {
        fetch(`${API_BASE}/players/${id}/avatar`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: avatarBase64 })
        }).catch(err => console.warn('Sync updatePlayerAvatar error:', err));
      } catch (e) { }

      return this.data.players[index];
    }
    return null;
  }

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
    try {
      fetch(`${API_BASE}/players/${id}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-token': this.getAdminToken()
        }
      }).catch(err => console.warn('Sync deletePlayer error:', err));
    } catch (e) { }
  }

  // --- MATCHES CRUD ---
  getMatches() {
    return (this.data.matches || []).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  getMatchById(id) {
    return (this.data.matches || []).find(m => m.id === id);
  }

  async addMatch(match) {
    const newMatch = {
      ...match,
      id: match.id || ('m_' + Date.now()),
      playerStats: match.playerStats || []
    };
    if (!this.data.matches) this.data.matches = [];
    this.data.matches.unshift(newMatch);
    this.saveData();

    // Gửi API lên server MongoDB
    try {
      fetch(`${API_BASE}/matches`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-token': this.getAdminToken()
        },
        body: JSON.stringify(newMatch)
      }).catch(err => console.warn('Sync addMatch error:', err));
    } catch (e) { }

    return newMatch;
  }

  async updateMatch(id, updatedFields) {
    const index = (this.data.matches || []).findIndex(m => m.id === id);
    if (index !== -1) {
      this.data.matches[index] = { ...this.data.matches[index], ...updatedFields };
      this.saveData();

      // Gửi API cập nhật lên server MongoDB
      try {
        fetch(`${API_BASE}/matches/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-token': this.getAdminToken()
          },
          body: JSON.stringify(this.data.matches[index])
        }).catch(err => console.warn('Sync updateMatch error:', err));
      } catch (e) { }

      return this.data.matches[index];
    }
    return null;
  }

  async deleteMatch(id) {
    this.data.matches = (this.data.matches || []).filter(m => m.id !== id);
    this.saveData();

    // Gửi API xóa lên server MongoDB
    try {
      fetch(`${API_BASE}/matches/${id}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-token': this.getAdminToken()
        }
      }).catch(err => console.warn('Sync deleteMatch error:', err));
    } catch (e) { }
  }

  async clearAllMatches() {
    this.data.matches = [];
    this.saveData();

    // Gửi API xóa tất cả trận lên server MongoDB
    try {
      fetch(`${API_BASE}/matches`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-token': this.getAdminToken()
        }
      }).catch(err => console.warn('Sync clearAllMatches error:', err));
    } catch (e) { }
  }

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
  }

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

  getTeamOverview() {
    const matches = this.getMatches();
    const players = this.getPlayers();

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
      teamName: this.data.teamInfo?.name || 'FC ANH EM PHỦI',
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

  async updateTeamInfo(info) {
    this.data.teamInfo = { ...this.data.teamInfo, ...info };
    this.saveData();

    try {
      fetch(`${API_BASE}/team`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-token': this.getAdminToken()
        },
        body: JSON.stringify(this.data.teamInfo)
      }).catch(err => console.warn('Sync updateTeamInfo error:', err));
    } catch (e) { }
  }

  resetToCleanData() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.saveData();
  }

  exportDataJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  async importDataJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.players && Array.isArray(parsed.players) && parsed.matches && Array.isArray(parsed.matches)) {
        this.data = parsed;
        this.saveData();

        try {
          fetch(`${API_BASE}/backup/restore`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-admin-token': this.getAdminToken()
            },
            body: JSON.stringify(parsed)
          }).catch(err => console.warn('Sync importDataJSON error:', err));
        } catch (e) { }

        return { success: true };
      } else {
        return { success: false, error: 'File JSON không đúng cấu trúc ứng dụng!' };
      }
    } catch (e) {
      return { success: false, error: 'Định dạng file không hợp lệ: ' + e.message };
    }
  }
}

window.stateManager = new StateManager();
