/**
 * FC TNT - State Management & Data Layer (js/state.js - Facade Pattern)
 * Bộ điều phối trung tâm quản lý State, đồng bộ 2 chiều với Node.js Backend & MongoDB
 * Tích hợp các sub-module chuyên biệt từ thư mục js/state/:
 * - state-auth.js: Quản lý PIN Admin, Token PBKDF2 của Cầu thủ, cập nhật hồ sơ & cấp tài khoản
 * - state-players.js: Quản lý danh sách cầu thủ, avatar, thống kê phong độ & bảng vinh danh
 * - state-matches.js: Lịch sử trận đấu, kết quả, chi phí quỹ và tổng quan phong độ đội
 * - state-social.js: Bảng tin khoảnh khắc (Moments), thảo luận & kịch bản sa bàn chiến thuật (Tactics)
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
  moments: [],
  tactics: (typeof window !== 'undefined' && window.OFFICIAL_TACTICS) || []
};

const ADMIN_AUTH_KEY = 'fc_tnt_admin_token';
const PLAYER_AUTH_KEY = 'fc_tnt_player_token_v1';
const PLAYER_PROFILE_KEY = 'fc_tnt_player_profile_v1';

class StateManager {
  constructor() {
    this.apiBase = API_BASE;
    this.isAdmin = !!sessionStorage.getItem(ADMIN_AUTH_KEY) || !!localStorage.getItem(ADMIN_AUTH_KEY);
    this.playerToken = localStorage.getItem(PLAYER_AUTH_KEY) || sessionStorage.getItem(PLAYER_AUTH_KEY) || '';
    this.currentPlayer = null;
    try {
      const savedProfile = localStorage.getItem(PLAYER_PROFILE_KEY) || sessionStorage.getItem(PLAYER_PROFILE_KEY);
      if (savedProfile) {
        this.currentPlayer = JSON.parse(savedProfile);
      }
    } catch (e) {
      console.warn('[State] Không thể nạp profile cầu thủ từ bộ nhớ tạm:', e.message);
    }

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

          // Cập nhật mượt mà comment trực tiếp trên DOM mà không wipe feed / ngắt quãng video
          if (payload && payload.type === 'moments' && payload.extra && window.momentsModule && typeof window.momentsModule.handleRemoteCommentUpdate === 'function') {
            window.momentsModule.handleRemoteCommentUpdate(payload.extra);
          }

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

  loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('fc_stats_master_data_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.players && parsed.players.length > 0) {
          if (!parsed.moments) parsed.moments = [];
          if (!parsed.matches) parsed.matches = [];
          if (!parsed.tactics) parsed.tactics = (typeof window !== 'undefined' && window.OFFICIAL_TACTICS) || [];
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse state from localStorage', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  saveData(dataToSave = this.data, shouldNotify = true) {
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
        })) : [],
        tactics: dataToSave.tactics || []
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
      if (shouldNotify) {
        this.notify();
      }
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
          if (!serverData.tactics) serverData.tactics = (typeof window !== 'undefined' && window.OFFICIAL_TACTICS) || [];
          this.data = serverData;
          this.isServerSynced = true;
          this.saveData(this.data);
        }
        if (!isSilent) {
          console.log('🌿 Đã đồng bộ dữ liệu thành công từ MongoDB Server!');
        }
        if (typeof this.restorePlayerSession === 'function') {
          await this.restorePlayerSession();
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
    if (window.TNT) {
      if (window.TNT.events) window.TNT.events.emit('state:updated', this.data);
      if (window.TNT.bus && window.TNT.bus !== window.TNT.events) window.TNT.bus.emit('state:updated', this.data);
    }
  }

  async updateTeamInfo(info) {
    this.data.teamInfo = { ...this.data.teamInfo, ...info };
    this.saveData();

    this._syncToServer(`${API_BASE}/team`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': typeof this.getAdminToken === 'function' ? this.getAdminToken() : ''
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
            'x-admin-token': typeof this.getAdminToken === 'function' ? this.getAdminToken() : ''
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

// Hợp nhất các sub-modules vào StateManager prototype (Facade Pattern)
if (typeof window !== 'undefined' && window.TNTStateMixins) {
  Object.assign(
    StateManager.prototype,
    window.TNTStateMixins.auth,
    window.TNTStateMixins.players,
    window.TNTStateMixins.matches,
    window.TNTStateMixins.social
  );
}

const stateManager = new StateManager();
if (window.TNT) {
  window.TNT.register('state', stateManager);
  window.TNT.register('utils', {
    escapeHtml: window.escapeHtml,
    getPlayerAliases: (typeof window.getPlayerAliases === 'function' ? window.getPlayerAliases : null)
  });
  window.TNT.state = stateManager;
}
window.stateManager = stateManager;
