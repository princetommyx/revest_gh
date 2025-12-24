import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminProvider } from '../../contexts/AdminContext';
import AdminLayout from './AdminLayout';
import Overview from './Overview';
import UsersPage from './UsersPage';
import ActivityPage from './ActivityPage';
import SupportPage from './SupportPage';
import SettingsPage from './SettingsPage';
import useAuth from '../../hooks/useAuth';

const AdminRoutes = () => {
    const { user } = useAuth();

    // Check if user is admin (staff or superuser)
    if (!user?.is_staff && !user?.is_superuser) {
        return <Navigate to="/" />;
    }

    return (
        <AdminProvider>
            <Routes>
                <Route element={<AdminLayout />}>
                    <Route index element={<Overview />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="activity" element={<ActivityPage />} />
                    <Route path="support" element={<SupportPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                </Route>
            </Routes>
        </AdminProvider>
    );
};

export default AdminRoutes;
