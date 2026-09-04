/**
 * Клиент взаимодействия с REST API сервиса «Квиты»
 */
export const API = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Произошла ошибка при выполнении запроса');
      }

      return data.data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
      throw err;
    }
  },

  // Создать новый сбор (комнату)
  async createRoom(title, baseCurrency = 'BYN', participants = []) {
    return this.request('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        title,
        base_currency: baseCurrency,
        participants
      })
    });
  },

  // Получить данные комнаты по slug
  async getRoom(slug) {
    return this.request(`/rooms/${encodeURIComponent(slug)}`);
  },

  // Добавить нового участника или обновить его реквизиты
  async saveParticipant(slug, participantData) {
    return this.request(`/rooms/${encodeURIComponent(slug)}/participants`, {
      method: 'POST',
      body: JSON.stringify(participantData)
    });
  },

  // Добавить расход
  async addExpense(slug, expenseData) {
    return this.request(`/rooms/${encodeURIComponent(slug)}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expenseData)
    });
  },

  // Удалить расход
  async deleteExpense(slug, expenseId) {
    return this.request(`/rooms/${encodeURIComponent(slug)}/expenses/${expenseId}`, {
      method: 'DELETE'
    });
  },

  // Получить расчет взаиморасчетов (Min Cash Flow)
  async getBalances(slug) {
    return this.request(`/rooms/${encodeURIComponent(slug)}/balances`);
  }
};
