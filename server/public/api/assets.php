<?php

declare(strict_types=1);

use App\AssetRepository;
use App\Auth;
use App\Http;
use App\HttpError;
use App\RateLimiter;
use App\Validator;

require dirname(__DIR__, 2) . '/src/bootstrap.php';

const ROOM_PATTERN = '/^[A-Za-z0-9][A-Za-z0-9 .\/#-]*$/u';
const ROOM_MESSAGE = 'Room number may use letters, numbers, spaces and . / # - only.';

function assetIdFromQuery(): int
{
    $raw = $_GET['id'] ?? '';
    if (!is_string($raw) || !ctype_digit($raw) || (int) $raw < 1 || strlen($raw) > 10) {
        throw new HttpError(400, 'INVALID_ID', 'A valid asset id is required.');
    }
    return (int) $raw;
}

$method = Http::allowMethods(['GET', 'POST', 'PUT', 'DELETE']);
$staff = Auth::requireStaff();

if ($method === 'GET') {
    RateLimiter::hit('read:' . $staff['id'], 300, 60);
    Http::json(200, AssetRepository::all());
}

Auth::requireCsrf();
RateLimiter::hit('write:' . $staff['id'], 60, 60);

switch ($method) {
    case 'POST':
        $asset = (new Validator(Http::jsonBody()))
            ->text('item_name', 'Item name', 100)
            ->text('category', 'Category', 50)
            ->text('room_number', 'Room number', 20, ROOM_PATTERN, ROOM_MESSAGE)
            ->validated();
        Http::json(201, AssetRepository::create($asset));

    case 'PUT':
        $id = assetIdFromQuery();
        $input = (new Validator(Http::jsonBody()))
            ->text('room_number', 'Room number', 20, ROOM_PATTERN, ROOM_MESSAGE)
            ->validated();
        $asset = AssetRepository::updateRoom($id, $input['room_number']);
        if ($asset === null) {
            throw new HttpError(404, 'NOT_FOUND', 'That asset no longer exists. It may have been removed by someone else.');
        }
        Http::json(200, $asset);

    case 'DELETE':
        if (!AssetRepository::delete(assetIdFromQuery())) {
            throw new HttpError(404, 'NOT_FOUND', 'That asset no longer exists. It may have been removed by someone else.');
        }
        Http::noContent();
}
