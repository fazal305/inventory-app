<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Support\ApiException;
use PDO;
use PDOException;

final class AssetRepository
{
    private const WRITABLE_COLUMNS = [
        'asset_tag', 'name', 'category_id', 'serial_number', 'status',
        'assigned_to', 'location', 'purchase_date', 'purchase_cost',
        'warranty_expires_at', 'notes',
    ];

    public function __construct(private readonly PDO $pdo)
    {
    }

    /**
     * @param array{search: ?string, status: ?string, category_id: ?int, sort_column: string, sort_direction: string, page: int, limit: int} $criteria
     * @return array{rows: array, total: int}
     */
    public function search(array $criteria): array
    {
        $where = [];
        $params = [];

        if ($criteria['search'] !== null) {
            $where[] = '(name LIKE :search OR asset_tag LIKE :search OR serial_number LIKE :search)';
            $params['search'] = '%' . $criteria['search'] . '%';
        }

        if ($criteria['status'] !== null) {
            $where[] = 'status = :status';
            $params['status'] = $criteria['status'];
        }

        if ($criteria['category_id'] !== null) {
            $where[] = 'category_id = :category_id';
            $params['category_id'] = $criteria['category_id'];
        }

        $whereSql = $where !== [] ? 'WHERE ' . implode(' AND ', $where) : '';

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM assets {$whereSql}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $offset = ($criteria['page'] - 1) * $criteria['limit'];

        // sort_column/sort_direction come only from AssetQueryValidator's fixed
        // allowlist, never the raw query string.
        $sql = "SELECT * FROM assets {$whereSql}
                ORDER BY {$criteria['sort_column']} {$criteria['sort_direction']}
                LIMIT :limit OFFSET :offset";
        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(":{$key}", $value);
        }
        $stmt->bindValue(':limit', $criteria['limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return ['rows' => $stmt->fetchAll(), 'total' => $total];
    }

    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM assets WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function findByAssetTag(string $assetTag): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM assets WHERE asset_tag = :asset_tag');
        $stmt->execute(['asset_tag' => $assetTag]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function findBySerialNumber(string $serialNumber): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM assets WHERE serial_number = :serial_number');
        $stmt->execute(['serial_number' => $serialNumber]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function create(array $fields): array
    {
        $columns = array_intersect_key($fields, array_flip(self::WRITABLE_COLUMNS));
        $placeholders = implode(', ', array_map(static fn ($col) => ":{$col}", array_keys($columns)));
        $columnList = implode(', ', array_keys($columns));

        $stmt = $this->pdo->prepare("INSERT INTO assets ({$columnList}) VALUES ({$placeholders})");

        try {
            $stmt->execute($columns);
        } catch (PDOException $e) {
            throw $this->translate($e);
        }

        return $this->find((int) $this->pdo->lastInsertId());
    }

    public function update(int $id, array $fields): array
    {
        $columns = array_intersect_key($fields, array_flip(self::WRITABLE_COLUMNS));
        $set = implode(', ', array_map(static fn ($col) => "{$col} = :{$col}", array_keys($columns)));
        $stmt = $this->pdo->prepare("UPDATE assets SET {$set} WHERE id = :id");

        try {
            $stmt->execute([...$columns, 'id' => $id]);
        } catch (PDOException $e) {
            throw $this->translate($e);
        }

        return $this->find($id);
    }

    public function delete(int $id): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM assets WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }

    /**
     * Appends one row to the asset's status/assignment audit trail. Called
     * by AssetService whenever a create or update actually changes status
     * or assigned_to, never directly from a controller.
     */
    public function addHistory(array $entry): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO asset_status_history
                (asset_id, changed_by, previous_status, new_status, previous_assigned_to, new_assigned_to, note)
             VALUES
                (:asset_id, :changed_by, :previous_status, :new_status, :previous_assigned_to, :new_assigned_to, :note)'
        );
        $stmt->execute($entry);
    }

    /** @return list<array<string,mixed>> */
    public function history(int $assetId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT h.*, u.name AS changed_by_name
             FROM asset_status_history h
             LEFT JOIN users u ON u.id = h.changed_by
             WHERE h.asset_id = :asset_id
             ORDER BY h.created_at DESC, h.id DESC'
        );
        $stmt->execute(['asset_id' => $assetId]);
        return $stmt->fetchAll();
    }

    /**
     * See ProductRepository::translate() for why both the MySQL driver code
     * and the Postgres SQLSTATE are checked here.
     */
    private function translate(PDOException $e): ApiException
    {
        $sqlState = $e->errorInfo[0] ?? null;
        $driverCode = $e->errorInfo[1] ?? null;

        if ($driverCode === 1062 || $sqlState === '23505') {
            $message = str_contains($e->getMessage(), 'serial_number')
                ? 'An asset with this serial number already exists.'
                : 'An asset with this asset tag already exists.';
            $code = str_contains($e->getMessage(), 'serial_number') ? 'DUPLICATE_SERIAL_NUMBER' : 'DUPLICATE_ASSET_TAG';
            return new ApiException($code, $message, 409);
        }

        if ($driverCode === 1452 || $sqlState === '23503') {
            return new ApiException('INVALID_CATEGORY', 'category_id does not reference an existing category.', 422);
        }

        return new ApiException('INTERNAL_SERVER_ERROR', 'Something went wrong.', 500);
    }
}
