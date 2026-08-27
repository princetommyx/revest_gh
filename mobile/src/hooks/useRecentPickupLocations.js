import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'recent_pickup_locations';
const MAX_RECENTS = 5;

/**
 * Single source of truth for recently-used pickup addresses, shared
 * between HomeScreen (one-tap chips on the primary CTA) and
 * PickupsScreen (the location search modal). Previously each screen/path
 * wrote its own shape into this list - one persisted {address, timestamp},
 * another only updated in-memory state with a different {name, lat, lon}
 * shape - so the list could end up with inconsistent, partially-lost
 * entries depending on which path was used last.
 */
export function useRecentPickupLocations() {
    const [recentLocations, setRecentLocations] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const saved = await AsyncStorage.getItem(STORAGE_KEY);
                if (saved) setRecentLocations(JSON.parse(saved));
            } catch (e) {
                console.log('Error loading recent locations:', e);
            } finally {
                setIsLoaded(true);
            }
        })();
    }, []);

    const addRecentLocation = useCallback((location) => {
        if (!location?.address) return;
        setRecentLocations(prev => {
            const updated = [
                {
                    address: location.address,
                    latitude: location.latitude ?? null,
                    longitude: location.longitude ?? null,
                    timestamp: Date.now(),
                },
                ...prev.filter(loc => loc.address !== location.address)
            ].slice(0, MAX_RECENTS);

            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
                .catch(e => console.log('Error saving recent location:', e));

            return updated;
        });
    }, []);

    return { recentLocations, addRecentLocation, isLoaded };
}
