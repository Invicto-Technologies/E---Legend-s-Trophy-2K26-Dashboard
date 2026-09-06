import React, { useState, useEffect, useRef } from 'react';
import './CustomTooltip.css';

/**
 * Universal Custom Tooltip System for E-Legends Trophy
 * Automatically intercepts any element with [data-tooltip] or [title]
 * and displays a styled, futuristic gaming/sports glassmorphism tooltip.
 */
const CustomTooltip = () => {
    const [tooltipState, setTooltipState] = useState({
        visible: false,
        text: '',
        x: 0,
        y: 0,
        position: 'top',
        arrowOffset: 0
    });

    const activeElRef = useRef(null);
    const tooltipRef = useRef(null);

    useEffect(() => {
        const handleMouseOver = (e) => {
            const target = e.target.closest('[data-tooltip], [title]');
            if (!target) return;

            // If element has a native title, convert to data-tooltip to suppress native browser tooltip
            if (target.hasAttribute('title')) {
                const titleVal = target.getAttribute('title');
                if (titleVal && titleVal.trim()) {
                    target.setAttribute('data-tooltip', titleVal.trim());
                }
                target.removeAttribute('title');
            }

            const text = target.getAttribute('data-tooltip');
            if (!text || !text.trim()) return;

            activeElRef.current = target;
            const preferredPos = target.getAttribute('data-tooltip-pos') || 'top';

            updatePosition(target, text, preferredPos);
        };

        const handleMouseOut = (e) => {
            if (!activeElRef.current) return;
            const target = e.target.closest('[data-tooltip]');
            if (target === activeElRef.current || !e.relatedTarget || !activeElRef.current.contains(e.relatedTarget)) {
                activeElRef.current = null;
                setTooltipState((prev) => ({ ...prev, visible: false }));
            }
        };

        const handleScrollOrResize = () => {
            if (activeElRef.current) {
                const text = activeElRef.current.getAttribute('data-tooltip');
                const pos = activeElRef.current.getAttribute('data-tooltip-pos') || 'top';
                updatePosition(activeElRef.current, text, pos);
            }
        };

        const updatePosition = (el, text, preferredPos) => {
            const rect = el.getBoundingClientRect();
            // If element is not visible in viewport, hide
            if (rect.width === 0 && rect.height === 0) {
                setTooltipState((prev) => ({ ...prev, visible: false }));
                return;
            }

            const targetCenterX = rect.left + rect.width / 2;

            let pos = preferredPos;
            const margin = 10;
            let x = targetCenterX;
            let y = rect.top - margin;

            // Auto flip if overflowing top
            if (pos === 'top' && rect.top < 48) {
                pos = 'bottom';
                y = rect.bottom + margin;
            } else if (pos === 'bottom' && rect.bottom > window.innerHeight - 48) {
                pos = 'top';
                y = rect.top - margin;
            } else if (pos === 'bottom') {
                y = rect.bottom + margin;
            }

            setTooltipState({
                visible: true,
                text,
                x,
                y,
                position: pos
            });
        };

        document.addEventListener('mouseover', handleMouseOver, true);
        document.addEventListener('mouseout', handleMouseOut, true);
        window.addEventListener('scroll', handleScrollOrResize, { passive: true });
        window.addEventListener('resize', handleScrollOrResize, { passive: true });

        return () => {
            document.removeEventListener('mouseover', handleMouseOver, true);
            document.removeEventListener('mouseout', handleMouseOut, true);
            window.removeEventListener('scroll', handleScrollOrResize);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, []);

    if (!tooltipState.visible || !tooltipState.text) {
        return null;
    }

    return (
        <div
            ref={tooltipRef}
            className={`elt-custom-tooltip pos-${tooltipState.position}`}
            style={{
                left: `${tooltipState.x}px`,
                top: `${tooltipState.y}px`
            }}
            role="tooltip"
            aria-hidden="true"
        >
            <div className="elt-tooltip-content">
                <span className="elt-tooltip-glow" />
                <span className="elt-tooltip-text">{tooltipState.text}</span>
            </div>
            <div className="elt-tooltip-arrow" />
        </div>
    );
};

export default CustomTooltip;
