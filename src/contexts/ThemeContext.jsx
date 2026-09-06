import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = 'eltrophy_theme';

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'dark' || saved === 'light') {
            return saved;
        }
        // Default to dark mode for E-Legends stadium night feel
        return 'dark';
    });

    const [isTransitioning, setIsTransitioning] = useState(false);
    const [transitionOrigin, setTransitionOrigin] = useState({ x: 0.5, y: 0.5 }); // Normalized (0-1)
    const [targetTheme, setTargetTheme] = useState(null);

    // Synchronize HTML element data-theme attribute
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [theme]);

    /**
     * Trigger 3D Celestial Transition
     * @param {MouseEvent|{clientX: number, clientY: number}} e - Optional event to center the 3D ripple
     */
    const toggleTheme = useCallback((e) => {
        if (isTransitioning) return; // Prevent multiple clicks during active animation

        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTargetTheme(nextTheme);

        // Calculate click coordinates for localized shockwave
        if (e && e.clientX !== undefined && e.clientY !== undefined) {
            const x = Math.max(0, Math.min(1, e.clientX / window.innerWidth));
            const y = Math.max(0, Math.min(1, e.clientY / window.innerHeight));
            setTransitionOrigin({ x, y });
        } else {
            setTransitionOrigin({ x: 0.5, y: 0.5 });
        }

        setIsTransitioning(true);

        // Add 3D perspective warp class to document body
        document.body.classList.add('theme-in-transition');
        document.body.classList.add(nextTheme === 'light' ? 'warp-to-day' : 'warp-to-night');

        // Mid-point of 3D presentation (during 0.5s top hold): Switch the actual DOM tokens
        const switchTimeout = setTimeout(() => {
            setTheme(nextTheme);
            document.documentElement.setAttribute('data-theme', nextTheme);
        }, 700);

        // End of 3D animation (after 1400ms 3-phase flip & descend): Clean up classes and overlay
        const finishTimeout = setTimeout(() => {
            setIsTransitioning(false);
            setTargetTheme(null);
            document.body.classList.remove('theme-in-transition', 'warp-to-day', 'warp-to-night');
        }, 1420);

        return () => {
            clearTimeout(switchTimeout);
            clearTimeout(finishTimeout);
        };
    }, [theme, isTransitioning]);

    return (
        <ThemeContext.Provider
            value={{
                theme,
                isDark: theme === 'dark',
                isLight: theme === 'light',
                isTransitioning,
                targetTheme,
                transitionOrigin,
                toggleTheme
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export default ThemeContext;
