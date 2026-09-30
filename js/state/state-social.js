/**
 * FC TNT - State Submodule: Moments & Tactics Playbook (state-social.js)
 * Quản lý bài đăng khoảnh khắc, cảm xúc reactions, bình luận và kịch bản sa bàn chiến thuật
 */

(function (root) {
  'use strict';

  const API_BASE = '/api';

  root.TNTStateMixins = root.TNTStateMixins || {};

  root.TNTStateMixins.social = {
    // --- MOMENTS (KHOẢNH KHẮC) MANAGEMENT ---
    getMoments(filterCategory = 'all') {
      const list = this.data.moments || [];
      const sorted = [...list].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
      if (filterCategory === 'all') return sorted;
      return sorted.filter(m => m.category === filterCategory);
    },

    getMomentById(id) {
      return (this.data.moments || []).find(m => m.id === id) || null;
    },

    async addMoment(moment) {
      if (!moment.id) moment.id = 'moment_' + Date.now();
      if (!moment.reactions) moment.reactions = { heart: 0, football: 0, beer: 0, fire: 0, userReactions: [] };
      if (!moment.comments) moment.comments = [];
      if (!this.data.moments) this.data.moments = [];

      const headers = { 'Content-Type': 'application/json' };
      const adminToken = typeof this.getAdminToken === 'function' ? this.getAdminToken() : (this.adminToken || '');
      const playerToken = typeof this.getPlayerToken === 'function' ? this.getPlayerToken() : (this.playerToken || '');
      if (adminToken) headers['x-admin-token'] = adminToken;
      if (playerToken) headers['x-player-token'] = playerToken;

      try {
        const res = await fetch(`${API_BASE}/moments`, {
          method: 'POST',
          headers,
          body: JSON.stringify(moment)
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Máy chủ từ chối lưu bài viết!');
        }

        const savedMoment = data || moment;
        this.data.moments.unshift(savedMoment);
        this.saveData();
        return savedMoment;
      } catch (err) {
        console.error('[State addMoment] Lỗi lưu khoảnh khắc:', err);
        throw err;
      }
    },

    async updateMoment(id, updateData) {
      if (!this.data.moments) this.data.moments = [];
      const idx = this.data.moments.findIndex(m => m.id === id);

      const headers = { 'Content-Type': 'application/json' };
      const adminToken = typeof this.getAdminToken === 'function' ? this.getAdminToken() : (this.adminToken || '');
      const playerToken = typeof this.getPlayerToken === 'function' ? this.getPlayerToken() : (this.playerToken || '');
      if (adminToken) headers['x-admin-token'] = adminToken;
      if (playerToken) headers['x-player-token'] = playerToken;

      try {
        const res = await fetch(`${API_BASE}/moments/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updateData)
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Máy chủ từ chối cập nhật bài viết!');
        }

        if (idx !== -1) {
          this.data.moments[idx] = { ...this.data.moments[idx], ...updateData };
          this.saveData();
        }
        return data;
      } catch (err) {
        console.error('[State updateMoment] Lỗi cập nhật khoảnh khắc:', err);
        throw err;
      }
    },

    async deleteMoment(id) {
      const headers = {};
      const adminToken = typeof this.getAdminToken === 'function' ? this.getAdminToken() : (this.adminToken || '');
      const playerToken = typeof this.getPlayerToken === 'function' ? this.getPlayerToken() : (this.playerToken || '');
      if (adminToken) headers['x-admin-token'] = adminToken;
      if (playerToken) headers['x-player-token'] = playerToken;

      try {
        const res = await fetch(`${API_BASE}/moments/${id}`, {
          method: 'DELETE',
          headers
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Máy chủ từ chối xóa bài viết!');
        }

        if (this.data.moments) {
          this.data.moments = this.data.moments.filter(m => m.id !== id);
          this.saveData();
        }
        return true;
      } catch (err) {
        console.error('[State deleteMoment] Lỗi xóa khoảnh khắc:', err);
        throw err;
      }
    },

    async toggleReaction(momentId, reactionType, customUserKey = null) {
      let userKey = customUserKey;
      if (!userKey) {
        if (this.currentPlayer && this.currentPlayer.id) {
          userKey = this.currentPlayer.id;
        } else {
          userKey = localStorage.getItem('fc_user_guid') || ('viewer_' + Math.random().toString(36).substring(2, 9));
          localStorage.setItem('fc_user_guid', userKey);
        }
      }

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

      this.saveData(this.data, false);

      const headers = { 'Content-Type': 'application/json' };
      if (this.adminToken) headers['x-admin-token'] = this.adminToken;
      if (this.playerToken) headers['x-player-token'] = this.playerToken;

      this._syncToServer(`${API_BASE}/moments/${momentId}/react`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reactionType, userKey })
      }, 'toggleReaction');

      return moment.reactions;
    },

    async addComment(momentId, authorName, content, avatar = '') {
      const moment = this.getMomentById(momentId);
      if (!moment) return null;

      if (!moment.comments) moment.comments = [];

      let resolvedAuthorId = '';
      let resolvedAuthorName = authorName;
      let resolvedAvatar = avatar;

      if (this.currentPlayer) {
        resolvedAuthorId = this.currentPlayer.id || '';
        resolvedAuthorName = this.currentPlayer.nickname || this.currentPlayer.name;
        resolvedAvatar = this.currentPlayer.avatar || '';
      } else if (this.isAdmin) {
        resolvedAuthorId = 'admin';
        resolvedAuthorName = 'Ban Quản Trị';
        resolvedAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
      }

      const newComment = {
        id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        authorId: resolvedAuthorId,
        authorName: resolvedAuthorName && resolvedAuthorName.trim() ? resolvedAuthorName.trim() : 'Khách / CĐV FC TNT',
        avatar: resolvedAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        content: content.trim(),
        createdAt: new Date()
      };

      moment.comments.push(newComment);
      this.saveData(this.data, false);

      const headers = { 'Content-Type': 'application/json' };
      const adminToken = typeof this.getAdminToken === 'function' ? this.getAdminToken() : (this.adminToken || '');
      const playerToken = typeof this.getPlayerToken === 'function' ? this.getPlayerToken() : (this.playerToken || '');
      if (adminToken) headers['x-admin-token'] = adminToken;
      if (playerToken) headers['x-player-token'] = playerToken;

      this._syncToServer(`${API_BASE}/moments/${momentId}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          authorId: resolvedAuthorId,
          authorName: resolvedAuthorName,
          content: content.trim(),
          avatar: resolvedAvatar
        })
      }, 'addComment');

      return newComment;
    },

    async deleteComment(momentId, commentId) {
      try {
        const headers = {};
        const adminToken = typeof this.getAdminToken === 'function' ? this.getAdminToken() : (this.adminToken || '');
        const playerToken = typeof this.getPlayerToken === 'function' ? this.getPlayerToken() : (this.playerToken || '');
        if (adminToken) headers['x-admin-token'] = adminToken;
        if (playerToken) headers['x-player-token'] = playerToken;

        const res = await fetch(`${API_BASE}/moments/${momentId}/comments/${commentId}`, {
          method: 'DELETE',
          headers
        });
        const data = await res.json();

        if (res.ok && data.success) {
          const moment = this.getMomentById(momentId);
          if (moment && moment.comments) {
            moment.comments = moment.comments.filter(c => c.id !== commentId);
            this.saveData(this.data, false);
          }
          return { success: true };
        }

        return { success: false, error: data.error || 'Không thể xóa bình luận trên máy chủ!' };
      } catch (err) {
        console.warn('[State] deleteComment error:', err.message);
        return { success: false, error: 'Lỗi mạng khi xóa bình luận!' };
      }
    },

    // =========================================================================
    // BẢNG SA BÀN CHIẾN THUẬT & PLAYBOOK (TACTICS METHODS)
    // =========================================================================

    getTactics() {
      return this.data.tactics || [];
    },

    getTacticById(id) {
      return (this.data.tactics || []).find(t => t.id === id);
    },

    async saveTactic(tacticData) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (this.isAdmin) headers['x-admin-token'] = this.getAdminToken();
        if (this.playerToken) headers['x-player-token'] = this.playerToken;

        const isUpdate = tacticData.id && !tacticData.id.startsWith('preset_') && this.getTacticById(tacticData.id);
        const url = isUpdate ? `${API_BASE}/tactics/${tacticData.id}` : `${API_BASE}/tactics`;
        const method = isUpdate ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers,
          body: JSON.stringify(tacticData)
        });
        const data = await res.json();

        if (res.ok && !data.error) {
          if (!this.data.tactics) this.data.tactics = [];
          if (isUpdate) {
            const idx = this.data.tactics.findIndex(t => t.id === tacticData.id);
            if (idx !== -1) this.data.tactics[idx] = data;
          } else {
            this.data.tactics.unshift(data);
          }
          this.saveData();
          return { success: true, tactic: data };
        }
        return { success: false, error: data.error || 'Không thể lưu bài chiến thuật!' };
      } catch (err) {
        console.warn('[State] Save tactic error:', err.message);
        return { success: false, error: 'Lỗi kết nối khi lưu bài chiến thuật!' };
      }
    },

    async deleteTactic(id) {
      try {
        const headers = {};
        if (this.isAdmin) headers['x-admin-token'] = this.getAdminToken();
        if (this.playerToken) headers['x-player-token'] = this.playerToken;

        const res = await fetch(`${API_BASE}/tactics/${id}`, {
          method: 'DELETE',
          headers
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (this.data.tactics) {
            this.data.tactics = this.data.tactics.filter(t => t.id !== id);
          }
          this.saveData();
          return { success: true };
        }
        return { success: false, error: data.error || 'Không thể xóa chiến thuật!' };
      } catch (err) {
        console.warn('[State] Delete tactic error:', err.message);
        return { success: false, error: 'Lỗi mạng khi xóa chiến thuật!' };
      }
    },

    async addTacticComment(tacticId, content) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (this.playerToken) headers['x-player-token'] = this.playerToken;

        const authorName = this.currentPlayer ? (this.currentPlayer.nickname || this.currentPlayer.name) : (this.isAdmin ? 'Admin' : 'Thành viên');
        const avatar = this.currentPlayer ? this.currentPlayer.avatar : '';

        const res = await fetch(`${API_BASE}/tactics/${tacticId}/comments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ authorName, content, avatar })
        });
        const comment = await res.json();

        if (res.ok && !comment.error) {
          const tactic = this.getTacticById(tacticId);
          if (tactic) {
            if (!tactic.comments) tactic.comments = [];
            tactic.comments.push(comment);
            this.saveData();
          }
          return { success: true, comment };
        }
        return { success: false, error: comment.error || 'Không thể gửi bình luận!' };
      } catch (err) {
        console.warn('[State] Add tactic comment error:', err.message);
        return { success: false, error: 'Lỗi mạng khi gửi bình luận!' };
      }
    },

    async deleteTacticComment(tacticId, commentId) {
      try {
        const headers = {};
        if (this.adminToken) headers['x-admin-token'] = this.adminToken;
        if (this.playerToken) headers['x-player-token'] = this.playerToken;

        const res = await fetch(`${API_BASE}/tactics/${tacticId}/comments/${commentId}`, {
          method: 'DELETE',
          headers
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const tactic = this.getTacticById(tacticId);
          if (tactic && Array.isArray(tactic.comments)) {
            tactic.comments = tactic.comments.filter(c => c.id !== commentId);
            this.saveData();
          }
          return { success: true };
        }
        return { success: false, error: data.error || 'Không thể xóa bình luận!' };
      } catch (err) {
        console.warn('[State] Delete tactic comment error:', err.message);
        return { success: false, error: 'Lỗi mạng khi xóa bình luận!' };
      }
    },

    async toggleTacticLike(tacticId) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (this.playerToken) headers['x-player-token'] = this.playerToken;
        const userId = this.currentPlayer ? this.currentPlayer.id : '';

        const res = await fetch(`${API_BASE}/tactics/${tacticId}/like`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ userId })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const tactic = this.getTacticById(tacticId);
          if (tactic) {
            tactic.likes = tactic.likes || [];
            const idx = tactic.likes.indexOf(userId);
            if (idx === -1) {
              tactic.likes.push(userId);
            } else {
              tactic.likes.splice(idx, 1);
            }
            this.saveData();
          }
          return data;
        }
        return { success: false };
      } catch (err) {
        console.warn('[State] Toggle tactic like error:', err.message);
        return { success: false };
      }
    }
  };
})(typeof self !== 'undefined' ? self : this);
