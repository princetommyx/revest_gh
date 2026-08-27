import AsyncStorage from '@react-native-async-storage/async-storage';

const ONLINE_PREFERENCE_KEY = 'revesta_collector_online_preference';

/**
 * Whether the collector wants to be discoverable for new pickup requests.
 * Defaults to true (previous behavior: always online while the app is
 * active) so existing users aren't silently opted out by this preference
 * appearing. The Home screen's online/offline toggle writes here; the
 * presence heartbeat in PickupsScreen reads it before pushing is_online.
 */
export async function getOnlinePreference() {
    try {
        const stored = await AsyncStorage.getItem(ONLINE_PREFERENCE_KEY);
        if (stored === null) return true;
        return stored === 'true';
    } catch (e) {
        return true;
    }
}

export async function setOnlinePreference(isOnline) {
    try {
        await AsyncStorage.setItem(ONLINE_PREFERENCE_KEY, isOnline ? 'true' : 'false');
    } catch (e) {
        console.warn('Failed to save online preference:', e?.message);
    }
}
