<?php

declare(strict_types=1);

/**
 * Sample data for manual/Postman testing — enough categories and products
 * (25+) to exercise pagination, search, filtering, and sorting once those
 * endpoints exist. Idempotent: uses INSERT IGNORE against the unique
 * name/slug/sku constraints, so re-running never duplicates rows.
 *
 * Usage: php database/seeders/seed.php
 */

require __DIR__ . '/../../src/Config/Env.php';
require __DIR__ . '/../../src/Config/Database.php';

use App\Config\Database;
use App\Config\Env;

Env::load(__DIR__ . '/../../.env');
$pdo = Database::connection();
$driver = Database::driver();

$categories = [
    ['name' => 'Electronics', 'slug' => 'electronics', 'description' => 'Devices, accessories, and components.'],
    ['name' => 'Furniture', 'slug' => 'furniture', 'description' => 'Office and home furniture.'],
    ['name' => 'Stationery', 'slug' => 'stationery', 'description' => 'Paper goods, writing tools, and office supplies.'],
    ['name' => 'Groceries', 'slug' => 'groceries', 'description' => 'Packaged food and household consumables.'],
];

// MySQL's INSERT IGNORE has no direct Postgres equivalent — ON CONFLICT
// DO NOTHING needs an explicit conflict target (the column with the unique
// constraint) instead of ignoring any constraint violation generically.
$insertCategory = $pdo->prepare($driver === 'pgsql'
    ? 'INSERT INTO categories (name, slug, description) VALUES (:name, :slug, :description) ON CONFLICT (name) DO NOTHING'
    : 'INSERT IGNORE INTO categories (name, slug, description) VALUES (:name, :slug, :description)');
foreach ($categories as $category) {
    $insertCategory->execute($category);
}

$categoryIds = $pdo->query('SELECT id, slug FROM categories')->fetchAll();
$idBySlug = array_column($categoryIds, 'id', 'slug');

$products = [];
$catalog = [
    'electronics' => ['Wireless Mouse', 'Mechanical Keyboard', 'USB-C Hub', 'Webcam 1080p', 'Bluetooth Speaker', 'Laptop Stand', 'Monitor Arm', 'Portable SSD 1TB'],
    'furniture' => ['Office Chair', 'Standing Desk', 'Bookshelf', 'Filing Cabinet', 'Desk Lamp', 'Conference Table'],
    'stationery' => ['Notebook A5', 'Ballpoint Pen Pack', 'Sticky Notes', 'Stapler', 'Whiteboard Markers', 'Binder Clips'],
    'groceries' => ['Coffee Beans 1kg', 'Green Tea Box', 'Pasta 500g', 'Olive Oil 1L', 'Rice 5kg', 'Cereal Box'],
];

$sku = 1000;
foreach ($catalog as $slug => $names) {
    foreach ($names as $name) {
        $sku++;
        $products[] = [
            'category_id' => $idBySlug[$slug],
            'name' => $name,
            'sku' => 'SKU-' . $sku,
            'description' => $name . ' — sample seed data.',
            'price' => round(mt_rand(500, 25000) / 100, 2),
            'quantity' => mt_rand(0, 200),
        ];
    }
}

$insertProduct = $pdo->prepare($driver === 'pgsql'
    ? 'INSERT INTO products (category_id, name, sku, description, price, quantity)
       VALUES (:category_id, :name, :sku, :description, :price, :quantity) ON CONFLICT (sku) DO NOTHING'
    : 'INSERT IGNORE INTO products (category_id, name, sku, description, price, quantity)
       VALUES (:category_id, :name, :sku, :description, :price, :quantity)');

$count = 0;
foreach ($products as $product) {
    $count += $insertProduct->execute($product) ? $insertProduct->rowCount() : 0;
}

// --- Assets ----------------------------------------------------------------
// A handful of individually tracked items (as opposed to the bulk `products`
// stock above), one per status, so pagination/filtering/history have
// something to show immediately after a fresh seed.
$assets = [
    [
        'asset_tag' => 'AST-1001', 'name' => 'Dell Latitude 5440 Laptop', 'category_id' => $idBySlug['electronics'],
        'serial_number' => 'SN-DL54-0001', 'status' => 'in_use', 'assigned_to' => 'Ada Lovelace',
        'location' => 'HQ - 3rd Floor', 'purchase_date' => '2024-02-10', 'purchase_cost' => 1299.00,
        'warranty_expires_at' => '2027-02-10', 'notes' => 'Primary engineering laptop.',
    ],
    [
        'asset_tag' => 'AST-1002', 'name' => '27" Monitor Arm', 'category_id' => $idBySlug['electronics'],
        'serial_number' => null, 'status' => 'in_storage', 'assigned_to' => null,
        'location' => 'Warehouse A - Shelf 4', 'purchase_date' => '2023-11-01', 'purchase_cost' => 89.50,
        'warranty_expires_at' => null, 'notes' => null,
    ],
    [
        'asset_tag' => 'AST-1003', 'name' => 'Standing Desk', 'category_id' => $idBySlug['furniture'],
        'serial_number' => 'SN-SD-7781', 'status' => 'under_repair', 'assigned_to' => 'Facilities',
        'location' => 'HQ - Repair Bay', 'purchase_date' => '2022-06-15', 'purchase_cost' => 420.00,
        'warranty_expires_at' => '2025-06-15', 'notes' => 'Motor making noise, sent for repair.',
    ],
    [
        'asset_tag' => 'AST-1004', 'name' => 'Conference Room Projector', 'category_id' => $idBySlug['electronics'],
        'serial_number' => 'SN-PJ-2290', 'status' => 'retired', 'assigned_to' => null,
        'location' => 'HQ - Storage', 'purchase_date' => '2019-01-20', 'purchase_cost' => 650.00,
        'warranty_expires_at' => '2021-01-20', 'notes' => 'Replaced by a newer model; kept for parts.',
    ],
    [
        'asset_tag' => 'AST-1005', 'name' => 'Office Chair (damaged)', 'category_id' => $idBySlug['furniture'],
        'serial_number' => null, 'status' => 'disposed', 'assigned_to' => null,
        'location' => null, 'purchase_date' => '2018-09-01', 'purchase_cost' => 180.00,
        'warranty_expires_at' => null, 'notes' => 'Frame cracked; disposed of at end of life.',
    ],
];

$insertAsset = $pdo->prepare($driver === 'pgsql'
    ? 'INSERT INTO assets
        (asset_tag, name, category_id, serial_number, status, assigned_to, location, purchase_date, purchase_cost, warranty_expires_at, notes)
       VALUES
        (:asset_tag, :name, :category_id, :serial_number, :status, :assigned_to, :location, :purchase_date, :purchase_cost, :warranty_expires_at, :notes)
       ON CONFLICT (asset_tag) DO NOTHING'
    : 'INSERT IGNORE INTO assets
        (asset_tag, name, category_id, serial_number, status, assigned_to, location, purchase_date, purchase_cost, warranty_expires_at, notes)
       VALUES
        (:asset_tag, :name, :category_id, :serial_number, :status, :assigned_to, :location, :purchase_date, :purchase_cost, :warranty_expires_at, :notes)');

$assetCount = 0;
foreach ($assets as $asset) {
    $assetCount += $insertAsset->execute($asset) ? $insertAsset->rowCount() : 0;
}

echo count($categories) . " categories ensured, {$count} product(s) inserted (" . count($products) . " total in seed set), {$assetCount} asset(s) inserted (" . count($assets) . " total in seed set).\n";
