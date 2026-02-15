import { useQuery } from '@tanstack/react-query';
import { logisticsApi } from '../api/logistics';
import { useAuth } from '../context/AuthContext';

export const usePickups = (location) => {
    const { userRole } = useAuth();

    return useQuery({
        queryKey: ['pickups', userRole, location?.latitude],
        queryFn: async () => {
            if (userRole === 'COLLECTOR') {
                if (!location) return [];
                // Collectors see PENDING jobs (to accept) + their own active jobs (ACCEPTED/ARRIVED)
                const data = await logisticsApi.getPickupRequests({
                    lat: location.latitude,
                    lon: location.longitude,
                    // Remove status filter to get all jobs - backend filters appropriately
                });
                return Array.isArray(data) ? data : (data.results || []);
            } else {
                // For sellers, fetch all and filter client-side to show only active requests
                const data = await logisticsApi.getPickupRequests();
                const allPickups = Array.isArray(data) ? data : (data.results || []);
                // Exclude CANCELLED and COMPLETED from map view
                return allPickups.filter(p => p.status !== 'CANCELLED' && p.status !== 'COMPLETED');
            }
        },
        // Only run for collectors if location is available. 
        // For others (Recycler/Seller), run immediately.
        enabled: userRole === 'COLLECTOR' ? !!location : true,
        staleTime: 1000 * 30, // 30 seconds
        retry: 2, // Retry failed requests 2 times
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
        refetchOnWindowFocus: false, // Don't refetch on every focus (performance)
        refetchOnReconnect: true, // Do refetch when network reconnects
        refetchInterval: 30000, // Auto-refresh every 30 seconds (reduced from 10s for performance)
    });
};
