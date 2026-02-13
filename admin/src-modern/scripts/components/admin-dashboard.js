import Alpine from 'alpinejs';

document.addEventListener('alpine:init', () => {
    Alpine.data('adminDashboard', () => ({
        stats: {
            total_users: 0,
            collectors: 0,
            sellers: 0,
            recyclers: 0,
            active_users: 0,
            new_registrations: { today: 0, this_week: 0, this_month: 0 },
            online_collectors: 0,
            growth_percentage: 0
        },
        loading: true,
        error: null,
        lastUpdated: null,

        async init() {
            await this.fetchStats();
            // Auto-refresh every 30 seconds
            setInterval(() => this.fetchStats(), 30000);
        },

        async fetchStats() {
            try {
                const token = localStorage.getItem('admin_token');

                if (!token) {
                    this.error = 'Not authenticated. Please login.';
                    window.location.href = '/login.html';
                    return;
                }

                // Determine API URL based on environment
                const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    ? 'http://localhost:8000/api/v1'
                    : 'https://revesta-backend.onrender.com/api/v1';

                const response = await fetch(`${API_BASE}/users/admin/stats/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.status === 401) {
                    // Token expired, redirect to login
                    localStorage.removeItem('admin_token');
                    window.location.href = '/login.html';
                    return;
                }

                if (!response.ok) {
                    throw new Error(`Failed to fetch stats: ${response.statusText}`);
                }

                this.stats = await response.json();
                this.loading = false;
                this.error = null;
                this.lastUpdated = new Date();
            } catch (err) {
                console.error('Error fetching stats:', err);
                this.error = err.message;
                this.loading = false;
            }
        },

        formatNumber(num) {
            return num.toLocaleString();
        },

        getGrowthClass() {
            return this.stats.growth_percentage >= 0 ? 'text-success' : 'text-danger';
        },

        getGrowthIcon() {
            return this.stats.growth_percentage >= 0 ? 'bi-arrow-up' : 'bi-arrow-down';
        }
    }));
});
