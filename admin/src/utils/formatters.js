export const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return new Intl.NumberFormat('en-US').format(num);
};

export const formatCurrency = (amount, currency = 'GHS') => {
    if (!amount && amount !== 0) return `${currency} 0.00`;
    return `${currency} ${new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount)}`;
};

export const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

export const formatDateTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const formatRelativeTime = (date) => {
    if (!date) return '';

    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return formatDate(date);
};

export const getRoleBadgeColor = (role) => {
    switch (role) {
        case 'COLLECTOR':
            return 'bg-blue-100 text-blue-800';
        case 'SELLER':
            return 'bg-orange-100 text-orange-800';
        case 'RECYCLER':
            return 'bg-green-100 text-green-800';
        case 'ADMIN':
            return 'bg-purple-100 text-purple-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

export const getStatusBadgeColor = (status) => {
    switch (status?.toUpperCase()) {
        case 'COMPLETED':
        case 'ACTIVE':
        case 'APPROVED':
            return 'bg-green-100 text-green-800';
        case 'PENDING':
        case 'IN_PROGRESS':
            return 'bg-yellow-100 text-yellow-800';
        case 'CANCELLED':
        case 'REJECTED':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};
