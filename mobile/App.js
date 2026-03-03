import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Toast from 'react-native-toast-message';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppNavigator />
          </NotificationProvider>
        </AuthProvider>
      </SafeAreaProvider>
      <Toast />
    </QueryClientProvider>
  );
}
