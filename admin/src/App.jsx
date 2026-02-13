import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { authApi } from './api/auth';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

function ProtectedRoute({ children }) {
    const isAuthenticated = authApi.isAuthenticated();
    return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
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
                        <Route path="users" element={<div className="p-6"><h2 className="text-2xl font-bold">Users - Coming Soon</h2></div>} />
                        <Route path="listings" element={<div className="p-6"><h2 className="text-2xl font-bold">Listings - Coming Soon</h2></div>} />
                        <Route path="pickups" element={<div className="p-6"><h2 className="text-2xl font-bold">Pickups - Coming Soon</h2></div>} />
                        <Route path="wallet" element={<div className="p-6"><h2 className="text-2xl font-bold">Transactions - Coming Soon</h2></div>} />
                        <Route path="settings" element={<div className="p-6"><h2 className="text-2xl font-bold">Settings - Coming Soon</h2></div>} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </QueryClientProvider>
    );
}

export default App;
