<?php

declare(strict_types=1);

namespace App;

final class RateLimiter
{
    /** Throws 429 if the bucket already has $max hits within the window; otherwise records one. */
    public static function hit(string $bucket, int $max, int $windowSeconds): void
    {
        self::check($bucket, $max, $windowSeconds);
        self::record($bucket);
    }

    public static function check(string $bucket, int $max, int $windowSeconds): void
    {
        $db = Db::connection();

        // Occasional cleanup keeps the table small without a cron job.
        if (random_int(1, 50) === 1) {
            $db->prepare('DELETE FROM rate_limit_hits WHERE hit_at < NOW(3) - INTERVAL 1 DAY')->execute();
        }

        $stmt = $db->prepare(
            'SELECT COUNT(*) AS hits,
                    TIMESTAMPDIFF(SECOND, NOW(3), MIN(hit_at) + INTERVAL ? SECOND) AS retry_after
             FROM rate_limit_hits
             WHERE bucket = ? AND hit_at > NOW(3) - INTERVAL ? SECOND'
        );
        $stmt->execute([$windowSeconds, $bucket, $windowSeconds]);
        $row = $stmt->fetch();

        if ((int) $row['hits'] >= $max) {
            $retryAfter = max(1, (int) ($row['retry_after'] ?? $windowSeconds));
            throw new HttpError(
                429,
                'RATE_LIMITED',
                'Too many requests. Please wait a moment and try again.',
                null,
                ['Retry-After' => (string) $retryAfter],
            );
        }
    }

    public static function record(string $bucket): void
    {
        Db::connection()
            ->prepare('INSERT INTO rate_limit_hits (bucket, hit_at) VALUES (?, NOW(3))')
            ->execute([$bucket]);
    }

    public static function clear(string $bucket): void
    {
        Db::connection()->prepare('DELETE FROM rate_limit_hits WHERE bucket = ?')->execute([$bucket]);
    }
}
