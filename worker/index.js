/**
 * Cloudflare Worker REST API для сервиса «Квиты»
 * База данных: Cloudflare D1 (нативный serverless SQLite)
 * Статика: Cloudflare Workers Static Assets (папка public/)
 */

const NANOID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_~';

function generateNanoid(size = 11) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  let result = '';
  for (let i = 0; i < size; i++) {
    result += NANOID_ALPHABET[bytes[i] % NANOID_ALPHABET.length];
  }
  return result;
}

// D1 DDL Схема
const D1_SCHEMA = `
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug VARCHAR(16) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    base_currency VARCHAR(10) NOT NULL DEFAULT 'RUB',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    telegram_id BIGINT NULL,
    payment_details VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    payer_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (payer_id) REFERENCES participants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expense_splits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL,
    participant_id INTEGER NOT NULL,
    share_amount DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
);
`;

let schemaInitialized = false;
async function ensureSchema(db) {
  if (schemaInitialized || !db) return;
  try {
    const statements = D1_SCHEMA.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    for (const sql of statements) {
      await db.prepare(sql).run();
    }
    schemaInitialized = true;
  } catch (e) {
    console.error('Ошибка инициализации схемы D1:', e);
  }
}

// Алгоритм Min Cash Flow на JavaScript
function calculateMinCashFlow(participants, expenses) {
  const netBalances = {};
  const participantMap = {};
  let totalSpent = 0.0;

  for (const p of participants) {
    const id = Number(p.id);
    netBalances[id] = 0.0;
    participantMap[id] = {
      id,
      name: p.name,
      payment_details: p.payment_details || null,
      telegram_id: p.telegram_id || null
    };
  }

  for (const expense of expenses) {
    const amount = Number(expense.amount);
    totalSpent += amount;
    const payerId = Number(expense.payer_id);

    if (netBalances[payerId] !== undefined) {
      netBalances[payerId] += amount;
    }

    if (Array.isArray(expense.splits)) {
      for (const split of expense.splits) {
        const splitId = Number(split.participant_id);
        const share = Number(split.share_amount);
        if (netBalances[splitId] !== undefined) {
          netBalances[splitId] -= share;
        }
      }
    }
  }

  const formattedBalances = [];
  const debtors = [];
  const creditors = [];

  for (const [idStr, balance] of Object.entries(netBalances)) {
    const id = Number(idStr);
    const rounded = Math.round(balance * 100) / 100;
    formattedBalances.push({
      participant_id: id,
      name: participantMap[id].name,
      balance: rounded,
      payment_details: participantMap[id].payment_details
    });

    if (rounded < -0.005) {
      debtors.push({ id, amount: Math.abs(rounded) });
    } else if (rounded > 0.005) {
      creditors.push({ id, amount: rounded });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const settleAmount = Math.round(Math.min(debtor.amount, creditor.amount) * 100) / 100;

    if (settleAmount > 0.005) {
      const debtorInfo = participantMap[debtor.id];
      const creditorInfo = participantMap[creditor.id];

      transactions.push({
        from: debtorInfo.name,
        from_id: debtorInfo.id,
        to: creditorInfo.name,
        to_id: creditorInfo.id,
        amount: settleAmount,
        to_payment_details: creditorInfo.payment_details
      });

      debtor.amount = Math.round((debtor.amount - settleAmount) * 100) / 100;
      creditor.amount = Math.round((creditor.amount - settleAmount) * 100) / 100;
    }

    if (debtor.amount <= 0.005) dIdx++;
    if (creditor.amount <= 0.005) cIdx++;
  }

  return {
    transactions,
    net_balances: formattedBalances,
    total_spent: Math.round(totalSpent * 100) / 100
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    }
  });
}

function successResponse(data, status = 200) {
  return jsonResponse({ success: true, data }, status);
}

function errorResponse(error, status = 400) {
  return jsonResponse({ success: false, error }, status);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    // CORS Preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
        }
      });
    }

    // Если запрос к статике (не /api/*) — отдаем статику через Cloudflare Assets
    if (!url.pathname.startsWith('/api')) {
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
      return new Response('Not Found', { status: 404 });
    }

    // Инициализация базы данных Cloudflare D1
    const db = env.DB;
    if (!db) {
      return errorResponse('База данных D1 не подключена в wrangler конфиге', 500);
    }
    await ensureSchema(db);

    const path = url.pathname.replace(/^\/api/, '');

    try {
      // 1. POST /api/rooms — Создать сбор
      if (method === 'POST' && path === '/rooms') {
        const body = await request.json().catch(() => ({}));
        const title = (body.title || '').trim();
        const baseCurrency = (body.base_currency || 'RUB').toUpperCase();
        const participantsInput = body.participants || [];

        if (!title) {
          return errorResponse('Название сбора обязательно', 422);
        }

        const slug = generateNanoid(11);
        const roomInsert = await db.prepare(
          'INSERT INTO rooms (slug, title, base_currency) VALUES (?, ?, ?)'
        ).bind(slug, title, baseCurrency).run();

        const roomId = roomInsert.meta.last_row_id;
        const createdParticipants = [];

        for (const pItem of participantsInput) {
          const name = typeof pItem === 'string' ? pItem.trim() : (pItem.name || '').trim();
          const paymentDetails = typeof pItem === 'object' ? (pItem.payment_details || null) : null;
          const tgId = typeof pItem === 'object' ? (pItem.telegram_id || null) : null;

          if (name) {
            const pInsert = await db.prepare(
              'INSERT INTO participants (room_id, name, payment_details, telegram_id) VALUES (?, ?, ?, ?)'
            ).bind(roomId, name, paymentDetails, tgId).run();

            createdParticipants.push({
              id: pInsert.meta.last_row_id,
              room_id: roomId,
              name,
              payment_details: paymentDetails,
              telegram_id: tgId
            });
          }
        }

        return successResponse({
          id: roomId,
          slug,
          title,
          base_currency: baseCurrency,
          participants: createdParticipants,
          expenses: []
        }, 201);
      }

      // 2. GET /api/rooms/:slug — Получить данные комнаты
      const matchRoom = path.match(/^\/rooms\/([a-zA-Z0-9_-]+)$/);
      if (method === 'GET' && matchRoom) {
        const slug = matchRoom[1];
        const room = await db.prepare('SELECT * FROM rooms WHERE slug = ?').bind(slug).first();

        if (!room) {
          return errorResponse('Сбор не найден', 404);
        }

        const participants = (await db.prepare(
          'SELECT * FROM participants WHERE room_id = ? ORDER BY id ASC'
        ).bind(room.id).all()).results || [];

        const expenses = (await db.prepare(`
          SELECT e.*, p.name as payer_name
          FROM expenses e
          JOIN participants p ON e.payer_id = p.id
          WHERE e.room_id = ?
          ORDER BY e.created_at DESC, e.id DESC
        `).bind(room.id).all()).results || [];

        let totalSpent = 0;
        for (const e of expenses) {
          const splits = (await db.prepare(`
            SELECT s.*, p.name as participant_name
            FROM expense_splits s
            JOIN participants p ON s.participant_id = p.id
            WHERE s.expense_id = ?
            ORDER BY s.id ASC
          `).bind(e.id).all()).results || [];
          e.splits = splits;
          totalSpent += Number(e.amount);
        }

        return successResponse({
          ...room,
          participants,
          expenses,
          total_spent: Math.round(totalSpent * 100) / 100
        });
      }

      // 3. POST /api/rooms/:slug/participants — Добавить/обновить участника
      const matchParticipants = path.match(/^\/rooms\/([a-zA-Z0-9_-]+)\/participants$/);
      if (method === 'POST' && matchParticipants) {
        const slug = matchParticipants[1];
        const room = await db.prepare('SELECT * FROM rooms WHERE slug = ?').bind(slug).first();
        if (!room) return errorResponse('Сбор не найден', 404);

        const body = await request.json().catch(() => ({}));
        const id = body.id;
        const name = (body.name || '').trim();
        const paymentDetails = body.payment_details !== undefined ? (body.payment_details || '').trim() : null;

        if (id) {
          if (name && paymentDetails !== null) {
            await db.prepare('UPDATE participants SET name = ?, payment_details = ? WHERE id = ? AND room_id = ?')
              .bind(name, paymentDetails, id, room.id).run();
          } else if (paymentDetails !== null) {
            await db.prepare('UPDATE participants SET payment_details = ? WHERE id = ? AND room_id = ?')
              .bind(paymentDetails, id, room.id).run();
          } else if (name) {
            await db.prepare('UPDATE participants SET name = ? WHERE id = ? AND room_id = ?')
              .bind(name, id, room.id).run();
          }
          const updated = await db.prepare('SELECT * FROM participants WHERE id = ?').bind(id).first();
          return successResponse(updated);
        }

        if (!name) return errorResponse('Имя участника обязательно', 422);

        const ins = await db.prepare(
          'INSERT INTO participants (room_id, name, payment_details) VALUES (?, ?, ?)'
        ).bind(room.id, name, paymentDetails).run();

        const created = await db.prepare('SELECT * FROM participants WHERE id = ?').bind(ins.meta.last_row_id).first();
        return successResponse(created, 201);
      }

      // 4. POST /api/rooms/:slug/expenses — Добавить расход
      const matchExpenseAdd = path.match(/^\/rooms\/([a-zA-Z0-9_-]+)\/expenses$/);
      if (method === 'POST' && matchExpenseAdd) {
        const slug = matchExpenseAdd[1];
        const room = await db.prepare('SELECT * FROM rooms WHERE slug = ?').bind(slug).first();
        if (!room) return errorResponse('Сбор не найден', 404);

        const body = await request.json().catch(() => ({}));
        const title = (body.title || '').trim();
        const amount = Number(body.amount);
        const payerId = Number(body.payer_id);
        const currency = body.currency || room.base_currency;
        const splits = body.splits || body.split_participant_ids || [];

        if (!title) return errorResponse('Название расхода обязательно', 422);
        if (!amount || amount <= 0) return errorResponse('Сумма должна быть больше нуля', 422);
        if (!splits.length) return errorResponse('Выберите участников сплита', 422);

        const expInsert = await db.prepare(
          'INSERT INTO expenses (room_id, payer_id, title, amount, currency) VALUES (?, ?, ?, ?, ?)'
        ).bind(room.id, payerId, title, amount, currency).run();

        const expenseId = expInsert.meta.last_row_id;
        const numSplits = splits.length;
        const totalCents = Math.round(amount * 100);
        const baseCents = Math.floor(totalCents / numSplits);
        const remainderCents = totalCents % numSplits;

        const createdSplits = [];
        for (let i = 0; i < numSplits; i++) {
          const pId = Number(splits[i]);
          const cents = baseCents + (i < remainderCents ? 1 : 0);
          const shareAmount = cents / 100;

          const sInsert = await db.prepare(
            'INSERT INTO expense_splits (expense_id, participant_id, share_amount) VALUES (?, ?, ?)'
          ).bind(expenseId, pId, shareAmount).run();

          createdSplits.push({
            id: sInsert.meta.last_row_id,
            expense_id: expenseId,
            participant_id: pId,
            share_amount: shareAmount
          });
        }

        return successResponse({
          id: expenseId,
          room_id: room.id,
          payer_id: payerId,
          title,
          amount,
          currency,
          splits: createdSplits
        }, 201);
      }

      // 5. DELETE /api/rooms/:slug/expenses/:id — Удалить расход
      const matchExpenseDel = path.match(/^\/rooms\/([a-zA-Z0-9_-]+)\/expenses\/([0-9]+)$/);
      if (method === 'DELETE' && matchExpenseDel) {
        const slug = matchExpenseDel[1];
        const expenseId = Number(matchExpenseDel[2]);
        const room = await db.prepare('SELECT * FROM rooms WHERE slug = ?').bind(slug).first();
        if (!room) return errorResponse('Сбор не найден', 404);

        await db.prepare('DELETE FROM expenses WHERE id = ? AND room_id = ?').bind(expenseId, room.id).run();
        return successResponse({ message: 'Расход успешно удален' });
      }

      // 6. GET /api/rooms/:slug/balances — Расчет взаиморасчетов (Min Cash Flow)
      const matchBalances = path.match(/^\/rooms\/([a-zA-Z0-9_-]+)\/balances$/);
      if (method === 'GET' && matchBalances) {
        const slug = matchBalances[1];
        const room = await db.prepare('SELECT * FROM rooms WHERE slug = ?').bind(slug).first();
        if (!room) return errorResponse('Сбор не найден', 404);

        const participants = (await db.prepare('SELECT * FROM participants WHERE room_id = ?').bind(room.id).all()).results || [];
        const expenses = (await db.prepare('SELECT * FROM expenses WHERE room_id = ?').bind(room.id).all()).results || [];

        for (const e of expenses) {
          const splits = (await db.prepare('SELECT * FROM expense_splits WHERE expense_id = ?').bind(e.id).all()).results || [];
          e.splits = splits;
        }

        const result = calculateMinCashFlow(participants, expenses);
        result.room = {
          id: room.id,
          slug: room.slug,
          title: room.title,
          base_currency: room.base_currency
        };

        return successResponse(result);
      }

      return errorResponse(`Маршрут не найден: ${method} ${path}`, 404);
    } catch (err) {
      console.error('Worker API error:', err);
      return errorResponse(`Ошибка сервера: ${err.message}`, 500);
    }
  }
};
