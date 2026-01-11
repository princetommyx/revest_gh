/**
 * Performance monitoring utility for tracking app metrics
 * Track startup time, navigation speed, cache hits, etc.
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            startup: [],
            navigation: [],
            cacheHits: 0,
            cacheMisses: 0,
            apiCalls: 0,
        };

        this.targets = {
            appStartup: 800,        // Target: <800ms
            screenNavigation: 100,  // Target: <100ms
            cacheHitRate: 0.9,     // Target: 90%
        };
    }

    /**
     * Track screen load time
     */
    trackScreenLoad(screenName) {
        const start = performance.now();

        return () => {
            const end = performance.now();
            const duration = Math.round(end - start);

            this.metrics.navigation.push(duration);

            const pass = duration < this.targets.screenNavigation;
            console.log(
                `[Perf] ${screenName} loaded in ${duration}ms`,
                pass ? '✅' : `❌ (target: ${this.targets.screenNavigation}ms)`
            );

            return duration;
        };
    }

    /**
     * Track app startup time
     */
    trackStartup() {
        const start = performance.now();

        return () => {
            const end = performance.now();
            const duration = Math.round(end - start);

            this.metrics.startup.push(duration);

            const pass = duration < this.targets.appStartup;
            console.log(
                `[Perf] App startup: ${duration}ms`,
                pass ? '✅' : `❌ (target: ${this.targets.appStartup}ms)`
            );

            return duration;
        };
    }

    /**
     * Track cache hit/miss
     */
    trackCache(hit) {
        if (hit) {
            this.metrics.cacheHits++;
        } else {
            this.metrics.cacheMisses++;
            this.metrics.apiCalls++;
        }
    }

    /**
     * Get cache hit rate
     */
    getCacheHitRate() {
        const total = this.metrics.cacheHits + this.metrics.cacheMisses;
        if (total === 0) return 0;
        return this.metrics.cacheHits / total;
    }

    /**
     * Get average startup time
     */
    getAvgStartup() {
        if (this.metrics.startup.length === 0) return 0;
        const sum = this.metrics.startup.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.metrics.startup.length);
    }

    /**
     * Get average navigation time
     */
    getAvgNavigation() {
        if (this.metrics.navigation.length === 0) return 0;
        const sum = this.metrics.navigation.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.metrics.navigation.length);
    }

    /**
     * Print performance report
     */
    report() {
        const cacheHitRate = (this.getCacheHitRate() * 100).toFixed(1);
        const avgStartup = this.getAvgStartup();
        const avgNav = this.getAvgNavigation();

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 PERFORMANCE REPORT');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Avg Startup:       ${avgStartup}ms (target: ${this.targets.appStartup}ms)`);
        console.log(`Avg Navigation:    ${avgNav}ms (target: ${this.targets.screenNavigation}ms)`);
        console.log(`Cache Hit Rate:    ${cacheHitRate}% (target: ${this.targets.cacheHitRate * 100}%)`);
        console.log(`API Calls:         ${this.metrics.apiCalls}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Return summary for analytics
        return {
            avgStartup,
            avgNavigation: avgNav,
            cacheHitRate: parseFloat(cacheHitRate),
            apiCalls: this.metrics.apiCalls,
            passedTargets: {
                startup: avgStartup < this.targets.appStartup,
                navigation: avgNav < this.targets.screenNavigation,
                cacheHitRate: this.getCacheHitRate() >= this.targets.cacheHitRate,
            }
        };
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.metrics = {
            startup: [],
            navigation: [],
            cacheHits: 0,
            cacheMisses: 0,
            apiCalls: 0,
        };
    }
}

export const perfMonitor = new PerformanceMonitor();

// Auto-report in dev mode every 30 seconds
if (__DEV__) {
    setInterval(() => {
        if (perfMonitor.metrics.navigation.length > 0) {
            perfMonitor.report();
        }
    }, 30000);
}
