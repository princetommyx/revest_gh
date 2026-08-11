import { useState, useEffect } from 'react';
import { marketApi } from '../api/market';

export const useListings = (params = {}) => {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);
    const [isError, setIsError] = useState(false);

    const fetchListings = async (isManual = false) => {
        if (isManual) setIsRefetching(true);
        else setIsLoading(true);

        try {
            const response = await marketApi.getListings(params);
            const listings = Array.isArray(response) ? response : (response.results || []);
            setData(listings);
            setIsError(false);
        } catch (error) {
            console.error('Error fetching listings:', error);
            setIsError(true);
        } finally {
            setIsLoading(false);
            setIsRefetching(false);
        }
    };

    useEffect(() => {
        fetchListings();
    }, [JSON.stringify(params)]);

    return { data, isLoading, isRefetching, isError, refetch: () => fetchListings(true) };
};
