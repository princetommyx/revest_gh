import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';

import Toast from 'react-native-toast-message';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min - data stays fresh, no refetch
      cacheTime: 1000 * 60 * 30, // 30 min - keep in cache
      retry: 1, // Only retry once (not 3x default)
      refetchOnWindowFocus: false, // Don't refetch on every screen focus
      refetchOnMount: false, // Use cache if available
      refetchOnReconnect: true, // Do refetch after network restore
    },
  },
});

export default function App() {
  return (
    <>
      <ErrorBoundary>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
      <Toast />
    </>
  );
}
