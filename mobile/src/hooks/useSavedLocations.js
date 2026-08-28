import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'saved_locations';

/**
 * Saved pickup locations, persisted on-device.
 *
 * There is no backend model for saved locations, so this mirrors the
 * approach already used for recent pickup locations rather than pretending
 * a server round-trip exists. Each entry is
 * { id, label, address, latitude, longitude, kind }.
 */
export function useSavedLocations() {
    const [savedLocations, setSavedLocations] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const saved = await AsyncStorage.getItem(STORAGE_KEY);
                if (saved) setSavedLocations(JSON.parse(saved));
            } catch (e) {
                console.log('Error loading saved locations:', e);
            } finally {
                setIsLoaded(true);
            }
        })();
    }, []);

    const persist = useCallback((next) => {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
            .catch(e => console.log('Error saving locations:', e));
        return next;
    }, []);

    const addLocation = useCallback((location) => {
        if (!location?.address || !location?.label) return;
        setSavedLocations(prev => persist([
            ...prev,
            {
                id: `${Date.now()}`,
                label: location.label,
                address: location.address,
                latitude: location.latitude ?? null,
                longitude: location.longitude ?? null,
                kind: location.kind || 'OTHER',
            },
        ]));
    }, [persist]);

    const removeLocation = useCallback((id) => {
        setSavedLocations(prev => persist(prev.filter(loc => loc.id !== id)));
    }, [persist]);

    return { savedLocations, addLocation, removeLocation, isLoaded };
}
