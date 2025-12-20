import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
// import { AnimatePresence } from 'framer-motion';
import Layout from './layouts/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Intro from './pages/Intro';
import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import CreateListing from './pages/CreateListing';
import ListingDetail from './pages/ListingDetail';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import RideHistory from './pages/RideHistory';
import AdminLogin from './pages/AdminLogin';
import AdminRoutes from './pages/admin/AdminRoutes';
import useAuth from './hooks/useAuth';
import { ToastProvider } from './contexts/ToastContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!user) {
    return <Navigate to="/intro" />;
  }

  return children;
};

function App() {
  const location = useLocation();

  return (
    <ToastProvider>
      <Routes location={location} key={location.pathname}>
        <Route path="/intro" element={<Intro />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Admin Login - Separate Entry Point */}
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Admin Dashboard */}
        <Route path="/admin-dashboard/*" element={
          <ProtectedRoute>
            <AdminRoutes />
          </ProtectedRoute>
        } />

        {/* Main App */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Home />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="marketplace/create" element={<CreateListing />} />
          <Route path="marketplace/:id" element={<ListingDetail />} />
          <Route path="profile" element={<Profile />} />
          <Route path="chat" element={<Chat />} />
          <Route path="ride-history" element={<RideHistory />} />
        </Route>
      </Routes>
      <Analytics />
    </ToastProvider>
  );
}

export default App;
