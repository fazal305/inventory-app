<?php

declare(strict_types=1);

namespace App;

final class Auth
{
    public static function startSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        session_name('staff_sid');
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => Env::bool('SESSION_SECURE_COOKIE'),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }

    /**
     * Returns the signed-in staff member or throws 401.
     * Idle sessions are destroyed and reported as SESSION_EXPIRED so the client can say so.
     *
     * @return array{id:int, username:string}
     */
    public static function requireStaff(): array
    {
        self::startSession();

        if (!isset($_SESSION['staff_id'])) {
            throw new HttpError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
        }

        $idleLimit = 60 * (int) Env::get('SESSION_IDLE_MINUTES', '30');
        if (time() - (int) ($_SESSION['last_activity'] ?? 0) > $idleLimit) {
            self::destroySession();
            throw new HttpError(401, 'SESSION_EXPIRED', 'Your session expired. Please sign in again.');
        }

        $_SESSION['last_activity'] = time();

        return ['id' => (int) $_SESSION['staff_id'], 'username' => (string) $_SESSION['username']];
    }

    /** State-changing requests must echo the per-session token in the X-CSRF-Token header. */
    public static function requireCsrf(): void
    {
        $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $expected = $_SESSION['csrf_token'] ?? '';
        if ($expected === '' || !is_string($sent) || !hash_equals($expected, $sent)) {
            throw new HttpError(403, 'CSRF_INVALID', 'This request could not be verified. Refresh the page and try again.');
        }
    }

    /** @param array{id:int, username:string} $staff */
    public static function signIn(array $staff): string
    {
        self::startSession();
        // A fresh ID on privilege change prevents session fixation.
        session_regenerate_id(true);
        $_SESSION['staff_id'] = $staff['id'];
        $_SESSION['username'] = $staff['username'];
        $_SESSION['last_activity'] = time();
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        return $_SESSION['csrf_token'];
    }

    public static function destroySession(): void
    {
        $_SESSION = [];
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 3600,
            'path' => $params['path'],
            'secure' => $params['secure'],
            'httponly' => $params['httponly'],
            'samesite' => $params['samesite'],
        ]);
        session_destroy();
    }
}
