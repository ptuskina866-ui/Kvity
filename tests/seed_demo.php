<?php

spl_autoload_register(function ($c) {
    $prefix = 'App\\';
    $baseDir = __DIR__ . '/../src/';
    if (strncmp($prefix, $c, strlen($prefix)) !== 0) return;
    $file = $baseDir . str_replace('\\', '/', substr($c, strlen($prefix))) . '.php';
    if (file_exists($file)) require_once $file;
});

use App\Models\Room;
use App\Models\Participant;
use App\Models\Expense;
use App\Services\NanoidService;

$slug = NanoidService::generate(11);
$room = Room::create($slug, 'Поездка на озеро и дачу', 'RUB');

$p1 = Participant::create($room['id'], 'Андрей', '+7 999 123-45-67 (СБП Т-Банк)');
$p2 = Participant::create($room['id'], 'Борис', '2200 7001 8923 4512');
$p3 = Participant::create($room['id'], 'Света', '+375 29 123-45-67 (ЕРИП)');
$p4 = Participant::create($room['id'], 'Даша');

Expense::create($room['id'], $p1['id'], 'Шашлыки, овощи и напитки', 5400, 'RUB', [$p1['id'], $p2['id'], $p3['id'], $p4['id']]);
Expense::create($room['id'], $p2['id'], 'Аренда лодки и снаряжения', 2800, 'RUB', [$p1['id'], $p2['id'], $p3['id']]);
Expense::create($room['id'], $p3['id'], 'Угли, дрова и снеки', 1200, 'RUB', [$p1['id'], $p2['id'], $p3['id'], $p4['id']]);

echo "DEMO_SLUG:" . $slug . "\n";
