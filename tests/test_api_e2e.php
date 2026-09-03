<?php

function apiRequest($url, $method = 'GET', $data = null) {
    $options = [
        'http' => [
            'method' => $method,
            'header' => "Content-Type: application/json\r\nAccept: application/json\r\n",
            'ignore_errors' => true
        ]
    ];
    if ($data !== null) {
        $options['http']['content'] = json_encode($data);
    }
    $context = stream_context_create($options);
    $response = file_get_contents($url, false, $context);
    return json_decode($response, true);
}

$baseUrl = 'http://127.0.0.1:8000';

echo "1. Проверка отдачи статики (index.html, manifest.json)...\n";
$html = file_get_contents($baseUrl . '/');
assert(str_contains($html, 'Квиты'), "index.html должен содержать 'Квиты'");
$manifest = file_get_contents($baseUrl . '/manifest.json');
assert(str_contains($manifest, 'Квиты'), "manifest.json должен содержать 'Квиты'");
echo "   ✓ Статика отдается корректно\n";

echo "2. Создание сбора (POST /api/rooms)...\n";
$createRes = apiRequest($baseUrl . '/api/rooms', 'POST', [
    'title' => 'Поездка в горы',
    'base_currency' => 'RUB',
    'participants' => ['Андрей', 'Борис', 'Света']
]);
assert($createRes['success'] === true, "Успешное создание комнаты");
$slug = $createRes['data']['slug'];
$participants = $createRes['data']['participants'];
echo "   ✓ Комната создана. Slug: $slug, Участников: " . count($participants) . "\n";

$andrey = $participants[0];
$boris = $participants[1];
$sveta = $participants[2];

echo "3. Обновление реквизитов Андрея (POST /api/rooms/{slug}/participants)...\n";
$updRes = apiRequest($baseUrl . "/api/rooms/$slug/participants", 'POST', [
    'id' => $andrey['id'],
    'payment_details' => '+7 999 123-45-67 (СБП Т-Банк)'
]);
assert($updRes['success'] === true, "Успешное сохранение реквизитов");
assert($updRes['data']['payment_details'] === '+7 999 123-45-67 (СБП Т-Банк)');
echo "   ✓ Реквизиты сохранены: {$updRes['data']['payment_details']}\n";

echo "4. Добавление расхода (POST /api/rooms/{slug}/expenses)...\n";
// Андрей заплатил 3000 за троих (по 1000 на каждого)
$expRes = apiRequest($baseUrl . "/api/rooms/$slug/expenses", 'POST', [
    'title' => 'Отель и ужин',
    'amount' => 3000,
    'payer_id' => $andrey['id'],
    'currency' => 'RUB',
    'splits' => [$andrey['id'], $boris['id'], $sveta['id']]
]);
assert($expRes['success'] === true, "Успешное добавление расхода");
$expenseId = $expRes['data']['id'];
echo "   ✓ Расход добавлен: {$expRes['data']['title']}, сумма: {$expRes['data']['amount']} руб.\n";

echo "5. Расчет балансов и долгов (GET /api/rooms/{slug}/balances)...\n";
$balRes = apiRequest($baseUrl . "/api/rooms/$slug/balances");
assert($balRes['success'] === true, "Успешное получение балансов");
$txs = $balRes['data']['transactions'];
echo "   ✓ Транзакции взаиморасчетов:\n";
foreach ($txs as $tx) {
    echo "     • {$tx['from']} ➔ {$tx['to']}: {$tx['amount']} руб. (Реквизиты: {$tx['to_payment_details']})\n";
}
assert(count($txs) === 2, "Должно быть 2 перевода Андрею от Бориса и Светы");

echo "6. Загрузка полных данных комнаты (GET /api/rooms/{slug})...\n";
$roomRes = apiRequest($baseUrl . "/api/rooms/$slug");
assert($roomRes['success'] === true, "Успешное получение комнаты");
assert($roomRes['data']['total_spent'] == 3000.0, "Общая сумма трат 3000");
assert(count($roomRes['data']['expenses']) === 1, "Один расход");
echo "   ✓ Комната получена: Всего потрачено: {$roomRes['data']['total_spent']} руб.\n";

echo "7. Удаление расхода (DELETE /api/rooms/{slug}/expenses/{id})...\n";
$delRes = apiRequest($baseUrl . "/api/rooms/$slug/expenses/$expenseId", 'DELETE');
assert($delRes['success'] === true, "Успешное удаление");
$roomAfterDel = apiRequest($baseUrl . "/api/rooms/$slug");
assert(count($roomAfterDel['data']['expenses']) === 0, "Расходов стало 0");
echo "   ✓ Расход удален. Осталось трат: " . count($roomAfterDel['data']['expenses']) . "\n";

echo "\n ПОЛНЫЙ E2E ТЕСТ API УСПЕШНО ПРОЙДЕН!\n";
