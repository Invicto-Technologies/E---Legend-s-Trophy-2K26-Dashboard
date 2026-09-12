import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './PageTransition.css';

/**
 * Wraps page content with a smooth fade-slide transition on route change.
 * No external animation libraries required — pure CSS keyframes.
 */
const PageTransition = ({ children }) => {
    const location = useLocation();
    const [displayLocation, setDisplayLocation] = useState(location);
    const [transitionStage, setTransitionStage] = useState('page-enter');
    const prevKey = useRef(location.key);

    useEffect(() => {
        if (location.key !== prevKey.current) {
            // Fade out current page
            setTransitionStage('page-exit');
        }
    }, [location]);

    const handleAnimationEnd = (e) => {
        if (e && e.target !== e.currentTarget) return;
        if (transitionStage === 'page-exit') {
            // Swap content and fade in new page
            setDisplayLocation(location);
            prevKey.current = location.key;
            setTransitionStage('page-enter');
        } else if (transitionStage === 'page-enter') {
            setTransitionStage('');
        }
    };

    return (
        <div
            className={`page-transition-wrapper ${transitionStage}`}
            onAnimationEnd={handleAnimationEnd}
        >
            {React.cloneElement(children, { location: displayLocation, key: displayLocation.pathname })}
        </div>
    );
};

export default PageTransition;
