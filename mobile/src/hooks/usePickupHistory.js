import { useQuery } from '@tanstack/react-query';
import { logisticsApi } from '../api/logistics';
import { useAuth } from '../context/AuthContext';

/**
 * Hook to fetch pickup history for the current user
 * Sellers see pickups they requested, Collectors see pickups they accepted
 */
export const usePickupHistory = (status = null) => {
    const { user, userRole } = useAuth();

    return useQuery({
        queryKey: ['pickup-history', user?.id, status, userRole],
        queryFn: async () => {
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

            const data = await logisticsApi.getPickupRequests(params);
            // Ensure we return an array
            return Array.isArray(data) ? data : (data.results || []);
        },
        staleTime: 1000 * 60 * 2, // 2 minutes - shorter for more up-to-date data
        enabled: !!user, // Only run if user is logged in
    });
};
