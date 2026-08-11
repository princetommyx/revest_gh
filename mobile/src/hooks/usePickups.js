import { useState, useEffect } from 'react';
import { logisticsApi } from '../api/logistics';
import { useAuth } from '../context/AuthContext';

export const usePickups = (location) => {
    const { userRole } = useAuth();
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);
    const [isError, setIsError] = useState(false);

    const fetchPickups = async (isManual = false) => {
        if (isManual) setIsRefetching(true);
        else setIsLoading(true);

        try {
            if (userRole === 'COLLECTOR') {
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
    };

    useEffect(() => {
        if (userRole === 'COLLECTOR' ? !!location : true) {
            fetchPickups();
        }
    }, [userRole, location?.latitude, location?.longitude]);

    return { data, isLoading, isRefetching, isError, refetch: () => fetchPickups(true) }; // Returned isRefetching and modified refetch
};
