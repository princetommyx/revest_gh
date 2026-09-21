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


/**
 * Stops any background location task the OS still has registered for this
 * app under a name we no longer define.
 *
 * Android keeps a location-updates registration alive across app restarts
 * and reinstalls-in-place, so a task name that has been deleted from the
 * source is still requested by the OS on launch. An earlier tracker used
 * 'REVESTA_COLLECTOR_TRACKING'; that code is gone, but devices that ran it
 * carry the registration forever, and every launch logs "Execution of
 * REVESTA_COLLECTOR_TRACKING was requested but looks like it is not
 * defined". Worse than the noise: the OS is waking the app to run a task
 * that no longer exists, and the real tracker below cannot start while a
 * stale one holds the slot.
 *
 * Deliberately keyed on "not this task" rather than on the old name, so a
 * future rename cleans up after itself without anyone having to remember.
 */
export async function stopOrphanedLocationTasks() {
    try {
        const tasks = await TaskManager.getRegisteredTasksAsync();
        for (const task of tasks) {
            if (task.taskName === COLLECTOR_LOCATION_TASK) continue;
            if (task.taskType !== 'location') continue;
            await TaskManager.unregisterTaskAsync(task.taskName);
            console.warn(`[CollectorLocationTask] Removed orphaned location task: ${task.taskName}`);
        }
    } catch (e) {
        // Never fatal: a device with no registrations, or an OS that refuses
        // the query, must still boot the app normally.
        console.warn('[CollectorLocationTask] Could not clean orphaned tasks:', e?.message);
    }
}
