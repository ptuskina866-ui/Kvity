<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Models\Room;
use App\Models\Participant;
use App\Models\Expense;
use App\Services\NanoidService;

class RoomController
{
    private const ALLOWED_CURRENCIES = ['BYN', 'RUB', 'USD', 'EUR', 'KZT'];

    public function create(Request $request): void
    {
        $title = trim($request->get('title', ''));
        $baseCurrency = strtoupper(trim($request->get('base_currency', 'RUB')));
        $participantsInput = $request->get('participants', []);

        if (empty($title)) {
            Response::error("Название сбора (комнаты) обязательно для заполнения", 422);
        }

        if (!in_array($baseCurrency, self::ALLOWED_CURRENCIES, true)) {
            $baseCurrency = 'RUB';
        }

        // Генерируем уникальный неперебираемый slug
        $slug = NanoidService::generate(11);

        $room = Room::create($slug, $title, $baseCurrency);

        // Создаем участников, если переданы
        $createdParticipants = [];
        if (is_array($participantsInput)) {
            foreach ($participantsInput as $pItem) {
                $name = is_array($pItem) ? ($pItem['name'] ?? '') : (string)$pItem;
                $paymentDetails = is_array($pItem) ? ($pItem['payment_details'] ?? null) : null;
                $telegramId = is_array($pItem) ? ($pItem['telegram_id'] ?? null) : null;

                if (trim($name) !== '') {
                    $createdParticipants[] = Participant::create(
                        $room['id'],
                        $name,
                        $paymentDetails,
                        $telegramId ? (int)$telegramId : null
                    );
                }
            }
        }

        $room['participants'] = $createdParticipants;
        $room['expenses'] = [];

        Response::success($room, 201);
    }

    public function show(Request $request, array $params): void
    {
        $slug = $params['slug'] ?? '';
        $room = Room::findBySlug($slug);

        if (!$room) {
            Response::error("Сбор не найден", 404);
        }

        $roomId = (int)$room['id'];
        $participants = Participant::getByRoomId($roomId);
        $expenses = Expense::getByRoomId($roomId);

        $totalSpent = 0.0;
        foreach ($expenses as $e) {
            $totalSpent += (float)$e['amount'];
        }

        $room['participants'] = $participants;
        $room['expenses'] = $expenses;
        $room['total_spent'] = round($totalSpent, 2);

        Response::success($room);
    }
}
