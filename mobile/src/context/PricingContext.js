import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { adminApi } from '../api/admin';

/**
 * Whether pricing, fees, and payment summaries should appear anywhere in the
 * UI. Mirrors the backend's WalletService.monetization_enabled() - off by
 * default, same reasoning: Revesta currently just connects disposers to
 * collectors to build the user base, and money is settled physically
 * between them, so showing prices/fees in the app would be misleading.
 *
 * Defaults to false (hidden) while the flag is loading, matching the
 * backend's own default - so there's no flash of pricing UI before this
 * resolves. Once monetization is switched on server-side, this picks it up
 * without an app update: screens that gate on `pricingEnabled` just start
 * showing their price UI again.
 */
const PricingContext = createContext({
    pricingEnabled: false,
    ready: false,
});

export function PricingProvider({ children }) {
    const [pricingEnabled, setPricingEnabled] = useState(false);
    const [ready, setReady] = useState(false);

    const fetchConfig = useCallback(async () => {
        try {
            const config = await adminApi.getAppConfig();
            setPricingEnabled(!!config?.monetization_enabled);
        } catch (e) {
            // Network hiccup or the app is offline - keep whatever value we
            // already had (or the safe `false` default on first load) rather
            // than erroring the whole app over a config flag.
        } finally {
            setReady(true);
        }
    }, []);

    useEffect(() => {
        fetchConfig();

        // Pick up an admin toggling this mid-session (e.g. flips monetization
        // on) the next time someone returns to the app, not just on cold start.
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') fetchConfig();
        });
        return () => sub.remove();
    }, [fetchConfig]);

    return (
        <PricingContext.Provider value={{ pricingEnabled, ready }}>
            {children}
        </PricingContext.Provider>
    );
}

export function usePricing() {
    return useContext(PricingContext);
}
