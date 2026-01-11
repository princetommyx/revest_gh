import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { walletApi } from '../api/wallet';
import Toast from 'react-native-root-toast';

/**
 * Base wallet query hook - fetches wallet data
 */
export const useWallet = () => {
    return useQuery({
        queryKey: ['wallet'],
        queryFn: async () => {
            const data = await walletApi.getWallet();
            return data;
        },
        staleTime: 1000 * 30, // 30 seconds
        retry: 2,
    });
};

/**
 * Verify payment mutation
 */
export const useVerifyPayment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (reference) => walletApi.verifyPayment(reference),
        onSuccess: (response) => {
            if (response.balance !== undefined) {
                queryClient.setQueryData(['wallet'], response);
                Toast.show("Payment verified!", { backgroundColor: '#27AE60' });
                return { verified: true };
            }
            Toast.show("Payment still pending", { backgroundColor: '#F39C12' });
            return { verified: false };
        },
        onError: () => {
            Toast.show("Verification failed", { backgroundColor: '#E74C3C' });
        },
    });
};


/**
 * Optimistic deposit mutation - UI updates instantly
 */
export const useOptimisticDeposit = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data) => walletApi.deposit(data),

        // ✅ Update UI BEFORE API call completes
        onMutate: async (newDeposit) => {
            // Cancel any outgoing refetches to avoid race conditions
            await queryClient.cancelQueries({ queryKey: ['wallet'] });

            // Snapshot the previous value for rollback
            const previousWallet = queryClient.getQueryData(['wallet']);

            // Optimistically update UI immediately
            queryClient.setQueryData(['wallet'], (old) => {
                if (!old) return old;

                return {
                    ...old,
                    // Don't update balance yet - wait for confirmation
                    recent_transactions: [
                        {
                            id: 'temp-' + Date.now(),
                            amount: newDeposit.amount,
                            transaction_type: 'DEPOSIT',
                            status: 'PENDING',
                            description: `MoMo Deposit via ${newDeposit.network}`,
                            created_at: new Date().toISOString(),
                        },
                        ...(old.recent_transactions || [])
                    ]
                };
            });

            Toast.show('Processing deposit...', { backgroundColor: '#2E7D32' });

            return { previousWallet };
        },

        // Rollback on error
        onError: (err, newDeposit, context) => {
            queryClient.setQueryData(['wallet'], context.previousWallet);
            Toast.show('Deposit failed - ' + (err.response?.data?.error || 'Please try again'), {
                backgroundColor: '#E74C3C'
            });
        },

        // Always refetch to ensure server state
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
        },
    });
};

/**
 * Optimistic withdrawal mutation - UI updates instantly
 */
export const useOptimisticWithdraw = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data) => walletApi.withdraw(data),

        onMutate: async (withdrawal) => {
            await queryClient.cancelQueries({ queryKey: ['wallet'] });
            const previousWallet = queryClient.getQueryData(['wallet']);

            // Optimistically deduct balance
            queryClient.setQueryData(['wallet'], (old) => {
                if (!old) return old;

                return {
                    ...old,
                    balance: old.balance - withdrawal.amount,
                    recent_transactions: [
                        {
                            id: 'temp-' + Date.now(),
                            amount: withdrawal.amount,
                            transaction_type: 'WITHDRAW',
                            status: 'PENDING',
                            description: `MoMo Withdrawal to ${withdrawal.network}`,
                            created_at: new Date().toISOString(),
                        },
                        ...(old.recent_transactions || [])
                    ]
                };
            });

            Toast.show('Processing withdrawal...', { backgroundColor: '#F39C12' });

            return { previousWallet };
        },

        onError: (err, withdrawal, context) => {
            queryClient.setQueryData(['wallet'], context.previousWallet);
            Toast.show('Withdrawal failed - ' + (err.response?.data?.error || 'Please try again'), {
                backgroundColor: '#E74C3C'
            });
        },

        onSuccess: () => {
            Toast.show('Withdrawal successful!', { backgroundColor: '#27AE60' });
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
        },
    });
};
