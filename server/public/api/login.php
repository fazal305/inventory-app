<?php

declare(strict_types=1);

use App\Auth;
use App\Db;
use App\Http;
use App\HttpError;
use App\RateLimiter;

require dirname(__DIR__, 2) . '/src/bootstrap.php';

Http::allowMethods(['POST']);

// Only failures count, so a whole office signing in from one shared IP is never locked out.
$ipBucket = 'login-ip:' . Http::clientIp();
RateLimiter::check($ipBucket, 30, 15 * 60);

$body = Http::jsonBody();
$username = is_string($body['username'] ?? null) ? trim($body['username']) : '';
$password = is_string($body['password'] ?? null) ? $body['password'] : '';

$fields = [];
if ($username === '') {
    $fields['username'] = 'Username is required.';
}
if ($password === '') {
    $fields['password'] = 'Password is required.';
}
if ($fields !== []) {
    throw new HttpError(422, 'VALIDATION_FAILED', 'Some fields need attention.', $fields);
}

$userBucket = 'login-user:' . mb_strtolower(mb_substr($username, 0, 50));
RateLimiter::check($userBucket, 5, 15 * 60);

$stmt = Db::connection()->prepare('SELECT id, username, password FROM staff WHERE username = ?');
$stmt->execute([$username]);
$staff = $stmt->fetch() ?: null;

// Verify against a dummy hash for unknown usernames so response timing doesn't reveal which usernames exist.
$hash = $staff['password'] ?? '$2y$10$gDX3BhFSPV7kceu0HxiI4..X5VU48Bza7wBp1D46vYkfaX7jB3a3W';
$valid = password_verify($password, $hash) && $staff !== null;

if (!$valid) {
    RateLimiter::record($userBucket);
    RateLimiter::record($ipBucket);
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Incorrect username or password.');
}

if (password_needs_rehash($staff['password'], PASSWORD_DEFAULT)) {
    Db::connection()->prepare('UPDATE staff SET password = ? WHERE id = ?')
        ->execute([password_hash($password, PASSWORD_DEFAULT), $staff['id']]);
}

RateLimiter::clear($userBucket);
$csrfToken = Auth::signIn(['id' => (int) $staff['id'], 'username' => $staff['username']]);

Http::json(200, ['username' => $staff['username'], 'csrf_token' => $csrfToken]);
