import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [activities, setActivities] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch dashboard statistics
    const fetchStats = async () => {
        try {
            const response = await api.get('/admin/stats/');
            setStats(response.data);
        } catch (err) {
            console.error('Error fetching stats:', err);
            setError('Failed to load statistics');
        }
    };

    // Fetch users with optional filters
    const fetchUsers = async (filters = {}) => {
        try {
            const params = new URLSearchParams(filters);
            const response = await api.get(`/admin/users/?${params}`);
            setUsers(response.data);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to load users');
        }
    };

    // Fetch activity logs
    const fetchActivities = async (filters = {}) => {
        try {
            const params = new URLSearchParams(filters);
            const response = await api.get(`/admin/activity/?${params}`);
            setActivities(response.data);
        } catch (err) {
            console.error('Error fetching activities:', err);
        }
    };

    // Fetch support tickets
    const fetchTickets = async (filters = {}) => {
        try {
            const params = new URLSearchParams(filters);
            const response = await api.get(`/admin/support/tickets/?${params}`);
            setTickets(response.data);
        } catch (err) {
            console.error('Error fetching tickets:', err);
        }
    };

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            const response = await api.get('/admin/notifications/');
            setNotifications(response.data);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    };

    // Mark notification as read
    const markNotificationRead = async (id) => {
        try {
            await api.post(`/admin/notifications/${id}/mark-read/`);
            fetchNotifications();
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    // Update user
    const updateUser = async (userId, data) => {
        try {
            const response = await api.patch(`/admin/users/${userId}/`, data);
            fetchUsers();
            return response.data;
        } catch (err) {
            console.error('Error updating user:', err);
            throw err;
        }
    };

    // Update support ticket
    const updateTicket = async (ticketId, data) => {
        try {
            const response = await api.patch(`/admin/support/tickets/${ticketId}/`, data);
            fetchTickets();
            return response.data;
        } catch (err) {
            console.error('Error updating ticket:', err);
            throw err;
        }
    };

    // Initialize data on mount
    useEffect(() => {
        const initializeData = async () => {
            setLoading(true);
            await Promise.all([
                fetchStats(),
                fetchUsers(),
                fetchActivities(),
                fetchTickets(),
                fetchNotifications(),
            ]);
            setLoading(false);
        };

        initializeData();

        // Refresh stats every 30 seconds
        const interval = setInterval(() => {
            fetchStats();
            fetchActivities();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const value = {
        stats,
        users,
        activities,
        tickets,
        notifications,
        loading,
        error,
        fetchStats,
        fetchUsers,
        fetchActivities,
        fetchTickets,
        fetchNotifications,
        markNotificationRead,
        updateUser,
        updateTicket,
    };

    return (
        <AdminContext.Provider value={value}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};

export default AdminContext;
