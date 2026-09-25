/**
 * FC TNT - Official Team Roster Seed Data (SSOT)
 * Danh sách 15 cầu thủ chính thức mặc định dùng chung cho Server và Client
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js
    module.exports = factory();
  } else {
    // Browser Global
    root.OFFICIAL_PLAYERS = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return [
    { id: 'p_1', name: 'Quân Kun', nickname: 'Quân Kun', number: 5, position: 'DF', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', phone: '0987654321', bankCode: 'VCB', bankAccountNumber: '9392139587', bankAccountName: 'NGUYEN CONG QUAN', joinDate: '2025-01-01', note: 'Hậu vệ cánh trái' },
    { id: 'p_2', name: 'Vinh Lê', nickname: 'Vinh Lê', number: 6, position: 'MF', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', phone: '0912345678', bankCode: 'VCB', bankAccountNumber: '1012345678', bankAccountName: 'LE QUANG VINH', joinDate: '2025-01-01', note: 'Tiền vệ trung tâm điều tiết' },
    { id: 'p_3', name: 'ToDiu', nickname: 'ToDiu', number: 24, position: 'GK', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Thủ môn bắt chính' },
    { id: 'p_4', name: 'Tài Thọ', nickname: 'Tài Thọ', number: 7, position: 'FW', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Tiền đạo cánh phải bứt tốc' },
    { id: 'p_5', name: 'Công Thắng', nickname: 'ct', number: 11, position: 'MF', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Kỹ thuật lắt léo' },
    { id: 'p_6', name: 'Quang', nickname: 'Voi', number: 69, position: 'DF', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Trung vệ thòng không chiến' },
    { id: 'p_7', name: 'Trường Giang', nickname: 'Trường Giang', number: 8, position: 'MF', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Tiền vệ năng động' },
    { id: 'p_8', name: 'Bùi Tiến', nickname: 'Tiến', number: 31, position: 'DF', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Hậu vệ bọc lót' },
    { id: 'p_9', name: 'Công Tiến', nickname: 'Tiếnn', number: 22, position: 'MF', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Tiền vệ cánh tốc độ' },
    { id: 'p_10', name: 'Đức Bắc', nickname: 'Đức Bắc', number: 4, position: 'DF', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Hậu vệ cánh phải dập khỏe' },
    { id: 'p_11', name: 'Đình Chiến', nickname: 'Đình Chiến', number: 19, position: 'MF', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Tạt bóng chuẩn xác' },
    { id: 'p_12', name: 'Hùng Sứt', nickname: 'Hùng Sứt', number: 10, position: 'FW', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Tiền đạo cánh trái sát thủ' },
    { id: 'p_13', name: 'Đình Anh', nickname: 'Đình Anh', number: 67, position: 'DF', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Hậu vệ tranh chấp tốt' },
    { id: 'p_14', name: 'Thành Nam', nickname: 'Nam Cao', number: 88, position: 'FW', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Tiền đạo đánh đầu' },
    { id: 'p_15', name: 'Sỹ Nam', nickname: 'Nam Thấp', number: 12, position: 'GK', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', phone: '', joinDate: '2025-01-01', note: 'Thủ môn phản xạ' }
  ];
});
