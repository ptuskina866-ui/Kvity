/**
 * Управление состоянием и кэшированием в localStorage
 */

const CURRENCY_SYMBOLS = {
  'RUB': '₽',
  'BYN': 'Br',
  'USD': '$',
  'EUR': '€',
  'KZT': '₸'
};

export const State = {
  currentRoom: null,
  balances: null,
  activeTab: 'expenses', // 'expenses' | 'balances'
  
  // Получить символ валюты
  formatCurrency(amount, currency = 'BYN') {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    const formatted = new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);

    return `${formatted} ${symbol}`;
  },

  // Кэширование текущей комнаты для оффлайн-доступа
  saveRoomToCache(roomData) {
    if (!roomData || !roomData.slug) return;
    try {
      localStorage.setItem(`kvity_room_${roomData.slug}`, JSON.stringify({
        data: roomData,
        cachedAt: Date.now()
      }));

      // Обновляем список недавних комнат
      this.addToRecentRooms(roomData);
    } catch (e) {
      console.warn('Не удалось сохранить комнату в кэш:', e);
    }
  },

  // Получить комнату из кэша
  getRoomFromCache(slug) {
    try {
      const raw = localStorage.getItem(`kvity_room_${slug}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.data;
    } catch (e) {
      return null;
    }
  },

  // Список недавних комнат для быстрого возврата на главной
  getRecentRooms() {
    try {
      const raw = localStorage.getItem('kvity_recent_rooms');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  addToRecentRooms(roomData) {
    try {
      let recent = this.getRecentRooms();
      recent = recent.filter(r => r.slug !== roomData.slug);
      recent.unshift({
        slug: roomData.slug,
        title: roomData.title,
        base_currency: roomData.base_currency,
        updatedAt: Date.now()
      });
      // Храним последние 10 комнат
      recent = recent.slice(0, 10);
      localStorage.setItem('kvity_recent_rooms', JSON.stringify(recent));
    } catch (e) {}
  }
};
