import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Three-layer cache manager for Bolt-level performance
 * Layer 1: Memory Cache (instant - 0ms)
 * Layer 2: AsyncStorage (fast - 10-50ms)
 * Layer 3: Network (slow - 200-2000ms)
 */
class CacheManager {
    constructor() {
        this.memoryCache = new Map();
        this.TTL = {
            short: 1000 * 60 * 5,      // 5 minutes
            medium: 1000 * 60 * 30,    // 30 minutes
            long: 1000 * 60 * 60 * 24  // 24 hours
        };
    }

    /**
     * Get data with automatic fallback through cache layers
     */
    async get(key, fetchFn, ttl = this.TTL.medium) {
        // Layer 1: Memory cache (instant)
        const memCached = this.memoryCache.get(key);
        if (memCached && Date.now() - memCached.timestamp < ttl) {
            console.log(`[Cache] HIT Memory: ${key}`);
            return memCached.data;
        }

        // Layer 2: Persistent cache (fast)
        try {
            const persisted = await AsyncStorage.getItem(`cache:${key}`);
            if (persisted) {
                const parsed = JSON.parse(persisted);
                if (Date.now() - parsed.timestamp < ttl) {
                    console.log(`[Cache] HIT Persistent: ${key}`);
                    this.memoryCache.set(key, parsed);

                    // Stale-while-revalidate: return cached, update in background
                    this.revalidate(key, fetchFn, ttl);

                    return parsed.data;
                }
            }
        } catch (e) {
            console.error('[Cache] Read error:', e);
        }

        // Layer 3: Network (slow but fresh)
        console.log(`[Cache] MISS: ${key} - Fetching from network`);
        return this.fetchAndCache(key, fetchFn, ttl);
    }

    /**
     * Fetch from network and cache in both layers
     */
    async fetchAndCache(key, fetchFn, ttl) {
        const data = await fetchFn();
        const cacheData = { data, timestamp: Date.now() };

        // Store in both layers
        this.memoryCache.set(key, cacheData);

        try {
            await AsyncStorage.setItem(`cache:${key}`, JSON.stringify(cacheData));
        } catch (e) {
            console.error('[Cache] Write error:', e);
        }

        return data;
    }

    /**
     * Background revalidation (stale-while-revalidate pattern)
     */
    async revalidate(key, fetchFn, ttl) {
        // Don't block - update in background
        setTimeout(async () => {
            try {
                await this.fetchAndCache(key, fetchFn, ttl);
                console.log(`[Cache] Revalidated: ${key}`);
            } catch (e) {
                console.error('[Cache] Revalidation failed:', e);
                // Keep using stale data on error
            }
        }, 100);
    }

    /**
     * Manually invalidate cache
     */
    async invalidate(key) {
        this.memoryCache.delete(key);
        try {
            await AsyncStorage.removeItem(`cache:${key}`);
        } catch (e) {
            console.error('[Cache] Invalidation error:', e);
        }
    }

    /**
     * Clear all cache
     */
    async clear() {
        this.memoryCache.clear();
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(k => k.startsWith('cache:'));
            await AsyncStorage.multiRemove(cacheKeys);
        } catch (e) {
            console.error('[Cache] Clear error:', e);
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            memorySize: this.memoryCache.size,
            memoryKeys: Array.from(this.memoryCache.keys())
        };
    }
}

export const cache = new CacheManager();
