<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Responses\ApiResponse;
use App\Services\AssetService;
use App\Support\RouteParams;

final class AssetController
{
    public function __construct(private readonly AssetService $assets)
    {
    }

    public function index(array $params, ?array $body, array $query = []): void
    {
        $result = $this->assets->list($query);
        ApiResponse::success($result['data'], $result['meta']);
    }

    public function show(array $params, ?array $body): void
    {
        ApiResponse::success($this->assets->find($this->id($params)));
    }

    public function history(array $params, ?array $body): void
    {
        ApiResponse::success($this->assets->history($this->id($params)));
    }

    public function store(array $params, ?array $body): void
    {
        ApiResponse::success($this->assets->create($body ?? []), status: 201);
    }

    public function replace(array $params, ?array $body): void
    {
        ApiResponse::success($this->assets->replace($this->id($params), $body ?? []));
    }

    public function patch(array $params, ?array $body): void
    {
        ApiResponse::success($this->assets->patch($this->id($params), $body ?? []));
    }

    public function destroy(array $params, ?array $body): void
    {
        $this->assets->delete($this->id($params));
        ApiResponse::noContent();
    }

    private function id(array $params): int
    {
        return RouteParams::id($params);
    }
}
