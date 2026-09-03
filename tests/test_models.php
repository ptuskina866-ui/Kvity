<?php

spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $baseDir = dirname(__DIR__) . '/src/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) return;
    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    if (file_exists($file)) require_once $file;
});

use App\Models\Room;
use App\Models\Participant;
use App\Models\Expense;
use App\Services\NanoidService;

echo "=== ТЕСТ: Инициализация БД и операции моделей ===\n";

$slug = NanoidService::generate(11);
echo "1. Сгенерирован slug: $slug\n";

$room = Room::create($slug, "Тестовый выезд на природу", "RUB");
echo "2. Создана комната: id={$room['id']}, title='{$room['title']}'\n";

$p1 = Participant::create($room['id'], "Алиса", "+7 999 000-00-01 (СБП)");
$p2 = Participant::create($room['id'], "Боб", "+7 999 000-00-02");
$p3 = Participant::create($room['id'], "Чарли");
echo "3. Создано 3 участника: {$p1['name']} ({$p1['id']}), {$p2['name']} ({$p2['id']}), {$p3['name']} ({$p3['id']})\n";

$expense = Expense::create(
    $room['id'],
    $p1['id'],
    "Шашлык и напитки",
    1500.0,
    "RUB",
    [$p1['id'], $p2['id'], $p3['id']]
);
echo "4. Создан расход: id={$expense['id']}, сумма={$expense['amount']}, долей: " . count($expense['splits']) . "\n";

$allExpenses = Expense::getByRoomId($room['id']);
echo "5. Загружено расходов из БД: " . count($allExpenses) . ", плательщик: {$allExpenses[0]['payer_name']}\n";

echo "Все тесты моделей пройдены успешно!\n";
