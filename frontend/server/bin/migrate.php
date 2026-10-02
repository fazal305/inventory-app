<?php

declare(strict_types=1);

// Usage: php server/bin/migrate.php
// Applies database/schema.sql to the database configured in server/.env.

require dirname(__DIR__) . '/src/bootstrap.php';

header_remove();
restore_exception_handler();

$sql = file_get_contents(dirname(__DIR__) . '/database/schema.sql');
$statements = array_filter(array_map('trim', explode(';', preg_replace('/^\s*--.*$/m', '', $sql))));

foreach ($statements as $statement) {
    App\Db::connection()->exec($statement);
}

fwrite(STDOUT, 'Applied ' . count($statements) . " schema statements.\n");
