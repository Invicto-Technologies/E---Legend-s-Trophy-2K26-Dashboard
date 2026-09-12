import React, { useState, useEffect } from 'react';
import { FaTrophy } from 'react-icons/fa';
import { MdSportsCricket } from 'react-icons/md';
import './PageLoader.css';

/**
 * Attractive, high-tech holographic loading animation for page renders.
 * Shows rotating 3D gyro-rings, pulsing cricket/trophy core,
 * ambient glowing particles, and an animated sweep progress bar.
 */
const PageLoader = ({
    message = 'Loading Tournament Telemetry...',
    subtitle = 'Synchronizing real-time cricket database & standings',
    tournamentName = "E-Legends Trophy 2K26",
    fullScreen = true
}) => {
    // Subtle cycling tips/status updates for engaging visual feedback
    const [statusIndex, setStatusIndex] = useState(0);

    const statuses = [
        subtitle,
        'Resolving fixture tables and team nodes...',
        'Connecting live stream telemetry socket...',
        'Calculating real-time player ratings & metrics...'
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setStatusIndex((prev) => (prev + 1) % statuses.length);
        }, 1800);
        return () => clearInterval(interval);
    }, [statuses.length]);

    return (
        <div className={`page-loader-overlay ${fullScreen ? 'fullscreen' : 'embedded'}`}>
            {/* Ambient Background Aura */}
            <div className="loader-ambient-glow loader-glow-cyan" />
            <div className="loader-ambient-glow loader-glow-gold" />
            <div className="loader-cyber-grid" />

            <div className="loader-content-card">
                {/* 3D Holographic Core */}
                <div className="loader-3d-stage">
                    {/* Outer Neon Cyan Gyro Ring */}
                    <div className="gyro-ring ring-outer" />
                    {/* Middle Neon Gold Counter-Rotating Ring */}
                    <div className="gyro-ring ring-middle" />
                    {/* Inner Platinum Orbit Ring */}
                    <div className="gyro-ring ring-inner" />

                    {/* Radar Pulse Wave */}
                    <div className="radar-ping-wave" />

                    {/* Center Glowing Cricket / Trophy Core */}
                    <div className="loader-center-orb">
                        <MdSportsCricket className="core-cricket-icon" />
                        <div className="core-trophy-badge">
                            <FaTrophy />
                        </div>
                    </div>
                </div>

                {/* Tournament Tag */}
                <div className="loader-tournament-pill">
                    <span className="live-ping-dot" />
                    <span className="pill-text">{tournamentName}</span>
                </div>

                {/* Primary Message */}
                <h2 className="loader-title">{message}</h2>

                {/* Secondary Animated Subtitle */}
                <p className="loader-subtitle">
                    <span key={statusIndex} className="status-fade-in">
                        {statuses[statusIndex]}
                    </span>
                </p>

                {/* Holographic Progress Track */}
                <div className="loader-progress-track">
                    <div className="loader-progress-beam" />
                </div>
            </div>
        </div>
    );
};

export default PageLoader;
