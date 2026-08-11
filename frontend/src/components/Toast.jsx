import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertCircle } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle size={20} />,
        error: <XCircle size={20} />,
        info: <Info size={20} />,
        warning: <AlertCircle size={20} />
    };

    const styles = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        info: 'bg-blue-500 text-white',
        warning: 'bg-yellow-500 text-white'
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex justify-center pt-4 px-4 pointer-events-none">
            <div
                className={`${styles[type]} px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 pointer-events-auto animate-slide-down max-w-md w-full`}
                style={{
                    animation: 'slideDown 0.3s ease-out'
                }}
            >
                {icons[type]}
                <span className="font-medium text-sm flex-1">{message}</span>
                <button
                    onClick={onClose}
                    className="ml-2 hover:opacity-80 transition-opacity"
                    aria-label="Close"
                >
                    <XCircle size={18} />
                </button>
            </div>
        </div>
    );
};

export default Toast;
