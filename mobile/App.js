import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';

import Toast from 'react-native-toast-message';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

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
