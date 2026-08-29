import { useState, useEffect } from 'react';
import { logisticsApi } from '../api/logistics';
import { useAuth } from '../context/AuthContext';

/**
 * Hook to fetch pickup history for the current user
 * Sellers see pickups they requested, Collectors see pickups they accepted
 */
export const usePickupHistory = (status = null) => {
    const { user, userRole } = useAuth();
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);
    const [isError, setIsError] = useState(false);

    const fetchHistory = async (isManual = false) => {
        if (!user) return;
        if (isManual) setIsRefetching(true);
        else setIsLoading(true);

        try {
            // Was reading the live job-board list endpoint with `requester` /
            // `collector` params that its filterset doesn't declare, so they
            // were silently ignored - which meant collectors saw other
            // people's nearby PENDING requests as their history and never
            // their own completed jobs. /history/ scopes by role server-side.
            const response = await logisticsApi.getPickupHistory(status);
            setData(Array.isArray(response) ? response : (response.results || []));
            setIsError(false); // Reset error on successful fetch
        } catch (error) {
            console.error('Fetch pickup history error:', error);
            setIsError(true);
        } finally {
            setIsLoading(false);
            setIsRefetching(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [user?.id, status, userRole]);

    return { data, isLoading, isRefetching, isError, refetch: () => fetchHistory(true) };
};
