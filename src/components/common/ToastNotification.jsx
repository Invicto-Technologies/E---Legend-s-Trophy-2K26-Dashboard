import React, { useState, useImperativeHandle, forwardRef } from 'react';
import './ToastNotification.css';
import { MdCheckCircle, MdError, MdInfo, MdWarning, MdClose } from 'react-icons/md';

const ToastNotification = forwardRef((props, ref) => {
    const [toasts, setToasts] = useState([]);

    useImperativeHandle(ref, () => ({
        showToast(type = 'info', message = '') {
            const id = Date.now() + Math.random();
            setToasts(prev => [...prev, { id, type, message }]);

            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 3800);
        }
    }));

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <MdCheckCircle className="toast-icon success" />;
            case 'error': return <MdError className="toast-icon error" />;
            case 'warning': return <MdWarning className="toast-icon warning" />;
            default: return <MdInfo className="toast-icon info" />;
        }
    };

    return (
        <div className="cx-toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`cx-toast-card ${toast.type}`}>
                    <div className="cx-toast-icon-wrap">{getIcon(toast.type)}</div>
                    <div className="cx-toast-message">{toast.message}</div>
                    <button className="cx-toast-close" onClick={() => removeToast(toast.id)}>
                        <MdClose />
                    </button>
                </div>
            ))}
        </div>
    );
});

export default ToastNotification;
