import { useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';

const LOCATION_TASK_NAME = 'REVESTA_COLLECTOR_TRACKING';
const ACTIVE_JOB_KEY = '@revesta_active_tracking_job';
const OFFLINE_QUEUE_KEY = '@revesta_offline_locations';

// Define the headless background task (Runs even when app is backgrounded/locked)
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error("Background Location Task Error:", error);
        return;
    }
    if (data) {
        const { locations } = data;
        const location = locations[0];
        
        if (location) {
            try {
                // Headless tasks don't share React state, so we read context from AsyncStorage
                const activeJobStr = await AsyncStorage.getItem(ACTIVE_JOB_KEY);
                if (!activeJobStr) return; // No active job to track
                
                const { pickupRequestId, collectorId } = JSON.parse(activeJobStr);
                
                const telemetry = {
                    collector_id: collectorId,
                    pickup_request_id: pickupRequestId,
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    heading: location.coords.heading || 0,
                    speed: location.coords.speed || 0,
                    // If you have expo-battery installed, you could read it here
                };

                // Sync offline queue if we have network back
                let offlineQueue = [];
                const queueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
                if (queueStr) offlineQueue = JSON.parse(queueStr);

                const batch = [...offlineQueue, telemetry];

                // Attempt to push to Supabase
                const { error: dbError } = await supabase
                    .from('collector_locations')
                    .insert(batch);

                if (dbError) {
                    // Network failed? Push current telemetry to queue and save
                    console.warn("Supabase Sync Failed, buffering locally:", dbError.message);
                    offlineQueue.push(telemetry);
                    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue));
                } else {
                    // Success! Clear offline queue
                    if (offlineQueue.length > 0) {
                        await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
                    }
                }
            } catch (err) {
                console.error("Exception in Location Task:", err);
            }
        }
    }
});

/**
 * Hook for Collectors to broadcast their location to Supabase.
 * Automatically handles foreground & background location permissions.
 */
export function useCollectorTracker() {
    const [isTracking, setIsTracking] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);

    // Initial permission check
    useEffect(() => {
        (async () => {
            const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
            const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
            if (fgStatus === 'granted' && bgStatus === 'granted') {
                setPermissionGranted(true);
            }
        })();
    }, []);

    const requestPermissions = async () => {
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus !== 'granted') {
            alert('Foreground location permission is required to track pickups.');
            return false;
        }
        
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
            alert('Background location permission is highly recommended so we can track you while you use navigation apps.');
            // We can still proceed with foreground-only tracking if background is denied,
            // but the background task won't fire when locked.
        }

        setPermissionGranted(true);
        return true;
    };

    /**
     * Start broadcasting live location for a specific job
     */
    const startTracking = useCallback(async (pickupRequestId, collectorId) => {
        if (!permissionGranted) {
            const granted = await requestPermissions();
            if (!granted) return;
        }

        try {
            // Save context for the headless task
            await AsyncStorage.setItem(ACTIVE_JOB_KEY, JSON.stringify({ pickupRequestId, collectorId }));

            // Start the background location updates
            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: 4000, // Update every 4 seconds
                fastestInterval: 2000,
                distanceInterval: 5, // Update every 5 meters moved
                showsBackgroundLocationIndicator: true,
                foregroundService: {
                    notificationTitle: "Revesta Hauler Active",
                    notificationBody: "Tracking pickup route...",
                    notificationColor: "#059669",
                },
                pausesUpdatesAutomatically: false,
            });

            setIsTracking(true);
            console.log(`Started tracking for Job ${pickupRequestId}`);
        } catch (error) {
            console.error("Failed to start tracking:", error);
        }
    }, [permissionGranted]);

    /**
     * Stop broadcasting and cleanup
     */
    const stopTracking = useCallback(async () => {
        try {
            const hasTask = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
            if (hasTask) {
                await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            }
            await AsyncStorage.removeItem(ACTIVE_JOB_KEY);
            setIsTracking(false);
            console.log("Stopped tracking.");
        } catch (error) {
            console.error("Failed to stop tracking:", error);
        }
    }, []);

    // Cleanup on unmount if we somehow unmount the root provider (unlikely for global hooks)
    useEffect(() => {
        return () => {
            // Note: Be careful auto-stopping on unmount if this hook is used inside a Screen component!
            // If the user navigates to another screen, it will kill the background tracker.
            // Only uncomment the below if this hook is mounted at the highest App.js level.
            // stopTracking(); 
        };
    }, []);

    return {
        isTracking,
        startTracking,
        stopTracking,
        requestPermissions,
        permissionGranted
    };
}
