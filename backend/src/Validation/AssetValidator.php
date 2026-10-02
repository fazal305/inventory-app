<?php

declare(strict_types=1);

namespace App\Validation;

use App\Support\ApiException;

final class AssetValidator
{
    public const STATUSES = ['in_use', 'in_storage', 'under_repair', 'retired', 'disposed'];

    /**
     * POST (create) and PUT (full replace): asset_tag and name are required;
     * everything else is optional/nullable, with status defaulting to
     * 'in_storage' when not supplied.
     */
    public static function validateFull(array $data): array
    {
        return self::validate($data, required: true);
    }

    /**
     * PATCH: every field optional, but whatever is present is checked with
     * the same rules, and at least one field must be present.
     */
    public static function validatePartial(array $data): array
    {
        $fields = self::validate($data, required: false);
        if ($fields === []) {
            throw new ApiException('VALIDATION_ERROR', 'At least one field must be provided.', 422);
        }
        return $fields;
    }

    private static function validate(array $data, bool $required): array
    {
        $errors = [];
        $fields = [];

        self::stringField($data, 'asset_tag', 50, $required, $errors, $fields);
        self::stringField($data, 'name', 150, $required, $errors, $fields);
        self::nullableStringField($data, 'serial_number', 100, $required, $errors, $fields);
        self::nullableStringField($data, 'assigned_to', 150, $required, $errors, $fields);
        self::nullableStringField($data, 'location', 150, $required, $errors, $fields);
        self::nullableStringField($data, 'notes', 2000, $required, $errors, $fields);

        if (array_key_exists('category_id', $data)) {
            $categoryId = $data['category_id'];
            if ($categoryId !== null && !self::isPositiveInt($categoryId)) {
                $errors['category_id'] = 'category_id must be a positive integer or null.';
            } else {
                $fields['category_id'] = $categoryId !== null ? (int) $categoryId : null;
            }
        } elseif ($required) {
            $fields['category_id'] = null;
        }

        if ($required || array_key_exists('status', $data)) {
            $status = $data['status'] ?? ($required ? 'in_storage' : null);
            if (!in_array($status, self::STATUSES, true)) {
                $errors['status'] = 'status must be one of: ' . implode(', ', self::STATUSES) . '.';
            } else {
                $fields['status'] = $status;
            }
        }

        self::nullableDateField($data, 'purchase_date', $required, $errors, $fields);
        self::nullableDateField($data, 'warranty_expires_at', $required, $errors, $fields);

        if (array_key_exists('purchase_cost', $data)) {
            $cost = $data['purchase_cost'];
            if ($cost !== null && (!is_numeric($cost) || (float) $cost < 0)) {
                $errors['purchase_cost'] = 'purchase_cost must be a number greater than or equal to 0, or null.';
            } else {
                $fields['purchase_cost'] = $cost !== null ? round((float) $cost, 2) : null;
            }
        } elseif ($required) {
            $fields['purchase_cost'] = null;
        }

        if ($errors !== []) {
            throw new ApiException('VALIDATION_ERROR', 'Invalid asset data.', 422, $errors);
        }

        return $fields;
    }

    private static function stringField(array $data, string $key, int $maxLength, bool $required, array &$errors, array &$fields): void
    {
        if (!array_key_exists($key, $data)) {
            if ($required) {
                $errors[$key] = ucfirst(str_replace('_', ' ', $key)) . ' is required.';
            }
            return;
        }

        $value = trim((string) $data[$key]);
        if ($value === '') {
            $errors[$key] = ucfirst(str_replace('_', ' ', $key)) . ' cannot be empty.';
        } elseif (strlen($value) > $maxLength) {
            $errors[$key] = ucfirst(str_replace('_', ' ', $key)) . " must be {$maxLength} characters or fewer.";
        } else {
            $fields[$key] = $value;
        }
    }

    private static function nullableStringField(array $data, string $key, int $maxLength, bool $required, array &$errors, array &$fields): void
    {
        if (!array_key_exists($key, $data)) {
            if ($required) {
                $fields[$key] = null;
            }
            return;
        }

        $value = $data[$key];
        if ($value === null) {
            $fields[$key] = null;
            return;
        }

        if (!is_string($value)) {
            $errors[$key] = ucfirst(str_replace('_', ' ', $key)) . ' must be a string or null.';
            return;
        }

        $value = trim($value);
        if ($value === '') {
            $fields[$key] = null;
        } elseif (strlen($value) > $maxLength) {
            $errors[$key] = ucfirst(str_replace('_', ' ', $key)) . " must be {$maxLength} characters or fewer.";
        } else {
            $fields[$key] = $value;
        }
    }

    private static function nullableDateField(array $data, string $key, bool $required, array &$errors, array &$fields): void
    {
        if (!array_key_exists($key, $data)) {
            if ($required) {
                $fields[$key] = null;
            }
            return;
        }

        $value = $data[$key];
        if ($value === null || $value === '') {
            $fields[$key] = null;
            return;
        }

        if (!is_string($value) || !self::isValidDate($value)) {
            $errors[$key] = ucfirst(str_replace('_', ' ', $key)) . ' must be a date in YYYY-MM-DD format, or null.';
            return;
        }

        $fields[$key] = $value;
    }

    private static function isValidDate(string $value): bool
    {
        $date = \DateTime::createFromFormat('Y-m-d', $value);
        return $date !== false && $date->format('Y-m-d') === $value;
    }

    private static function isPositiveInt(mixed $value): bool
    {
        return (is_int($value) || (is_string($value) && ctype_digit($value))) && (int) $value > 0;
    }
}
