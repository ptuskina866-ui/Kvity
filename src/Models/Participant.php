<?php

namespace App\Models;

use App\Database;
use PDO;

class Participant
{
    public static function getByRoomId(int $roomId): array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT id, room_id, name, telegram_id, payment_details, created_at
            FROM participants
            WHERE room_id = :room_id
            ORDER BY id ASC
        ");
        $stmt->execute(['room_id' => $roomId]);
        return $stmt->fetchAll();
    }

    public static function findById(int $id): ?array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM participants WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $participant = $stmt->fetch();
        return $participant ?: null;
    }

    public static function create(int $roomId, string $name, ?string $paymentDetails = null, ?int $telegramId = null): array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            INSERT INTO participants (room_id, name, telegram_id, payment_details, created_at)
            VALUES (:room_id, :name, :telegram_id, :payment_details, datetime('now'))
        ");
        $stmt->execute([
            'room_id' => $roomId,
            'name' => trim($name),
            'telegram_id' => $telegramId,
            'payment_details' => $paymentDetails ? trim($paymentDetails) : null
        ]);

        $id = (int)$db->lastInsertId();
        return self::findById($id);
    }

    public static function update(int $id, ?string $name = null, ?string $paymentDetails = null): bool
    {
        $db = Database::getConnection();
        $fields = [];
        $params = ['id' => $id];

        if ($name !== null) {
            $fields[] = "name = :name";
            $params['name'] = trim($name);
        }
        if ($paymentDetails !== null) {
            $fields[] = "payment_details = :payment_details";
            $params['payment_details'] = trim($paymentDetails);
        }

        if (empty($fields)) {
            return false;
        }

        $sql = "UPDATE participants SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        return $stmt->execute($params);
    }
}
