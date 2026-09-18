import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const AdminProcessingContext = createContext({
    isProcessing: false,
    processingTitle: '',
    processingSubtitle: '',
    showProcessing: () => {},
    hideProcessing: () => {},
    withProcessing: async (fn) => fn()
});

export const AdminProcessingProvider = ({ children }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingTitle, setProcessingTitle] = useState('');
    const [processingSubtitle, setProcessingSubtitle] = useState('');
    const minTimeTimerRef = useRef(null);

    const showProcessing = useCallback((title = 'Processing Request...', subtitle = 'Updating tournament database...') => {
        if (minTimeTimerRef.current) {
            clearTimeout(minTimeTimerRef.current);
            minTimeTimerRef.current = null;
        }
        setProcessingTitle(title);
        setProcessingSubtitle(subtitle);
        setIsProcessing(true);
    }, []);

    const hideProcessing = useCallback(() => {
        // Subtle grace period so micro-animations feel smooth and not jittery
        minTimeTimerRef.current = setTimeout(() => {
            setIsProcessing(false);
            setProcessingTitle('');
            setProcessingSubtitle('');
            minTimeTimerRef.current = null;
        }, 350);
    }, []);

    const withProcessing = useCallback(async (asyncFn, title = 'Processing Request...', subtitle = 'Updating tournament database...') => {
        showProcessing(title, subtitle);
        const startTime = Date.now();
        try {
            const result = await asyncFn();
            return result;
        } finally {
            const elapsed = Date.now() - startTime;
            // Ensure animation is visible for at least 450ms so user clearly perceives the confirmation
            const remaining = Math.max(0, 450 - elapsed);
            setTimeout(() => {
                hideProcessing();
            }, remaining);
        }
    }, [showProcessing, hideProcessing]);

    return (
        <AdminProcessingContext.Provider
            value={{
                isProcessing,
                processingTitle,
                processingSubtitle,
                showProcessing,
                hideProcessing,
                withProcessing
            }}
        >
            {children}
        </AdminProcessingContext.Provider>
    );
};

export const useAdminProcessing = () => {
    return useContext(AdminProcessingContext);
};
