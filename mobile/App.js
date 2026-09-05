import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { PricingProvider } from './src/context/PricingContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/ToastConfig';
import NetworkBanner from './src/components/NetworkBanner';
import { ThemeProvider } from './src/theme/ThemeContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';

const queryClient = new QueryClient();

export default function App() {
  return (
    // Outermost, deliberately theme-independent (see ErrorBoundary.js): without
    // this, an uncaught render error anywhere below - a bad screen, even a
    // context provider itself - unmounts the whole tree and leaves a blank
    // screen with no way back short of force-quitting the app.
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* Outermost so navigation chrome, the status bar and every screen read
            from the same theme. */}
        <ThemeProvider>
          <SafeAreaProvider>
            <AuthProvider>
              <NotificationProvider>
                <PricingProvider>
                  <AppNavigator />
                  <NetworkBanner />
                </PricingProvider>
              </NotificationProvider>
            </AuthProvider>
          </SafeAreaProvider>
          <Toast config={toastConfig} />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
