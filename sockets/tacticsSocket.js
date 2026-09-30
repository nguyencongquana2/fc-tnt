/**
 * FC TNT - Real-time Tactics Whiteboard Socket.IO Handler
 * Quản lý phòng họp chiến thuật, đồng bộ kéo thả quân cờ, nét vẽ vector và bài tập mẫu
 */

const { createSocketRateLimiter } = require('../utils/rateLimiter');
const { getDefaultTacticsPieces } = require('../utils/tacticsPieces');

function initTacticsSocket(io) {
  // Anti-Spam Rate Limiters cho Socket.IO Sa Bàn (Ngăn ngừa DoS, flood event và tràn RAM)
  const tacticsMoveLimiter = createSocketRateLimiter({ windowMs: 1000, max: 40 }); // Tối đa 40 frames/s khi kéo quân cờ
  const tacticsDrawLimiter = createSocketRateLimiter({ windowMs: 2000, max: 20 }); // Tối đa 20 nét vẽ trong 2 giây
  const tacticsResetLimiter = createSocketRateLimiter({ windowMs: 5000, max: 4 });  // Tối đa 4 lần đổi sơ đồ/reset trong 5 giây
  const tacticsEditLimiter = createSocketRateLimiter({ windowMs: 5000, max: 10 });  // Tối đa 10 lần sửa tên/số áo trong 5 giây
  const tacticsPlaybookLimiter = createSocketRateLimiter({ windowMs: 5000, max: 5 }); // Tối đa 5 lần nạp bài tập trong 5 giây

  const allTacticsSocketLimiters = [
    tacticsMoveLimiter,
    tacticsDrawLimiter,
    tacticsResetLimiter,
    tacticsEditLimiter,
    tacticsPlaybookLimiter
  ];

  // Snapshot trạng thái phòng Sa bàn chiến thuật thời gian thực trong RAM (Room State Sync)
  const tacticsRoomSnapshot = {
    pieces: getDefaultTacticsPieces(),
    drawings: [],
    hasCustomState: false
  };

  io.on('connection', (socket) => {
    // Đồng bộ phòng sa bàn chiến thuật trực tiếp (Live Tactical Whiteboard Room)
    socket.on('join_tactics_room', () => {
      socket.join('tactics_room');
      // Gửi Snapshot tức thời cho thành viên mới nếu sa bàn đã có thay đổi
      if (tacticsRoomSnapshot.hasCustomState) {
        socket.emit('tactics_room_snapshot', {
          pieces: tacticsRoomSnapshot.pieces,
          drawings: tacticsRoomSnapshot.drawings
        });
      }
    });

    socket.on('leave_tactics_room', () => {
      socket.leave('tactics_room');
    });

    // 1. Kéo thả quân cờ thời gian thực (Có Rate Limit & Clamp tọa độ an toàn)
    socket.on('tactics_piece_move', (data) => {
      if (!tacticsMoveLimiter.allow(socket.id)) return;
      if (!data || typeof data !== 'object' || typeof data.id !== 'string') return;

      const x = Number(data.x);
      const y = Number(data.y);
      if (Number.isNaN(x) || Number.isNaN(y)) return;

      const sanitized = {
        id: String(data.id).slice(0, 50),
        x: Math.max(0, Math.min(100, Math.round(x * 10) / 10)),
        y: Math.max(0, Math.min(100, Math.round(y * 10) / 10))
      };

      if (tacticsRoomSnapshot.pieces) {
        const p = tacticsRoomSnapshot.pieces.find(item => item.id === sanitized.id);
        if (p) {
          p.x = sanitized.x;
          p.y = sanitized.y;
          tacticsRoomSnapshot.hasCustomState = true;
        }
      }

      socket.to('tactics_room').emit('tactics_piece_moved', sanitized);
    });

    // 2. Vẽ nét mới / mũi tên (Có Rate Limit & Kiểm tra mảng điểm points)
    socket.on('tactics_draw_add', (data) => {
      if (!tacticsDrawLimiter.allow(socket.id)) return;
      if (!data || typeof data !== 'object' || typeof data.id !== 'string') return;

      const allowedTypes = ['arrow', 'curve', 'pass', 'pass_arrow', 'zone', 'text', 'freehand'];
      const shapeType = allowedTypes.includes(data.type) ? data.type : 'arrow';

      const sanitized = {
        id: String(data.id).slice(0, 60),
        type: shapeType,
        color: typeof data.color === 'string' ? data.color.slice(0, 25) : '#10b981',
        width: typeof data.width === 'number' ? Math.max(1, Math.min(10, data.width)) : 3,
        points: Array.isArray(data.points)
          ? data.points.slice(0, 100).map(pt => ({
              x: Math.max(0, Math.min(100, Math.round((Number(pt.x) || 0) * 10) / 10)),
              y: Math.max(0, Math.min(100, Math.round((Number(pt.y) || 0) * 10) / 10))
            }))
          : []
      };

      if (shapeType === 'text') {
        sanitized.text = typeof data.text === 'string' ? data.text.trim().slice(0, 80) : '';
      }

      tacticsRoomSnapshot.drawings.push(sanitized);
      tacticsRoomSnapshot.hasCustomState = true;
      if (tacticsRoomSnapshot.drawings.length > 100) {
        tacticsRoomSnapshot.drawings.shift();
      }

      socket.to('tactics_room').emit('tactics_draw_added', sanitized);
    });

    // 2b. Hoàn tác nét vẽ (Undo) đồng bộ qua Socket
    socket.on('tactics_draw_undo', () => {
      if (!tacticsDrawLimiter.allow(socket.id)) return;
      if (tacticsRoomSnapshot.drawings.length > 0) {
        tacticsRoomSnapshot.drawings.pop();
        tacticsRoomSnapshot.hasCustomState = true;
      }
      socket.to('tactics_room').emit('tactics_draw_undone');
    });

    // 2c. Làm lại nét vẽ (Redo) đồng bộ qua Socket
    socket.on('tactics_draw_redo', (data) => {
      if (!tacticsDrawLimiter.allow(socket.id)) return;
      if (!data || typeof data !== 'object' || typeof data.id !== 'string') return;

      const allowedTypes = ['arrow', 'curve', 'pass', 'pass_arrow', 'zone', 'text', 'freehand'];
      const shapeType = allowedTypes.includes(data.type) ? data.type : 'arrow';

      const sanitized = {
        id: String(data.id).slice(0, 60),
        type: shapeType,
        color: typeof data.color === 'string' ? data.color.slice(0, 25) : '#10b981',
        width: typeof data.width === 'number' ? Math.max(1, Math.min(10, data.width)) : 3,
        points: Array.isArray(data.points)
          ? data.points.slice(0, 100).map(pt => ({
              x: Math.max(0, Math.min(100, Math.round((Number(pt.x) || 0) * 10) / 10)),
              y: Math.max(0, Math.min(100, Math.round((Number(pt.y) || 0) * 10) / 10))
            }))
          : []
      };

      tacticsRoomSnapshot.drawings.push(sanitized);
      tacticsRoomSnapshot.hasCustomState = true;
      if (tacticsRoomSnapshot.drawings.length > 100) {
        tacticsRoomSnapshot.drawings.shift();
      }

      socket.to('tactics_room').emit('tactics_draw_redone', sanitized);
    });

    // 2d. Xóa toàn bộ nét vẽ (Clear Drawings) đồng bộ qua Socket
    socket.on('tactics_draw_clear', () => {
      if (!tacticsResetLimiter.allow(socket.id)) return;
      tacticsRoomSnapshot.drawings = [];
      tacticsRoomSnapshot.hasCustomState = true;
      socket.to('tactics_room').emit('tactics_draw_cleared');
    });

    // 3. Đặt lại sa bàn / chuyển sơ đồ chiến thuật (Giới hạn tối đa 4 lần/5s)
    socket.on('tactics_board_reset', (data) => {
      if (!tacticsResetLimiter.allow(socket.id)) return;

      let sanitized = null;
      if (data && typeof data === 'object') {
        sanitized = {};
        if (Array.isArray(data.pieces)) {
          sanitized.pieces = data.pieces.slice(0, 30).map(p => ({
            id: String(p.id || '').slice(0, 50),
            team: ['home', 'away', 'ball'].includes(p.team) ? p.team : 'home',
            number: String(p.number !== undefined ? p.number : '').slice(0, 10),
            name: String(p.name || '').slice(0, 30),
            role: String(p.role || '').slice(0, 15),
            x: Math.max(0, Math.min(100, Math.round((Number(p.x) || 0) * 10) / 10)),
            y: Math.max(0, Math.min(100, Math.round((Number(p.y) || 0) * 10) / 10))
          }));
        }
        if (Array.isArray(data.drawings)) {
          sanitized.drawings = data.drawings.slice(0, 100);
        }
      }

      if (sanitized && sanitized.pieces) {
        tacticsRoomSnapshot.pieces = sanitized.pieces;
        tacticsRoomSnapshot.drawings = sanitized.drawings || [];
        tacticsRoomSnapshot.hasCustomState = true;
      } else {
        tacticsRoomSnapshot.pieces = getDefaultTacticsPieces();
        tacticsRoomSnapshot.drawings = [];
        tacticsRoomSnapshot.hasCustomState = false;
      }

      socket.to('tactics_room').emit('tactics_board_resetted', sanitized);
    });

    // 4. Nạp bài tập mẫu lên sa bàn trực tiếp
    socket.on('tactics_load_playbook', (data) => {
      if (!tacticsPlaybookLimiter.allow(socket.id)) return;
      if (!data || typeof data !== 'object') return;
      socket.to('tactics_room').emit('tactics_playbook_loaded', data);
    });

    // 5. Chỉnh sửa tên / số áo quân cờ
    socket.on('tactics_piece_edit', (data) => {
      if (!tacticsEditLimiter.allow(socket.id)) return;
      if (!data || typeof data !== 'object' || typeof data.id !== 'string') return;

      const sanitized = {
        id: String(data.id).slice(0, 50),
        number: String(data.number !== undefined ? data.number : '').slice(0, 10),
        name: String(data.name !== undefined ? data.name : '').trim().slice(0, 30)
      };

      if (!sanitized.name) return;

      if (tacticsRoomSnapshot.pieces) {
        const p = tacticsRoomSnapshot.pieces.find(item => item.id === sanitized.id);
        if (p) {
          p.name = sanitized.name;
          p.number = sanitized.number;
          tacticsRoomSnapshot.hasCustomState = true;
        }
      }

      socket.to('tactics_room').emit('tactics_piece_edited', sanitized);
    });

    // Giải phóng toàn bộ bộ nhớ rate limiter khi client ngắt kết nối
    socket.on('disconnect', () => {
      for (const limiter of allTacticsSocketLimiters) {
        limiter.remove(socket.id);
      }
    });
  });
}

module.exports = {
  initTacticsSocket
};
