/**
 * FC TNT - Initial Seed Moments (SSOT)
 * Dữ liệu khoảnh khắc mẫu khởi tạo mặc định cho đội bóng
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js
    module.exports = factory();
  } else {
    // Browser Global
    root.INITIAL_MOMENTS = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return [
    {
      id: 'moment_1',
      title: 'Liên hoan tất niên & Chúc mừng chuỗi trận bất bại',
      date: '2026-09-08',
      location: 'Nhà hàng Lẩu Nướng 79 - Cầu Giấy, Hà Nội',
      category: 'party',
      description: 'Bữa tiệc liên hoan ấm cúng cùng toàn thể anh em FC TNT sau chuỗi trận thi đấu cống hiến hết mình. Thắng cùng mừng, thua cùng uống, tinh thần anh em là số 1!',
      images: [
        'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&auto=format&fit=crop&q=80'
      ],
      videoUrl: '',
      taggedPlayerIds: ['p_1', 'p_2', 'p_3', 'p_4', 'p_6'],
      reactions: { heart: 8, football: 5, beer: 15, fire: 10, userReactions: [] },
      comments: [
        { id: 'c_1', authorName: 'Quân Kun', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', content: 'Hôm đấy vui quá anh em ơi, bia vào chân đá lại càng dẻo! 🍻🔥', createdAt: new Date('2026-09-08T22:30:00') },
        { id: 'c_2', authorName: 'Tài Thọ', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', content: 'Trận sau cứ thắng 3 bàn trở lên lại làm bữa nữa nhé đội trưởng! ⚽💪', createdAt: new Date('2026-09-08T23:15:00') }
      ]
    },
    {
      id: 'moment_2',
      title: 'Ra mắt mẫu áo đấu sân nhà mùa giải mới',
      date: '2026-09-01',
      location: 'Sân bóng PVV - Trần Thái Tông',
      category: 'jersey',
      description: 'Chính thức trình làng bộ trang phục thi đấu mới cực chiến của FC TNT. Chúc toàn đội luôn giữ vững phong độ và tinh thần đoàn kết!',
      images: [
        'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80'
      ],
      videoUrl: '',
      taggedPlayerIds: ['p_1', 'p_2', 'p_4', 'p_5', 'p_7', 'p_12'],
      reactions: { heart: 12, football: 18, beer: 6, fire: 20, userReactions: [] },
      comments: [
        { id: 'c_3', authorName: 'Vinh Lê', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', content: 'Áo mặc vào tôn dáng cực kỳ, chất vải thoáng mát đá bao sướng! 👕⭐', createdAt: new Date('2026-09-01T18:00:00') }
      ]
    }
  ];
});
