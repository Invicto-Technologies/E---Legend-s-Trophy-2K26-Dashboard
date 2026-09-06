import React, { useEffect } from 'react';
import {
    MdWarning,
    MdDeleteForever,
    MdCheckCircle,
    MdInfo,
    MdClose
} from 'react-icons/md';
import './ConfirmationModal.css';

const typeConfig = {
    danger: {
        Icon: MdDeleteForever,
        iconClass: 'modal-icon danger',
        titleClass: 'cx-modal-title danger',
        confirmClass: 'cx-btn-confirm danger',
        accentClass: 'cx-modal-accent danger'
    },
    warning: {
        Icon: MdWarning,
        iconClass: 'modal-icon warning',
        titleClass: 'cx-modal-title warning',
        confirmClass: 'cx-btn-confirm warning',
        accentClass: 'cx-modal-accent warning'
    },
    primary: {
        Icon: MdCheckCircle,
        iconClass: 'modal-icon primary',
        titleClass: 'cx-modal-title primary',
        confirmClass: 'cx-btn-confirm primary',
        accentClass: 'cx-modal-accent primary'
    },
    info: {
        Icon: MdInfo,
        iconClass: 'modal-icon info',
        titleClass: 'cx-modal-title info',
        confirmClass: 'cx-btn-confirm info',
        accentClass: 'cx-modal-accent info'
    }
};

const ConfirmationModal = ({
    isOpen,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
    onConfirm,
    onCancel,
    detail = null   // Optional secondary detail text
}) => {
    const config = typeConfig[type] || typeConfig.danger;
    const { Icon, iconClass, titleClass, confirmClass, accentClass } = config;

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') onCancel?.();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    return (
        <div className="cx-modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="cx-modal-title-id">
            <div className="cx-modal-dialog" onClick={(e) => e.stopPropagation()}>

                {/* Accent Bar */}
                <div className={accentClass} />

                {/* Close X Button */}
                <button className="cx-modal-close-x" onClick={onCancel} aria-label="Close">
                    <MdClose />
                </button>

                {/* Icon + Header */}
                <div className="cx-modal-header">
                    <div className={iconClass}>
                        <Icon />
                    </div>
                    <div className="cx-modal-header-text">
                        <h3 className={titleClass} id="cx-modal-title-id">{title}</h3>
                    </div>
                </div>

                {/* Body */}
                <div className="cx-modal-body">
                    <p>{message}</p>
                    {detail && <p className="cx-modal-detail">{detail}</p>}
                </div>

                {/* Footer */}
                <div className="cx-modal-footer">
                    <button className="cx-btn-secondary" onClick={onCancel}>
                        {cancelText}
                    </button>
                    <button className={confirmClass} onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
