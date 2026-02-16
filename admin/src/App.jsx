import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';
import UserDetailPage from './pages/UserDetailPage';
import SystemUsersPage from './pages/SystemUsersPage';
import NotificationsPage from './pages/NotificationsPage';
import ListingsPage from './pages/ListingsPage';
import PickupsPage from './pages/PickupsPage';
import TransactionsPage from './pages/TransactionsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import SupportPage from './pages/SupportPage';
import { authApi } from './api/auth';

const queryClient = new QueryClient();

function ProtectedRoute({ children }) {
    const isAuthenticated = authApi.isAuthenticated();
    return isAuthenticated ? children : <Navigate to="/login" replace />;
}

import { ThemeProvider } from './context/ThemeContext';

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <Layout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<Dashboard />} />
                            <Route path="users" element={<UsersPage />} />
                            <Route path="users/:userId" element={<UserDetailPage />} />
                            <Route path="system-users" element={<SystemUsersPage />} />
                            <Route path="notifications" element={<NotificationsPage />} />
                            <Route path="listings" element={<ListingsPage />} />
                            <Route path="pickups" element={<PickupsPage />} />
                            <Route path="wallet" element={<TransactionsPage />} />
                            <Route path="profile" element={<ProfilePage />} />
                            <Route path="support" element={<SupportPage />} />
                            <Route path="settings" element={<SettingsPage />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </ThemeProvider>
        </QueryClientProvider>
    );
}

export default App;
