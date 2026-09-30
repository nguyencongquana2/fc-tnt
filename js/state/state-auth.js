/**
 * FC TNT - State Submodule: Auth & Member Session (state-auth.js)
 * Quản lý phiên Quản trị viên (PIN), Token PBKDF2 của Cầu thủ, cập nhật hồ sơ & cấp tài khoản
 */

(function (root) {
  'use strict';

  const ADMIN_AUTH_KEY = 'fc_tnt_admin_token';
  const PLAYER_AUTH_KEY = 'fc_tnt_player_token_v1';
  const PLAYER_PROFILE_KEY = 'fc_tnt_player_profile_v1';
  const API_BASE = '/api';

  root.TNTStateMixins = root.TNTStateMixins || {};

  root.TNTStateMixins.auth = {
    getAdminToken() {
      return sessionStorage.getItem(ADMIN_AUTH_KEY) || localStorage.getItem(ADMIN_AUTH_KEY) || '';
    },

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
    },

    logoutAdmin() {
      this.isAdmin = false;
      sessionStorage.removeItem(ADMIN_AUTH_KEY);
      localStorage.removeItem(ADMIN_AUTH_KEY);
      this.notify();
    },

    getPlayerToken() {
      return this.playerToken || localStorage.getItem(PLAYER_AUTH_KEY) || sessionStorage.getItem(PLAYER_AUTH_KEY) || '';
    },

    isPlayerLoggedIn() {
      return Boolean(this.currentPlayer && this.getPlayerToken());
    },

    async loginPlayer(username, password, remember = true) {
      try {
        const res = await fetch(`${API_BASE}/auth/player/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          this.playerToken = data.token;
          this.currentPlayer = data.player;

          if (remember) {
            localStorage.setItem(PLAYER_AUTH_KEY, data.token);
            localStorage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(data.player));
          } else {
            sessionStorage.setItem(PLAYER_AUTH_KEY, data.token);
            sessionStorage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(data.player));
          }

          // Cập nhật lại trong danh sách players bộ nhớ nếu có
          if (this.data && Array.isArray(this.data.players)) {
            const idx = this.data.players.findIndex(p => p.id === data.player.id);
            if (idx !== -1) {
              this.data.players[idx] = { ...this.data.players[idx], ...data.player };
            }
          }

          this.notify();
          return {
            success: true,
            player: data.player,
            mustChangePassword: Boolean(data.mustChangePassword),
            message: data.message
          };
        } else {
          return { success: false, error: data.error || 'Đăng nhập không thành công!' };
        }
      } catch (err) {
        console.warn('[State] Player login error:', err.message);
        return { success: false, error: 'Không thể kết nối máy chủ để xác thực!' };
      }
    },

    logoutPlayer() {
      this.currentPlayer = null;
      this.playerToken = '';
      localStorage.removeItem(PLAYER_AUTH_KEY);
      localStorage.removeItem(PLAYER_PROFILE_KEY);
      sessionStorage.removeItem(PLAYER_AUTH_KEY);
      sessionStorage.removeItem(PLAYER_PROFILE_KEY);
      this.notify();
    },

    async changePlayerPassword(currentPassword, newPassword) {
      try {
        const token = this.getPlayerToken();
        if (!token) return { success: false, error: 'Bạn chưa đăng nhập tài khoản thành viên!' };

        const res = await fetch(`${API_BASE}/auth/player/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-player-token': token
          },
          body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (this.currentPlayer) {
            this.currentPlayer.mustChangePassword = false;
            const storage = localStorage.getItem(PLAYER_AUTH_KEY) ? localStorage : sessionStorage;
            storage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(this.currentPlayer));
          }
          this.notify();
          return { success: true, message: data.message };
        } else {
          return { success: false, error: data.error || 'Đổi mật khẩu thất bại!' };
        }
      } catch (err) {
        console.warn('[State] Change password error:', err.message);
        return { success: false, error: 'Không thể kết nối máy chủ để đổi mật khẩu!' };
      }
    },

    async updatePlayerProfile(updates) {
      try {
        const token = this.getPlayerToken();
        if (!token) return { success: false, error: 'Bạn chưa đăng nhập tài khoản thành viên!' };

        const res = await fetch(`${API_BASE}/auth/player/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-player-token': token
          },
          body: JSON.stringify(updates)
        });
        const data = await res.json();

        if (res.ok && data.success) {
          this.currentPlayer = data.player;
          const storage = localStorage.getItem(PLAYER_AUTH_KEY) ? localStorage : sessionStorage;
          storage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(data.player));

          if (this.data && Array.isArray(this.data.players)) {
            const idx = this.data.players.findIndex(p => p.id === data.player.id);
            if (idx !== -1) {
              this.data.players[idx] = { ...this.data.players[idx], ...data.player };
              this.saveData(this.data);
            }
          }

          this.notify();
          return { success: true, player: data.player, message: data.message };
        } else {
          return { success: false, error: data.error || 'Cập nhật thông tin thất bại!' };
        }
      } catch (err) {
        console.warn('[State] Update profile error:', err.message);
        return { success: false, error: 'Không thể kết nối máy chủ để cập nhật hồ sơ!' };
      }
    },

    async provisionPlayer(playerId, username, tempPassword) {
      try {
        const adminToken = this.getAdminToken();
        if (!adminToken) return { success: false, error: 'Yêu cầu quyền Quản trị viên!' };

        const res = await fetch(`${API_BASE}/auth/player/provision`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken
          },
          body: JSON.stringify({ playerId, username, tempPassword })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (this.data && Array.isArray(this.data.players)) {
            const idx = this.data.players.findIndex(p => p.id === playerId);
            if (idx !== -1) {
              this.data.players[idx] = { ...this.data.players[idx], ...data.player };
              this.saveData(this.data);
            }
          }
          this.notify();
          return {
            success: true,
            player: data.player,
            shareText: data.shareText,
            message: data.message
          };
        } else {
          return { success: false, error: data.error || 'Cấp tài khoản thất bại!' };
        }
      } catch (err) {
        console.warn('[State] Provision player error:', err.message);
        return { success: false, error: 'Không thể kết nối máy chủ để cấp tài khoản!' };
      }
    },

    async restorePlayerSession() {
      const token = this.getPlayerToken();
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/auth/player/me`, {
          headers: { 'x-player-token': token }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.player) {
            this.currentPlayer = data.player;
            const storage = localStorage.getItem(PLAYER_AUTH_KEY) ? localStorage : sessionStorage;
            storage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(data.player));
            this.notify();
          }
        } else if (res.status === 401) {
          this.logoutPlayer();
        }
      } catch (err) {
        console.warn('[State] Không thể xác thực lại phiên thành viên:', err.message);
      }
    }
  };
})(typeof self !== 'undefined' ? self : this);
