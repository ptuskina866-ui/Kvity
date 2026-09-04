import { API } from './api.js';
import { TMA } from './tma.js';
import { State } from './state.js';

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

function showToast(message, duration = 2500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'liquid-glass-card text-forest-dark px-4 py-3 rounded-2xl shadow-xl border border-white flex items-center gap-3 animate-liquid-sheet text-xs font-bold';
  toast.innerHTML = `
    <span class="w-2.5 h-2.5 rounded-full bg-emerald-700 animate-ping"></span>
    <span class="flex-1">${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

function copyToClipboard(text, successMsg = 'Скопировано в буфер обмена!') {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg);
      TMA.haptic.notification('success');
    }).catch(() => fallbackCopy(text, successMsg));
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast(successMsg);
    TMA.haptic.notification('success');
  } catch (err) {
    showToast('Не удалось скопировать. Скопируйте вручную.');
  }
  document.body.removeChild(textArea);
}

// --- РОУТИНГ ---

function getSlugFromUrl() {
  const hash = window.location.hash;
  const match = hash.match(/#\/r\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  const params = new URLSearchParams(window.location.search);
  return params.get('r') || null;
}

function navigateTo(slug) {
  window.location.hash = `#/r/${slug}`;
}

function navigateHome() {
  window.location.hash = '';
}

// --- ОСНОВНОЙ МОДУЛЬ APP ---

export const App = {
  async init() {
    TMA.init();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('Service Worker зарегистрирован'))
        .catch(err => console.warn('Ошибка регистрации SW:', err));
    }

    this.bindGlobalEvents();
    this.handleRoute();

    window.addEventListener('hashchange', () => this.handleRoute());
  },

  bindGlobalEvents() {
    document.getElementById('tab-btn-expenses')?.addEventListener('click', () => {
      this.switchTab('expenses');
      TMA.haptic.selection();
    });

    document.getElementById('tab-btn-balances')?.addEventListener('click', () => {
      this.switchTab('balances');
      TMA.haptic.selection();
    });

    document.getElementById('btn-share-room')?.addEventListener('click', () => {
      this.shareRoom();
    });

    document.getElementById('btn-open-add-expense')?.addEventListener('click', () => {
      this.openAddExpenseModal();
      TMA.haptic.impact('light');
    });

    document.getElementById('btn-open-participants')?.addEventListener('click', () => {
      this.openParticipantsModal();
      TMA.haptic.impact('light');
    });

    document.getElementById('btn-generate-chat-report')?.addEventListener('click', () => {
      this.generateAndCopyChatReport();
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.closeAllModals();
        }
      });
    });

    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });

    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-privacy') || e.target.closest('.btn-open-privacy')) {
        e.preventDefault();
        TMA.haptic.impact('light');
        this.openModal('modal-privacy');
      }
    });
  },

  async handleRoute() {
    const slug = getSlugFromUrl();
    if (slug) {
      document.getElementById('view-home').classList.add('hidden');
      document.getElementById('view-room').classList.remove('hidden');
      TMA.showBackButton(() => navigateHome());
      await this.loadRoom(slug);
    } else {
      document.getElementById('view-home').classList.remove('hidden');
      document.getElementById('view-room').classList.add('hidden');
      TMA.hideBackButton();
      this.renderHomeView();
    }
  },

  // --- ГЛАВНАЯ СТРАНИЦА: ДИЗАЙНЕРСКИЙ БУМ С ПАРЯЩИМИ 3D ЭЛЕМЕНТАМИ ---

  renderHomeView() {
    const container = document.getElementById('view-home');
    const recent = State.getRecentRooms();
    const tgUser = TMA.getUserFirstName();

    container.innerHTML = `
      <div class="max-w-md mx-auto p-4 pb-16 flex flex-col min-h-screen justify-between">
        <div class="space-y-6 pt-2">
          
          <!-- Главный типографический блок с безопасным отступом сверху под Telegram -->
          <div class="safe-top-padding px-2 text-center">
            <h1 class="text-[28px] sm:text-[32px] font-black text-forest-dark leading-[1.2] tracking-[-0.03em]">
              Разделите расходы,<br><span class="text-forest-dark/70 font-extrabold">сохраните дружбу.</span>
            </h1>
            <p class="text-[13px] text-forest-dark/75 font-medium mt-2.5 leading-snug max-w-[290px] mx-auto">
              Быстрый расчет чеков и долгов для встреч и поездок. Без регистрации.
            </p>

            <!-- Кнопка справки: отцентрирована под описанием, никогда не задевает Dynamic Island или кнопки Telegram -->
            <div class="pt-3.5 flex justify-center">
              <button id="btn-how-it-works" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full liquid-glass text-xs font-bold text-forest-dark border border-white hover:bg-white transition active:scale-95 shadow-2xs">
                <svg class="w-3.5 h-3.5 text-forest-muted" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 16v-4m0-4h.01"/></svg>
                <span>Как это работает?</span>
              </button>
            </div>
          </div>


          <!-- Форма создания сбора в ультралегком Liquid Glass -->
          <div class="liquid-glass-card rounded-[32px] p-6 space-y-5">
            <div>
              <span class="text-xs font-black uppercase tracking-wider text-forest-muted">
                Новый сбор
              </span>
            </div>

            <div>
              <label class="block text-xs font-bold text-forest-muted mb-1.5">Куда едем или что празднуем?</label>
              <input type="text" id="new-room-title" placeholder="например: Шашлыки, Бар, Дача" autocomplete="off" enterkeyhint="next"
                class="w-full liquid-glass-input rounded-2xl px-4 py-3.5 text-sm font-semibold placeholder-forest-muted/50 focus:outline-none transition">
            </div>

            <div>
              <label class="block text-xs font-bold text-forest-muted mb-1.5">Основная валюта</label>
              <div class="grid grid-cols-5 gap-1.5" id="currency-selector">
                ${['BYN', 'RUB', 'KZT', 'USD', 'EUR'].map(c => `
                  <button type="button" data-curr="${c}" class="curr-btn py-2.5 text-xs font-black rounded-2xl transition ${c === 'BYN' ? 'bg-forest-dark text-white shadow-md' : 'liquid-glass text-forest-dark hover:bg-white'}">
                    ${c}
                  </button>
                `).join('')}
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-1.5">
                <label class="text-xs font-bold text-forest-muted">Участники сбора</label>
                ${tgUser ? `<button id="btn-add-tg-user" class="text-xs font-extrabold text-forest-dark hover:underline">+ Я (${tgUser})</button>` : ''}
              </div>
              
              <div class="flex flex-wrap gap-1.5 p-2 liquid-glass-input rounded-2xl min-h-[52px] items-center" id="tags-container">
                <input type="text" id="participant-input" placeholder="Имя и Enter..." autocomplete="off" enterkeyhint="done"
                  class="bg-transparent border-none text-forest-dark text-sm font-semibold focus:outline-none px-2.5 py-1 flex-1 min-w-[110px]">
                <button type="button" id="btn-add-tag-inline" class="w-8 h-8 rounded-xl bg-forest-dark text-white font-bold flex items-center justify-center shrink-0 hover:bg-forest-dark-hover active:scale-95 transition" title="Добавить">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                </button>
              </div>
            </div>

            <button id="btn-create-room" class="w-full py-4 px-4 btn-forest-primary rounded-2xl text-sm font-bold tracking-tight flex items-center justify-center gap-2 shadow-lg">
              <span>Создать сбор</span>
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
          </div>

          <!-- Недавние события -->
          ${recent.length > 0 ? `
            <div class="space-y-2.5 pt-1">
              <h3 class="text-xs font-bold uppercase tracking-wider text-forest-muted px-1">Недавние события</h3>
              <div class="space-y-2">
                ${recent.map(r => `
                  <a href="#/r/${r.slug}" class="liquid-glass p-4 rounded-2xl flex items-center justify-between active:scale-98 transition group">
                    <div>
                      <div class="font-bold text-forest-dark text-sm">${r.title}</div>
                      <div class="text-xs text-forest-muted/70 mt-0.5">Токен: ${r.slug} • Валюта: ${r.base_currency}</div>
                    </div>
                    <div class="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-forest-dark group-hover:bg-forest-dark group-hover:text-white transition">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 17L17 7m0 0H7m10 0v10"/></svg>
                    </div>
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Стильный микро-футер -->
          <footer class="pt-6 pb-2 text-center text-xs font-semibold text-forest-dark/60 flex items-center justify-center flex-wrap gap-x-2 gap-y-1">
            <a href="https://overweb.by" target="_blank" rel="noopener" class="hover:text-forest-dark transition underline underline-offset-4 decoration-forest-dark/20 hover:decoration-forest-dark">Разработано overweb.by</a>
            <span class="text-forest-dark/30">•</span>
            <a href="https://t.me/nu_posmotr1m" target="_blank" rel="noopener" class="hover:text-forest-dark transition underline underline-offset-4 decoration-forest-dark/20 hover:decoration-forest-dark">Обратная связь</a>
            <span class="text-forest-dark/30">•</span>
            <button type="button" id="btn-privacy" class="hover:text-forest-dark transition underline underline-offset-4 decoration-forest-dark/20 hover:decoration-forest-dark cursor-pointer">Конфиденциальность</button>
          </footer>
        </div>
      </div>
    `;

    this.bindHomeEvents();
    TMA.checkFullscreen();
  },

  bindHomeEvents() {
    let selectedCurrency = 'BYN';
    const participants = [];

    document.getElementById('btn-how-it-works')?.addEventListener('click', () => {
      TMA.haptic.impact('light');
      this.openModal('modal-how-it-works');
    });

    document.querySelectorAll('.curr-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        TMA.haptic.selection();
        selectedCurrency = btn.dataset.curr;
        document.querySelectorAll('.curr-btn').forEach(b => {
          b.className = 'curr-btn py-2.5 text-xs font-black rounded-2xl transition liquid-glass text-forest-dark hover:bg-white';
        });
        btn.className = 'curr-btn py-2.5 text-xs font-black rounded-2xl transition bg-forest-dark text-white shadow-md';
      });
    });

    const tagsContainer = document.getElementById('tags-container');
    const input = document.getElementById('participant-input');

    const renderTags = () => {
      tagsContainer.querySelectorAll('.participant-tag').forEach(t => t.remove());
      participants.forEach((name, idx) => {
        const tag = document.createElement('span');
        tag.className = 'participant-tag inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-forest-dark border border-forest-dark/10 shadow-sm text-xs font-bold';
        tag.innerHTML = `
          <span>${name}</span>
          <button type="button" data-idx="${idx}" class="remove-tag text-forest-muted/50 hover:text-forest-dark font-bold">&times;</button>
        `;
        tagsContainer.insertBefore(tag, input);
      });

      tagsContainer.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.idx);
          participants.splice(idx, 1);
          renderTags();
        });
      });
    };

    const addParticipantName = (name) => {
      const trimmed = name.trim();
      if (trimmed && !participants.includes(trimmed)) {
        participants.push(trimmed);
        renderTags();
      }
    };

    document.getElementById('btn-add-tg-user')?.addEventListener('click', () => {
      const tgName = TMA.getUserFirstName();
      if (tgName) {
        addParticipantName(tgName);
        TMA.haptic.impact('light');
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addParticipantName(input.value);
        input.value = '';
      } else if (e.key === 'Backspace' && input.value === '' && participants.length > 0) {
        participants.pop();
        renderTags();
      }
    });

    document.getElementById('btn-add-tag-inline')?.addEventListener('click', () => {
      if (input.value.trim()) {
        addParticipantName(input.value);
        input.value = '';
        TMA.haptic.impact('light');
        input.focus();
      }
    });

    input.addEventListener('blur', () => {
      if (input.value.trim()) {
        addParticipantName(input.value);
        input.value = '';
      }
    });

    document.getElementById('btn-create-room')?.addEventListener('click', async () => {
      const title = document.getElementById('new-room-title').value.trim();
      if (input.value.trim()) {
        addParticipantName(input.value);
        input.value = '';
      }

      if (!title) {
        showToast('Пожалуйста, укажите название сбора');
        TMA.haptic.notification('error');
        return;
      }

      if (participants.length < 2) {
        showToast('Добавьте как минимум 2 участников для деления счетов');
        TMA.haptic.notification('error');
        return;
      }

      const btn = document.getElementById('btn-create-room');
      btn.disabled = true;
      btn.innerHTML = '<span class="animate-spin mr-2">⏳</span> Создание...';

      try {
        const room = await API.createRoom(title, selectedCurrency, participants);
        State.saveRoomToCache(room);
        TMA.haptic.notification('success');
        navigateTo(room.slug);
      } catch (err) {
        showToast(err.message || 'Ошибка создания сбора');
        TMA.haptic.notification('error');
        btn.disabled = false;
        btn.innerHTML = 'Создать сбор';
      }
    });
  },

  // --- КОМНАТА: ЗАГРУЗКА И ОТОБРАЖЕНИЕ ---

  async loadRoom(slug) {
    try {
      document.getElementById('room-loading')?.classList.remove('hidden');
      document.getElementById('room-content')?.classList.add('hidden');

      const cached = State.getRoomFromCache(slug);
      if (cached) {
        State.currentRoom = cached;
        this.renderRoomHeader();
        this.renderExpensesTab();
      }

      const room = await API.getRoom(slug);
      State.currentRoom = room;
      State.saveRoomToCache(room);

      const balances = await API.getBalances(slug);
      State.balances = balances;

      document.getElementById('room-loading')?.classList.add('hidden');
      document.getElementById('room-content')?.classList.remove('hidden');

      this.renderRoomHeader();
      this.renderExpensesTab();
      this.renderBalancesTab();
    } catch (err) {
      console.error('Ошибка загрузки комнаты:', err);
      if (State.currentRoom) {
        showToast('Работаем в оффлайн-режиме (показаны кэшированные данные)');
        document.getElementById('room-loading')?.classList.add('hidden');
        document.getElementById('room-content')?.classList.remove('hidden');
        this.renderRoomHeader();
        this.renderExpensesTab();
      } else {
        showToast('Не удалось загрузить сбор. Проверьте ссылку.');
        navigateHome();
      }
    }
  },

  renderRoomHeader() {
    const room = State.currentRoom;
    if (!room) return;

    document.getElementById('room-title').textContent = room.title;
    document.getElementById('room-currency-badge').textContent = room.base_currency;
    document.getElementById('room-participants-count').textContent = `${room.participants?.length || 0} участников`;

    const total = room.total_spent || 0;
    document.getElementById('summary-total-spent').textContent = State.formatCurrency(total, room.base_currency);

    const count = room.participants?.length || 1;
    const avg = total > 0 ? (total / count) : 0;
    document.getElementById('summary-avg-spent').textContent = State.formatCurrency(avg, room.base_currency);
    document.getElementById('summary-expense-count').textContent = `${room.expenses?.length || 0} трат`;
  },

  switchTab(tab) {
    State.activeTab = tab;
    const tabExpenses = document.getElementById('tab-expenses-content');
    const tabBalances = document.getElementById('tab-balances-content');
    const btnExp = document.getElementById('tab-btn-expenses');
    const btnBal = document.getElementById('tab-btn-balances');

    if (tab === 'expenses') {
      tabExpenses.classList.remove('hidden');
      tabExpenses.classList.remove('tab-fade-in');
      void tabExpenses.offsetWidth;
      tabExpenses.classList.add('tab-fade-in');

      tabBalances.classList.add('hidden');
      btnExp.className = 'flex-1 py-2.5 text-xs font-bold rounded-2xl segment-item-active transition';
      btnBal.className = 'flex-1 py-2.5 text-xs font-bold rounded-2xl text-forest-muted hover:text-forest-dark transition';
    } else {
      tabExpenses.classList.add('hidden');
      tabBalances.classList.remove('hidden');
      tabBalances.classList.remove('tab-fade-in');
      void tabBalances.offsetWidth;
      tabBalances.classList.add('tab-fade-in');

      btnExp.className = 'flex-1 py-2.5 text-xs font-bold rounded-2xl text-forest-muted hover:text-forest-dark transition';
      btnBal.className = 'flex-1 py-2.5 text-xs font-bold rounded-2xl segment-item-active transition';
      this.renderBalancesTab();
    }
  },

  // --- ВКЛАДКА 1: РАСХОДЫ ---

  renderExpensesTab() {
    const room = State.currentRoom;
    const container = document.getElementById('expenses-list-container');
    if (!container || !room) return;

    const expenses = room.expenses || [];

    if (expenses.length === 0) {
      container.innerHTML = `
        <div class="liquid-glass-card rounded-[32px] p-8 text-center space-y-3 my-4">
          <div class="w-12 h-12 rounded-2xl bg-white/70 text-forest-dark flex items-center justify-center mx-auto shadow-sm">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
          <h3 class="text-base font-extrabold text-forest-dark">Операций пока нет</h3>
          <p class="text-xs text-forest-muted max-w-xs mx-auto">
            Нажмите «+ Добавить расход» внизу экрана, чтобы записать оплату или общий чек
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = expenses.map(e => {
      const splitsNames = e.splits?.map(s => s.participant_name).join(', ') || 'Все';
      const formattedDate = e.created_at ? new Date(e.created_at.replace(' ', 'T')).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short'
      }) : '';

      return `
        <div class="liquid-glass rounded-2xl p-4 flex items-center justify-between gap-3.5 transition group">
          <div class="flex items-center gap-3.5 flex-1 min-w-0">
            <div class="w-11 h-11 rounded-2xl bg-white/80 text-forest-dark flex items-center justify-center shrink-0 border border-white shadow-xs">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 17L17 7m0 0H7m10 0v10"/></svg>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-extrabold text-forest-dark text-sm truncate">${e.title}</span>
                ${formattedDate ? `<span class="text-[11px] text-forest-muted/70 font-semibold">${formattedDate}</span>` : ''}
              </div>
              <div class="text-xs text-forest-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Оплатил:</span>
                <span class="font-bold text-forest-dark">${e.payer_name}</span>
                <span class="text-forest-muted/40">•</span>
                <span class="text-[11px] text-forest-muted truncate">На ${e.splits?.length || 0} чел.</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 shrink-0">
            <div class="text-right">
              <div class="text-base font-black text-forest-dark tracking-tight">
                ${State.formatCurrency(e.amount, e.currency || room.base_currency)}
              </div>
            </div>

            <button class="btn-delete-expense w-8 h-8 rounded-xl flex items-center justify-center text-forest-muted/50 hover:text-rose-600 hover:bg-rose-50 transition" data-id="${e.id}" title="Удалить операцию">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-delete-expense').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const expenseId = btn.dataset.id;
        TMA.showConfirm('Вы действительно хотите удалить этот расход?', async (confirmed) => {
          if (confirmed) {
            try {
              await API.deleteExpense(room.slug, expenseId);
              TMA.haptic.notification('success');
              showToast('Расход удален');
              await this.loadRoom(room.slug);
            } catch (err) {
              showToast('Ошибка при удалении расхода');
            }
          }
        });
      });
    });
  },

  // --- ВКЛАДКА 2: БАЛАНС И ВЗАИМОРАСЧЕТЫ ---

  renderBalancesTab() {
    const room = State.currentRoom;
    const balances = State.balances;
    if (!room || !balances) return;

    const txContainer = document.getElementById('settlement-transactions-container');
    const txList = balances.transactions || [];

    if (txContainer) {
      if (txList.length === 0) {
        txContainer.innerHTML = `
          <div class="liquid-glass-card rounded-[28px] p-6 text-center text-forest-muted text-xs font-medium space-y-1">
            <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2 font-bold">✓</div>
            <div class="font-extrabold text-forest-dark text-sm">Все взаиморасчеты закрыты</div>
            <div>Балансы между всеми участниками равны нулю.</div>
          </div>
        `;
      } else {
        txContainer.innerHTML = txList.map((tx, idx) => {
          const reqs = tx.to_payment_details;

          return `
            <div class="liquid-glass-card rounded-3xl p-4 space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-sm font-extrabold">
                  <span class="text-rose-600">${tx.from}</span>
                  <span class="text-forest-muted/50">➔</span>
                  <span class="text-emerald-700">${tx.to}</span>
                </div>
                <div class="text-lg font-black text-forest-dark tracking-tight">
                  ${State.formatCurrency(tx.amount, room.base_currency)}
                </div>
              </div>

              ${reqs ? `
                <div class="bg-white/80 rounded-2xl p-3 flex items-center justify-between gap-2 border border-white shadow-xs">
                  <div class="text-xs truncate flex-1 min-w-0">
                    <span class="text-forest-muted font-medium">Реквизиты:</span>
                    <span class="font-bold text-forest-dark ml-1 selectable">${reqs}</span>
                  </div>
                  <button class="btn-copy-reqs px-3.5 py-2 btn-forest-glass rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0" data-reqs="${reqs}">
                    <span>Копировать</span>
                    <svg class="w-3.5 h-3.5 text-forest-dark" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                  </button>
                </div>
              ` : `
                <div class="text-xs text-forest-muted flex items-center justify-between pt-1 border-t border-forest-dark/5">
                  <span>Реквизиты не указаны</span>
                  <button class="text-forest-dark font-extrabold hover:underline btn-add-reqs-for" data-pid="${tx.to_id}">+ Добавить реквизиты</button>
                </div>
              `}
            </div>
          `;
        }).join('');

        txContainer.querySelectorAll('.btn-copy-reqs').forEach(btn => {
          btn.addEventListener('click', () => {
            const reqs = btn.dataset.reqs;
            copyToClipboard(reqs, 'Реквизиты скопированы!');
            const origHTML = btn.innerHTML;
            btn.innerHTML = `<span class="text-emerald-700 font-extrabold">✓ Скопировано</span>`;
            setTimeout(() => {
              btn.innerHTML = origHTML;
            }, 1500);
          });
        });

        txContainer.querySelectorAll('.btn-add-reqs-for').forEach(btn => {
          btn.addEventListener('click', () => {
            this.openParticipantsModal();
          });
        });
      }
    }

    const netContainer = document.getElementById('net-balances-container');
    const netList = balances.net_balances || [];

    if (netContainer) {
      netContainer.innerHTML = netList.map(item => {
        const bal = item.balance;
        let bgBadge = 'liquid-glass text-forest-muted';
        let prefix = '';

        if (bal > 0.005) {
          bgBadge = 'bg-emerald-100/90 text-emerald-800 border border-emerald-200';
          prefix = '+';
        } else if (bal < -0.005) {
          bgBadge = 'bg-rose-100/90 text-rose-800 border border-rose-200';
        }

        return `
          <div class="liquid-glass rounded-2xl p-3.5 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="w-2.5 h-2.5 rounded-full ${bal > 0 ? 'bg-emerald-600' : (bal < 0 ? 'bg-rose-500' : 'bg-slate-300')}"></span>
              <span class="text-sm font-extrabold text-forest-dark">${item.name}</span>
            </div>
            <span class="text-xs font-black px-3 py-1 rounded-full ${bgBadge}">
              ${prefix}${State.formatCurrency(bal, room.base_currency)}
            </span>
          </div>
        `;
      }).join('');
    }
  },

  // --- ФОРМИРОВАНИЕ ОТЧЕТА ДЛЯ ЧАТА TELEGRAM ---

  generateAndCopyChatReport() {
    const room = State.currentRoom;
    const balances = State.balances;
    if (!room || !balances) return;

    const totalStr = State.formatCurrency(room.total_spent || 0, room.base_currency);
    const txList = balances.transactions || [];

    let text = `🌲 Взаиморасчеты: ${room.title}\n`;
    text += `Всего потрачено: ${totalStr}\n\n`;

    if (txList.length === 0) {
      text += `🎉 Все взаиморасчеты закрыты! Долгов нет.\n\n`;
    } else {
      text += `Кто кому переводит:\n`;
      txList.forEach(tx => {
        const amountStr = State.formatCurrency(tx.amount, room.base_currency);
        const reqStr = tx.to_payment_details ? ` (Реквизиты: ${tx.to_payment_details})` : '';
        text += `• ${tx.from} ➔ ${tx.to}: ${amountStr}${reqStr}\n`;
      });
      text += `\n`;
    }

    const roomUrl = window.location.href;
    text += `Ссылка на сбор: ${roomUrl}\n`;
    text += `Рассчитано в «Квиты»`;

    copyToClipboard(text, 'Отчет для чата скопирован!');
  },

  // --- МОДАЛЬНОЕ ОКНО: ДОБАВЛЕНИЕ РАСХОДА ---

  openAddExpenseModal() {
    const room = State.currentRoom;
    if (!room) return;

    const modal = document.getElementById('modal-add-expense');
    const selectPayer = document.getElementById('expense-payer-select');
    const splitsContainer = document.getElementById('expense-splits-container');

    document.getElementById('expense-title').value = '';
    document.getElementById('expense-amount').value = '';

    selectPayer.innerHTML = room.participants.map(p => `
      <option value="${p.id}">${p.name}</option>
    `).join('');

    const tgName = TMA.getUserFirstName();
    if (tgName) {
      const match = room.participants.find(p => p.name.toLowerCase() === tgName.toLowerCase());
      if (match) {
        selectPayer.value = match.id;
      }
    }

    const updateSharePreview = () => {
      const amountVal = document.getElementById('expense-amount').value.trim().replace(',', '.');
      const amount = parseFloat(amountVal) || 0;
      const checked = splitsContainer.querySelectorAll('input[type="checkbox"]:checked');
      const count = checked.length;
      const previewEl = document.getElementById('expense-split-preview');

      if (count > 0 && amount > 0) {
        const perPerson = amount / count;
        previewEl.textContent = `По ${State.formatCurrency(perPerson, room.base_currency)} с каждого (${count} чел.)`;
      } else {
        previewEl.textContent = `Выбрано: ${count} чел.`;
      }
    };

    splitsContainer.innerHTML = `
      <div class="flex justify-between items-center mb-2.5">
        <span class="text-xs font-bold text-forest-muted" id="expense-split-preview">Все участники</span>
        <div class="flex gap-2.5">
          <button type="button" id="btn-split-all" class="text-xs font-black text-forest-dark hover:underline">Все</button>
          <button type="button" id="btn-split-none" class="text-xs font-semibold text-forest-muted/60 hover:text-forest-dark">Снять</button>
        </div>
      </div>
      <div class="space-y-1.5 max-h-44 overflow-y-auto pr-1">
        ${room.participants.map(p => `
          <label class="flex items-center justify-between p-3 rounded-2xl liquid-glass active:scale-[0.99] cursor-pointer transition">
            <span class="text-xs font-black text-forest-dark">${p.name}</span>
            <input type="checkbox" value="${p.id}" checked class="expense-split-checkbox w-5 h-5 rounded-lg text-forest-dark focus:ring-forest-dark bg-white border-forest-dark/20">
          </label>
        `).join('')}
      </div>
    `;

    document.getElementById('btn-split-all')?.addEventListener('click', () => {
      splitsContainer.querySelectorAll('.expense-split-checkbox').forEach(cb => cb.checked = true);
      updateSharePreview();
      TMA.haptic.impact('light');
    });

    document.getElementById('btn-split-none')?.addEventListener('click', () => {
      splitsContainer.querySelectorAll('.expense-split-checkbox').forEach(cb => cb.checked = false);
      updateSharePreview();
      TMA.haptic.impact('light');
    });

    splitsContainer.querySelectorAll('.expense-split-checkbox').forEach(cb => {
      cb.addEventListener('change', updateSharePreview);
    });

    document.getElementById('expense-amount')?.addEventListener('input', updateSharePreview);

    const submitBtn = document.getElementById('btn-save-expense');
    submitBtn.onclick = async () => {
      const title = document.getElementById('expense-title').value.trim();
      const amountVal = document.getElementById('expense-amount').value.trim().replace(',', '.');
      const amount = parseFloat(amountVal);
      const payerId = parseInt(selectPayer.value);
      const splitCheckboxes = splitsContainer.querySelectorAll('.expense-split-checkbox:checked');
      const splits = Array.from(splitCheckboxes).map(cb => parseInt(cb.value));

      if (!title) {
        showToast('Введите название расхода');
        return;
      }
      if (!amount || amount <= 0) {
        showToast('Введите корректную сумму расхода');
        return;
      }
      if (splits.length === 0) {
        showToast('Выберите хотя бы одного человека, на кого делить');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="animate-spin mr-2">⏳</span> Сохранение...';

      try {
        await API.addExpense(room.slug, {
          title,
          amount,
          payer_id: payerId,
          currency: room.base_currency,
          splits
        });

        TMA.haptic.notification('success');
        showToast('Расход успешно добавлен!');
        this.closeAllModals();
        await this.loadRoom(room.slug);
      } catch (err) {
        showToast(err.message || 'Ошибка сохранения');
        TMA.haptic.notification('error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Сохранить расход';
      }
    };

    this.openModal('modal-add-expense');
    setTimeout(() => {
      const input = document.getElementById('expense-amount');
      if (input && !document.getElementById('modal-add-expense').classList.contains('hidden')) {
        input.focus();
        input.select();
      }
    }, 220);
  },

  // --- МОДАЛЬНОЕ ОКНО: УЧАСТНИКИ И РЕКВИЗИТЫ ---

  openParticipantsModal() {
    const room = State.currentRoom;
    if (!room) return;

    const modal = document.getElementById('modal-participants');
    const container = document.getElementById('participants-manage-container');

    container.innerHTML = `
      <div class="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
        ${room.participants.map(p => `
          <div class="liquid-glass rounded-2xl p-3.5 space-y-2 border border-white/80">
            <div class="flex items-center justify-between px-0.5">
              <span class="text-sm font-extrabold text-forest-dark">${p.name}</span>
              <span class="text-[11px] font-semibold ${p.payment_details ? 'text-emerald-700 font-bold' : 'text-forest-muted/50'}">
                ${p.payment_details ? '✓ Указаны' : 'Не указаны'}
              </span>
            </div>
            <input type="text" data-pid="${p.id}" value="${p.payment_details || ''}" placeholder="Номер карты или телефон для СБП / ЕРИП" autocomplete="off"
              class="participant-req-input w-full liquid-glass-input rounded-xl px-3.5 py-2.5 text-sm font-medium text-forest-dark placeholder-forest-muted/40 focus:outline-none transition">
          </div>
        `).join('')}
      </div>

      <div class="pt-3 border-t border-forest-dark/10 space-y-3">
        <div>
          <label class="block text-xs font-bold text-forest-muted mb-1.5">Добавить нового участника</label>
          <div class="flex gap-2">
            <input type="text" id="new-participant-name" placeholder="Имя нового участника" autocomplete="off" enterkeyhint="done"
              class="flex-1 liquid-glass-input rounded-2xl px-4 py-3 text-sm font-medium text-forest-dark placeholder-forest-muted/50 focus:outline-none transition">
            <button type="button" id="btn-add-new-participant" class="px-5 py-3 btn-forest-primary rounded-2xl text-xs font-bold transition shrink-0">
              + Добавить
            </button>
          </div>
        </div>

        <button type="button" id="btn-save-all-participants" class="w-full py-4 btn-forest-primary rounded-2xl text-sm font-bold tracking-tight shadow-md flex items-center justify-center gap-2">
          <span>Сохранить реквизиты</span>
        </button>
      </div>
    `;

    // Сохранение реквизитов участников одной кнопкой
    const saveAllRequisites = async (closeOnComplete = true) => {
      const inputs = container.querySelectorAll('.participant-req-input');
      const savePromises = [];

      inputs.forEach(input => {
        const id = parseInt(input.dataset.pid);
        const val = input.value.trim();
        const participant = room.participants.find(p => p.id === id);
        if (participant && (participant.payment_details || '') !== val) {
          savePromises.push(API.saveParticipant(room.slug, { id, payment_details: val }));
        }
      });

      if (savePromises.length > 0) {
        const btn = document.getElementById('btn-save-all-participants');
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<span class="animate-spin mr-2">⏳</span> Сохранение...';
        }
        try {
          await Promise.all(savePromises);
          TMA.haptic.notification('success');
          showToast('Реквизиты сохранены');
          await this.loadRoom(room.slug);
        } catch (e) {
          showToast('Ошибка при сохранении реквизитов');
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>Сохранить реквизиты</span>';
          }
        }
      }

      if (closeOnComplete) {
        this.closeAllModals();
      }
    };

    document.getElementById('btn-save-all-participants')?.addEventListener('click', () => {
      saveAllRequisites(true);
    });

    // Сохранение при выходе из фокуса
    container.querySelectorAll('.participant-req-input').forEach(input => {
      input.addEventListener('change', () => {
        saveAllRequisites(false);
      });
    });

    // Добавление участника
    document.getElementById('btn-add-new-participant')?.addEventListener('click', async () => {
      const nameInput = document.getElementById('new-participant-name');
      const name = nameInput.value.trim();
      if (!name) {
        showToast('Введите имя участника');
        return;
      }

      try {
        await API.saveParticipant(room.slug, { name });
        TMA.haptic.notification('success');
        showToast(`Участник ${name} добавлен`);
        nameInput.value = '';
        await this.loadRoom(room.slug);
        this.openParticipantsModal();
      } catch (err) {
        showToast('Ошибка добавления участника');
      }
    });

    this.openModal('modal-participants');
  },

  shareRoom() {
    const room = State.currentRoom;
    if (!room) return;

    const url = window.location.href;
    const title = `Квиты: ${room.title}`;
    const text = `Поделили траты на ${room.title}. Посмотри расчет и чеки:`;

    if (navigator.share) {
      navigator.share({
        title,
        text,
        url
      }).catch(() => {});
    } else {
      copyToClipboard(url, 'Ссылка на сбор скопирована!');
    }
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    TMA.showBackButton(() => this.closeAllModals());
  },

  closeAllModals() {
    document.querySelectorAll('.app-modal').forEach(m => m.classList.add('hidden'));
    document.body.classList.remove('modal-open');
    const slug = getSlugFromUrl();
    if (slug) {
      TMA.showBackButton(() => navigateHome());
    } else {
      TMA.hideBackButton();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
