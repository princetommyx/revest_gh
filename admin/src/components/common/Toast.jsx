import { CheckCircle, XCircle, X } from 'lucide-react';
import { useEffect } from 'react';

export default function Toast({ type = 'success', message, onClose, duration = 3000 }) {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const styles = {
        success: {
            bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
            border: 'border-green-200',
            icon: 'text-green-600',
            text: 'text-green-800',
            IconComponent: CheckCircle
        },
        error: {
            bg: 'bg-gradient-to-r from-red-50 to-pink-50',
            border: 'border-red-200',
            icon: 'text-red-600',
            text: 'text-red-800',
            IconComponent: XCircle
        }
    };

    const style = styles[type] || styles.success;
    const Icon = style.IconComponent;

    return (
        <div className={`${style.bg} ${style.border} border rounded-xl shadow-lg p-4 flex items-center space-x-3 min-w-[300px] max-w-md animate-slide-down`}>
            <Icon className={`w-5 h-5 ${style.icon} flex-shrink-0`} />
            <p className={`${style.text} font-medium flex-1 text-sm`}>{message}</p>
            <button
                onClick={onClose}
                className={`${style.icon} hover:opacity-70 transition-opacity flex-shrink-0`}
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
