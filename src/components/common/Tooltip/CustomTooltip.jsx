import React, { useState, useEffect, useRef } from 'react';
import './CustomTooltip.css';

/**
 * Standard, self-explanatory UI actions and short labels that do NOT need a tooltip.
 * Hovering these causes distracting and disturbing popup clutter.
 */
const TRIVIAL_PHRASES = new Set([
    '0', '1', '2', '3', '4', '6',
    '0 dot', '1 single', '2 double', '3 three', '4 four', '6 six',
    '1 run', '2 runs', '3 runs', '4 runs', '6 runs',
    '1 run(s)', '2 run(s)', '3 run(s)', '4 run(s)', '6 run(s)',
    'single', 'double', 'three', 'four', 'six', 'dot', 'dot ball',
    'run', 'runs', 'wicket', 'save', 'cancel', 'close', 'delete', 'edit',
    'remove', 'back', 'next', 'submit', 'reset', 'clear', 'undo', 'swap',
    'confirm', 'search', 'filter', 'refresh', 'zoom in', 'zoom out',
    'download', 'copy', 'play', 'pause', 'mute', 'unmute', 'settings',
    'menu', 'winner', 'scorecard', 'commentary', 'live', 'fixtures',
    'home', 'rankings', 'history', 'admin', 'logout', 'login',
    'clear selection', 'select', 'open', 'view', 'standby', 'batting',
    'bowling', 'view wagon wheel', 'wagon wheel', 'view striker wagon wheel',
    'view non-striker wagon wheel', 'close desk (esc)', 'toggle commentary power',
    'unmute all audio', 'mute all audio', 'reset pan & zoom',
    'crop as square / rectangle (full logo)', 'crop as circle (player avatar)',
    'full logo', 'player avatar'
]);

/**
 * Keywords indicating a complex cricket rule, disabled-button explanation,
 * or vital instructional guidance that users actually need help understanding.
 */
const SPECIAL_EXPLANATION_KEYWORDS = [
    'locked',
    'enable',
    'disabled',
    'cannot',
    'require',
    'must be',
    'prior to',
    'penalty',
    'dls',
    'duckworth',
    'powerplay',
    'strike:',
    'bowler charged',
    'mandatory',
    'free hit',
    'rule',
    'law',
    'regulation',
    'par score',
    'target',
    'calculation',
    'how to',
    'note:',
    'hint:',
    'why',
    'reason',
    'over limit',
    'super over',
    'tied match'
];

/**
 * Determines whether a tooltip represents a "special difficult to understand" button
 * or is merely redundant/disturbing clutter on an obvious button.
 */
const shouldShowSpecialTooltip = (target, text) => {
    if (!text || typeof text !== 'string') return false;
    const cleanText = text.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!cleanText || cleanText.length < 2) return false;

    // 1. Explicit developer override: data-tooltip-force or data-tooltip-help
    if (target.hasAttribute('data-tooltip-force') || target.hasAttribute('data-tooltip-help')) {
        return true;
    }

    // 2. Dedicated Info or Help icon
    const isInfoOrHelpTarget = (
        target.classList.contains('info-icon') ||
        target.classList.contains('help-icon') ||
        target.hasAttribute('data-help') ||
        Boolean(target.closest('.info-icon, .help-icon, .sc-info-icon, [data-help]'))
    );
    if (isInfoOrHelpTarget) return true;

    // 3. Check for special explanation keywords (e.g. disabled reasons, cricket rules, instructions)
    const hasSpecialKeyword = SPECIAL_EXPLANATION_KEYWORDS.some(kw => cleanText.includes(kw));
    if (hasSpecialKeyword) return true;

    // 4. Disabled button with a non-empty explanation of why it is locked
    const isDisabled = target.disabled || target.hasAttribute('disabled') || target.classList.contains('disabled');
    if (isDisabled && cleanText.length > 5 && !TRIVIAL_PHRASES.has(cleanText)) {
        return true;
    }

    // 5. Trivial / standard UI action words filter
    if (TRIVIAL_PHRASES.has(cleanText)) return false;

    // 6. Repetition check: Compare tooltip text with visible text on the element
    const visibleText = (target.innerText || target.textContent || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (visibleText && visibleText.length >= 2) {
        if (cleanText === visibleText) return false;
        if (cleanText.includes(visibleText) && cleanText.length < 32) return false;
        if (visibleText.includes(cleanText)) return false;
    }

    // 7. Substantial instructional text (> 38 characters providing real guidance)
    if (cleanText.length > 38) return true;

    // Default: Suppress ordinary buttons and labels
    return false;
};

/**
 * Universal Custom Tooltip System for E-Legends Trophy
 * Intelligently suppresses redundant/trivial button tooltips and only
 * displays tooltips for special, complex, rule-based, or disabled buttons.
 * Uses a 400ms hover delay to eliminate flickering while moving the mouse.
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
    const delayTimerRef = useRef(null);
    const tooltipRef = useRef(null);

    useEffect(() => {
        const clearHoverTimer = () => {
            if (delayTimerRef.current) {
                clearTimeout(delayTimerRef.current);
                delayTimerRef.current = null;
            }
        };

        const hideTooltip = () => {
            clearHoverTimer();
            activeElRef.current = null;
            setTooltipState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        };

        const handleMouseOver = (e) => {
            const target = e.target.closest('[data-tooltip], [title]');
            if (!target) return;

            // Always strip native title to prevent jarring native browser tooltips
            if (target.hasAttribute('title')) {
                const titleVal = target.getAttribute('title');
                if (titleVal && titleVal.trim()) {
                    target.setAttribute('data-tooltip', titleVal.trim());
                }
                target.removeAttribute('title');
            }

            const text = target.getAttribute('data-tooltip');
            if (!shouldShowSpecialTooltip(target, text)) {
                // If the user moved onto an obvious/standard button, ensure any active tooltip is hidden
                if (activeElRef.current && activeElRef.current !== target) {
                    hideTooltip();
                }
                return;
            }

            activeElRef.current = target;
            clearHoverTimer();

            // 400ms hover pause delay: only show if user deliberately pauses on a complex/unclear button
            delayTimerRef.current = setTimeout(() => {
                if (activeElRef.current === target) {
                    const preferredPos = target.getAttribute('data-tooltip-pos') || 'top';
                    updatePosition(target, text, preferredPos);
                }
            }, 400);
        };

        const handleMouseOut = (e) => {
            if (!activeElRef.current) return;
            const target = e.target.closest('[data-tooltip]');
            if (target === activeElRef.current || !e.relatedTarget || !activeElRef.current.contains(e.relatedTarget)) {
                hideTooltip();
            }
        };

        // Immediately dismiss tooltip on any click or mouse press
        const handleMouseDown = () => {
            hideTooltip();
        };

        const handleScrollOrResize = () => {
            if (activeElRef.current && tooltipState.visible) {
                const text = activeElRef.current.getAttribute('data-tooltip');
                const pos = activeElRef.current.getAttribute('data-tooltip-pos') || 'top';
                updatePosition(activeElRef.current, text, pos);
            } else {
                clearHoverTimer();
            }
        };

        const updatePosition = (el, text, preferredPos) => {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) {
                hideTooltip();
                return;
            }

            const targetCenterX = rect.left + rect.width / 2;
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 360;

            let pos = preferredPos;
            const margin = 10;
            const safeEdgeMargin = Math.min(90, Math.floor(viewportWidth / 2) - 10);
            const clampedX = Math.max(safeEdgeMargin, Math.min(viewportWidth - safeEdgeMargin, targetCenterX));

            let x = clampedX;
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
        document.addEventListener('mousedown', handleMouseDown, true);
        window.addEventListener('scroll', handleScrollOrResize, { passive: true });
        window.addEventListener('resize', handleScrollOrResize, { passive: true });

        return () => {
            clearHoverTimer();
            document.removeEventListener('mouseover', handleMouseOver, true);
            document.removeEventListener('mouseout', handleMouseOut, true);
            document.removeEventListener('mousedown', handleMouseDown, true);
            window.removeEventListener('scroll', handleScrollOrResize);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [tooltipState.visible]);

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
