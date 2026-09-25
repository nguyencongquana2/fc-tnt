/**
 * State Management & Data Layer for FC TNT
 * Đồng bộ hóa dữ liệu 2 chiều với Backend Node.js & MongoDB Server
 */

const STORAGE_KEY = 'fc_tnt_data_v4';
const API_BASE = '/api';

// Global HTML Escaper to prevent Cross-Site Scripting (XSS)
window.escapeHtml = function (str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
// Single Source of Truth from utils/officialPlayers.js (loaded in index.html)
const OFFICIAL_PLAYERS = (typeof window !== 'undefined' && window.OFFICIAL_PLAYERS) || [];


const DEFAULT_DATA = {
  teamInfo: {
    name: 'FC TNT',
    slogan: 'Đá hết mình - Thắng cùng mừng, Thua cùng uống',
    badge: '⚽',
    formation: '3-1-2'
  },
  players: OFFICIAL_PLAYERS,
  matches: [],
  moments: []
};

const ADMIN_AUTH_KEY = 'fc_tnt_admin_token';

class StateManager {
  constructor() {
    this.isAdmin = !!sessionStorage.getItem(ADMIN_AUTH_KEY) || !!localStorage.getItem(ADMIN_AUTH_KEY);
    this.data = this.loadData();
    this.listeners = [];
    this.isServerSynced = false;
    this.socket = null;

    // Tự động đồng bộ với backend MongoDB khi khởi chạy
    this.syncWithBackend();

    // Khởi tạo kết nối Real-time WebSocket
    this.initRealtimeSocket();
  }

  initRealtimeSocket() {
    if (typeof io !== 'undefined') {
      try {
        this.socket = io({
          transports: ['websocket', 'polling'],
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000
        });

        this.socket.on('connect', () => {
          console.log('⚡ Real-time WebSocket connected:', this.socket.id);
          this.updateRealtimeIndicator(true);
        });

        this.socket.on('disconnect', () => {
          console.log('⚡ Real-time WebSocket disconnected');
          this.updateRealtimeIndicator(false);
        });

        this.socket.on('data_updated', async (payload) => {
          console.log('🔄 Tín hiệu cập nhật thời gian thực:', payload);
          // Đồng bộ lại dữ liệu tức thì từ server
          await this.syncWithBackend(true);

          if (payload && payload.message) {
            if (window.appModule && window.appModule.showToast) {
              window.appModule.showToast(payload.message, 'info');
            } else if (window.showToast) {
              window.showToast(payload.message, 'info');
            }
          }
        });

        // Nhận tín hiệu đồng bộ trận đấu Live liên máy
        this.socket.on('live_match_synced', (draftData) => {
          console.log('📡 Nhận tín hiệu Live Match từ thiết bị khác:', draftData);
          if (window.matchesModule && typeof window.matchesModule.handleRemoteLiveMatchSync === 'function') {
            window.matchesModule.handleRemoteLiveMatchSync(draftData);
          }
        });

        this.socket.on('live_match_cleared', () => {
          console.log('📡 Trận đấu Live đã kết thúc/xóa trên thiết bị khác');
          if (window.matchesModule && typeof window.matchesModule.handleRemoteLiveMatchClear === 'function') {
            window.matchesModule.handleRemoteLiveMatchClear();
          }
        });
      } catch (err) {
        console.warn('Socket.io client init error:', err);
      }
    }
  }

  updateRealtimeIndicator(isOnline) {
    const indicator = document.getElementById('realtime-live-indicator');
    if (indicator) {
      if (isOnline) {
        indicator.classList.remove('offline');
        indicator.title = '🟢 Đang đồng bộ thời gian thực (Real-time Live)';
      } else {
        indicator.classList.add('offline');
        indicator.title = '⚪ Đang chạy chế độ ngoại tuyến (Offline cache)';
      }
    }
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
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('fc_stats_master_data_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.players && parsed.players.length > 0) {
          if (!parsed.moments) parsed.moments = [];
          if (!parsed.matches) parsed.matches = [];
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse state from localStorage', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  saveData(dataToSave = this.data) {
    try {
      // Tách dữ liệu nhẹ lưu cache LocalStorage (loại bỏ media nặng của moments để không bao giờ vượt quota 5MB)
      const lightCache = {
        teamInfo: dataToSave.teamInfo,
        players: dataToSave.players,
        matches: dataToSave.matches,
        moments: Array.isArray(dataToSave.moments) ? dataToSave.moments.map(m => ({
          ...m,
          images: [],
          video: null
        })) : []
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lightCache));
    } catch (e) {
      console.warn('LocalStorage cache warning (quota):', e);
      try {
        const miniCache = {
          teamInfo: dataToSave.teamInfo,
          matches: dataToSave.matches
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(miniCache));
      } catch (e2) {
        console.warn('LocalStorage miniCache fallback failed (quota exceeded):', e2);
      }
    } finally {
      this.notify();
    }
  }

  // Đồng bộ ngầm lên server, xử lý và bắt trọn vẹn lỗi mà không để rơi vào empty catch
  _syncToServer(url, options, actionName) {
    try {
      fetch(url, options).catch(err => {
        console.warn(`[Sync ${actionName}] Lỗi kết nối mạng:`, err.message || err);
      });
    } catch (e) {
      console.warn(`[Sync ${actionName}] Không thể gửi request:`, e.message || e);
    }
  }

  async syncWithBackend(isSilent = false) {
    try {
      const res = await fetch(`${API_BASE}/data`);
      if (res.ok) {
        const serverData = await res.json();
        if (serverData && serverData.players && serverData.players.length > 0) {
          if (!serverData.moments) serverData.moments = [];
          this.data = serverData;
          this.isServerSynced = true;
          this.saveData(this.data);
          this.notify();
        }
        if (!isSilent) {
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
    if (window.TNT && window.TNT.events) {
      window.TNT.events.emit('state:updated', this.data);
    }
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
    this._syncToServer(`${API_BASE}/players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': this.getAdminToken()
      },
      body: JSON.stringify(newPlayer)
    }, 'addPlayer');

    return newPlayer;
  }

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
  }

  async updatePlayerAvatar(id, avatarBase64) {
    const index = this.data.players.findIndex(p => p.id === id);
    if (index !== -1) {
      this.data.players[index].avatar = avatarBase64;
      this.saveData();

      // Gửi API cập nhật avatar lên server MongoDB (mở cho cả thành viên)
      this._syncToServer(`${API_BASE}/players/${id}/avatar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: avatarBase64 })
      }, 'updatePlayerAvatar');

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
    this._syncToServer(`${API_BASE}/players/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': this.getAdminToken()
      }
    }, 'deletePlayer');
  }

  // --- MATCHES CRUD ---
  getMatches() {
    return (this.data.matches || []).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  getMatchById(id) {
    return (this.data.matches || []).find(m => m.id === id);
  }

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
  }

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
  }

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
  }

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

  // --- MOMENTS (KHOẢNH KHẮC) MANAGEMENT ---
  getMoments(filterCategory = 'all') {
    const list = this.data.moments || [];
    const sorted = [...list].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    if (filterCategory === 'all') return sorted;
    return sorted.filter(m => m.category === filterCategory);
  }

  getMomentById(id) {
    return (this.data.moments || []).find(m => m.id === id) || null;
  }

  async addMoment(moment) {
    if (!moment.id) moment.id = 'moment_' + Date.now();
    if (!moment.reactions) moment.reactions = { heart: 0, football: 0, beer: 0, fire: 0, userReactions: [] };
    if (!moment.comments) moment.comments = [];
    if (!this.data.moments) this.data.moments = [];

    this.data.moments.unshift(moment);
    this.saveData();

    this._syncToServer(`${API_BASE}/moments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': this.getAdminToken()
      },
      body: JSON.stringify(moment)
    }, 'addMoment');

    return moment;
  }

  async updateMoment(id, updateData) {
    if (!this.data.moments) this.data.moments = [];
    const idx = this.data.moments.findIndex(m => m.id === id);
    if (idx !== -1) {
      this.data.moments[idx] = { ...this.data.moments[idx], ...updateData };
      this.saveData();

      this._syncToServer(`${API_BASE}/moments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': this.getAdminToken()
        },
        body: JSON.stringify(updateData)
      }, 'updateMoment');

      return this.data.moments[idx];
    }
    return null;
  }

  async deleteMoment(id) {
    if (!this.data.moments) this.data.moments = [];
    this.data.moments = this.data.moments.filter(m => m.id !== id);
    this.saveData();

    this._syncToServer(`${API_BASE}/moments/${id}`, {
      method: 'DELETE',
      headers: {
        'x-admin-token': this.getAdminToken()
      }
    }, 'deleteMoment');

    return true;
  }

  async toggleReaction(momentId, reactionType, userKey = 'viewer_' + (localStorage.getItem('fc_user_guid') || Math.random().toString(36).substring(2, 9))) {
    localStorage.setItem('fc_user_guid', userKey);
    const moment = this.getMomentById(momentId);
    if (!moment) return null;

    if (!moment.reactions) {
      moment.reactions = { heart: 0, football: 0, beer: 0, fire: 0, userReactions: [] };
    }
    if (!moment.reactions.userReactions) moment.reactions.userReactions = [];

    const existingIdx = moment.reactions.userReactions.findIndex(
      ur => ur.userKey === userKey && ur.reactionType === reactionType
    );

    if (existingIdx !== -1) {
      // Bỏ thả
      moment.reactions.userReactions.splice(existingIdx, 1);
      moment.reactions[reactionType] = Math.max(0, (moment.reactions[reactionType] || 1) - 1);
    } else {
      // Thả mới
      moment.reactions.userReactions.push({ userKey, reactionType });
      moment.reactions[reactionType] = (moment.reactions[reactionType] || 0) + 1;
    }

    this.saveData();

    this._syncToServer(`${API_BASE}/moments/${momentId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reactionType, userKey })
    }, 'toggleReaction');

    return moment.reactions;
  }

  async addComment(momentId, authorName, content, avatar = '') {
    const moment = this.getMomentById(momentId);
    if (!moment) return null;

    if (!moment.comments) moment.comments = [];
    const newComment = {
      id: 'c_' + Date.now(),
      authorName: authorName && authorName.trim() ? authorName.trim() : 'Anh Em Phủi',
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      content: content.trim(),
      createdAt: new Date()
    };

    moment.comments.push(newComment);
    this.saveData();

    this._syncToServer(`${API_BASE}/moments/${momentId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorName, content, avatar })
    }, 'addComment');

    return newComment;
  }

  async deleteComment(momentId, commentId) {
    const moment = this.getMomentById(momentId);
    if (!moment || !moment.comments) return false;

    moment.comments = moment.comments.filter(c => c.id !== commentId);
    this.saveData();

    this._syncToServer(`${API_BASE}/moments/${momentId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': this.getAdminToken() }
    }, 'deleteComment');

    return true;
  }

  async updateTeamInfo(info) {
    this.data.teamInfo = { ...this.data.teamInfo, ...info };
    this.saveData();

    this._syncToServer(`${API_BASE}/team`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': this.getAdminToken()
      },
      body: JSON.stringify(this.data.teamInfo)
    }, 'updateTeamInfo');
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

        this._syncToServer(`${API_BASE}/backup/restore`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': this.getAdminToken()
          },
          body: JSON.stringify(parsed)
        }, 'importDataJSON');

        return { success: true };
      } else {
        return { success: false, error: 'File JSON không đúng cấu trúc ứng dụng!' };
      }
    } catch (e) {
      return { success: false, error: 'Định dạng file không hợp lệ: ' + e.message };
    }
  }
}

const stateManager = new StateManager();
if (window.TNT) {
  window.TNT.register('state', stateManager);
  window.TNT.register('utils', {
    escapeHtml: window.escapeHtml,
    getPlayerAliases: (typeof window.getPlayerAliases === 'function' ? window.getPlayerAliases : null)
  });
}
window.stateManager = stateManager;
