<?php

namespace App\Models;

use App\Database;
use PDO;
use Exception;

class Expense
{
    public static function getByRoomId(int $roomId): array
    {
        $db = Database::getConnection();

        // 1. Получаем все расходы с именем плательщика
        $stmt = $db->prepare("
            SELECT e.*, p.name as payer_name
            FROM expenses e
            JOIN participants p ON e.payer_id = p.id
            WHERE e.room_id = :room_id
            ORDER BY e.created_at DESC, e.id DESC
        ");
        $stmt->execute(['room_id' => $roomId]);
        $expenses = $stmt->fetchAll();

        if (empty($expenses)) {
            return [];
        }

        // 2. Получаем сплиты (доли) для этих расходов
        $expenseIds = array_column($expenses, 'id');
        $placeholders = implode(',', array_fill(0, count($expenseIds), '?'));

        $stmtSplits = $db->prepare("
            SELECT s.*, p.name as participant_name
            FROM expense_splits s
            JOIN participants p ON s.participant_id = p.id
            WHERE s.expense_id IN ($placeholders)
            ORDER BY s.id ASC
        ");
        $stmtSplits->execute($expenseIds);
        $allSplits = $stmtSplits->fetchAll();

        // Группируем сплиты по expense_id
        $splitsByExpense = [];
        foreach ($allSplits as $split) {
            $splitsByExpense[$split['expense_id']][] = [
                'id' => (int)$split['id'],
                'participant_id' => (int)$split['participant_id'],
                'participant_name' => $split['participant_name'],
                'share_amount' => (float)$split['share_amount']
            ];
        }

        foreach ($expenses as &$expense) {
            $expense['id'] = (int)$expense['id'];
            $expense['room_id'] = (int)$expense['room_id'];
            $expense['payer_id'] = (int)$expense['payer_id'];
            $expense['amount'] = (float)$expense['amount'];
            $expense['splits'] = $splitsByExpense[$expense['id']] ?? [];
        }

        return $expenses;
    }

    /**
     * Создание расхода с автоматическим точным делением на участников
     */
    public static function create(
        int $roomId,
        int $payerId,
        string $title,
        float $amount,
        string $currency,
        array $splitParticipantIds
    ): array {
        if (empty($splitParticipantIds)) {
            throw new Exception("Необходимо указать хотя бы одного участника для сплита расхода");
        }

        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            // 1. Вставляем сам расход
            $stmt = $db->prepare("
                INSERT INTO expenses (room_id, payer_id, title, amount, currency, created_at)
                VALUES (:room_id, :payer_id, :title, :amount, :currency, datetime('now'))
            ");
            $stmt->execute([
                'room_id' => $roomId,
                'payer_id' => $payerId,
                'title' => trim($title),
                'amount' => $amount,
                'currency' => strtoupper($currency)
            ]);

            $expenseId = (int)$db->lastInsertId();

            // 2. Расчет долей с точным учетом копеек
            $numSplits = count($splitParticipantIds);
            $totalCents = (int)round($amount * 100);
            $baseCents = intdiv($totalCents, $numSplits);
            $remainderCents = $totalCents % $numSplits;

            $stmtSplit = $db->prepare("
                INSERT INTO expense_splits (expense_id, participant_id, share_amount)
                VALUES (:expense_id, :participant_id, :share_amount)
            ");

            $splits = [];
            foreach ($splitParticipantIds as $index => $pId) {
                // Добавляем оставшиеся копейки первым участникам
                $cents = $baseCents + ($index < $remainderCents ? 1 : 0);
                $shareAmount = round($cents / 100, 2);

                $stmtSplit->execute([
                    'expense_id' => $expenseId,
                    'participant_id' => $pId,
                    'share_amount' => $shareAmount
                ]);

                $splits[] = [
                    'id' => (int)$db->lastInsertId(),
                    'expense_id' => $expenseId,
                    'participant_id' => (int)$pId,
                    'share_amount' => $shareAmount
                ];
            }

            $db->commit();

            return [
                'id' => $expenseId,
                'room_id' => $roomId,
                'payer_id' => $payerId,
                'title' => $title,
                'amount' => $amount,
                'currency' => strtoupper($currency),
                'splits' => $splits
            ];
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    public static function delete(int $id, int $roomId): bool
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("DELETE FROM expenses WHERE id = :id AND room_id = :room_id");
        $stmt->execute(['id' => $id, 'room_id' => $roomId]);
        return $stmt->rowCount() > 0;
    }
}
