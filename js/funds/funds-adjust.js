/**
 * FC TNT - Funds Submodule: Treasurer Auth & Balance Adjuster (js/funds/funds-adjust.js)
 * Quản lý xác thực quyền Thủ Quỹ (Treasurer PIN), điều chỉnh số dư thủ công và xuất báo cáo Zalo
 */

(function (root) {
  'use strict';

  root.TNTFundsMixins = root.TNTFundsMixins || {};

  root.TNTFundsMixins.adjust = {
    // =========================================================================
    // XÁC THỰC MÃ PIN THỦ QUỸ
    // =========================================================================
    promptTreasurerLogin(callback = null) {
      const pin = prompt('🔐 Nhập Mã PIN Thủ Quỹ (Chỉ Thủ Quỹ mới có quyền can thiệp số dư):');
      if (!pin) return;
      this.loginTreasurer(pin, callback);
    },

    async loginTreasurer(pin, callback = null) {
      try {
        const res = await fetch('/api/auth/treasurer/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          localStorage.setItem('fc_tnt_treasurer_token', data.token);
          this.isTreasurerLoggedIn = true;
          if (root.stateManager) root.stateManager.isTreasurer = true;
          if (root.TNT && root.TNT.state) root.TNT.state.isTreasurer = true;
          if (root.appModule && typeof root.appModule.updateAuthUI === 'function') {
            root.appModule.updateAuthUI();
          }
          if (root.showToast) root.showToast('🔓 Đã mở khóa quyền Thủ Quỹ thành công!', 'success');
          else alert('🔓 Đã mở khóa quyền Thủ Quỹ!');

          this.renderFundsPage();
          if (typeof callback === 'function') callback();
        } else {
          alert(data.error || 'Mã PIN Thủ Quỹ không chính xác!');
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ: ' + err.message);
      }
    },

    logoutTreasurer() {
      localStorage.removeItem('fc_tnt_treasurer_token');
      sessionStorage.removeItem('fc_tnt_treasurer_token');
      if (root.stateManager) root.stateManager.isTreasurer = false;
      if (root.TNT && root.TNT.state) root.TNT.state.isTreasurer = false;
      if (root.appModule && typeof root.appModule.updateAuthUI === 'function') {
        root.appModule.updateAuthUI();
      }
      if (root.showToast) root.showToast('🔒 Đã khóa quyền Thủ Quỹ.', 'info');
      this.renderFundsPage();
    },

    isTreasurer() {
      return Boolean(this.getTreasurerToken());
    },

    getTreasurerToken() {
      return localStorage.getItem('fc_tnt_treasurer_token') || sessionStorage.getItem('fc_tnt_treasurer_token') || '';
    },

    // =========================================================================
    // ĐIỀU CHỈNH SỐ DƯ CÁ NHÂN THỦ CÔNG (ADJUST MODAL)
    // =========================================================================
    async openAdjustModal(playerId) {
      if (!this.isTreasurer()) {
        this.promptTreasurerLogin(() => this.openAdjustModal(playerId));
        return;
      }

      const player = (this.playersBalances || []).find(p => p.id === playerId);
      if (!player) {
        alert('Không tìm thấy thông tin cầu thủ!');
        return;
      }

      const currentBal = Number(player.fundBalance) || 0;
      const input = prompt(
        `⚙️ ĐIỀU CHỈNH SỐ DƯ QUỸ:\nCầu thủ: ${player.name} (#${player.number || '?'})\nSố dư hiện tại: ${this.formatMoney(currentBal)}\n\nNhập số dư mới mong muốn (VNĐ):`,
        currentBal
      );

      if (input === null) return;
      const cleanNum = parseInt(String(input).replace(/[^0-9-]/g, ''), 10);
      if (isNaN(cleanNum) || cleanNum < -20000000 || cleanNum > 50000000) {
        alert('Số tiền không hợp lệ! Vui lòng nhập số nguyên từ -20.000.000đ đến 50.000.000đ.');
        return;
      }

      const reason = prompt('Lý do điều chỉnh số dư (nhật ký giao dịch):', 'Điều chỉnh số dư quỹ thủ công');
      if (reason === null) return;

      try {
        const res = await fetch('/api/funds/adjust', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-treasurer-token': this.getTreasurerToken()
          },
          body: JSON.stringify({
            playerId,
            newBalance: cleanNum,
            reason: String(reason || '').trim() || 'Điều chỉnh thủ công'
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          if (root.showToast) root.showToast(`✅ ${data.message}`, 'success');
          else alert(data.message);
          await this.fetchBalances();
          this.renderFundsPage();
        } else {
          alert(data.error || 'Điều chỉnh số dư thất bại!');
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ: ' + err.message);
      }
    },

    // =========================================================================
    // SAO CHÉP BÁO CÁO ZALO 1 CHẠM
    // =========================================================================
    copyZaloReport() {
      const now = new Date();
      const monthStr = `${now.getMonth() + 1}/${now.getFullYear()}`;
      
      const goodList = [];
      const lowList = [];
      const debtList = [];

      this.playersBalances.forEach(p => {
        const bal = Number(p.fundBalance) || 0;
        const line = `- #${p.number} ${p.name}: ${bal >= 0 ? '+' : ''}${this.formatMoney(bal)}`;
        if (bal < 0) debtList.push(line);
        else if (bal <= 50000) lowList.push(line);
        else goodList.push(line);
      });

      let report = `⚽ FC TNT - BÁO CÁO QUỸ ĐỘI BÓNG (Tháng ${monthStr})\n`;
      report += `💰 Tổng quỹ hiện có: ${this.formatMoney(this.summary.totalFund)}\n`;
      report += `------------------------------------\n`;

      if (debtList.length > 0) {
        report += `🔴 NỢ QUỸ / CẦN NỘP THÊM:\n${debtList.join('\n')}\n\n`;
      }

      if (lowList.length > 0) {
        report += `🟡 SẮP HẾT QUỸ (< 50k):\n${lowList.join('\n')}\n\n`;
      }

      if (goodList.length > 0) {
        report += `🟢 SỐ DƯ TỐT:\n${goodList.join('\n')}\n\n`;
      }

      report += `------------------------------------\n`;
      report += `💳 STK Quỹ: VCB 9392139587 - NGUYEN CONG QUAN\n`;
      report += `📝 Cú pháp: TNT [Tên bạn] nop quy`;

      if (root.TNT && root.TNT.utils && typeof root.TNT.utils.copyToClipboard === 'function') {
        root.TNT.utils.copyToClipboard(report, '📋 Đã sao chép báo cáo Zalo vào Clipboard!');
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(report).then(() => {
          if (root.showToast) root.showToast('📋 Đã sao chép báo cáo Zalo vào Clipboard!', 'success');
          else alert('Đã sao chép báo cáo Zalo!');
        }).catch(err => {
          console.warn('Lỗi copy clipboard:', err.message);
          alert('Không thể tự động copy. Vui lòng thử lại!');
        });
      }
    }
  };

})(typeof window !== 'undefined' ? window : this);
