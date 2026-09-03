<?php

namespace App\Models;

use App\Database;
use PDO;

class Room
{
    public static function findBySlug(string $slug): ?array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM rooms WHERE slug = :slug LIMIT 1");
        $stmt->execute(['slug' => $slug]);
        $room = $stmt->fetch();
        return $room ?: null;
    }

    public static function create(string $slug, string $title, string $baseCurrency = 'RUB'): array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            INSERT INTO rooms (slug, title, base_currency, created_at)
            VALUES (:slug, :title, :base_currency, datetime('now'))
        ");
        $stmt->execute([
            'slug' => $slug,
            'title' => $title,
            'base_currency' => $baseCurrency
        ]);

        $id = (int)$db->lastInsertId();
        return [
            'id' => $id,
            'slug' => $slug,
            'title' => $title,
            'base_currency' => $baseCurrency
        ];
    }
}
