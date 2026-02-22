import { useState, useCallback } from 'react';

export function useToast() {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3500) => {
        const id = Date.now();
        setToasts(t => [...t, { id, message, type }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
    }, []);

    return { toasts, addToast };
}

export function ToastContainer({ toasts }) {
    if (!toasts.length) return null;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    return (
        <div className="toast-container" role="alert" aria-live="polite">
            {toasts.map(t => (
                <div key={t.id} className={`toast ${t.type}`}>
                    <span>{icons[t.type]}</span>
                    {t.message}
                </div>
            ))}
        </div>
    );
}
