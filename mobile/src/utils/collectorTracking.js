import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLLECTOR_LOCATION_TASK, ACTIVE_TRACKING_JOB_KEY } from '../tasks/collectorLocationTask';

/**
 * Starts (or re-targets) background GPS streaming for a collector's active job.
 * Updates keep flowing to the server via the background task even if the
 * app is backgrounded or the screen locks - this is what makes tracking
 * feel "live" instead of only while the app is open.
 */
export async function startCollectorLocationTracking(jobId) {
    if (!jobId) return false;

    try {
        await AsyncStorage.setItem(ACTIVE_TRACKING_JOB_KEY, String(jobId));

        const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
        if (fgStatus !== 'granted') {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return false;
        }

        // Best-effort: background permission unlocks tracking while the app
        // isn't in the foreground. If the user denies it, updates still work
        // whenever the app is open/foregrounded.
        const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
            await Location.requestBackgroundPermissionsAsync();
        }

        const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(COLLECTOR_LOCATION_TASK);
        if (alreadyRunning) return true;

        await Location.startLocationUpdatesAsync(COLLECTOR_LOCATION_TASK, {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 15,
            showsBackgroundLocationIndicator: true,
            pausesUpdatesAutomatically: false,
            foregroundService: {
                notificationTitle: 'Revesta is tracking your trip',
                notificationBody: 'Sharing your live location with the disposer until this job is done.',
                notificationColor: '#27AE60',
            },
        });
        return true;
    } catch (e) {
        console.warn('Failed to start collector location tracking:', e?.message);
        return false;
    }
}

export async function stopCollectorLocationTracking() {
    try {
        await AsyncStorage.removeItem(ACTIVE_TRACKING_JOB_KEY);
        const isRunning = await Location.hasStartedLocationUpdatesAsync(COLLECTOR_LOCATION_TASK);
        if (isRunning) {
            await Location.stopLocationUpdatesAsync(COLLECTOR_LOCATION_TASK);
        }
    } catch (e) {
        console.warn('Failed to stop collector location tracking:', e?.message);
    }
}
