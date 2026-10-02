<?php

declare(strict_types=1);

namespace App;

final class AssetRepository
{
    /** @return list<array<string,mixed>> */
    public static function all(): array
    {
        return Db::connection()
            ->query('SELECT id, item_name, category, room_number FROM assets ORDER BY id DESC')
            ->fetchAll();
    }

    /** @return array<string,mixed>|null */
    public static function find(int $id): ?array
    {
        $stmt = Db::connection()->prepare('SELECT id, item_name, category, room_number FROM assets WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    /** @param array{item_name:string, category:string, room_number:string} $asset */
    public static function create(array $asset): array
    {
        $db = Db::connection();
        $db->prepare('INSERT INTO assets (item_name, category, room_number) VALUES (?, ?, ?)')
            ->execute([$asset['item_name'], $asset['category'], $asset['room_number']]);
        return self::find((int) $db->lastInsertId());
    }

    public static function updateRoom(int $id, string $roomNumber): ?array
    {
        if (self::find($id) === null) {
            return null;
        }
        Db::connection()->prepare('UPDATE assets SET room_number = ? WHERE id = ?')->execute([$roomNumber, $id]);
        return self::find($id);
    }

    public static function delete(int $id): bool
    {
        $stmt = Db::connection()->prepare('DELETE FROM assets WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }
}
