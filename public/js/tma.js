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

        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
          this.user = tg.initDataUnsafe.user;
        }

        // Слушатели изменения темы и безопасных зон Telegram
        tg.onEvent('themeChanged', () => this.applyThemeColors());
        tg.onEvent('safeAreaChanged', () => this.applySafeAreas());
        tg.onEvent('contentSafeAreaChanged', () => this.applySafeAreas());
        tg.onEvent('fullscreenChanged', () => this.applySafeAreas());
      } catch (e) {
        console.warn('Ошибка инициализации Telegram WebApp:', e);
      }
    } else {
      // Обычный браузер или PWA
      this.isTMA = false;
    }
  },

  applySafeAreas() {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    const root = document.documentElement;

    // Системные кнопки Telegram (Закрыть и ...) занимают ~84-90px от верха экрана
    const reportedTop = tg.contentSafeAreaInset?.top || tg.safeAreaInset?.top || 0;
    const topInset = reportedTop >= 70 ? reportedTop : 88;
    const bottomInset = tg.contentSafeAreaInset?.bottom || tg.safeAreaInset?.bottom || 0;

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
  }
};
