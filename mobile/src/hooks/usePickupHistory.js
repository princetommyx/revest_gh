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
            const params = {};

            // Filter by user role
            if (userRole === 'SELLER') {
                params.requester = user.id;
            } else if (userRole === 'COLLECTOR') {
                params.collector = user.id;
            }

            // Filter by status if provided
            if (status && status !== 'ALL') {
                params.status = status;
            }

            const response = await logisticsApi.getPickupRequests(params);
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
