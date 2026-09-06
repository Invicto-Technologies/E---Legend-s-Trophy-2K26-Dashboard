import React, { useState } from 'react';
import './WagonWheel.css';

export const WAGON_WHEEL_ZONES = [
    { id: 'third_man', name: 'Third Man', angleStart: 0, angleEnd: 45, side: 'Off' },
    { id: 'point', name: 'Point', angleStart: 45, angleEnd: 90, side: 'Off' },
    { id: 'cover', name: 'Cover', angleStart: 90, angleEnd: 135, side: 'Off' },
    { id: 'mid_off', name: 'Mid-off', angleStart: 135, angleEnd: 180, side: 'Off' },
    { id: 'mid_on', name: 'Mid-on', angleStart: 180, angleEnd: 225, side: 'Leg' },
    { id: 'mid_wicket', name: 'Mid-wicket', angleStart: 225, angleEnd: 270, side: 'Leg' },
    { id: 'square_leg', name: 'Square Leg', angleStart: 270, angleEnd: 315, side: 'Leg' },
    { id: 'fine_leg', name: 'Fine Leg', angleStart: 315, angleEnd: 360, side: 'Leg' }
];

const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
};

const describeArc = (x, y, radius, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', x, y, 'L', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y, 'Z'].join(' ');
};

const getRunColor = (runs, isWicket = false) => {
    if (isWicket) return '#ef4444'; // Red
    switch (runs) {
        case 6: return '#8b5cf6'; // Violet
        case 4: return '#00f0ff'; // Cyan
        case 3: return '#f59e0b'; // Amber
        case 2: return '#10b981'; // Emerald
        case 1: return '#e2e8f0'; // Light Slate
        default: return '#64748b'; // Gray
    }
};

const WagonWheel = ({
    shots = [],
    interactive = false,
    selectedZone = null,
    onSelectZone = null,
    batsmanName = '',
    size = 380
}) => {
    const [hoveredZone, setHoveredZone] = useState(null);
    const [filterType, setFilterType] = useState('all');

    const center = size / 2;
    const outerRadius = (size / 2) - 20;
    const innerCircleRadius = outerRadius * 0.58;

    // Filter shots
    const filteredShots = shots.filter(s => {
        if (filterType === 'all') return true;
        if (filterType === 'dots') return s.runs === 0;
        if (filterType === 'singles') return s.runs === 1;
        if (filterType === 'boundaries') return s.runs === 4 || s.runs === 6;
        if (filterType === 'wickets') return s.isWicket;
        return true;
    });

    return (
        <div className="wagon-wheel-container" style={{ width: size, maxWidth: '100%' }}>
            {/* Header info */}
            {batsmanName && (
                <div className="wagon-wheel-header">
                    <h4>{batsmanName}</h4>
                    <span className="wagon-shots-count">{shots.length} Deliveries</span>
                </div>
            )}

            {/* Filter Pills */}
            <div className="wagon-filter-pills">
                <button
                    className={`wf-pill ${filterType === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterType('all')}
                >
                    All ({shots.length})
                </button>
                <button
                    className={`wf-pill ${filterType === 'boundaries' ? 'active' : ''}`}
                    onClick={() => setFilterType('boundaries')}
                >
                    4s & 6s
                </button>
                <button
                    className={`wf-pill ${filterType === 'singles' ? 'active' : ''}`}
                    onClick={() => setFilterType('singles')}
                >
                    1s & 2s
                </button>
                <button
                    className={`wf-pill ${filterType === 'dots' ? 'active' : ''}`}
                    onClick={() => setFilterType('dots')}
                >
                    Dots
                </button>
            </div>

            {/* SVG Visualizer */}
            <div className="wagon-wheel-svg-wrap">
                <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    className="wagon-wheel-svg"
                >
                    <defs>
                        <radialGradient id="fieldGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#0d2319" />
                            <stop offset="70%" stopColor="#081812" />
                            <stop offset="100%" stopColor="#040d09" />
                        </radialGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Outer Boundary Field */}
                    <circle
                        cx={center}
                        cy={center}
                        r={outerRadius}
                        fill="url(#fieldGrad)"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeDasharray="4 2"
                    />

                    {/* 30-Yard Circle */}
                    <circle
                        cx={center}
                        cy={center}
                        r={innerCircleRadius}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.18)"
                        strokeWidth="1.2"
                        strokeDasharray="5 5"
                    />

                    {/* 8 Field Zones */}
                    {WAGON_WHEEL_ZONES.map((zone) => {
                        const pathData = describeArc(center, center, outerRadius - 2, zone.angleStart, zone.angleEnd);
                        const isSelected = selectedZone === zone.name;
                        const isHovered = hoveredZone === zone.name;

                        // Zone midpoint for label
                        const midAngle = (zone.angleStart + zone.angleEnd) / 2;
                        const labelPos = polarToCartesian(center, center, outerRadius * 0.78, midAngle);

                        return (
                            <g key={zone.id} className="wagon-zone-group">
                                <path
                                    d={pathData}
                                    className={`wagon-zone-sector ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
                                    fill={isSelected ? 'rgba(0, 240, 255, 0.22)' : isHovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent'}
                                    stroke="rgba(255, 255, 255, 0.12)"
                                    strokeWidth="1"
                                    onClick={() => interactive && onSelectZone && onSelectZone(zone.name)}
                                    onMouseEnter={() => setHoveredZone(zone.name)}
                                    onMouseLeave={() => setHoveredZone(null)}
                                    style={{ cursor: interactive ? 'pointer' : 'default' }}
                                />
                                <text
                                    x={labelPos.x}
                                    y={labelPos.y}
                                    className="wagon-zone-label"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                >
                                    {zone.name}
                                </text>
                            </g>
                        );
                    })}

                    {/* Pitch in Center */}
                    <rect
                        x={center - 6}
                        y={center - 18}
                        width="12"
                        height="36"
                        fill="#d97706"
                        rx="2"
                        opacity="0.85"
                    />

                    {/* Render Trajectory Lines */}
                    {filteredShots.map((shot, idx) => {
                        const angle = shot.angle !== undefined ? shot.angle : (
                            // Default angle based on zone name
                            (() => {
                                const matched = WAGON_WHEEL_ZONES.find(z => z.name === shot.zone);
                                if (matched) return (matched.angleStart + matched.angleEnd) / 2;
                                return Math.random() * 360;
                            })()
                        );

                        const distanceRatio = shot.runs === 6 ? 1.0 : shot.runs === 4 ? 0.95 : (0.3 + (shot.runs * 0.18));
                        const targetPos = polarToCartesian(center, center, outerRadius * distanceRatio, angle);
                        const color = getRunColor(shot.runs, shot.isWicket);

                        return (
                            <g key={idx} className="wagon-shot-trajectory">
                                <line
                                    x1={center}
                                    y1={center}
                                    x2={targetPos.x}
                                    y2={targetPos.y}
                                    stroke={color}
                                    strokeWidth={shot.runs >= 4 ? '2.5' : '1.5'}
                                    strokeOpacity={0.8}
                                    filter={shot.runs >= 4 ? 'url(#glow)' : undefined}
                                />
                                <circle
                                    cx={targetPos.x}
                                    cy={targetPos.y}
                                    r={shot.runs === 6 ? 4.5 : shot.runs === 4 ? 3.8 : 2.5}
                                    fill={color}
                                />
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Selected Zone Pill / Prompt */}
            {interactive && (
                <div className="wagon-selection-prompt">
                    {selectedZone ? (
                        <span className="selected-tag">Selected: <strong>{selectedZone}</strong></span>
                    ) : (
                        <span className="prompt-text">Tap field to select shot zone</span>
                    )}
                </div>
            )}
        </div>
    );
};

export default WagonWheel;
