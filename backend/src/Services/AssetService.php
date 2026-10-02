<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\AssetRepository;
use App\Repositories\CategoryRepository;
use App\Support\ApiException;
use App\Support\AuthContext;
use App\Validation\AssetQueryValidator;
use App\Validation\AssetValidator;

final class AssetService
{
    public function __construct(
        private readonly AssetRepository $assets,
        private readonly CategoryRepository $categories,
    ) {
    }

    /**
     * @return array{data: array, meta: array{page: int, limit: int, total: int, totalPages: int}}
     */
    public function list(array $queryParams): array
    {
        $validated = AssetQueryValidator::validate($queryParams);

        $categoryId = null;
        if ($validated['category_slug'] !== null) {
            $category = $this->categories->findBySlug($validated['category_slug']);
            if ($category === null) {
                return $this->emptyPage($validated);
            }
            $categoryId = (int) $category['id'];
        }

        $result = $this->assets->search([
            'search' => $validated['search'],
            'status' => $validated['status'],
            'category_id' => $categoryId,
            'sort_column' => $validated['sort_column'],
            'sort_direction' => $validated['sort_direction'],
            'page' => $validated['page'],
            'limit' => $validated['limit'],
        ]);

        return [
            'data' => $result['rows'],
            'meta' => [
                'page' => $validated['page'],
                'limit' => $validated['limit'],
                'total' => $result['total'],
                'totalPages' => (int) ceil($result['total'] / $validated['limit']),
            ],
        ];
    }

    private function emptyPage(array $validated): array
    {
        return [
            'data' => [],
            'meta' => ['page' => $validated['page'], 'limit' => $validated['limit'], 'total' => 0, 'totalPages' => 0],
        ];
    }

    public function find(int $id): array
    {
        return $this->findOrFail($id);
    }

    public function history(int $id): array
    {
        $this->findOrFail($id);
        return $this->assets->history($id);
    }

    public function create(array $data): array
    {
        $validated = AssetValidator::validateFull($data);
        $this->assertCategoryExists($validated['category_id']);
        $this->assertAssetTagAvailable($validated['asset_tag']);
        $this->assertSerialNumberAvailable($validated['serial_number']);

        $asset = $this->assets->create($validated);

        // The very first row in an asset's history is its intake: no
        // previous status/assignment to compare against, but still worth
        // recording so the audit trail always starts at creation.
        $this->assets->addHistory([
            'asset_id' => (int) $asset['id'],
            'changed_by' => AuthContext::userId(),
            'previous_status' => null,
            'new_status' => $asset['status'],
            'previous_assigned_to' => null,
            'new_assigned_to' => $asset['assigned_to'],
            'note' => 'Asset created.',
        ]);

        return $asset;
    }

    public function replace(int $id, array $data): array
    {
        $existing = $this->findOrFail($id);
        $validated = AssetValidator::validateFull($data);
        $this->assertCategoryExists($validated['category_id']);
        $this->assertAssetTagAvailable($validated['asset_tag'], excludeId: $id);
        $this->assertSerialNumberAvailable($validated['serial_number'], excludeId: $id);

        return $this->applyUpdate($id, $existing, $validated);
    }

    public function patch(int $id, array $data): array
    {
        $existing = $this->findOrFail($id);
        $validated = AssetValidator::validatePartial($data);

        if (array_key_exists('category_id', $validated)) {
            $this->assertCategoryExists($validated['category_id']);
        }
        if (array_key_exists('asset_tag', $validated)) {
            $this->assertAssetTagAvailable($validated['asset_tag'], excludeId: $id);
        }
        if (array_key_exists('serial_number', $validated)) {
            $this->assertSerialNumberAvailable($validated['serial_number'], excludeId: $id);
        }

        return $this->applyUpdate($id, $existing, $validated);
    }

    public function delete(int $id): void
    {
        $this->findOrFail($id);
        $this->assets->delete($id);
    }

    /**
     * Writes the update, then — only when status or assigned_to actually
     * changed — appends one row to the audit trail. A PATCH that only
     * touches e.g. `location` or `notes` is not itself history-worthy, but
     * the user's two priority fields (status, assigned_to) always are.
     */
    private function applyUpdate(int $id, array $existing, array $fields): array
    {
        $updated = $this->assets->update($id, $fields);

        $statusChanged = array_key_exists('status', $fields) && $fields['status'] !== $existing['status'];
        $assignmentChanged = array_key_exists('assigned_to', $fields) && $fields['assigned_to'] !== $existing['assigned_to'];

        if ($statusChanged || $assignmentChanged) {
            $this->assets->addHistory([
                'asset_id' => $id,
                'changed_by' => AuthContext::userId(),
                'previous_status' => $existing['status'],
                'new_status' => $updated['status'],
                'previous_assigned_to' => $existing['assigned_to'],
                'new_assigned_to' => $updated['assigned_to'],
                'note' => null,
            ]);
        }

        return $updated;
    }

    /**
     * Checked explicitly here (rather than relying only on the foreign key)
     * so the client gets a clear 422 with a field name instead of a raw
     * database failure translated after the fact — the FK is still the real
     * backstop, see AssetRepository::translate().
     */
    private function assertCategoryExists(?int $categoryId): void
    {
        if ($categoryId === null) {
            return;
        }
        if ($this->categories->find($categoryId) === null) {
            throw new ApiException(
                'INVALID_CATEGORY',
                'category_id does not reference an existing category.',
                422,
                ['category_id' => 'No category with this id exists.']
            );
        }
    }

    private function assertAssetTagAvailable(string $assetTag, ?int $excludeId = null): void
    {
        $existing = $this->assets->findByAssetTag($assetTag);
        if ($existing !== null && (int) $existing['id'] !== $excludeId) {
            throw new ApiException('DUPLICATE_ASSET_TAG', 'An asset with this asset tag already exists.', 409);
        }
    }

    private function assertSerialNumberAvailable(?string $serialNumber, ?int $excludeId = null): void
    {
        if ($serialNumber === null) {
            return;
        }
        $existing = $this->assets->findBySerialNumber($serialNumber);
        if ($existing !== null && (int) $existing['id'] !== $excludeId) {
            throw new ApiException('DUPLICATE_SERIAL_NUMBER', 'An asset with this serial number already exists.', 409);
        }
    }

    private function findOrFail(int $id): array
    {
        $asset = $this->assets->find($id);
        if ($asset === null) {
            throw new ApiException('NOT_FOUND', 'Asset not found.', 404);
        }
        return $asset;
    }
}
