import React, { useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { MdWbSunny, MdDarkMode } from 'react-icons/md';
import './ThemeToggle.css';

const ThemeToggle = ({ className = '' }) => {
    const { isDark, toggleTheme, isTransitioning } = useTheme();
    const buttonRef = useRef(null);

    const handleMouseMove = (e) => {
        const card = buttonRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        card.style.transform = `perspective(600px) rotateX(${-y * 0.15}deg) rotateY(${x * 0.15}deg) translateZ(4px)`;
    };

    const handleMouseLeave = () => {
        const card = buttonRef.current;
        if (!card) return;
        card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    };

    return (
        <button
            ref={buttonRef}
            className={`theme-3d-toggle ${isDark ? 'is-dark' : 'is-light'} ${isTransitioning ? 'transitioning' : ''} ${className}`}
            onClick={toggleTheme}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            role="switch"
            aria-checked={isDark}
            aria-label={`Switch to ${isDark ? 'Light (Day)' : 'Dark (Night)'} Mode`}
            data-tooltip={`Switch to ${isDark ? 'Day' : 'Night'} Mode`}
        >
            {/* 3D Track */}
            <div className="toggle-track">
                {/* Sun icon section */}
                <div className={`track-icon sun-side ${!isDark ? 'active' : ''}`}>
                    <MdWbSunny className="glyph-sun" />
                </div>

                {/* 3D Thumb Ball */}
                <div className="toggle-thumb-3d">
                    <div className="thumb-glow" />
                    <div className="thumb-face">
                        {isDark ? (
                            <MdDarkMode className="thumb-glyph lunar-glyph" />
                        ) : (
                            <MdWbSunny className="thumb-glyph solar-glyph" />
                        )}
                    </div>
                </div>

                {/* Moon icon section */}
                <div className={`track-icon moon-side ${isDark ? 'active' : ''}`}>
                    <MdDarkMode className="glyph-moon" />
                </div>
            </div>
        </button>
    );
};

export default ThemeToggle;
