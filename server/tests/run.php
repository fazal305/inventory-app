<?php

declare(strict_types=1);

// Integration tests: real HTTP requests against PHP's built-in server and a real MySQL database.
//
//   php server/tests/run.php
//
// Uses the DB credentials from server/.env but the database named in TEST_DB_NAME
// (default: staff_assets_test). Every table in that database is emptied, so never point it at real data.

$serverDir = dirname(__DIR__);
require $serverDir . '/src/Env.php';
App\Env::load($serverDir . '/.env');

$testDb = getenv('TEST_DB_NAME') ?: 'staff_assets_test';
if ($testDb === App\Env::get('DB_NAME') && getenv('ALLOW_TEST_ON_MAIN_DB') !== '1') {
    fwrite(STDERR, "TEST_DB_NAME matches DB_NAME; refusing to wipe the main database.\n");
    exit(1);
}
putenv("DB_NAME=$testDb");

$php = PHP_BINARY;
passthru(escapeshellarg($php) . ' ' . escapeshellarg("$serverDir/bin/migrate.php"), $code);
if ($code !== 0) {
    exit(1);
}

$pdo = new PDO(
    sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', App\Env::get('DB_HOST'), App\Env::get('DB_PORT', '3306'), $testDb),
    App\Env::get('DB_USER'),
    App\Env::get('DB_PASS'),
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
);
foreach (['assets', 'staff', 'rate_limit_hits'] as $table) {
    $pdo->exec("DELETE FROM $table");
}
$pdo->prepare('INSERT INTO staff (username, password) VALUES (?, ?)')
    ->execute(['tester', password_hash('correct-horse-9', PASSWORD_DEFAULT)]);

/** @return resource */
function startServer(string $php, string $serverDir, int $port, array $env)
{
    $envString = '';
    foreach ($env as $key => $value) {
        $envString .= sprintf('%s=%s ', $key, escapeshellarg((string) $value));
    }
    $cmd = sprintf(
        'exec env %s %s -S 127.0.0.1:%d -t %s %s',
        $envString,
        escapeshellarg($php),
        $port,
        escapeshellarg("$serverDir/public"),
        escapeshellarg("$serverDir/router.php"),
    );
    $proc = proc_open($cmd, [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pipes);
    for ($i = 0; $i < 50; $i++) {
        if (@fsockopen('127.0.0.1', $port)) {
            return $proc;
        }
        usleep(100_000);
    }
    fwrite(STDERR, "Server on port $port did not start.\n");
    exit(1);
}

final class Client
{
    private string $jar;
    public ?string $csrf = null;

    public function __construct(private string $base)
    {
        $this->jar = tempnam(sys_get_temp_dir(), 'jar');
    }

    /** @return array{status:int, body:mixed, headers:string} */
    public function request(string $method, string $path, mixed $json = null, array $headers = [], ?string $rawBody = null): array
    {
        $ch = curl_init($this->base . $path);
        $sendHeaders = $headers;
        if ($this->csrf !== null) {
            $sendHeaders[] = 'X-CSRF-Token: ' . $this->csrf;
        }
        if ($json !== null) {
            $rawBody = json_encode($json);
            $sendHeaders[] = 'Content-Type: application/json';
        }
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_COOKIEJAR => $this->jar,
            CURLOPT_COOKIEFILE => $this->jar,
            CURLOPT_HTTPHEADER => $sendHeaders,
        ]);
        if ($rawBody !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $rawBody);
        }
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        curl_close($ch);
        $body = substr($response, $headerSize);
        return [
            'status' => $status,
            'headers' => substr($response, 0, $headerSize),
            'body' => $body === '' ? null : (json_decode($body, true) ?? $body),
        ];
    }

    public function login(string $user, string $pass): array
    {
        $res = $this->request('POST', '/api/login.php', ['username' => $user, 'password' => $pass]);
        $this->csrf = $res['body']['data']['csrf_token'] ?? null;
        return $res;
    }
}

$passed = 0;
$failed = 0;
function check(string $name, bool $ok, mixed $debug = null): void
{
    global $passed, $failed;
    if ($ok) {
        $passed++;
        echo "  ok   $name\n";
    } else {
        $failed++;
        echo "  FAIL $name\n";
        if ($debug !== null) {
            echo '       ' . json_encode($debug, JSON_UNESCAPED_SLASHES) . "\n";
        }
    }
}

$port = 18081;
$server = startServer($php, $serverDir, $port, ['DB_NAME' => $testDb, 'SESSION_IDLE_MINUTES' => 30]);
$base = "http://127.0.0.1:$port";

try {
    echo "Auth\n";
    $anon = new Client($base);
    $r = $anon->request('GET', '/api/assets.php');
    check('GET assets without session is 401', $r['status'] === 401 && $r['body']['error']['code'] === 'UNAUTHENTICATED', $r);
    $r = $anon->request('GET', '/api/session.php');
    check('GET session without session is 401', $r['status'] === 401, $r);
    $r = $anon->request('GET', '/api/login.php');
    check('GET login is 405 with Allow header', $r['status'] === 405 && str_contains($r['headers'], 'Allow: POST'), $r);
    $r = $anon->request('POST', '/api/login.php', null, ['Content-Type: application/x-www-form-urlencoded'], 'username=tester&password=correct-horse-9');
    check('form-encoded login is rejected (415)', $r['status'] === 415, $r);
    $r = $anon->request('POST', '/api/login.php', null, ['Content-Type: application/json'], '{not json');
    check('malformed JSON is 400', $r['status'] === 400 && $r['body']['error']['code'] === 'INVALID_JSON', $r);
    $r = $anon->request('POST', '/api/login.php', ['username' => '', 'password' => '']);
    check('empty login fields give field errors', $r['status'] === 422 && isset($r['body']['error']['fields']['username'], $r['body']['error']['fields']['password']), $r);
    $r = $anon->login('tester', 'wrong-password');
    check('wrong password is 401 INVALID_CREDENTIALS', $r['status'] === 401 && $r['body']['error']['code'] === 'INVALID_CREDENTIALS', $r);
    $r2 = $anon->login('nobody', 'wrong-password');
    check('unknown user gets the identical error', $r2['status'] === 401 && $r2['body'] === $r['body'], $r2);
    $r = $anon->login("tester' OR '1'='1", 'x');
    check('SQL injection attempt in username fails', $r['status'] === 401, $r);
    check('error responses carry no stack trace', !str_contains(json_encode($r['body']), '.php'), $r);

    $staff = new Client($base);
    $r = $staff->login('tester', 'correct-horse-9');
    check('valid login is 200 with username + csrf token', $r['status'] === 200 && $r['body']['data']['username'] === 'tester' && strlen((string) $staff->csrf) === 64, $r);
    check('session cookie is HttpOnly and SameSite=Lax', (bool) preg_match('/Set-Cookie: staff_sid=[^;]+;.*HttpOnly; SameSite=Lax/i', $r['headers']), $r['headers']);
    check('password hash never returned', !str_contains(json_encode($r['body']), '$2y$'), $r);
    $r = $staff->request('GET', '/api/session.php');
    check('session endpoint restores identity', $r['status'] === 200 && $r['body']['data']['username'] === 'tester', $r);
    check('API sends nosniff + no-store headers', str_contains($r['headers'], 'X-Content-Type-Options: nosniff') && str_contains($r['headers'], 'Cache-Control: no-store'), $r['headers']);

    echo "Assets CRUD\n";
    $r = $staff->request('GET', '/api/assets.php');
    check('empty inventory returns []', $r['status'] === 200 && $r['body']['data'] === [], $r);

    $r = $staff->request('POST', '/api/assets.php', ['item_name' => '  ThinkPad   X1 ', 'category' => 'Laptop', 'room_number' => 'B-204']);
    check('create returns 201 with trimmed, collapsed values', $r['status'] === 201 && $r['body']['data']['item_name'] === 'ThinkPad X1' && is_int($r['body']['data']['id']), $r);
    $id = $r['body']['data']['id'] ?? 0;

    $r = $staff->request('POST', '/api/assets.php', ['item_name' => '<script>alert(1)</script>', 'category' => 'Test', 'room_number' => '1']);
    check('HTML in text is stored verbatim (escaped at render time)', $r['status'] === 201 && $r['body']['data']['item_name'] === '<script>alert(1)</script>', $r);
    $xssId = $r['body']['data']['id'] ?? 0;

    $r = $staff->request('POST', '/api/assets.php', ['item_name' => '', 'category' => str_repeat('x', 51), 'room_number' => 'Room; DROP']);
    check('invalid create gives per-field errors', $r['status'] === 422
        && isset($r['body']['error']['fields']['item_name'], $r['body']['error']['fields']['category'], $r['body']['error']['fields']['room_number']), $r);
    $r = $staff->request('POST', '/api/assets.php', ['item_name' => 5, 'category' => ['a'], 'room_number' => null]);
    check('non-string field types are rejected', $r['status'] === 422 && count($r['body']['error']['fields']) === 3, $r);
    $r = $staff->request('POST', '/api/assets.php', ['item_name' => str_repeat('é', 100), 'category' => 'Unicode', 'room_number' => 'A1']);
    check('100 multibyte characters fit item_name', $r['status'] === 201, $r);

    $r = $staff->request('GET', '/api/assets.php');
    check('read returns all rows newest first with exact columns', $r['status'] === 200 && count($r['body']['data']) === 3
        && array_keys($r['body']['data'][0]) === ['id', 'item_name', 'category', 'room_number']
        && $r['body']['data'][0]['id'] > $r['body']['data'][2]['id'], $r);

    $r = $staff->request('PUT', "/api/assets.php?id=$id", ['room_number' => 'C-301']);
    check('update changes room_number', $r['status'] === 200 && $r['body']['data']['room_number'] === 'C-301' && $r['body']['data']['item_name'] === 'ThinkPad X1', $r);
    $r = $staff->request('PUT', "/api/assets.php?id=$id", ['room_number' => 'C-302', 'item_name' => 'Renamed']);
    check('update ignores fields other than room_number', $r['status'] === 200 && $r['body']['data']['item_name'] === 'ThinkPad X1', $r);
    $r = $staff->request('PUT', "/api/assets.php?id=$id", ['room_number' => '']);
    check('update with empty room is 422', $r['status'] === 422, $r);
    $r = $staff->request('PUT', '/api/assets.php?id=999999', ['room_number' => 'A1']);
    check('update unknown id is 404', $r['status'] === 404, $r);
    foreach (['', 'abc', '0', '-1', '1.5', '1%20OR%201=1'] as $bad) {
        $r = $staff->request('PUT', "/api/assets.php?id=$bad", ['room_number' => 'A1']);
        check("update with id '$bad' is 400", $r['status'] === 400 && $r['body']['error']['code'] === 'INVALID_ID', $r);
    }

    $r = $staff->request('DELETE', "/api/assets.php?id=$xssId");
    check('delete returns 204 with empty body', $r['status'] === 204 && $r['body'] === null, $r);
    $r = $staff->request('DELETE', "/api/assets.php?id=$xssId");
    check('deleting again is 404', $r['status'] === 404, $r);
    $r = $staff->request('PATCH', "/api/assets.php?id=$id", ['room_number' => 'A1']);
    check('PATCH is 405', $r['status'] === 405, $r);

    echo "CSRF\n";
    $token = $staff->csrf;
    $staff->csrf = null;
    $r = $staff->request('POST', '/api/assets.php', ['item_name' => 'x', 'category' => 'x', 'room_number' => 'x']);
    check('write without CSRF header is 403', $r['status'] === 403 && $r['body']['error']['code'] === 'CSRF_INVALID', $r);
    $staff->csrf = str_repeat('0', 64);
    $r = $staff->request('DELETE', "/api/assets.php?id=$id");
    check('write with wrong CSRF token is 403', $r['status'] === 403, $r);
    $r = $staff->request('POST', '/api/logout.php');
    check('logout with wrong CSRF token is 403', $r['status'] === 403, $r);
    $staff->csrf = $token;
    $r = $staff->request('GET', '/api/assets.php');
    check('reads do not need the CSRF header', $r['status'] === 200, $r);

    echo "Logout\n";
    $r = $staff->request('POST', '/api/logout.php');
    check('logout is 204 and expires the cookie', $r['status'] === 204 && (bool) preg_match('/Set-Cookie: staff_sid=deleted|Set-Cookie: staff_sid=;/i', $r['headers']), $r['headers']);
    $r = $staff->request('GET', '/api/assets.php');
    check('after logout, reads are 401', $r['status'] === 401, $r);
    $r = $staff->request('POST', '/api/logout.php');
    check('logout without a session still succeeds', $r['status'] === 204, $r);

    echo "Rate limiting\n";
    $pdo->exec('DELETE FROM rate_limit_hits');
    $locked = new Client($base);
    for ($i = 0; $i < 5; $i++) {
        $locked->login('tester', 'bad-guess-' . $i);
    }
    $r = $locked->login('tester', 'correct-horse-9');
    check('6th attempt after 5 failures is 429 even with the right password', $r['status'] === 429 && preg_match('/Retry-After: \d+/', $r['headers']), $r);
    $pdo->exec('DELETE FROM rate_limit_hits');
    $r = $locked->login('tester', 'correct-horse-9');
    check('login works again once the window is cleared', $r['status'] === 200, $r);
    $pdo->exec('DELETE FROM rate_limit_hits');
    $codes = [];
    for ($i = 0; $i < 21; $i++) {
        $codes[] = (new Client($base))->login('user' . $i, 'x')['status'];
    }
    check('more than 20 login attempts per IP in 15 min are 429', $codes[19] === 401 && $codes[20] === 429, $codes);
    $pdo->exec('DELETE FROM rate_limit_hits');

    echo "Routing\n";
    $r = $anon->request('GET', '/api/nope.php');
    check('unknown API endpoint is a JSON 404', $r['status'] === 404 && $r['body']['error']['code'] === 'NOT_FOUND', $r);
    $r = $anon->request('GET', '/api/../src/Db.php');
    check('path traversal to server source is not served', !str_contains((string) json_encode($r['body']), 'PDO'), $r);
} finally {
    proc_terminate($server);
}

echo "Session expiry\n";
$expiryPort = 18082;
$expiryServer = startServer($php, $serverDir, $expiryPort, ['DB_NAME' => $testDb, 'SESSION_IDLE_MINUTES' => 0]);
try {
    $idle = new Client("http://127.0.0.1:$expiryPort");
    $idle->login('tester', 'correct-horse-9');
    sleep(2);
    $r = $idle->request('GET', '/api/assets.php');
    check('idle session returns 401 SESSION_EXPIRED', $r['status'] === 401 && $r['body']['error']['code'] === 'SESSION_EXPIRED', $r);
    $r = $idle->request('GET', '/api/assets.php');
    check('expired session is destroyed (next call is UNAUTHENTICATED)', $r['status'] === 401 && $r['body']['error']['code'] === 'UNAUTHENTICATED', $r);
} finally {
    proc_terminate($expiryServer);
}

echo "\n$passed passed, $failed failed\n";
exit($failed === 0 ? 0 : 1);
