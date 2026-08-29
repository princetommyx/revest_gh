import { useState, useEffect, useCallback } from 'react';
import { logisticsApi } from '../api/logistics';
import { useAuth } from '../context/AuthContext';

export const usePickups = (location) => {
    const { userRole } = useAuth();
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);
    const [isError, setIsError] = useState(false);

    // RECYCLER is a job-board picker-upper exactly like COLLECTOR (see
    // isCollectorRole elsewhere in the app), but this only checked for
    // 'COLLECTOR' - a recycler fell into the else branch below, which calls
    // the endpoint with no lat/lon and gets back only jobs *they* raised as
    // a requester (effectively empty for a pure collector-side account), so
    // nearby pending jobs and their own accepted jobs never appeared.
    const isCollectorRole = userRole === 'COLLECTOR' || userRole === 'RECYCLER';

    const fetchPickups = useCallback(async (isManual = false) => {
        if (isManual) setIsRefetching(true);
        else setIsLoading(true);

        try {
            if (isCollectorRole) {
                if (!location) {
                    setData([]);
                    return;
                }
                const response = await logisticsApi.getPickupRequests({
                    lat: location.latitude,
                    lon: location.longitude,
                });
                setData(Array.isArray(response) ? response : (response.results || []));
            } else {
                const response = await logisticsApi.getPickupRequests();
                const allPickups = Array.isArray(response) ? response : (response.results || []);
                setData(allPickups.filter(p => p.status !== 'CANCELLED' && p.status !== 'COMPLETED'));
            }
            setIsError(false); // Clear error on successful fetch
        } catch (error) {
            console.error('Fetch pickups error:', error);
            setIsError(true);
        } finally {
            setIsLoading(false);
            setIsRefetching(false); // Reset isRefetching
        }
    }, [isCollectorRole, location?.latitude, location?.longitude]);

    useEffect(() => {
        if (isCollectorRole ? !!location : true) {
            fetchPickups();
        }
        // Deliberately keyed on lat/lon primitives, not the `location` object -
        // a new location object arrives on every GPS tick even when the
        // collector hasn't meaningfully moved, which would refire this on
        // every tick instead of only when it actually matters.
    }, [fetchPickups, isCollectorRole, location?.latitude, location?.longitude]);

    // `refetch` used to be a fresh arrow function every render, so any effect
    // that depended on it (e.g. a polling interval) got torn down and
    // recreated on every re-render instead of ever completing its interval.
    // useCallback keeps its identity stable across renders that don't
    // actually change what it does.
    const refetch = useCallback(() => fetchPickups(true), [fetchPickups]);

    return { data, isLoading, isRefetching, isError, refetch };
};
