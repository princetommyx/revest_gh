import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes } from './tokens';

const STORAGE_KEY = '@revesta/theme-preference';

// 'system' follows the device; 'light'/'dark' pin it.
export const THEME_MODES = ['system', 'light', 'dark'];

const ThemeContext = createContext({
    colors: themes.light,
    scheme: 'light',
    isDark: false,
    mode: 'system',
    setMode: () => {},
    ready: false,
});

export function ThemeProvider({ children }) {
    const systemScheme = useColorScheme();
    const [mode, setModeState] = useState('system');
    // Gates the first paint: without this the app renders light, then snaps to
    // dark once the stored preference loads.
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (!cancelled && stored && THEME_MODES.includes(stored)) {
                    setModeState(stored);
                }
            } catch (e) {
                // Fall back to following the system.
            } finally {
                if (!cancelled) setReady(true);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const setMode = useCallback(async (next) => {
        if (!THEME_MODES.includes(next)) return;
        setModeState(next);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, next);
        } catch (e) {
            // Preference just won't survive a restart.
        }
    }, []);

    const value = useMemo(() => {
        const scheme = mode === 'system' ? (systemScheme || 'light') : mode;
        const isDark = scheme === 'dark';
        return {
            colors: isDark ? themes.dark : themes.light,
            scheme,
            isDark,
            mode,
            setMode,
            ready,
        };
    }, [mode, systemScheme, setMode, ready]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    return useContext(ThemeContext);
}

/**
 * Builds a themed StyleSheet.
 *
 * StyleSheet.create runs once at module scope, which is exactly why the app's
 * existing styles can't react to a theme change. This keeps the same authoring
 * shape - one factory taking the palette - and memoises per scheme so the
 * sheet is created twice at most, not on every render.
 *
 *   const useStyles = makeStyles((c) => ({ box: { backgroundColor: c.surface } }));
 *   ...
 *   const styles = useStyles();
 */
export function makeStyles(factory) {
    const cache = {};
    return function useStyles() {
        const { colors, scheme } = useTheme();
        return useMemo(() => {
            if (!cache[scheme]) {
                cache[scheme] = StyleSheet.create(factory(colors));
            }
            return cache[scheme];
        }, [scheme, colors]);
    };
}
