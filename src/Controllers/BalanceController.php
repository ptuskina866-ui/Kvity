<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Models\Room;
use App\Models\Participant;
use App\Models\Expense;
use App\Services\MinCashFlowService;

class BalanceController
{
    public function calculate(Request $request, array $params): void
    {
        $slug = $params['slug'] ?? '';
        $room = Room::findBySlug($slug);

        if (!$room) {
            Response::error("Сбор не найден", 404);
        }

        $roomId = (int)$room['id'];
        $participants = Participant::getByRoomId($roomId);
        $expenses = Expense::getByRoomId($roomId);

        $service = new MinCashFlowService();
        $result = $service->calculate($participants, $expenses);

        $result['room'] = [
            'id' => $room['id'],
            'slug' => $room['slug'],
            'title' => $room['title'],
            'base_currency' => $room['base_currency'],
        ];

        Response::success($result);
    }
}
