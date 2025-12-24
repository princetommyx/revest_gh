import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [activities, setActivities] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { user } = useAuth(); // Need to access token functionality from auth context

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

    // ... existing fetch functions ...

    // WebSocket Connection
    useEffect(() => {
        let socket;
        const token = localStorage.getItem('access_token');

        if (token && (user?.is_staff || user?.is_superuser)) {
            // Determine protocol (ws or wss)
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//localhost:8000/ws/admin/?token=${token}`;

            socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                console.log('Admin WebSocket Connected');
            };

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('Admin Socket Message:', data);

                if (data.type === 'admin_notification' || data.type === 'INFO' || data.type === 'URGENT_ISSUE') {
                    // Refresh notifications list
                    fetchNotifications();
                    // Optional: Show toast or update badge count directly
                    setNotifications(prev => [data.message, ...prev]);
                    // Also refresh stats if it's a relevant event
                    fetchStats();
                }
            };

            socket.onclose = () => {
                console.log('Admin WebSocket Disconnected');
            };

            socket.onerror = (error) => {
                console.error('Admin WebSocket Error:', error);
            };
        }

        return () => {
            if (socket) {
                socket.close();
            }
        };
    }, [user]); // Re-connect if user changes

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
