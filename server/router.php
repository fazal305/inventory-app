<?php

declare(strict_types=1);

// Router for PHP's built-in server. Serves the JSON API from public/api and the built
// React app from client/dist on the same origin, so the session cookie stays first-party.
//
//   php -S 127.0.0.1:8080 -t server/public server/router.php

$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');

if (str_starts_with($path, '/api/')) {
    if (preg_match('#^/api/[a-z]+\.php$#', $path) && is_file(__DIR__ . '/public' . $path)) {
        return false;
    }
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"error":{"code":"NOT_FOUND","message":"Unknown API endpoint."}}';
    return true;
}

$dist = realpath(dirname(__DIR__) . '/client/dist');
if ($dist === false) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo "The client has not been built. Run `npm run build` in client/, or use `npm run dev` for development.\n";
    return true;
}

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Frame-Options: DENY');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
header(
    "Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; font-src 'self'; "
    . "connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
);

$file = realpath($dist . $path);
if ($file !== false && is_file($file) && str_starts_with($file, $dist . DIRECTORY_SEPARATOR)) {
    $types = [
        'html' => 'text/html; charset=utf-8',
        'js' => 'text/javascript; charset=utf-8',
        'css' => 'text/css; charset=utf-8',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'ico' => 'image/x-icon',
        'webp' => 'image/webp',
        'woff2' => 'font/woff2',
        'woff' => 'font/woff',
        'txt' => 'text/plain; charset=utf-8',
        'xml' => 'application/xml',
        'webmanifest' => 'application/manifest+json',
        'json' => 'application/json',
    ];
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
    // Vite fingerprints everything under /assets, so those can be cached forever.
    header(str_starts_with($path, '/assets/') ? 'Cache-Control: public, max-age=31536000, immutable' : 'Cache-Control: no-cache');
    readfile($file);
    return true;
}

// Missing files with an extension are real 404s; extensionless paths are client-side routes.
if (pathinfo($path, PATHINFO_EXTENSION) !== '') {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Not found\n";
    return true;
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');
readfile($dist . '/index.html');
return true;
