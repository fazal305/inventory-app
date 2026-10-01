<?php

declare(strict_types=1);

use App\Auth;
use App\Http;

require dirname(__DIR__, 2) . '/src/bootstrap.php';

Http::allowMethods(['POST']);

Auth::startSession();

// Signing out of an already-expired session still succeeds, so the client can always reset.
if (isset($_SESSION['staff_id'])) {
    Auth::requireCsrf();
}

Auth::destroySession();
Http::noContent();
