<?php

// Автозагрузчик классов в пространстве имен App\ -> src/
spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $baseDir = dirname(__DIR__) . '/src/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require_once $file;
    }
});

use App\Core\Request;
use App\Core\Response;
use App\Core\Router;
use App\Controllers\RoomController;
use App\Controllers\ParticipantController;
use App\Controllers\ExpenseController;
use App\Controllers\BalanceController;

$request = new Request();
$uri = $request->getUri();

// Если запрос не к API — отдаем статические файлы или SPA index.html
if (!str_starts_with($uri, '/api')) {
    $filePath = __DIR__ . $uri;
    if ($uri !== '/' && file_exists($filePath) && !is_dir($filePath)) {
        return false; // Встроенный PHP сервер отдаст статический файл с правильным MIME
    }
    // Для всех остальных маршрутов отдаем SPA HTML
    require __DIR__ . '/index.html';
    exit;
}

$router = new Router();

// Регистрация маршрутов API
$router->post('/api/rooms', [RoomController::class, 'create']);
$router->get('/api/rooms/{slug}', [RoomController::class, 'show']);
$router->post('/api/rooms/{slug}/participants', [ParticipantController::class, 'storeOrUpdate']);
$router->post('/api/rooms/{slug}/expenses', [ExpenseController::class, 'store']);
$router->delete('/api/rooms/{slug}/expenses/{id}', [ExpenseController::class, 'destroy']);
$router->get('/api/rooms/{slug}/balances', [BalanceController::class, 'calculate']);

// Диспетчеризация
try {
    $router->dispatch($request);
} catch (Throwable $e) {
    Response::error("Внутренняя ошибка сервера: " . $e->getMessage(), 500);
}
