<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Models\Room;
use App\Models\Participant;
use App\Models\Expense;
use Exception;

class ExpenseController
{
    public function store(Request $request, array $params): void
    {
        $slug = $params['slug'] ?? '';
        $room = Room::findBySlug($slug);

        if (!$room) {
            Response::error("Сбор не найден", 404);
        }

        $title = trim($request->get('title', ''));
        $amount = (float)$request->get('amount', 0);
        $payerId = (int)$request->get('payer_id', 0);
        $currency = $request->get('currency') ?: $room['base_currency'];
        $splits = $request->get('splits') ?: $request->get('split_participant_ids');

        if (empty($title)) {
            Response::error("Название расхода обязательно", 422);
        }

        if ($amount <= 0) {
            Response::error("Сумма расхода должна быть больше нуля", 422);
        }

        $payer = Participant::findById($payerId);
        if (!$payer || (int)$payer['room_id'] !== (int)$room['id']) {
            Response::error("Выбранный плательщик не принадлежит этому сбору", 422);
        }

        if (empty($splits) || !is_array($splits)) {
            Response::error("Необходимо выбрать участников для деления расхода", 422);
        }

        // Проверяем, что все указанные участники сплита принадлежат комнате
        $roomParticipants = Participant::getByRoomId((int)$room['id']);
        $validParticipantIds = array_column($roomParticipants, 'id');

        $cleanedSplits = [];
        foreach ($splits as $splitId) {
            $sId = (int)$splitId;
            if (in_array($sId, $validParticipantIds, true)) {
                $cleanedSplits[] = $sId;
            }
        }

        if (empty($cleanedSplits)) {
            Response::error("Не выбрано ни одного корректного участника для деления", 422);
        }

        try {
            $expense = Expense::create(
                (int)$room['id'],
                $payerId,
                $title,
                $amount,
                $currency,
                $cleanedSplits
            );

            Response::success($expense, 201);
        } catch (Exception $e) {
            Response::error("Ошибка при сохранении расхода: " . $e->getMessage(), 500);
        }
    }

    public function destroy(Request $request, array $params): void
    {
        $slug = $params['slug'] ?? '';
        $expenseId = (int)($params['id'] ?? 0);

        $room = Room::findBySlug($slug);
        if (!$room) {
            Response::error("Сбор не найден", 404);
        }

        $deleted = Expense::delete($expenseId, (int)$room['id']);
        if (!$deleted) {
            Response::error("Расход не найден или уже удален", 404);
        }

        Response::success(['message' => 'Расход успешно удален']);
    }
}
