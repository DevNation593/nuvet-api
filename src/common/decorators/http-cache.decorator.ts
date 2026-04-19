import { SetMetadata } from '@nestjs/common';

export const HTTP_CACHE_TTL_KEY = 'http_cache_ttl';

/**
 * Marks a GET endpoint for Redis-backed HTTP caching.
 * The cache key includes the tenant ID and the full URL so that
 * different tenants (and different query params) get separate entries.
 *
 * @param ttlSeconds  Cache time-to-live in seconds (default 60)
 */
export const HttpCache = (ttlSeconds = 60) =>
    SetMetadata(HTTP_CACHE_TTL_KEY, ttlSeconds);
