<?php

declare(strict_types=1);

use App\Auth;
use App\Http;

require dirname(__DIR__, 2) . '/src/bootstrap.php';

Http::allowMethods(['GET']);

$staff = Auth::requireStaff();

Http::json(200, ['username' => $staff['username'], 'csrf_token' => $_SESSION['csrf_token']]);
