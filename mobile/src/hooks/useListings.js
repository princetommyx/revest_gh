import { useQuery } from '@tanstack/react-query';
import { marketApi } from '../api/market';

export const useListings = (params = {}) => {
    return useQuery({
        queryKey: ['listings', params],
        queryFn: async () => {
            const data = await marketApi.getListings(params);
            return Array.isArray(data) ? data : (data.results || []);
        },
        keepPreviousData: true,
        staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
        cacheTime: 1000 * 60 * 30, // Keep in cache for 30 mins
    });
};
