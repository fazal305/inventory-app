<?php

declare(strict_types=1);

namespace App;

final class HttpError extends \RuntimeException
{
    /** @param array<string,string>|null $fields */
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        string $message,
        public readonly ?array $fields = null,
        public readonly array $headers = [],
    ) {
        parent::__construct($message);
    }
}

final class Http
{
    public static function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    /** @param string[] $allowed */
    public static function allowMethods(array $allowed): string
    {
        $method = self::method();
        if (!in_array($method, $allowed, true)) {
            throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'This method is not allowed here.', null, [
                'Allow' => implode(', ', $allowed),
            ]);
        }
        return $method;
    }

    /**
     * Decodes a JSON object body. Requiring application/json also blocks plain cross-site
     * HTML form posts, which cannot set that content type without a CORS preflight.
     *
     * @return array<string,mixed>
     */
    public static function jsonBody(): array
    {
        $type = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
        if (!str_starts_with($type, 'application/json')) {
            throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Requests must be sent as JSON.');
        }

        $raw = file_get_contents('php://input', false, null, 0, 16_384) ?: '';
        $data = json_decode($raw, true);
        if (!is_array($data) || array_is_list($data) && $data !== []) {
            throw new HttpError(400, 'INVALID_JSON', 'The request body is not a valid JSON object.');
        }
        return $data;
    }

    public static function clientIp(): string
    {
        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }

    public static function json(int $status, mixed $data): never
    {
        http_response_code($status);
        echo json_encode(['data' => $data], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function noContent(): never
    {
        http_response_code(204);
        exit;
    }

    public static function sendError(HttpError $e): never
    {
        http_response_code($e->status);
        foreach ($e->headers as $name => $value) {
            header("$name: $value");
        }
        $error = ['code' => $e->errorCode, 'message' => $e->getMessage()];
        if ($e->fields !== null) {
            $error['fields'] = $e->fields;
        }
        echo json_encode(['error' => $error], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }
}
