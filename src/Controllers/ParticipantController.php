<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Models\Room;
use App\Models\Participant;

class ParticipantController
{
    public function storeOrUpdate(Request $request, array $params): void
    {
        $slug = $params['slug'] ?? '';
        $room = Room::findBySlug($slug);

        if (!$room) {
            Response::error("Сбор не найден", 404);
        }

        $id = $request->get('id');
        $name = $request->get('name');
        $paymentDetails = $request->get('payment_details');
        $telegramId = $request->get('telegram_id');

        // Если передан ID — обновляем существующего участника
        if (!empty($id)) {
            $participant = Participant::findById((int)$id);
            if (!$participant || (int)$participant['room_id'] !== (int)$room['id']) {
                Response::error("Участник не найден в данном сборе", 404);
            }

            Participant::update((int)$id, $name, $paymentDetails);
            $updated = Participant::findById((int)$id);
            Response::success($updated);
        }

        // Иначе создаем нового участника
        if (empty($name) || trim($name) === '') {
            Response::error("Имя участника обязательно", 422);
        }

        $created = Participant::create(
            (int)$room['id'],
            $name,
            $paymentDetails,
            $telegramId ? (int)$telegramId : null
        );

        Response::success($created, 201);
    }
}
