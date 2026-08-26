import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/ToastConfig';
import NetworkBanner from './src/components/NetworkBanner';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppNavigator />
            <NetworkBanner />
          </NotificationProvider>
        </AuthProvider>
      </SafeAreaProvider>
      <Toast config={toastConfig} />
    </QueryClientProvider>
  );
}
