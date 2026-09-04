/**
 * Интеграция с Telegram Mini App (TMA)
 */
export const TMA = {
  isTMA: false,
  user: null,

  init() {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.initData) {
      this.isTMA = true;
      document.body.classList.add('tma-app');
      try {
        tg.ready();
        tg.expand();
        
        // Синхронизируем цвета темы Telegram
        this.applyThemeColors();
        this.applySafeAreas();
        this.checkFullscreen();

        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
          this.user = tg.initDataUnsafe.user;
        }

        // Слушатели изменения темы, безопасных зон и изменения размера окна
        tg.onEvent('themeChanged', () => this.applyThemeColors());
        tg.onEvent('safeAreaChanged', () => { this.applySafeAreas(); this.checkFullscreen(); });
        tg.onEvent('contentSafeAreaChanged', () => { this.applySafeAreas(); this.checkFullscreen(); });
        tg.onEvent('fullscreenChanged', () => { this.applySafeAreas(); this.checkFullscreen(); });
        tg.onEvent('viewportChanged', () => { this.applySafeAreas(); this.checkFullscreen(); });
        window.addEventListener('resize', () => { this.applySafeAreas(); this.checkFullscreen(); });
      } catch (e) {
        console.warn('Ошибка инициализации Telegram WebApp:', e);
      }
    } else {
      // Обычный браузер или PWA
      this.isTMA = false;
    }
  },

  checkFullscreen() {
    const tg = window.Telegram?.WebApp;
    if (!this.isTMA) return;

    // В полноэкранном режиме Telegram убирает системную белую шапку
    // В обычном режиме шапка Telegram находится ВНЕ вебвью
    const isFull = Boolean(tg?.isFullscreen);

    if (isFull) {
      document.body.classList.add('tma-fullscreen');
      document.body.classList.remove('tma-sheet');
    } else {
      document.body.classList.add('tma-sheet');
      document.body.classList.remove('tma-fullscreen');
    }
  },

  applySafeAreas() {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    const root = document.documentElement;

    // Если Telegram в полноэкранном режиме, нужны отступы под плавающие кнопки
    // В стандартном режиме вебвью начинается ровно под нативной шапкой Telegram, отступ 12px
    let topInset = 12;
    if (tg.isFullscreen) {
      const reportedTop = tg.safeAreaInset?.top || tg.contentSafeAreaInset?.top || 0;
      topInset = reportedTop >= 50 ? reportedTop : 56;
    }

    const bottomInset = tg.safeAreaInset?.bottom || tg.contentSafeAreaInset?.bottom || 0;

    root.style.setProperty('--tma-safe-top', `${topInset}px`);
    root.style.setProperty('--tma-safe-bottom', `${bottomInset}px`);
  },

  applyThemeColors() {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const root = document.documentElement;
    const theme = tg.themeParams || {};

    if (theme.bg_color) root.style.setProperty('--tg-theme-bg-color', theme.bg_color);
    if (theme.text_color) root.style.setProperty('--tg-theme-text-color', theme.text_color);
    if (theme.hint_color) root.style.setProperty('--tg-theme-hint-color', theme.hint_color);
    if (theme.link_color) root.style.setProperty('--tg-theme-link-color', theme.link_color);
    if (theme.button_color) root.style.setProperty('--tg-theme-button-color', theme.button_color);
    if (theme.button_text_color) root.style.setProperty('--tg-theme-button-text-color', theme.button_text_color);
    if (theme.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color);
  },

  // Тактильный отклик (Haptic Feedback)
  haptic: {
    impact(style = 'medium') {
      try {
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
      } catch (e) {}
    },
    notification(type = 'success') {
      try {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
      } catch (e) {}
    },
    selection() {
      try {
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      } catch (e) {}
    }
  },

  getUserFirstName() {
    return this.user?.first_name || '';
  },

  getUserId() {
    return this.user?.id || null;
  },

  // Управление кнопкой «Назад» в Telegram
  _backCallback: null,
  showBackButton(callback) {
    const tg = window.Telegram?.WebApp;
    if (tg?.BackButton) {
      if (this._backCallback) {
        tg.BackButton.offClick(this._backCallback);
      }
      this._backCallback = () => {
        this.haptic.impact('light');
        if (callback) callback();
      };
      tg.BackButton.onClick(this._backCallback);
      tg.BackButton.show();
    }
  },

  hideBackButton() {
    const tg = window.Telegram?.WebApp;
    if (tg?.BackButton) {
      if (this._backCallback) {
        tg.BackButton.offClick(this._backCallback);
        this._backCallback = null;
      }
      tg.BackButton.hide();
    }
  },

  // Нативное диалоговое окно подтверждения Telegram с fallback на confirm
  showConfirm(message, callback) {
    const tg = window.Telegram?.WebApp;
    if (tg && typeof tg.showConfirm === 'function') {
      tg.showConfirm(message, (confirmed) => {
        callback(Boolean(confirmed));
      });
    } else {
      const confirmed = window.confirm(message);
      callback(confirmed);
    }
  }
};
