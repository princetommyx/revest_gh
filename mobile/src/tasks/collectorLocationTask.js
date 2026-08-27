import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logisticsApi } from '../api/logistics';

// Name must be globally unique and stable across app launches - the OS
// relaunches the JS bundle headlessly to deliver updates while backgrounded,
// so this module (and defineTask below) must run at import time, not inside
// a component. It's imported for its side effect from mobile/index.js.
export const COLLECTOR_LOCATION_TASK = 'revesta-collector-location-task';

// TaskManager callbacks run outside the React tree (sometimes in a
// headless launch), so the active job id has to live in storage rather
// than component state.
export const ACTIVE_TRACKING_JOB_KEY = 'revesta_active_tracking_job_id';

TaskManager.defineTask(COLLECTOR_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
        console.warn('[CollectorLocationTask] Error:', error.message);
        return;
    }

    const locations = data?.locations;
    if (!locations || locations.length === 0) return;

    const jobId = await AsyncStorage.getItem(ACTIVE_TRACKING_JOB_KEY);
    if (!jobId) return;

    const latest = locations[locations.length - 1];
    const { latitude, longitude, heading, speed } = latest.coords;

    try {
        await logisticsApi.trackLocation(jobId, { latitude, longitude, heading, speed });
    } catch (e) {
        console.warn('[CollectorLocationTask] Failed to push location:', e?.message);
    }
});
