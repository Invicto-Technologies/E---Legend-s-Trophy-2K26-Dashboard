import React, { useState, useEffect } from 'react';
import { MdSportsCricket, MdSync } from 'react-icons/md';
import { useAdminProcessing } from '../../../contexts/AdminProcessingContext';
import './AdminProcessingOverlay.css';

const DEFAULT_SUBTITLES = [
    'Transmitting updates to real-time database...',
    'Synchronizing tournament telemetry and standings...',
    'Broadcasting live updates across clients...',
    'Finalizing official records...'
];

const AdminProcessingOverlay = () => {
    const { isProcessing, processingTitle, processingSubtitle } = useAdminProcessing();
    const [subIndex, setSubIndex] = useState(0);

    useEffect(() => {
        if (!isProcessing) {
            setSubIndex(0);
            return;
        }
        const timer = setInterval(() => {
            setSubIndex((prev) => (prev + 1) % DEFAULT_SUBTITLES.length);
        }, 1600);
        return () => clearInterval(timer);
    }, [isProcessing]);

    if (!isProcessing) return null;

    const title = processingTitle || 'Processing Update...';
    const subtitle = processingSubtitle || DEFAULT_SUBTITLES[subIndex];

    return (
        <aside
            className="admin-processing-backdrop"
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <div className="admin-processing-aura-gold" />
            <div className="admin-processing-aura-cyan" />

            <div className="admin-processing-card">
                {/* Visual Stage with 3D Gyro Rings */}
                <div className="admin-proc-stage">
                    <div className="proc-ring proc-ring-outer" />
                    <div className="proc-ring proc-ring-middle" />
                    <div className="proc-ring proc-ring-inner" />
                    <div className="proc-radar-wave" />

                    <div className="proc-center-core">
                        <MdSportsCricket className="proc-core-cricket" />
                        <div className="proc-sync-badge">
                            <MdSync className="proc-sync-spin" />
                        </div>
                    </div>
                </div>

                {/* Status Badge */}
                <div className="admin-proc-badge">
                    <span className="proc-dot" />
                    <span>SYNCHRONIZING DATABASE</span>
                </div>

                {/* Primary Title */}
                <h3 className="admin-proc-title">{title}</h3>

                {/* Subtitle with dynamic status */}
                <p className="admin-proc-subtitle">{subtitle}</p>

                {/* Cyber Progress Beam */}
                <div className="admin-proc-track">
                    <div className="admin-proc-beam" />
                </div>
            </div>
        </aside>
    );
};

export default AdminProcessingOverlay;
