<?php

declare(strict_types=1);

namespace App\Validation;

use App\Support\ApiException;

/**
 * Validates GET /assets query parameters: search, status, category, sort,
 * page, limit. Mirrors ProductQueryValidator's shape and reasoning.
 */
final class AssetQueryValidator
{
    private const SORTABLE_COLUMNS = ['asset_tag', 'name', 'status', 'purchase_date', 'created_at'];

    private const DEFAULT_LIMIT = 20;
    private const MAX_LIMIT = 100;

    public static function validate(array $query): array
    {
        $errors = [];

        $search = self::nullableString($query['search'] ?? null);
        $categorySlug = self::nullableString($query['category'] ?? null);

        $status = self::nullableString($query['status'] ?? null);
        if ($status !== null && !in_array($status, AssetValidator::STATUSES, true)) {
            $errors['status'] = 'status must be one of: ' . implode(', ', AssetValidator::STATUSES) . '.';
            $status = null;
        }

        $sortColumn = 'created_at';
        $sortDirection = 'DESC';
        $rawSort = self::nullableString($query['sort'] ?? null);
        if ($rawSort !== null) {
            $sortDirection = str_starts_with($rawSort, '-') ? 'DESC' : 'ASC';
            $column = ltrim($rawSort, '-');
            if (!in_array($column, self::SORTABLE_COLUMNS, true)) {
                $errors['sort'] = 'sort must be one of: ' . implode(', ', self::SORTABLE_COLUMNS)
                    . ' (prefix with - for descending, e.g. -purchase_date).';
            } else {
                $sortColumn = $column;
            }
        }

        $page = 1;
        $rawPage = $query['page'] ?? null;
        if ($rawPage !== null && $rawPage !== '') {
            if (!ctype_digit((string) $rawPage) || (int) $rawPage < 1) {
                $errors['page'] = 'page must be a positive integer.';
            } else {
                $page = (int) $rawPage;
            }
        }

        $limit = self::DEFAULT_LIMIT;
        $rawLimit = $query['limit'] ?? null;
        if ($rawLimit !== null && $rawLimit !== '') {
            if (!ctype_digit((string) $rawLimit) || (int) $rawLimit < 1) {
                $errors['limit'] = 'limit must be a positive integer.';
            } else {
                $limit = min((int) $rawLimit, self::MAX_LIMIT);
            }
        }

        if ($errors !== []) {
            throw new ApiException('VALIDATION_ERROR', 'Invalid query parameters.', 422, $errors);
        }

        return [
            'search' => $search,
            'status' => $status,
            'category_slug' => $categorySlug,
            'sort_column' => $sortColumn,
            'sort_direction' => $sortDirection,
            'page' => $page,
            'limit' => $limit,
        ];
    }

    private static function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $value = trim((string) $value);
        return $value === '' ? null : $value;
    }
}
