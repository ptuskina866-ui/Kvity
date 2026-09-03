<?php

require_once __DIR__ . '/../src/Services/MinCashFlowService.php';

use App\Services\MinCashFlowService;

echo "=== ТЕСТ 1: Классический пример из 3 участников ===\n";
// Андрей заплатил 300 за всех троих (Андрей, Борис, Света) -> по 100 на каждого
// Борис заплатил 150 за себя и Свету -> по 75 на каждого
// Света ничего не платила.
// Ожидаемый баланс:
// Андрей: +300 - 100 = +200
// Борис: +150 - 100 - 75 = -25
// Света: 0 - 100 - 75 = -175
// Взаиморасчеты:
// Света должна Андрею 175
// Борис должен Андрею 25

$participants = [
    ['id' => 1, 'name' => 'Андрей', 'payment_details' => '+7 999 111-11-11 (Тинькофф)'],
    ['id' => 2, 'name' => 'Борис', 'payment_details' => '+7 999 222-22-22 (Сбер)'],
    ['id' => 3, 'name' => 'Света', 'payment_details' => null]
];

$expenses = [
    [
        'id' => 1,
        'payer_id' => 1,
        'amount' => 300.0,
        'splits' => [
            ['participant_id' => 1, 'share_amount' => 100.0],
            ['participant_id' => 2, 'share_amount' => 100.0],
            ['participant_id' => 3, 'share_amount' => 100.0]
        ]
    ],
    [
        'id' => 2,
        'payer_id' => 2,
        'amount' => 150.0,
        'splits' => [
            ['participant_id' => 2, 'share_amount' => 75.0],
            ['participant_id' => 3, 'share_amount' => 75.0]
        ]
    ]
];

$service = new MinCashFlowService();
$res = $service->calculate($participants, $expenses);

echo "Транзакции:\n";
foreach ($res['transactions'] as $tx) {
    echo "  - {$tx['from']} ➔ {$tx['to']}: {$tx['amount']} руб. (реквизиты: {$tx['to_payment_details']})\n";
}

echo "Балансы:\n";
foreach ($res['net_balances'] as $nb) {
    echo "  - {$nb['name']}: {$nb['balance']} руб.\n";
}

assert(count($res['transactions']) === 2, "Должно быть ровно 2 транзакции");
assert($res['transactions'][0]['from'] === 'Света' && $res['transactions'][0]['to'] === 'Андрей' && $res['transactions'][0]['amount'] == 175.0, "Света -> Андрей 175");
assert($res['transactions'][1]['from'] === 'Борис' && $res['transactions'][1]['to'] === 'Андрей' && $res['transactions'][1]['amount'] == 25.0, "Борис -> Андрей 25");

echo "\n=== ТЕСТ 2: Нечетное деление копеек (100 руб на 3) ===\n";
// Деление 100 на 3 -> 33.34, 33.33, 33.33
$p2 = [
    ['id' => 1, 'name' => 'Иван', 'payment_details' => null],
    ['id' => 2, 'name' => 'Ольга', 'payment_details' => null],
    ['id' => 3, 'name' => 'Дмитрий', 'payment_details' => null]
];
$e2 = [
    [
        'id' => 1,
        'payer_id' => 1,
        'amount' => 100.0,
        'splits' => [
            ['participant_id' => 1, 'share_amount' => 33.34],
            ['participant_id' => 2, 'share_amount' => 33.33],
            ['participant_id' => 3, 'share_amount' => 33.33]
        ]
    ]
];
$res2 = $service->calculate($p2, $e2);
foreach ($res2['transactions'] as $tx) {
    echo "  - {$tx['from']} ➔ {$tx['to']}: {$tx['amount']} руб.\n";
}

echo "\nВсе тесты алгоритма успешно пройдены!\n";
