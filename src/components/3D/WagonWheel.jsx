import React, { useState } from 'react';
import './WagonWheel.css';

export const WAGON_WHEEL_ZONES_RHB = [
    { id: 'mid_off', name: 'Mid-off', angleStart: 0, angleEnd: 45, side: 'Off' },
    { id: 'cover', name: 'Cover', angleStart: 45, angleEnd: 90, side: 'Off' },
    { id: 'point', name: 'Point', angleStart: 90, angleEnd: 135, side: 'Off' },
    { id: 'third_man', name: 'Third Man', angleStart: 135, angleEnd: 180, side: 'Off' },
    { id: 'fine_leg', name: 'Fine Leg', angleStart: 180, angleEnd: 225, side: 'Leg' },
    { id: 'square_leg', name: 'Square Leg', angleStart: 225, angleEnd: 270, side: 'Leg' },
    { id: 'mid_wicket', name: 'Mid-wicket', angleStart: 270, angleEnd: 315, side: 'Leg' },
    { id: 'mid_on', name: 'Mid-on', angleStart: 315, angleEnd: 360, side: 'Leg' }
];

export const WAGON_WHEEL_ZONES_LHB = [
    { id: 'mid_on', name: 'Mid-on', angleStart: 0, angleEnd: 45, side: 'Leg' },
    { id: 'mid_wicket', name: 'Mid-wicket', angleStart: 45, angleEnd: 90, side: 'Leg' },
    { id: 'square_leg', name: 'Square Leg', angleStart: 90, angleEnd: 135, side: 'Leg' },
    { id: 'fine_leg', name: 'Fine Leg', angleStart: 135, angleEnd: 180, side: 'Leg' },
    { id: 'third_man', name: 'Third Man', angleStart: 180, angleEnd: 225, side: 'Off' },
    { id: 'point', name: 'Point', angleStart: 225, angleEnd: 270, side: 'Off' },
    { id: 'cover', name: 'Cover', angleStart: 270, angleEnd: 315, side: 'Off' },
    { id: 'mid_off', name: 'Mid-off', angleStart: 315, angleEnd: 360, side: 'Off' }
];

export const WAGON_WHEEL_ZONES = WAGON_WHEEL_ZONES_RHB;

const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
};

const describeArc = (x, y, radius, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, radius, startAngle);
    const end = polarToCartesian(x, y, radius, endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', x, y, 'L', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y, 'Z'].join(' ');
};

const getRunColor = (runs, isWicket = false) => {
    if (isWicket) return '#ef4444'; // Red
    switch (runs) {
        case 6: return '#a855f7'; // Purple
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
    batsmanHand = 'Right Hand',
    size = 380
}) => {
    const [hoveredZone, setHoveredZone] = useState(null);
    const [filterType, setFilterType] = useState('all');

    const center = size / 2;
    const outerRadius = (size / 2) - 20;
    const innerCircleRadius = outerRadius * 0.58;

    const zones = batsmanHand === 'Left Hand' ? WAGON_WHEEL_ZONES_LHB : WAGON_WHEEL_ZONES_RHB;

    // Filter out dot balls (runs === 0) and extras - ONLY draw lines for bat scoring runs (1, 2, 3, 4, 6)
    const scoringShots = shots.filter(s => {
        if (s.isExtra || s.extraType) return false;
        if (Number(s.runs) <= 0) return false;
        return true;
    });

    const filteredShots = scoringShots.filter(s => {
        if (filterType === 'all') return true;
        if (filterType === 'singles') return s.runs === 1 || s.runs === 2 || s.runs === 3;
        if (filterType === 'boundaries') return s.runs === 4 || s.runs === 6;
        return true;
    });

    return (
        <div className="wagon-wheel-container" style={{ width: size, maxWidth: '100%' }}>
            {/* Header info */}
            {batsmanName && (
                <div className="wagon-wheel-header">
                    <div>
                        <h4>{batsmanName}</h4>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{batsmanHand} Batsman</span>
                    </div>
                    <span className="wagon-shots-count">{scoringShots.length} Scoring Shots</span>
                </div>
            )}

            {/* Filter Pills */}
            <div className="wagon-filter-pills">
                <button
                    className={`wf-pill ${filterType === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterType('all')}
                >
                    All Shots ({scoringShots.length})
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
                    1s, 2s & 3s
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
                            <feGaussianBlur stdDeviation="2.5" result="blur" />
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
                    {zones.map((zone) => {
                        const pathData = describeArc(center, center, outerRadius - 2, zone.angleStart, zone.angleEnd);
                        const isSelected = selectedZone === zone.name;
                        const isHovered = hoveredZone === zone.name;

                        // Zone midpoint for label
                        const midAngle = (zone.angleStart + zone.angleEnd) / 2;
                        const labelPos = polarToCartesian(center, center, outerRadius * 0.76, midAngle);

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
                    <circle cx={center} cy={center} r="3" fill="#00f0ff" />

                    {/* Render Trajectory Lines ONLY for Bat Scoring Shots (No Dots, No Extras) */}
                    {filteredShots.map((shot, idx) => {
                        const zoneName = shot.zone || shot.wagonZone || shot.name || '';
                        const cleanTarget = zoneName.replace(/[\s_-]+/g, '').toLowerCase();
                        const matched = zones.find(z =>
                            z.name.replace(/[\s_-]+/g, '').toLowerCase() === cleanTarget ||
                            z.id.replace(/[\s_-]+/g, '').toLowerCase() === cleanTarget
                        );

                        let angle = (idx * 45) % 360;
                        if (shot.angle !== undefined) {
                            angle = shot.angle;
                        } else if (matched) {
                            const zoneSpan = matched.angleEnd - matched.angleStart;
                            const spreadOffset = (idx * 13) % (zoneSpan * 0.7) - (zoneSpan * 0.35);
                            angle = ((matched.angleStart + matched.angleEnd) / 2) + spreadOffset;
                        }

                        const distanceRatio = shot.runs >= 6 ? 1.0 : shot.runs === 4 ? 0.92 : shot.runs === 3 ? 0.75 : shot.runs === 2 ? 0.58 : 0.42;
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
                                    strokeOpacity={0.85}
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
