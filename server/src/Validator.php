<?php

declare(strict_types=1);

namespace App;

final class Validator
{
    /** @var array<string,string> */
    private array $errors = [];

    /** @var array<string,string> */
    private array $clean = [];

    /** @param array<string,mixed> $input */
    public function __construct(private readonly array $input)
    {
    }

    public function text(string $field, string $label, int $maxLength, ?string $pattern = null, ?string $patternMessage = null): self
    {
        $value = $this->input[$field] ?? null;

        if (!is_string($value) || trim($value) === '') {
            $this->errors[$field] = "$label is required.";
            return $this;
        }

        $value = trim(preg_replace('/\s+/u', ' ', $value) ?? '');

        if (preg_match('/[\x00-\x1F\x7F]/u', $value) || !mb_check_encoding($value, 'UTF-8')) {
            $this->errors[$field] = "$label contains invalid characters.";
        } elseif (mb_strlen($value) > $maxLength) {
            $this->errors[$field] = "$label must be $maxLength characters or fewer.";
        } elseif ($pattern !== null && !preg_match($pattern, $value)) {
            $this->errors[$field] = $patternMessage ?? "$label has an invalid format.";
        } else {
            $this->clean[$field] = $value;
        }

        return $this;
    }

    /** @return array<string,string> */
    public function validated(): array
    {
        if ($this->errors !== []) {
            throw new HttpError(422, 'VALIDATION_FAILED', 'Some fields need attention.', $this->errors);
        }
        return $this->clean;
    }
}
