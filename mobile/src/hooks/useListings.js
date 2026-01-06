import { useQuery } from '@tanstack/react-query';
import { marketApi } from '../api/market';

export const useListings = () => {
    return useQuery({
        queryKey: ['listings'],
        queryFn: async () => {
            const data = await marketApi.getListings();
            return Array.isArray(data) ? data : (data.results || []);
        },
        staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
        cacheTime: 1000 * 60 * 30, // Keep in cache for 30 mins
    });
};
