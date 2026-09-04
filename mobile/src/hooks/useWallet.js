import { useState, useEffect, useCallback } from 'react';
import { walletApi } from '../api/wallet';

/**
 * Base wallet hook - handles fetching, depositing, and withdrawing
 */
export const useWallet = () => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);
    const [isError, setIsError] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // useCallback matters here: `refetch` below is handed to useFocusEffect on
    // the wallet screen. As a fresh arrow function each render it changed
    // identity every time, re-firing the effect, setting state, and looping.
    const fetchWallet = useCallback(async (isManual = false) => {
        if (isManual) setIsRefetching(true);
        else setIsLoading(true);

        try {
            const wallet = await walletApi.getWallet();
            setData(wallet);
            setIsError(false);
        } catch (error) {
            console.error('Error fetching wallet:', error);
            setIsError(true);
        } finally {
            setIsLoading(false);
            setIsRefetching(false);
        }
    }, []);

    useEffect(() => {
        fetchWallet();
    }, [fetchWallet]);

    const deposit = async (depositData) => {
        setIsActionLoading(true);
        try {
            const res = await walletApi.deposit(depositData);
            await fetchWallet();
            return res;
        } catch (error) {
            throw error;
        } finally {
            setIsActionLoading(false);
        }
    };

    const withdraw = async (withdrawData) => {
        setIsActionLoading(true);
        try {
            const res = await walletApi.withdraw(withdrawData);
            await fetchWallet();
            return res;
        } catch (error) {
            throw error;
        } finally {
            setIsActionLoading(false);
        }
    };

    const verifyPayment = async (reference) => {
        setIsActionLoading(true);
        try {
            const res = await walletApi.verifyPayment(reference);
            await fetchWallet();
            return res;
        } catch (error) {
            throw error;
        } finally {
            setIsActionLoading(false);
        }
    };

    const refetch = useCallback(() => fetchWallet(true), [fetchWallet]);

    return {
        data,
        isLoading,
        isRefetching,
        isError,
        isActionLoading,
        refetch,
        deposit,
        withdraw,
        verifyPayment
    };
};

// Wrappers for compatibility with .mutate() and .isPending
const mutationWrapper = (mutationFn, isPending) => ({
    mutate: (vars, options) => {
        mutationFn(vars)
            .then(res => options?.onSuccess?.(res))
            .catch(err => options?.onError?.(err));
    },
    mutateAsync: mutationFn,
    isPending
});

export const useVerifyPayment = () => {
    const { verifyPayment, isActionLoading } = useWallet();
    return mutationWrapper(verifyPayment, isActionLoading);
};

export const useOptimisticDeposit = () => {
    const { deposit, isActionLoading } = useWallet();
    return mutationWrapper(deposit, isActionLoading);
};

export const useOptimisticWithdraw = () => {
    const { withdraw, isActionLoading } = useWallet();
    return mutationWrapper(withdraw, isActionLoading);
};
