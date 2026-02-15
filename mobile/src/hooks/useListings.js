import { useQuery } from '@tanstack/react-query';
import { marketApi } from '../api/market';

export const useListings = (params = {}) => {
    return useQuery({
        queryKey: ['listings', params],
        queryFn: async () => {
            // Remove empty keys
            const cleanParams = Object.fromEntries(
                Object.entries(params).filter(([_, v]) => v != null && v !== '')
            );
            const data = await marketApi.getListings(cleanParams);
            return Array.isArray(data) ? data : (data.results || []);
        },
        keepPreviousData: true,
        staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
        cacheTime: 1000 * 60 * 30, // Keep in cache for 30 mins
    });
};
