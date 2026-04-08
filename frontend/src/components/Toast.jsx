import { useEffect } from 'react';
import { FaCheck, FaTimes, FaInfo, FaExclamationTriangle } from 'react-icons/fa';

function Toast({ id, type = 'info', message, onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);

        return () => clearTimeout(timer);
    }, [onClose]);

    const icons = {
        success: <FaCheck className="w-5 h-5" />,
        error: <FaTimes className="w-5 h-5" />,
        info: <FaInfo className="w-5 h-5" />,
        warning: <FaExclamationTriangle className="w-5 h-5" />
    };

    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };

    return (
        <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 animate-slide-in">
            <div className={`w-8 h-8 rounded-full ${colors[type]} flex items-center justify-center text-white`}>
                {icons[type]}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{message}</p>
            <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
            >
                <FaTimes className="w-4 h-4 text-gray-500" />
            </button>
        </div>
    );
}

export default Toast;
