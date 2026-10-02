<?php

declare(strict_types=1);

namespace App;

require_once __DIR__ . '/Env.php';
require_once __DIR__ . '/Http.php';
require_once __DIR__ . '/Db.php';
require_once __DIR__ . '/RateLimiter.php';
require_once __DIR__ . '/Auth.php';
require_once __DIR__ . '/Validator.php';
require_once __DIR__ . '/AssetRepository.php';

Env::load(dirname(__DIR__) . '/.env');

// Details go to the server log only; clients get generic messages.
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// Warnings and notices become exceptions so they can't silently corrupt a response;
// deprecations are only logged, so a PHP upgrade can't turn them into 500s.
set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    if ($severity === E_DEPRECATED || $severity === E_USER_DEPRECATED) {
        error_log(sprintf('[api] Deprecated: %s in %s:%d', $message, $file, $line));
        return true;
    }
    throw new \ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(static function (\Throwable $e): void {
    if ($e instanceof HttpError) {
        Http::sendError($e);
    }
    error_log(sprintf('[api] %s: %s in %s:%d', $e::class, $e->getMessage(), $e->getFile(), $e->getLine()));
    Http::sendError(new HttpError(500, 'SERVER_ERROR', 'Something went wrong on our side. Please try again.'));
});

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
header('X-Frame-Options: DENY');
