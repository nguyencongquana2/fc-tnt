/**
 * FC TNT - Universal Validation Utilities (SSOT)
 * Chuẩn hóa và kiểm tra tính hợp lệ của dữ liệu đầu vào cho cả Client và Server (UMD pattern)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TNTValidators = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Kiểm tra định dạng Avatar hợp lệ (URL web http/https hoặc Image Data URI)
   * Giới hạn dung lượng tối đa (mặc định 2.5MB cho base64)
   * Phòng chống DoS và ReDoS bằng thuật toán quét tuyến tính không backtracking
   */
  function isValidAvatar(avatar, maxSizeBytes = 2.5 * 1024 * 1024) {
    if (!avatar || typeof avatar !== 'string') return false;
    const trimmed = avatar.trim();
    if (!trimmed || trimmed.length > maxSizeBytes) return false;

    // Hỗ trợ link ảnh Web HTTP/HTTPS chuẩn (tối đa 2048 ký tự, không chứa khoảng trắng)
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed.length <= 2048 && !/\s/.test(trimmed);
    }

    // Hỗ trợ Data URI ảnh base64 chuẩn: PNG, JPEG, WEBP, GIF
    const match = trimmed.match(/^data:image\/(jpeg|jpg|png|webp|gif);base64,(.*)$/i);
    if (match) {
      const base64Data = match[2];
      if (!base64Data || base64Data.length === 0) return false;
      // Quét an toàn O(N) không backtracking: kiểm tra đầu mẫu và không chứa ký tự cấm
      return /^[A-Za-z0-9+/=]+$/.test(base64Data.slice(0, 100)) && !/[^A-Za-z0-9+/=\r\n]/.test(base64Data);
    }

    return false;
  }

  /**
   * Danh sách loại cảm xúc hợp lệ
   */
  const VALID_REACTION_TYPES = ['heart', 'football', 'beer', 'fire'];

  function isValidReaction(reactionType) {
    return typeof reactionType === 'string' && VALID_REACTION_TYPES.includes(reactionType);
  }

  /**
   * Kiểm tra và làm sạch dữ liệu bình luận bài viết
   */
  function validateCommentInput(payload = {}) {
    const errors = [];
    const { authorName, content, avatar } = payload;

    if (!content || typeof content !== 'string' || !content.trim()) {
      errors.push('Nội dung bình luận không được để trống.');
    } else if (content.trim().length > 1000) {
      errors.push('Nội dung bình luận tối đa 1.000 ký tự.');
    }

    let cleanAuthor = 'Anh Em Phủi';
    if (authorName && typeof authorName === 'string' && authorName.trim()) {
      cleanAuthor = authorName.trim().slice(0, 60);
    }

    let cleanAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
    if (avatar && typeof avatar === 'string') {
      const trimmedAvatar = avatar.trim();
      // Avatar comment giới hạn 500KB
      if (isValidAvatar(trimmedAvatar, 500 * 1024)) {
        cleanAvatar = trimmedAvatar;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: {
        authorName: cleanAuthor,
        content: content && typeof content === 'string' ? content.trim() : '',
        avatar: cleanAvatar
      }
    };
  }

  return {
    isValidAvatar,
    isValidReaction,
    validateCommentInput,
    VALID_REACTION_TYPES
  };
});
