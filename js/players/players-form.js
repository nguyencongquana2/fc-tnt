/**
 * FC TNT - Players Form Submodule (js/players/players-form.js)
 * Quản lý Modal thêm/sửa thông tin cầu thủ (#player-modal), lưu dữ liệu và xóa cầu thủ
 */

(function (root) {
  'use strict';

  function showToast(msg, type = 'info') {
    if (root.TNT && root.TNT.ui && typeof root.TNT.ui.showToast === 'function') {
      root.TNT.ui.showToast(msg, type);
    } else if (typeof root.showToast === 'function') {
      root.showToast(msg, type);
    }
  }

  const PlayersFormMixin = {
    currentEditId: null,

    bindFormEvents() {
      const addBtn = document.getElementById('add-player-btn');
      if (addBtn) {
        addBtn.addEventListener('click', () => this.openPlayerModal());
      }

      const form = document.getElementById('player-form');
      if (form) {
        form.addEventListener('submit', (e) => this.handleSavePlayer(e));
      }
    },

    openPlayerModal(id = null) {
      if (!window.stateManager || !window.stateManager.isAdmin) {
        showToast('Vui lòng đăng nhập Quản trị viên để thêm/sửa cầu thủ!', 'error');
        if (window.appModule && window.appModule.openAdminModal) {
          window.appModule.openAdminModal();
        }
        return;
      }

      this.currentEditId = id;
      const modal = document.getElementById('player-modal');
      const title = document.getElementById('player-modal-title');
      const form = document.getElementById('player-form');
      if (form) form.reset();

      if (id) {
        if (title) title.innerHTML = '✏️ Chỉnh Sửa Cầu Thủ';
        const player = window.stateManager ? window.stateManager.getPlayerById(id) : null;
        if (player) {
          const nameInput = document.getElementById('player-name');
          const nickInput = document.getElementById('player-nickname');
          const numInput = document.getElementById('player-number');
          const posInput = document.getElementById('player-position');
          const avCustom = document.getElementById('player-avatar-custom');
          const phoneInput = document.getElementById('player-phone');
          const noteInput = document.getElementById('player-note');
          const bankCodeInput = document.getElementById('player-bank-code');
          const bankAccNumInput = document.getElementById('player-bank-acc-number');
          const bankAccNameInput = document.getElementById('player-bank-acc-name');
          const avPreview = document.getElementById('player-avatar-preview');

          if (nameInput) nameInput.value = player.name || '';
          if (nickInput) nickInput.value = player.nickname || '';
          if (numInput) numInput.value = player.number || '';
          if (posInput) posInput.value = player.position || 'FW';
          if (avCustom) avCustom.value = player.avatar || '';
          if (phoneInput) phoneInput.value = player.phone || '';
          if (noteInput) noteInput.value = player.note || '';
          if (bankCodeInput) bankCodeInput.value = player.bankCode || '';
          if (bankAccNumInput) bankAccNumInput.value = player.bankAccountNumber || '';
          if (bankAccNameInput) bankAccNameInput.value = player.bankAccountName || '';
          if (avPreview) avPreview.src = player.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
        }
      } else {
        if (title) title.innerHTML = '➕ Thêm Cầu Thủ Mới';
        const randomAvatars = [
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
        ];
        const randomAv = randomAvatars[Math.floor(Math.random() * randomAvatars.length)];
        const avCustom = document.getElementById('player-avatar-custom');
        const avPreview = document.getElementById('player-avatar-preview');
        const bankCodeInput = document.getElementById('player-bank-code');
        const bankAccNumInput = document.getElementById('player-bank-acc-number');
        const bankAccNameInput = document.getElementById('player-bank-acc-name');

        if (avCustom) avCustom.value = randomAv;
        if (avPreview) avPreview.src = randomAv;
        if (bankCodeInput) bankCodeInput.value = '';
        if (bankAccNumInput) bankAccNumInput.value = '';
        if (bankAccNameInput) bankAccNameInput.value = '';
      }

      if (modal) modal.classList.add('active');
    },

    closePlayerModal() {
      const modal = document.getElementById('player-modal');
      if (modal) modal.classList.remove('active');
      this.currentEditId = null;
    },

    handleSavePlayer(e) {
      e.preventDefault();
      if (!window.stateManager || !window.stateManager.isAdmin) {
        showToast('Vui lòng đăng nhập Quản trị viên để lưu thông tin!', 'error');
        return;
      }
      const name = document.getElementById('player-name')?.value.trim();
      if (!name) {
        showToast('Vui lòng nhập tên cầu thủ!', 'error');
        return;
      }

      const playerData = {
        name,
        nickname: document.getElementById('player-nickname')?.value.trim() || '',
        number: parseInt(document.getElementById('player-number')?.value) || 0,
        position: document.getElementById('player-position')?.value || 'FW',
        avatar: document.getElementById('player-avatar-custom')?.value.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        phone: document.getElementById('player-phone')?.value.trim() || '',
        note: document.getElementById('player-note')?.value.trim() || '',
        bankCode: document.getElementById('player-bank-code')?.value || '',
        bankAccountNumber: document.getElementById('player-bank-acc-number')?.value.trim() || '',
        bankAccountName: document.getElementById('player-bank-acc-name')?.value.trim() || ''
      };

      if (this.currentEditId) {
        window.stateManager.updatePlayer(this.currentEditId, playerData);
        showToast(`Đã cập nhật cầu thủ: ${playerData.name}`, 'success');
      } else {
        window.stateManager.addPlayer(playerData);
        showToast(`Đã thêm cầu thủ mới: ${playerData.name}`, 'success');
      }

      this.closePlayerModal();
      this.renderPlayers();
      if (window.awardsModule && typeof window.awardsModule.renderAwards === 'function') {
        window.awardsModule.renderAwards();
      }
      if (window.appModule && typeof window.appModule.renderDashboard === 'function') {
        window.appModule.renderDashboard();
      }
    },

    deletePlayer(id) {
      if (!window.stateManager || !window.stateManager.isAdmin) {
        showToast('Vui lòng đăng nhập Quản trị viên để xóa cầu thủ!', 'error');
        if (window.appModule && window.appModule.openAdminModal) {
          window.appModule.openAdminModal();
        }
        return;
      }

      const player = window.stateManager.getPlayerById(id);
      if (!player) return;

      if (confirm(`Bạn có chắc chắn muốn xóa cầu thủ "${player.name}" khỏi đội bóng không?`)) {
        window.stateManager.deletePlayer(id);
        showToast(`Đã xóa cầu thủ ${player.name}`, 'info');
        this.renderPlayers();
        if (window.awardsModule && typeof window.awardsModule.renderAwards === 'function') {
          window.awardsModule.renderAwards();
        }
        if (window.appModule && typeof window.appModule.renderDashboard === 'function') {
          window.appModule.renderDashboard();
        }
      }
    }
  };

  root.TNTPlayersMixins = root.TNTPlayersMixins || {};
  root.TNTPlayersMixins.form = PlayersFormMixin;

})(typeof window !== 'undefined' ? window : this);
