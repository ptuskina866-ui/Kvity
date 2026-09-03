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
      try {
        tg.ready();
        tg.expand();
        
        // Синхронизируем цвета темы Telegram
        this.applyThemeColors();

        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
          this.user = tg.initDataUnsafe.user;
        }

        // Слушатель изменения темы Telegram
        tg.onEvent('themeChanged', () => {
          this.applyThemeColors();
        });
      } catch (e) {
        console.warn('Ошибка инициализации Telegram WebApp:', e);
      }
    } else {
      // Обычный браузер или PWA
      this.isTMA = false;
    }
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
