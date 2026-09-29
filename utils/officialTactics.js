/**
 * FC TNT - Kịch bản chiến thuật sân 7 chuẩn mẫu (Official Preset Playbooks)
 * Tọa độ x, y tính theo phần trăm kích thước mặt sân (0% - 100%)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OFFICIAL_TACTICS = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return [
    {
      id: 'preset_corner_1',
      title: 'Phạt góc bài 1: Cắt mặt cột gần & Tuyến hai nã đại bác',
      category: 'corner',
      description: 'Cầu thủ đá phạt góc treo bóng xoáy vào cột gần. Tiền đạo #9 làm động tác hút người, Tiền vệ #8 băng cắt dứt điểm 1-chạm. Hậu vệ thòng #4 đón bóng bật ra tuyến hai sút xa.',
      formationHome: '3-1-2',
      formationAway: '3-2-1',
      isPreset: true,
      author: {
        id: 'system',
        name: 'Ban Huấn Luyện FC TNT',
        role: 'admin',
        avatar: 'assets/images/logo.svg'
      },
      pieces: [
        // Đội nhà (Xanh Neon)
        { id: 'home_gk', team: 'home', number: 1, name: 'GK Văn Thọ', role: 'GK', x: 5, y: 50 },
        { id: 'home_df_c', team: 'home', number: 4, name: 'Thòng Văn Quân', role: 'DF', x: 42, y: 50 },
        { id: 'home_df_l', team: 'home', number: 3, name: 'Hậu vệ Tài', role: 'DF', x: 30, y: 22 },
        { id: 'home_df_r', team: 'home', number: 5, name: 'Hậu vệ Long', role: 'DF', x: 30, y: 78 },
        { id: 'home_mf', team: 'home', number: 8, name: 'TV Tuấn Anh', role: 'MF', x: 74, y: 44 },
        { id: 'home_fw_1', team: 'home', number: 9, name: 'TĐ Chiến', role: 'FW', x: 86, y: 46 },
        { id: 'home_fw_2', team: 'home', number: 10, name: 'TĐ Đức (Đá góc)', role: 'FW', x: 97, y: 8 },
        // Đội bạn (Đỏ Cam)
        { id: 'away_gk', team: 'away', number: 'GK', name: 'GK Đối thủ', role: 'GK', x: 94, y: 50 },
        { id: 'away_df_1', team: 'away', number: 2, name: 'HV Bạn 1', role: 'DF', x: 88, y: 38 },
        { id: 'away_df_2', team: 'away', number: 3, name: 'HV Bạn 2', role: 'DF', x: 87, y: 56 },
        { id: 'away_df_3', team: 'away', number: 4, name: 'HV Bạn 3', role: 'DF', x: 78, y: 42 },
        { id: 'away_mf_1', team: 'away', number: 6, name: 'TV Bạn 1', role: 'MF', x: 68, y: 48 },
        { id: 'away_mf_2', team: 'away', number: 7, name: 'TV Bạn 2', role: 'MF', x: 62, y: 30 },
        { id: 'away_fw', team: 'away', number: 9, name: 'TĐ Cắm Bạn', role: 'FW', x: 50, y: 50 },
        // Bóng thi đấu
        { id: 'ball', team: 'ball', number: '⚽', name: 'Bóng', role: 'ball', x: 96, y: 10 }
      ],
      drawings: [
        // Đường chuyền bóng từ chấm phạt góc vào cột gần
        { id: 'd_1', type: 'pass_arrow', color: '#f59e0b', width: 3, points: [{ x: 96, y: 10 }, { x: 86, y: 38 }] },
        // Tiền vệ băng cắt cột gần
        { id: 'd_2', type: 'arrow', color: '#10b981', width: 4, points: [{ x: 74, y: 44 }, { x: 85, y: 38 }] },
        // Tiền đạo kéo dạt cột xa hút 2 hậu vệ
        { id: 'd_3', type: 'arrow', color: '#06b6d4', width: 3, points: [{ x: 86, y: 46 }, { x: 90, y: 62 }] },
        // Thòng dâng lên đón bóng bật ra tuyến hai
        { id: 'd_4', type: 'arrow', color: '#a855f7', width: 3, points: [{ x: 42, y: 50 }, { x: 65, y: 50 }] }
      ],
      comments: [
        {
          id: 'cm_preset_1',
          authorName: 'Đội Trưởng Quân',
          avatar: '',
          content: 'Bài này anh em tập kỹ: Đức đá phạt góc bóng cuộn tầm trung, Tuấn Anh đè người dứt điểm một chạm ngay nhé!',
          createdAt: new Date()
        }
      ],
      likes: ['p_1', 'p_2', 'p_3']
    },
    {
      id: 'preset_escape_pressing_2',
      title: 'Thoát Pressing Sân Nhà: Thủ Môn Phát Ngắn & Mở Cánh Tốc Độ',
      category: 'pressing_escape',
      description: 'Khi đối thủ dâng cao pressing 1 kèm 1, thủ môn chuyền sệt cho Hậu vệ thòng. Thòng kéo bóng thu hút tiền đạo bạn rồi tỉa sang nách cánh cho Hậu vệ biên bứt tốc phản công.',
      formationHome: '3-1-2',
      formationAway: '3-2-1',
      isPreset: true,
      author: {
        id: 'system',
        name: 'Ban Huấn Luyện FC TNT',
        role: 'admin',
        avatar: 'assets/images/logo.svg'
      },
      pieces: [
        { id: 'home_gk', team: 'home', number: 1, name: 'GK Văn Thọ', role: 'GK', x: 6, y: 50 },
        { id: 'home_df_c', team: 'home', number: 4, name: 'Thòng Văn Quân', role: 'DF', x: 18, y: 42 },
        { id: 'home_df_l', team: 'home', number: 3, name: 'Hậu vệ Tài', role: 'DF', x: 24, y: 15 },
        { id: 'home_df_r', team: 'home', number: 5, name: 'Hậu vệ Long', role: 'DF', x: 24, y: 85 },
        { id: 'home_mf', team: 'home', number: 8, name: 'TV Tuấn Anh', role: 'MF', x: 38, y: 52 },
        { id: 'home_fw_1', team: 'home', number: 9, name: 'TĐ Chiến', role: 'FW', x: 62, y: 32 },
        { id: 'home_fw_2', team: 'home', number: 10, name: 'TĐ Đức', role: 'FW', x: 62, y: 68 },
        // Away
        { id: 'away_gk', team: 'away', number: 'GK', name: 'GK Đối thủ', role: 'GK', x: 92, y: 50 },
        { id: 'away_df_1', team: 'away', number: 2, name: 'HV Bạn 1', role: 'DF', x: 75, y: 30 },
        { id: 'away_df_2', team: 'away', number: 3, name: 'HV Bạn 2', role: 'DF', x: 75, y: 70 },
        { id: 'away_df_3', team: 'away', number: 4, name: 'HV Bạn 3', role: 'DF', x: 68, y: 50 },
        { id: 'away_mf_1', team: 'away', number: 6, name: 'TV Bạn 1', role: 'MF', x: 44, y: 38 },
        { id: 'away_mf_2', team: 'away', number: 7, name: 'TV Bạn 2', role: 'MF', x: 44, y: 64 },
        { id: 'away_fw', team: 'away', number: 9, name: 'TĐ Bạn (Pressing)', role: 'FW', x: 26, y: 46 },
        { id: 'ball', team: 'ball', number: '⚽', name: 'Bóng', role: 'ball', x: 8, y: 50 }
      ],
      drawings: [
        { id: 'd_p1', type: 'pass_arrow', color: '#f59e0b', width: 3, points: [{ x: 8, y: 50 }, { x: 18, y: 42 }] },
        { id: 'd_p2', type: 'pass_arrow', color: '#f59e0b', width: 3, points: [{ x: 18, y: 42 }, { x: 24, y: 85 }] },
        { id: 'd_p3', type: 'arrow', color: '#10b981', width: 4, points: [{ x: 24, y: 85 }, { x: 55, y: 88 }] },
        { id: 'd_p4', type: 'arrow', color: '#06b6d4', width: 3, points: [{ x: 62, y: 68 }, { x: 82, y: 58 }] }
      ],
      comments: [
        {
          id: 'cm_preset_2',
          authorName: 'Hậu vệ Long',
          avatar: '',
          content: 'Khi Thọ chuyền cho Quân, cánh phải em sẽ lập tức dâng cao sát đường biên để đón đường chọc khe!',
          createdAt: new Date()
        }
      ],
      likes: ['p_1', 'p_4']
    },
    {
      id: 'preset_throwin_3',
      title: 'Ném Biên Biến Ảo: Giả Chạy Sâu Nhả Lại Tuyến Hai Dứt Điểm',
      category: 'throw_in',
      description: 'Ném biên tầm 1/3 sân đối phương. Tiền đạo giả vờ bứt tốc về đáy biên kéo trung vệ đi theo, bóng ném nhả lại cho Tiền vệ trung tâm xoay người cứa lòng vào góc xa.',
      formationHome: '3-1-2',
      formationAway: '3-2-1',
      isPreset: true,
      author: {
        id: 'system',
        name: 'Ban Huấn Luyện FC TNT',
        role: 'admin',
        avatar: 'assets/images/logo.svg'
      },
      pieces: [
        { id: 'home_gk', team: 'home', number: 1, name: 'GK Văn Thọ', role: 'GK', x: 5, y: 50 },
        { id: 'home_df_c', team: 'home', number: 4, name: 'Thòng Văn Quân', role: 'DF', x: 45, y: 50 },
        { id: 'home_df_l', team: 'home', number: 3, name: 'Hậu vệ Tài (Ném biên)', role: 'DF', x: 68, y: 2 },
        { id: 'home_df_r', team: 'home', number: 5, name: 'Hậu vệ Long', role: 'DF', x: 40, y: 78 },
        { id: 'home_mf', team: 'home', number: 8, name: 'TV Tuấn Anh', role: 'MF', x: 62, y: 35 },
        { id: 'home_fw_1', team: 'home', number: 9, name: 'TĐ Chiến', role: 'FW', x: 78, y: 24 },
        { id: 'home_fw_2', team: 'home', number: 10, name: 'TĐ Đức', role: 'FW', x: 82, y: 62 },
        // Away
        { id: 'away_gk', team: 'away', number: 'GK', name: 'GK Đối thủ', role: 'GK', x: 93, y: 50 },
        { id: 'away_df_1', team: 'away', number: 2, name: 'HV Bạn 1', role: 'DF', x: 80, y: 32 },
        { id: 'away_df_2', team: 'away', number: 3, name: 'HV Bạn 2', role: 'DF', x: 84, y: 50 },
        { id: 'away_df_3', team: 'away', number: 4, name: 'HV Bạn 3', role: 'DF', x: 74, y: 64 },
        { id: 'away_mf_1', team: 'away', number: 6, name: 'TV Bạn 1', role: 'MF', x: 64, y: 48 },
        { id: 'away_mf_2', team: 'away', number: 7, name: 'TV Bạn 2', role: 'MF', x: 55, y: 25 },
        { id: 'away_fw', team: 'away', number: 9, name: 'TĐ Bạn', role: 'FW', x: 50, y: 50 },
        { id: 'ball', team: 'ball', number: '⚽', name: 'Bóng', role: 'ball', x: 68, y: 4 }
      ],
      drawings: [
        { id: 'd_t1', type: 'arrow', color: '#ef4444', width: 3, points: [{ x: 78, y: 24 }, { x: 90, y: 15 }] },
        { id: 'd_t2', type: 'pass_arrow', color: '#f59e0b', width: 3, points: [{ x: 68, y: 4 }, { x: 65, y: 34 }] },
        { id: 'd_t3', type: 'arrow', color: '#10b981', width: 4, points: [{ x: 65, y: 34 }, { x: 76, y: 45 }] }
      ],
      comments: [],
      likes: ['p_2']
    },
    {
      id: 'preset_freekick_4',
      title: 'Đá Phạt Hàng Rào: Giả Sút Nhả Phải & Nã Đại Bác Góc Xa',
      category: 'freekick',
      description: 'Đá phạt trực tiếp chếch trung lộ 17m. Tiền đạo chạy qua bóng giả vờ vung chân sút để hút hàng rào và thủ môn nghiêng người. Người thứ 2 gạt bóng nhẹ sang phải 1m để tiền vệ băng lên nã đại bác chìm vào góc lưới.',
      formationHome: '3-1-2',
      formationAway: '3-2-1',
      isPreset: true,
      author: {
        id: 'system',
        name: 'Ban Huấn Luyện FC TNT',
        role: 'admin',
        avatar: 'assets/images/logo.svg'
      },
      pieces: [
        { id: 'home_gk', team: 'home', number: 1, name: 'GK Văn Thọ', role: 'GK', x: 5, y: 50 },
        { id: 'home_df_c', team: 'home', number: 4, name: 'Thòng Văn Quân', role: 'DF', x: 32, y: 50 },
        { id: 'home_df_l', team: 'home', number: 3, name: 'Hậu vệ Tài', role: 'DF', x: 40, y: 18 },
        { id: 'home_df_r', team: 'home', number: 5, name: 'Hậu vệ Long', role: 'DF', x: 40, y: 82 },
        { id: 'home_mf', team: 'home', number: 8, name: 'TV Tuấn Anh (Sút xa)', role: 'MF', x: 64, y: 64 },
        { id: 'home_fw_1', team: 'home', number: 9, name: 'TĐ Chiến (Giả sút)', role: 'FW', x: 70, y: 44 },
        { id: 'home_fw_2', team: 'home', number: 10, name: 'TĐ Đức (Chặn rào)', role: 'FW', x: 84, y: 38 },
        // Away
        { id: 'away_gk', team: 'away', number: 'GK', name: 'GK Đối thủ', role: 'GK', x: 94, y: 50 },
        { id: 'away_df_1', team: 'away', number: 2, name: 'Rào 1', role: 'DF', x: 82, y: 46 },
        { id: 'away_df_2', team: 'away', number: 3, name: 'Rào 2', role: 'DF', x: 82, y: 53 },
        { id: 'away_df_3', team: 'away', number: 4, name: 'Rào 3', role: 'DF', x: 82, y: 60 },
        { id: 'away_mf_1', team: 'away', number: 6, name: 'TV Bọc Lót', role: 'MF', x: 86, y: 68 },
        { id: 'away_mf_2', team: 'away', number: 7, name: 'TV Cánh', role: 'MF', x: 65, y: 25 },
        { id: 'away_fw', team: 'away', number: 9, name: 'TĐ Chực Chờ', role: 'FW', x: 48, y: 50 },
        { id: 'ball', team: 'ball', number: '⚽', name: 'Bóng', role: 'ball', x: 73, y: 50 }
      ],
      drawings: [
        { id: 'd_f1', type: 'arrow', color: '#ef4444', width: 3, points: [{ x: 70, y: 44 }, { x: 78, y: 40 }] },
        { id: 'd_f2', type: 'pass', color: '#f59e0b', width: 3, points: [{ x: 73, y: 50 }, { x: 73, y: 62 }] },
        { id: 'd_f3', type: 'arrow', color: '#10b981', width: 4, points: [{ x: 64, y: 64 }, { x: 73, y: 62 }] },
        { id: 'd_f4', type: 'arrow', color: '#38bdf8', width: 4, points: [{ x: 73, y: 62 }, { x: 95, y: 45 }] },
        { id: 'd_f5', type: 'zone', color: '#f59e0b', width: 2, points: [{ x: 80, y: 42 }, { x: 85, y: 64 }] },
        { id: 'd_f6', type: 'text', color: '#ffffff', width: 2, points: [{ x: 74, y: 36 }], text: 'Giả sút nhử hàng rào' }
      ],
      comments: [
        {
          id: 'cm_preset_4',
          authorName: 'TV Tuấn Anh',
          avatar: '',
          content: 'Quả này gạt bóng nhẹ sang phải là em lấy đà đóng mu lai má ngoài ngay góc xa cực căng!',
          createdAt: new Date()
        }
      ],
      likes: ['p_1', 'p_3']
    },
    {
      id: 'preset_counter_5',
      title: 'Phản Công Thần Tốc 3 Đánh 2: Xẻ Nách Cánh Trái & Đệm Cận Thành',
      category: 'attack',
      description: 'Chớp thời cơ khi đối thủ mất bóng ở giữa sân. Tiền vệ dốc bóng tốc độ trung lộ thu hút trung vệ cuối cùng lùi về, bất ngờ tỉa bóng khe nách cho tiền đạo trái bứt tốc căng ngang dọn cỗ cho tiền đạo phải đệm bóng.',
      formationHome: '3-1-2',
      formationAway: '3-2-1',
      isPreset: true,
      author: {
        id: 'system',
        name: 'Ban Huấn Luyện FC TNT',
        role: 'admin',
        avatar: 'assets/images/logo.svg'
      },
      pieces: [
        { id: 'home_gk', team: 'home', number: 1, name: 'GK Văn Thọ', role: 'GK', x: 6, y: 50 },
        { id: 'home_df_c', team: 'home', number: 4, name: 'Thòng Văn Quân', role: 'DF', x: 28, y: 50 },
        { id: 'home_df_l', team: 'home', number: 3, name: 'Hậu vệ Tài', role: 'DF', x: 38, y: 20 },
        { id: 'home_df_r', team: 'home', number: 5, name: 'Hậu vệ Long', role: 'DF', x: 38, y: 80 },
        { id: 'home_mf', team: 'home', number: 8, name: 'TV Tuấn Anh (Kéo bóng)', role: 'MF', x: 55, y: 48 },
        { id: 'home_fw_1', team: 'home', number: 9, name: 'TĐ Chiến (Bứt tốc)', role: 'FW', x: 62, y: 22 },
        { id: 'home_fw_2', team: 'home', number: 10, name: 'TĐ Đức (Cắt mặt)', role: 'FW', x: 62, y: 72 },
        // Away
        { id: 'away_gk', team: 'away', number: 'GK', name: 'GK Đối thủ', role: 'GK', x: 94, y: 50 },
        { id: 'away_df_1', team: 'away', number: 2, name: 'Trung vệ Bạn', role: 'DF', x: 74, y: 42 },
        { id: 'away_df_2', team: 'away', number: 3, name: 'Hậu vệ Thòng Bạn', role: 'DF', x: 76, y: 58 },
        { id: 'away_df_3', team: 'away', number: 4, name: 'HV Mất đà', role: 'DF', x: 52, y: 82 },
        { id: 'away_mf_1', team: 'away', number: 6, name: 'TV Đuối sức', role: 'MF', x: 48, y: 35 },
        { id: 'away_mf_2', team: 'away', number: 7, name: 'TV Không về kịp', role: 'MF', x: 42, y: 55 },
        { id: 'away_fw', team: 'away', number: 9, name: 'TĐ Bạn', role: 'FW', x: 22, y: 46 },
        { id: 'ball', team: 'ball', number: '⚽', name: 'Bóng', role: 'ball', x: 57, y: 48 }
      ],
      drawings: [
        { id: 'd_c1', type: 'arrow', color: '#10b981', width: 4, points: [{ x: 55, y: 48 }, { x: 67, y: 48 }] },
        { id: 'd_c2', type: 'pass', color: '#f59e0b', width: 3, points: [{ x: 67, y: 48 }, { x: 80, y: 22 }] },
        { id: 'd_c3', type: 'arrow', color: '#38bdf8', width: 4, points: [{ x: 62, y: 22 }, { x: 82, y: 22 }] },
        { id: 'd_c4', type: 'pass', color: '#f59e0b', width: 3, points: [{ x: 82, y: 22 }, { x: 88, y: 52 }] },
        { id: 'd_c5', type: 'arrow', color: '#ef4444', width: 4, points: [{ x: 62, y: 72 }, { x: 88, y: 52 }] },
        { id: 'd_c6', type: 'zone', color: '#38bdf8', width: 2, points: [{ x: 78, y: 16 }, { x: 88, y: 32 }] },
        { id: 'd_c7', type: 'text', color: '#ffffff', width: 2, points: [{ x: 80, y: 14 }], text: 'Khoảng trống xẻ nách' }
      ],
      comments: [
        {
          id: 'cm_preset_5',
          authorName: 'TĐ Chiến',
          avatar: '',
          content: 'Em sẽ bứt tốc nhận bóng rồi căng ngang 1-chạm sệt ngay trước mặt gôn để Đức ập vào ghi bàn!',
          createdAt: new Date()
        }
      ],
      likes: ['p_1', 'p_2', 'p_5']
    },
    {
      id: 'preset_defense_6',
      title: 'Khối Phòng Ngự Khóa Nách Trung Lộ 3-2-1: Bẫy Ép Ra Biên Cướp Bóng',
      category: 'defense',
      description: 'Chủ động co cụm bảo vệ khu vực trung lộ và trước vòng cấm 13m. Nhử đối phương chuyền bóng ra biên, ngay khi đối thủ chạm bóng, Hậu vệ cánh và Tiền vệ trung tâm lập tức ập vào tạo thế 2 kèm 1 để đoạt bóng.',
      formationHome: '3-2-1',
      formationAway: '2-3-1',
      isPreset: true,
      author: {
        id: 'system',
        name: 'Ban Huấn Luyện FC TNT',
        role: 'admin',
        avatar: 'assets/images/logo.svg'
      },
      pieces: [
        { id: 'home_gk', team: 'home', number: 1, name: 'GK Văn Thọ', role: 'GK', x: 6, y: 50 },
        { id: 'home_df_c', team: 'home', number: 4, name: 'Thòng Văn Quân', role: 'DF', x: 18, y: 50 },
        { id: 'home_df_l', team: 'home', number: 3, name: 'Hậu vệ Tài (Ép biên)', role: 'DF', x: 26, y: 22 },
        { id: 'home_df_r', team: 'home', number: 5, name: 'Hậu vệ Long', role: 'DF', x: 24, y: 76 },
        { id: 'home_mf', team: 'home', number: 8, name: 'TV Tuấn Anh (Hỗ trợ 2v1)', role: 'MF', x: 35, y: 35 },
        { id: 'home_fw_1', team: 'home', number: 9, name: 'TV Thủ', role: 'MF', x: 34, y: 65 },
        { id: 'home_fw_2', team: 'home', number: 10, name: 'TĐ Cắm (Đón phản công)', role: 'FW', x: 55, y: 50 },
        // Away
        { id: 'away_gk', team: 'away', number: 'GK', name: 'GK Đối thủ', role: 'GK', x: 92, y: 50 },
        { id: 'away_df_1', team: 'away', number: 2, name: 'HV Bạn 1', role: 'DF', x: 72, y: 35 },
        { id: 'away_df_2', team: 'away', number: 3, name: 'HV Bạn 2', role: 'DF', x: 72, y: 65 },
        { id: 'away_mf_1', team: 'away', number: 6, name: 'TV Bạn 1', role: 'MF', x: 52, y: 50 },
        { id: 'away_mf_2', team: 'away', number: 7, name: 'Tiền đạo Cánh Bạn (Bị bẫy)', role: 'FW', x: 38, y: 15 },
        { id: 'away_mf_3', team: 'away', number: 8, name: 'Cánh Phải Bạn', role: 'FW', x: 42, y: 82 },
        { id: 'away_fw', team: 'away', number: 9, name: 'TĐ Cắm Bạn', role: 'FW', x: 24, y: 48 },
        { id: 'ball', team: 'ball', number: '⚽', name: 'Bóng', role: 'ball', x: 39, y: 17 }
      ],
      drawings: [
        { id: 'd_d1', type: 'arrow', color: '#10b981', width: 4, points: [{ x: 26, y: 22 }, { x: 35, y: 18 }] },
        { id: 'd_d2', type: 'arrow', color: '#10b981', width: 4, points: [{ x: 35, y: 35 }, { x: 37, y: 22 }] },
        { id: 'd_d3', type: 'zone', color: '#ef4444', width: 2, points: [{ x: 28, y: 10 }, { x: 44, y: 28 }] },
        { id: 'd_d4', type: 'text', color: '#ffffff', width: 2, points: [{ x: 30, y: 8 }], text: 'Khu vực bẫy 2 kèm 1 đoạt bóng' },
        { id: 'd_d5', type: 'arrow', color: '#38bdf8', width: 3, points: [{ x: 18, y: 50 }, { x: 20, y: 42 }] }
      ],
      comments: [
        {
          id: 'cm_preset_6',
          authorName: 'Thòng Văn Quân',
          avatar: '',
          content: 'Khi Tài và Tuấn Anh ập vào bẫy cánh, Quân sẽ lót ngay sau lưng phòng trường hợp đối phương đẩy bóng qua người!',
          createdAt: new Date()
        }
      ],
      likes: ['p_1', 'p_4', 'p_6']
    }
  ];
});
