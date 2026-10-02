<?php

declare(strict_types=1);

// Usage: php server/bin/create-staff.php <username>
// Prompts for the password (hidden on terminals that support it), or reads it from STAFF_PASSWORD.
// The SRS has no self-registration, so staff accounts are provisioned by an operator with this script.

require dirname(__DIR__) . '/src/bootstrap.php';

header_remove();
restore_exception_handler();

$username = trim($argv[1] ?? '');
if ($username === '' || mb_strlen($username) > 50 || !preg_match('/^[A-Za-z0-9._-]+$/', $username)) {
    fwrite(STDERR, "Usage: php server/bin/create-staff.php <username>\n");
    fwrite(STDERR, "Username: 1-50 characters, letters, numbers, dot, underscore or hyphen.\n");
    exit(1);
}

$password = getenv('STAFF_PASSWORD') ?: null;
if ($password === null) {
    fwrite(STDOUT, 'Password (min 10 characters): ');
    $hidden = stream_isatty(STDIN) && DIRECTORY_SEPARATOR === '/';
    if ($hidden) {
        shell_exec('stty -echo');
    }
    $password = rtrim((string) fgets(STDIN), "\r\n");
    if ($hidden) {
        shell_exec('stty echo');
        fwrite(STDOUT, "\n");
    }
}

if (strlen($password) < 10) {
    fwrite(STDERR, "Password must be at least 10 characters.\n");
    exit(1);
}

$db = App\Db::connection();
$stmt = $db->prepare('SELECT id FROM staff WHERE username = ?');
$stmt->execute([$username]);
if ($stmt->fetch()) {
    $db->prepare('UPDATE staff SET password = ? WHERE username = ?')
        ->execute([password_hash($password, PASSWORD_DEFAULT), $username]);
    fwrite(STDOUT, "Updated password for '$username'.\n");
} else {
    $db->prepare('INSERT INTO staff (username, password) VALUES (?, ?)')
        ->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
    fwrite(STDOUT, "Created staff account '$username'.\n");
}
