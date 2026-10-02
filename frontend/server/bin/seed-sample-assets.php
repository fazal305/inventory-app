<?php

declare(strict_types=1);

// Usage: php server/bin/seed-sample-assets.php
// Inserts a handful of clearly fictional sample assets for local development and screenshots.
// Refuses to run if the assets table already has rows, so it never mixes into real data.

require dirname(__DIR__) . '/src/bootstrap.php';

header_remove();
restore_exception_handler();

$db = App\Db::connection();
if ((int) $db->query('SELECT COUNT(*) FROM assets')->fetchColumn() > 0) {
    fwrite(STDERR, "The assets table is not empty; skipping sample data.\n");
    exit(1);
}

$samples = [
    ['Dell Latitude 7440 laptop', 'Laptop', 'B-204'],
    ['Lenovo ThinkPad T14', 'Laptop', 'B-204'],
    ['HP LaserJet Pro M404', 'Printer', 'A-110'],
    ['Dell UltraSharp 27" monitor', 'Monitor', 'B-210'],
    ['Logitech Rally Bar', 'Conference', 'C-301'],
    ['Cisco Catalyst 9200 switch', 'Networking', 'Server Room'],
    ['Epson EB-L200F projector', 'Projector', 'C-301'],
    ['APC Smart-UPS 1500', 'Power', 'Server Room'],
];

$stmt = $db->prepare('INSERT INTO assets (item_name, category, room_number) VALUES (?, ?, ?)');
foreach ($samples as $row) {
    $stmt->execute($row);
}

fwrite(STDOUT, 'Inserted ' . count($samples) . " sample assets.\n");
