import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    MdTimeline,
    MdSportsCricket,
    MdFlag,
} from 'react-icons/md';
import './ScoreComparisonChart.css';

/**
 * Extracts and enriches over-by-over score progression for a team.
 * Supports exact overHistory, commentary derivation, and milestone-based interpolation.
 */
export function getTeamOverProgression(teamObj, teamKey, matchData, overLimit = 20) {
    if (!teamObj) return [{ over: 0, runs: 0, wickets: 0, overRuns: 0, crr: '0.00' }];

    const totalRuns = Number(teamObj.totalRuns ?? teamObj.runs ?? 0);
    const totalWickets = Number(teamObj.totalWickets ?? teamObj.wickets ?? 0);
    const totalBalls = Number(teamObj.totalBalls ?? 0);
    const oversDecimal = Number(teamObj.overs ?? 0);
    const actualOversCount = totalBalls > 0 ? (totalBalls / 6) : oversDecimal;

    // 1. Explicit overHistory stored on team
    if (teamObj.overHistory && typeof teamObj.overHistory === 'object') {
        const entries = Object.values(teamObj.overHistory)
            .filter(e => e && e.over !== undefined && !isNaN(Number(e.over)))
            .map(e => ({
                over: Number(e.over),
                runs: Number(e.runs || 0),
                wickets: Number(e.wickets || 0),
                balls: Number(e.balls || (Number(e.over) * 6))
            }))
            .sort((a, b) => a.over - b.over);

        if (entries.length > 0) {
            const map = new Map();
            map.set(0, { over: 0, runs: 0, wickets: 0 });
            entries.forEach(e => {
                map.set(e.over, e);
            });
            if (actualOversCount > 0) {
                const roundedOver = Math.round(actualOversCount * 10) / 10;
                map.set(roundedOver, {
                    over: roundedOver,
                    runs: totalRuns,
                    wickets: totalWickets
                });
            }
            const sorted = Array.from(map.values()).sort((a, b) => a.over - b.over);
            return enrichProgression(sorted);
        }
    }

    // 2. Commentary-derived progression
    const allComm = matchData?.commentary ? Object.values(matchData.commentary) : [];
    const teamDeliveries = allComm.filter(c => {
        if (!c) return false;
        if (c.battingTeamKey) return c.battingTeamKey === teamKey;
        if (c.team) return c.team === teamKey;
        return true;
    });

    if (teamDeliveries.length >= 6) {
        const overMap = new Map();
        overMap.set(0, { over: 0, runs: 0, wickets: 0 });
        let runningRuns = 0;
        let runningWickets = 0;

        const sortedDeliveries = [...teamDeliveries].sort(
            (a, b) => (Number(a.timestamp || a.id) || 0) - (Number(b.timestamp || b.id) || 0)
        );
        sortedDeliveries.forEach(d => {
            const r = Number(d.runs || 0) + Number(d.extraRuns || 0);
            runningRuns += r;
            if (d.isWicket) runningWickets += 1;
            const ovNum = Math.floor(parseFloat(d.over || 0)) + 1;
            overMap.set(ovNum, { over: ovNum, runs: runningRuns, wickets: runningWickets });
        });

        const sorted = Array.from(overMap.values()).sort((a, b) => a.over - b.over);
        if (sorted.length > 1) {
            return enrichProgression(sorted);
        }
    }

    // 3. Fallback: Milestone & Fall of Wickets interpolation
    if (actualOversCount <= 0 && totalRuns === 0) {
        return [{ over: 0, runs: 0, wickets: 0, overRuns: 0, crr: '0.00' }];
    }

    const anchors = [{ over: 0, runs: 0, wickets: 0 }];

    if (teamObj.fallOfWickets) {
        Object.values(teamObj.fallOfWickets).forEach(fow => {
            if (!fow) return;
            const ov = parseFloat(fow.over);
            let r = 0;
            let w = 1;
            if (typeof fow.score === 'string') {
                const parts = fow.score.split(/[-/]/);
                r = parseInt(parts[0], 10) || 0;
                w = parseInt(parts[1], 10) || 1;
            }
            if (!isNaN(ov) && ov > 0) {
                anchors.push({ over: ov, runs: r, wickets: w });
            }
        });
    }

    const maxBowledOver = Math.max(0.1, actualOversCount);
    anchors.push({ over: maxBowledOver, runs: totalRuns, wickets: totalWickets });
    anchors.sort((a, b) => a.over - b.over);

    const result = [{ over: 0, runs: 0, wickets: 0 }];
    const fullOvers = Math.floor(maxBowledOver);

    for (let ov = 1; ov <= fullOvers; ov++) {
        let prevAnchor = anchors[0];
        let nextAnchor = anchors[anchors.length - 1];
        for (let i = 0; i < anchors.length - 1; i++) {
            if (anchors[i].over <= ov && anchors[i + 1].over >= ov) {
                prevAnchor = anchors[i];
                nextAnchor = anchors[i + 1];
                break;
            }
        }
        const span = nextAnchor.over - prevAnchor.over;
        const progress = span > 0 ? (ov - prevAnchor.over) / span : 0;
        const runsAtOv = Math.round(prevAnchor.runs + progress * (nextAnchor.runs - prevAnchor.runs));
        const wktsAtOv = prevAnchor.wickets;
        result.push({ over: ov, runs: runsAtOv, wickets: wktsAtOv });
    }

    if (maxBowledOver > fullOvers) {
        result.push({ over: Math.round(maxBowledOver * 10) / 10, runs: totalRuns, wickets: totalWickets });
    }

    return enrichProgression(result);
}

function enrichProgression(points) {
    let prevRuns = 0;
    let prevWkts = 0;
    return points.map((p, idx) => {
        const overRuns = idx === 0 ? 0 : Math.max(0, p.runs - prevRuns);
        const wicketsInOver = idx === 0 ? 0 : Math.max(0, p.wickets - prevWkts);
        prevRuns = p.runs;
        prevWkts = p.wickets;
        const crr = p.over > 0 ? (p.runs / p.over).toFixed(2) : '0.00';
        return {
            ...p,
            overRuns,
            wicketsInOver,
            crr
        };
    });
}

// SVG Layout Dimensions: Calibrated for crystal clarity and responsive single-screen fitting
const SVG_WIDTH = 860;
const SVG_HEIGHT = 290;
const PAD = { top: 24, right: 32, bottom: 34, left: 52 };
const chartW = SVG_WIDTH - PAD.left - PAD.right;
const chartH = SVG_HEIGHT - PAD.top - PAD.bottom;
const baselineY = PAD.top + chartH;

function generateSvgLinePath(points, getX, getY, valProp) {
    if (!points || points.length === 0) return '';
    return points
        .map((p, idx) => {
            const x = getX(p.over);
            const y = getY(p[valProp]);
            return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
}

function generateSvgAreaPath(points, getX, getY, valProp) {
    if (!points || points.length === 0) return '';
    const line = generateSvgLinePath(points, getX, getY, valProp);
    const lastX = getX(points[points.length - 1].over);
    const firstX = getX(points[0].over);
    return `${line} L ${lastX.toFixed(1)},${baselineY} L ${firstX.toFixed(1)},${baselineY} Z`;
}

/**
 * ScoreComparisonChart Component
 * Displays both teams' score progression per over in a single broadcast-grade chart.
 * Works seamlessly in both Light and Dark mode, fits in a single screen on desktop, and is fully mobile responsive.
 */
export default function ScoreComparisonChart({
    matchData = {},
    team1 = {},
    team2 = {},
    t1Name = 'Team 1',
    t2Name = 'Team 2',
    t1Score = 0,
    t2Score = 0,
    t1Wickets = 0,
    t2Wickets = 0,
    t1Overs = 0,
    t2Overs = 0,
    t1Logo = null,
    t2Logo = null,
    firstBatTeamKey = 'team1',
    secondBatTeamKey = 'team2',
    target = null,
    overLimit = 20
}) {
    const [chartMode, setChartMode] = useState('worm'); // 'worm' | 'manhattan' | 'crr'
    const [hoveredOver, setHoveredOver] = useState(null);

    // Dynamic Light / Dark mode sync from documentElement data-theme attribute
    const [currentTheme, setCurrentTheme] = useState(() => {
        if (typeof document !== 'undefined') {
            return document.documentElement.getAttribute('data-theme') || 'dark';
        }
        return 'dark';
    });

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const updateTheme = () => {
            const t = document.documentElement.getAttribute('data-theme') || 'dark';
            setCurrentTheme(t);
        };
        updateTheme();
        const observer = new MutationObserver(updateTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    const isLight = currentTheme === 'light';

    // Theme-adaptive vibrant, high-clarity colors
    const COLOR_TEAM_A = isLight ? '#0284c7' : '#00f0ff'; // Bright Sky/Cobalt in Light, Electric Cyan in Dark
    const COLOR_TEAM_B = isLight ? '#ea580c' : '#ff9d00'; // High-contrast Deep Orange in Light, Vivid Amber in Dark
    const COLOR_TARGET = isLight ? '#b45309' : '#ffd700'; // Warm Golden Target
    const COLOR_GRID = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
    const COLOR_AXIS_LABEL = isLight ? '#334155' : '#94a3b8';
    const COLOR_AXIS_TITLE = isLight ? '#1e293b' : '#cbd5e1';

    // Identify teams by batting order
    const isT1FirstBat = firstBatTeamKey === 'team1';
    const firstBatTeamObj = isT1FirstBat ? team1 : team2;
    const secondBatTeamObj = isT1FirstBat ? team2 : team1;
    const firstBatName = isT1FirstBat ? t1Name : t2Name;
    const secondBatName = isT1FirstBat ? t2Name : t1Name;
    const firstBatLogo = isT1FirstBat ? t1Logo : t2Logo;
    const secondBatLogo = isT1FirstBat ? t2Logo : t1Logo;
    const firstBatScore = isT1FirstBat ? t1Score : t2Score;
    const secondBatScore = isT1FirstBat ? t2Score : t1Score;
    const firstBatWickets = isT1FirstBat ? t1Wickets : t2Wickets;
    const secondBatWickets = isT1FirstBat ? t2Wickets : t1Wickets;
    const firstBatOvers = isT1FirstBat ? t1Overs : t2Overs;
    const secondBatOvers = isT1FirstBat ? t2Overs : t1Overs;

    // Progression arrays
    const firstBatProgression = useMemo(() => {
        return getTeamOverProgression(firstBatTeamObj, firstBatTeamKey, matchData, overLimit);
    }, [firstBatTeamObj, firstBatTeamKey, matchData, overLimit]);

    const secondBatProgression = useMemo(() => {
        return getTeamOverProgression(secondBatTeamObj, secondBatTeamKey, matchData, overLimit);
    }, [secondBatTeamObj, secondBatTeamKey, matchData, overLimit]);

    // Determine max over range
    const maxProgOver = Math.max(
        overLimit || 20,
        ...firstBatProgression.map(p => p.over),
        ...secondBatProgression.map(p => p.over)
    );
    const maxOver = Math.max(5, Math.ceil(maxProgOver));

    // Determine max runs range
    const maxRunInProg = Math.max(
        target ? Number(target) : 0,
        ...firstBatProgression.map(p => p.runs),
        ...secondBatProgression.map(p => p.runs)
    );
    const maxRuns = Math.max(40, Math.ceil(maxRunInProg / 25) * 25 + 25);

    // Determine max per-over runs (for Manhattan)
    const maxOverRuns = Math.max(
        12,
        ...firstBatProgression.map(p => p.overRuns || 0),
        ...secondBatProgression.map(p => p.overRuns || 0)
    );
    const maxPerOverScale = Math.ceil(maxOverRuns / 4) * 4;

    // Determine max CRR (for CRR mode)
    const maxCrrVal = Math.max(
        12,
        ...firstBatProgression.map(p => parseFloat(p.crr) || 0),
        ...secondBatProgression.map(p => parseFloat(p.crr) || 0)
    );
    const maxCrrScale = Math.ceil(maxCrrVal / 2) * 2;

    // Coordinate converters
    const getX = useCallback((over) => PAD.left + (over / maxOver) * chartW, [maxOver]);
    const getYRuns = useCallback((runs) => PAD.top + chartH - (runs / maxRuns) * chartH, [maxRuns]);
    const getYManhattan = useCallback((runs) => PAD.top + chartH - (runs / maxPerOverScale) * chartH, [maxPerOverScale]);
    const getYCrr = useCallback((crr) => PAD.top + chartH - (crr / maxCrrScale) * chartH, [maxCrrScale]);

    // Paths
    const team1WormPath = useMemo(() => generateSvgLinePath(firstBatProgression, getX, getYRuns, 'runs'), [firstBatProgression, getX, getYRuns]);
    const team1AreaPath = useMemo(() => generateSvgAreaPath(firstBatProgression, getX, getYRuns, 'runs'), [firstBatProgression, getX, getYRuns]);

    const team2WormPath = useMemo(() => {
        return secondBatOvers > 0 || secondBatScore > 0 ? generateSvgLinePath(secondBatProgression, getX, getYRuns, 'runs') : '';
    }, [secondBatProgression, secondBatOvers, secondBatScore, getX, getYRuns]);

    const team2AreaPath = useMemo(() => {
        return secondBatOvers > 0 || secondBatScore > 0 ? generateSvgAreaPath(secondBatProgression, getX, getYRuns, 'runs') : '';
    }, [secondBatProgression, secondBatOvers, secondBatScore, getX, getYRuns]);

    const team1CrrPath = useMemo(() => generateSvgLinePath(firstBatProgression, getX, getYCrr, 'crr'), [firstBatProgression, getX, getYCrr]);
    const team2CrrPath = useMemo(() => {
        return secondBatOvers > 0 || secondBatScore > 0 ? generateSvgLinePath(secondBatProgression, getX, getYCrr, 'crr') : '';
    }, [secondBatProgression, secondBatOvers, secondBatScore, getX, getYCrr]);

    // Grid ticks (evenly spaced for clarity)
    const yRunTicks = useMemo(() => {
        const step = maxRuns > 160 ? 50 : (maxRuns > 80 ? 25 : 15);
        const ticks = [];
        for (let r = 0; r <= maxRuns; r += step) ticks.push(r);
        return ticks;
    }, [maxRuns]);

    const yManhattanTicks = useMemo(() => {
        const step = maxPerOverScale > 20 ? 6 : 4;
        const ticks = [];
        for (let r = 0; r <= maxPerOverScale; r += step) ticks.push(r);
        return ticks;
    }, [maxPerOverScale]);

    const yCrrTicks = useMemo(() => {
        const step = 3;
        const ticks = [];
        for (let r = 0; r <= maxCrrScale; r += step) ticks.push(r);
        return ticks;
    }, [maxCrrScale]);

    const xOverTicks = useMemo(() => {
        // Show every over 1 to 20 (Over limit) without 0 point for x-axis
        const step = maxOver > 25 ? (maxOver > 40 ? 5 : 2) : 1;
        const ticks = [];
        for (let o = 1; o <= maxOver; o += step) ticks.push(o);
        return ticks;
    }, [maxOver]);

    // Active tooltip lookup based on hovered over
    const activeHoverData = useMemo(() => {
        if (hoveredOver === null) return null;
        const t1Item = firstBatProgression.find(p => Math.abs(p.over - hoveredOver) < 0.6) ||
            firstBatProgression.filter(p => p.over <= hoveredOver).pop() || null;
        const t2Item = (secondBatOvers > 0 || secondBatScore > 0)
            ? (secondBatProgression.find(p => Math.abs(p.over - hoveredOver) < 0.6) ||
                secondBatProgression.filter(p => p.over <= hoveredOver).pop() || null)
            : null;
        return {
            over: hoveredOver,
            t1: t1Item,
            t2: t2Item
        };
    }, [hoveredOver, firstBatProgression, secondBatProgression, secondBatOvers, secondBatScore]);

    // Phase comparison stats (Powerplay 1-6, Highest Over)
    const phaseStats = useMemo(() => {
        const getPhaseScore = (prog, startOv, endOv) => {
            const startPt = prog.filter(p => p.over <= startOv).pop() || { runs: 0, wickets: 0 };
            const endPt = prog.filter(p => p.over <= endOv).pop() || prog[prog.length - 1] || { runs: 0, wickets: 0 };
            return {
                runs: Math.max(0, endPt.runs - startPt.runs),
                wickets: Math.max(0, endPt.wickets - startPt.wickets)
            };
        };

        const t1PP = getPhaseScore(firstBatProgression, 0, 6);
        const t2PP = (secondBatOvers > 0 || secondBatScore > 0) ? getPhaseScore(secondBatProgression, 0, 6) : null;

        const t1HighestOver = [...firstBatProgression].sort((a, b) => (b.overRuns || 0) - (a.overRuns || 0))[0] || null;
        const t2HighestOver = (secondBatOvers > 0 || secondBatScore > 0)
            ? [...secondBatProgression].sort((a, b) => (b.overRuns || 0) - (a.overRuns || 0))[0]
            : null;

        return {
            t1PP,
            t2PP,
            t1HighestOver,
            t2HighestOver
        };
    }, [firstBatProgression, secondBatProgression, secondBatOvers, secondBatScore]);

    const hasMatchStarted = (firstBatOvers > 0 || firstBatScore > 0);

    return (
        <div className="scc-container" data-scc-theme={currentTheme}>
            {/* Header: Title Block & Mode Controls in one compact row without icons */}
            <div className="scc-header">
                <div className="scc-title-block">
                    <div className="scc-title-row">
                        <span className="scc-badge">
                            <MdTimeline /> OVER-BY-OVER PROGRESSION
                        </span>
                    </div>
                    <p className="scc-sub-title">
                        Comparing runs, scoring pace, and wicket milestones across both teams in a single view
                    </p>
                </div>

                {/* Mode Tabs: No icons, full & short text for flawless single-row mobile display */}
                <div className="scc-mode-tabs">
                    <button
                        type="button"
                        className={`scc-mode-btn ${chartMode === 'worm' ? 'active' : ''}`}
                        onClick={() => setChartMode('worm')}
                    >
                        <span className="scc-btn-label-full">Cumulative (Worm)</span>
                        <span className="scc-btn-label-short">Worm</span>
                    </button>
                    <button
                        type="button"
                        className={`scc-mode-btn ${chartMode === 'manhattan' ? 'active' : ''}`}
                        onClick={() => setChartMode('manhattan')}
                    >
                        <span className="scc-btn-label-full">Runs / Over</span>
                        <span className="scc-btn-label-short">Runs / Ov</span>
                    </button>
                    <button
                        type="button"
                        className={`scc-mode-btn ${chartMode === 'crr' ? 'active' : ''}`}
                        onClick={() => setChartMode('crr')}
                    >
                        <span className="scc-btn-label-full">Run Rate (CRR)</span>
                        <span className="scc-btn-label-short">Run Rate</span>
                    </button>
                </div>
            </div>

            {/* Team Legend Bar: Slim, single-row status bar */}
            <div className="scc-teams-legend">
                <div className="scc-legend-card team-a">
                    <div className="scc-legend-dot" style={{ backgroundColor: COLOR_TEAM_A }} />
                    {firstBatLogo ? (
                        <img src={firstBatLogo} alt={firstBatName} className="scc-legend-logo" />
                    ) : (
                        <div className="scc-legend-avatar" style={{ borderColor: COLOR_TEAM_A }}>
                            {firstBatName.charAt(0)}
                        </div>
                    )}
                    <div className="scc-legend-info">
                        <span className="scc-legend-name">{firstBatName}</span>
                        <span className="scc-legend-sub">1st Bat • <strong>{firstBatScore}/{firstBatWickets}</strong> ({firstBatOvers} ov)</span>
                    </div>
                </div>

                <div className="scc-legend-divider">VS</div>

                <div className="scc-legend-card team-b">
                    <div className="scc-legend-dot" style={{ backgroundColor: COLOR_TEAM_B }} />
                    {secondBatLogo ? (
                        <img src={secondBatLogo} alt={secondBatName} className="scc-legend-logo" />
                    ) : (
                        <div className="scc-legend-avatar" style={{ borderColor: COLOR_TEAM_B }}>
                            {secondBatName.charAt(0)}
                        </div>
                    )}
                    <div className="scc-legend-info">
                        <span className="scc-legend-name">{secondBatName}</span>
                        <span className="scc-legend-sub">
                            2nd Bat • {secondBatOvers > 0 || secondBatScore > 0 ? (
                                <strong>{secondBatScore}/{secondBatWickets} ({secondBatOvers} ov)</strong>
                            ) : (
                                <em className="scc-yet-to-bat">Yet to Bat</em>
                            )}
                        </span>
                    </div>
                </div>

                {target && (
                    <div className="scc-legend-target-badge">
                        <MdFlag /> Target: <strong>{target}</strong>
                    </div>
                )}
            </div>

            {/* Interactive SVG Chart Viewport: Scaled to fit single desktop screen with high clarity */}
            <div className="scc-svg-wrapper">
                {!hasMatchStarted ? (
                    <div className="scc-empty-state">
                        <MdSportsCricket className="scc-empty-icon" />
                        <h4>Match Inning Has Not Commenced</h4>
                        <p>Score changing curves for both teams will dynamically plot here as each over is bowled.</p>
                    </div>
                ) : (
                    <svg
                        className="scc-svg-canvas"
                        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                        preserveAspectRatio="xMidYMid meet"
                        onMouseLeave={() => setHoveredOver(null)}
                    >
                        <defs>
                            {/* Team 1 Gradient */}
                            <linearGradient id="sccGradTeamA" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={COLOR_TEAM_A} stopOpacity={isLight ? 0.25 : 0.32} />
                                <stop offset="100%" stopColor={COLOR_TEAM_A} stopOpacity="0.0" />
                            </linearGradient>

                            {/* Team 2 Gradient */}
                            <linearGradient id="sccGradTeamB" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={COLOR_TEAM_B} stopOpacity={isLight ? 0.22 : 0.30} />
                                <stop offset="100%" stopColor={COLOR_TEAM_B} stopOpacity="0.0" />
                            </linearGradient>

                            {/* Glow Filters */}
                            <filter id="sccGlowA" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="0" stdDeviation={isLight ? '2' : '3'} floodColor={COLOR_TEAM_A} floodOpacity={isLight ? 0.4 : 0.8} />
                            </filter>
                            <filter id="sccGlowB" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="0" stdDeviation={isLight ? '2' : '3'} floodColor={COLOR_TEAM_B} floodOpacity={isLight ? 0.4 : 0.8} />
                            </filter>
                        </defs>

                        {/* Background gridlines (Horizontal) */}
                        {chartMode === 'worm' && yRunTicks.map(val => {
                            const y = getYRuns(val);
                            return (
                                <g key={`grid-y-${val}`} className="scc-grid-line-grp">
                                    <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y} stroke={COLOR_GRID} strokeDasharray="4 4" strokeWidth="1" className="scc-grid-line" />
                                    <text x={PAD.left - 9} y={y + 4} fill={COLOR_AXIS_LABEL} fontSize="11" fontWeight="700" textAnchor="end" className="scc-axis-label y-axis">{val}</text>
                                </g>
                            );
                        })}

                        {chartMode === 'manhattan' && yManhattanTicks.map(val => {
                            const y = getYManhattan(val);
                            return (
                                <g key={`grid-ym-${val}`} className="scc-grid-line-grp">
                                    <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y} stroke={COLOR_GRID} strokeDasharray="4 4" strokeWidth="1" className="scc-grid-line" />
                                    <text x={PAD.left - 9} y={y + 4} fill={COLOR_AXIS_LABEL} fontSize="11" fontWeight="700" textAnchor="end" className="scc-axis-label y-axis">{val} r</text>
                                </g>
                            );
                        })}

                        {chartMode === 'crr' && yCrrTicks.map(val => {
                            const y = getYCrr(val);
                            return (
                                <g key={`grid-yc-${val}`} className="scc-grid-line-grp">
                                    <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y} stroke={COLOR_GRID} strokeDasharray="4 4" strokeWidth="1" className="scc-grid-line" />
                                    <text x={PAD.left - 9} y={y + 4} fill={COLOR_AXIS_LABEL} fontSize="11" fontWeight="700" textAnchor="end" className="scc-axis-label y-axis">{val}</text>
                                </g>
                            );
                        })}

                        {/* Background gridlines (Vertical / Overs) */}
                        {xOverTicks.map(val => {
                            const x = getX(val);
                            return (
                                <g key={`grid-x-${val}`} className="scc-grid-line-grp">
                                    <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + chartH} stroke={COLOR_GRID} strokeDasharray="2 4" strokeWidth="1" className="scc-grid-line vertical" />
                                    <text
                                        x={x}
                                        y={PAD.top + chartH + 16}
                                        fill={COLOR_AXIS_LABEL}
                                        fontSize={maxOver > 15 ? "9.5" : "11"}
                                        fontWeight="700"
                                        textAnchor="middle"
                                        className="scc-axis-label x-axis"
                                    >
                                        {val === 0 ? '0' : val}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Axis Titles */}
                        <text
                            x={PAD.left + chartW / 2}
                            y={SVG_HEIGHT - 3}
                            fill={COLOR_AXIS_TITLE}
                            fontSize="10"
                            fontWeight="800"
                            letterSpacing="0.08em"
                            textAnchor="middle"
                            className="scc-axis-title x"
                        >
                            OVERS COMPLETED
                        </text>
                        <text
                            x={14}
                            y={PAD.top + chartH / 2}
                            fill={COLOR_AXIS_TITLE}
                            fontSize="10"
                            fontWeight="800"
                            letterSpacing="0.08em"
                            textAnchor="middle"
                            className="scc-axis-title y"
                            transform={`rotate(-90 14 ${PAD.top + chartH / 2})`}
                        >
                            {chartMode === 'worm' ? 'CUMULATIVE RUNS' : (chartMode === 'manhattan' ? 'RUNS IN OVER' : 'RUN RATE (CRR)')}
                        </text>

                        {/* Target Line in 2nd Innings (Worm mode) */}
                        {chartMode === 'worm' && target && target <= maxRuns && (
                            <g className="scc-target-line-grp">
                                <line
                                    x1={PAD.left}
                                    y1={getYRuns(target)}
                                    x2={PAD.left + chartW}
                                    y2={getYRuns(target)}
                                    stroke={COLOR_TARGET}
                                    strokeWidth="1.8"
                                    strokeDasharray="6 3"
                                    className="scc-target-line"
                                />
                                <rect
                                    x={PAD.left + chartW - 92}
                                    y={getYRuns(target) - 12}
                                    width={88}
                                    height={20}
                                    rx={4}
                                    fill={isLight ? '#fffbeb' : '#1e1b09'}
                                    stroke={COLOR_TARGET}
                                    strokeWidth="1.2"
                                />
                                <text
                                    x={PAD.left + chartW - 48}
                                    y={getYRuns(target) + 2}
                                    fill={COLOR_TARGET}
                                    fontSize="9.5"
                                    fontWeight="800"
                                    textAnchor="middle"
                                    className="scc-target-badge-txt"
                                >
                                    TARGET {target}
                                </text>
                            </g>
                        )}

                        {/* ────────────────── MODE 1: WORM CHART ────────────────── */}
                        {chartMode === 'worm' && (
                            <>
                                {/* Team 1 Area Fill & Line */}
                                {team1AreaPath && <path d={team1AreaPath} fill="url(#sccGradTeamA)" />}
                                {team1WormPath && (
                                    <path
                                        d={team1WormPath}
                                        fill="none"
                                        stroke={COLOR_TEAM_A}
                                        strokeWidth="3.6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        filter="url(#sccGlowA)"
                                    />
                                )}

                                {/* Team 2 Area Fill & Line */}
                                {team2AreaPath && <path d={team2AreaPath} fill="url(#sccGradTeamB)" />}
                                {team2WormPath && (
                                    <path
                                        d={team2WormPath}
                                        fill="none"
                                        stroke={COLOR_TEAM_B}
                                        strokeWidth="3.6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        filter="url(#sccGlowB)"
                                    />
                                )}

                                {/* Team 1 Data Points & Wicket Flags */}
                                {firstBatProgression.map((p, idx) => {
                                    if (idx === 0) return null;
                                    const cx = getX(p.over);
                                    const cy = getYRuns(p.runs);
                                    const isWkt = p.wicketsInOver > 0;
                                    const isHovered = hoveredOver !== null && Math.abs(p.over - hoveredOver) < 0.6;
                                    return (
                                        <g key={`pt-t1-${p.over}`}>
                                            <circle
                                                cx={cx}
                                                cy={cy}
                                                r={isHovered ? 6 : (isWkt ? 4.8 : 3.5)}
                                                fill={isWkt ? '#ef4444' : COLOR_TEAM_A}
                                                stroke="#ffffff"
                                                strokeWidth={isHovered ? 2.5 : 1.8}
                                                className="scc-data-dot"
                                            />
                                            {isWkt && (
                                                <g transform={`translate(${cx}, ${cy - 15})`} className="scc-wicket-pin">
                                                    <circle r="7.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                                                    <text y="3" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900">
                                                        {p.wicketsInOver > 1 ? `${p.wicketsInOver}W` : 'W'}
                                                    </text>
                                                </g>
                                            )}
                                        </g>
                                    );
                                })}

                                {/* Team 2 Data Points & Wicket Flags */}
                                {(secondBatOvers > 0 || secondBatScore > 0) && secondBatProgression.map((p, idx) => {
                                    if (idx === 0) return null;
                                    const cx = getX(p.over);
                                    const cy = getYRuns(p.runs);
                                    const isWkt = p.wicketsInOver > 0;
                                    const isHovered = hoveredOver !== null && Math.abs(p.over - hoveredOver) < 0.6;
                                    return (
                                        <g key={`pt-t2-${p.over}`}>
                                            <circle
                                                cx={cx}
                                                cy={cy}
                                                r={isHovered ? 6 : (isWkt ? 4.8 : 3.5)}
                                                fill={isWkt ? '#ef4444' : COLOR_TEAM_B}
                                                stroke="#ffffff"
                                                strokeWidth={isHovered ? 2.5 : 1.8}
                                                className="scc-data-dot"
                                            />
                                            {isWkt && (
                                                <g transform={`translate(${cx}, ${cy - 15})`} className="scc-wicket-pin">
                                                    <circle r="7.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                                                    <text y="3" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900">
                                                        {p.wicketsInOver > 1 ? `${p.wicketsInOver}W` : 'W'}
                                                    </text>
                                                </g>
                                            )}
                                        </g>
                                    );
                                })}
                            </>
                        )}

                        {/* ────────────────── MODE 2: MANHATTAN BARS ────────────────── */}
                        {chartMode === 'manhattan' && (
                            <g className="scc-manhattan-bars-grp">
                                {xOverTicks.filter(o => o > 0).map(ov => {
                                    const t1 = firstBatProgression.find(p => Math.abs(p.over - ov) < 0.6);
                                    const t2 = (secondBatOvers > 0 || secondBatScore > 0)
                                        ? secondBatProgression.find(p => Math.abs(p.over - ov) < 0.6)
                                        : null;

                                    const centerPointX = getX(ov);
                                    const barWidth = Math.max(5, Math.min(15, (chartW / maxOver) * 0.36));
                                    const gap = 2;

                                    const t1RunsVal = t1 ? (t1.overRuns || 0) : 0;
                                    const t2RunsVal = t2 ? (t2.overRuns || 0) : 0;

                                    const t1H = (t1RunsVal / maxPerOverScale) * chartH;
                                    const t2H = (t2RunsVal / maxPerOverScale) * chartH;

                                    const t1Y = PAD.top + chartH - t1H;
                                    const t2Y = PAD.top + chartH - t2H;

                                    return (
                                        <g key={`bar-grp-${ov}`}>
                                            {/* Team 1 Bar */}
                                            {t1 && t1RunsVal > 0 && (
                                                <g>
                                                    <rect
                                                        x={centerPointX - barWidth - gap / 2}
                                                        y={t1Y}
                                                        width={barWidth}
                                                        height={t1H}
                                                        rx="3"
                                                        fill={COLOR_TEAM_A}
                                                        className="scc-bar t1"
                                                    />
                                                    <text
                                                        x={centerPointX - barWidth / 2 - gap / 2}
                                                        y={t1Y - 4}
                                                        textAnchor="middle"
                                                        fill={COLOR_TEAM_A}
                                                        fontSize={maxOver > 15 ? "8.5" : "10"}
                                                        fontWeight="800"
                                                        className="scc-bar-val-txt t1"
                                                    >
                                                        {t1RunsVal}
                                                    </text>
                                                </g>
                                            )}

                                            {/* Team 2 Bar */}
                                            {t2 && t2RunsVal > 0 && (
                                                <g>
                                                    <rect
                                                        x={centerPointX + gap / 2}
                                                        y={t2Y}
                                                        width={barWidth}
                                                        height={t2H}
                                                        rx="3"
                                                        fill={COLOR_TEAM_B}
                                                        className="scc-bar t2"
                                                    />
                                                    <text
                                                        x={centerPointX + barWidth / 2 + gap / 2}
                                                        y={t2Y - 4}
                                                        textAnchor="middle"
                                                        fill={COLOR_TEAM_B}
                                                        fontSize={maxOver > 15 ? "8.5" : "10"}
                                                        fontWeight="800"
                                                        className="scc-bar-val-txt t2"
                                                    >
                                                        {t2RunsVal}
                                                    </text>
                                                </g>
                                            )}
                                        </g>
                                    );
                                })}
                            </g>
                        )}

                        {/* ────────────────── MODE 3: CRR RUN RATE ────────────────── */}
                        {chartMode === 'crr' && (
                            <>
                                {team1CrrPath && (
                                    <path
                                        d={team1CrrPath}
                                        fill="none"
                                        stroke={COLOR_TEAM_A}
                                        strokeWidth="3.4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        filter="url(#sccGlowA)"
                                    />
                                )}
                                {team2CrrPath && (
                                    <path
                                        d={team2CrrPath}
                                        fill="none"
                                        stroke={COLOR_TEAM_B}
                                        strokeWidth="3.4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        filter="url(#sccGlowB)"
                                    />
                                )}

                                {/* Team 1 CRR Data Points */}
                                {firstBatProgression.map((p, idx) => {
                                    if (idx === 0) return null;
                                    const cx = getX(p.over);
                                    const cy = getYCrr(parseFloat(p.crr) || 0);
                                    const isHovered = hoveredOver !== null && Math.abs(p.over - hoveredOver) < 0.6;
                                    return (
                                        <circle
                                            key={`crr-pt-t1-${p.over}`}
                                            cx={cx}
                                            cy={cy}
                                            r={isHovered ? 5.5 : 3.2}
                                            fill={COLOR_TEAM_A}
                                            stroke="#ffffff"
                                            strokeWidth={isHovered ? 2.2 : 1.5}
                                            className="scc-data-dot"
                                        />
                                    );
                                })}

                                {/* Team 2 CRR Data Points */}
                                {(secondBatOvers > 0 || secondBatScore > 0) && secondBatProgression.map((p, idx) => {
                                    if (idx === 0) return null;
                                    const cx = getX(p.over);
                                    const cy = getYCrr(parseFloat(p.crr) || 0);
                                    const isHovered = hoveredOver !== null && Math.abs(p.over - hoveredOver) < 0.6;
                                    return (
                                        <circle
                                            key={`crr-pt-t2-${p.over}`}
                                            cx={cx}
                                            cy={cy}
                                            r={isHovered ? 5.5 : 3.2}
                                            fill={COLOR_TEAM_B}
                                            stroke="#ffffff"
                                            strokeWidth={isHovered ? 2.2 : 1.5}
                                            className="scc-data-dot"
                                        />
                                    );
                                })}
                            </>
                        )}

                        {/* Interactive Crosshair Tracking on Hover */}
                        {hoveredOver !== null && (
                            <g className="scc-crosshair-grp">
                                <line
                                    x1={getX(hoveredOver)}
                                    y1={PAD.top}
                                    x2={getX(hoveredOver)}
                                    y2={PAD.top + chartH}
                                    stroke={isLight ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.45)'}
                                    strokeWidth="1.5"
                                    strokeDasharray="4 3"
                                    className="scc-crosshair-line"
                                />
                            </g>
                        )}

                        {/* Invisible Hitboxes for Hover & Touch Detection */}
                        {xOverTicks.filter(o => o > 0).map(ov => {
                            const segWidth = chartW / maxOver;
                            const left = getX(ov) - segWidth / 2;
                            return (
                                <rect
                                    key={`hitbox-${ov}`}
                                    x={Math.max(PAD.left, left)}
                                    y={PAD.top}
                                    width={segWidth}
                                    height={chartH}
                                    fill="transparent"
                                    className="scc-hover-hitbox"
                                    onMouseEnter={() => setHoveredOver(ov)}
                                    onTouchStart={() => setHoveredOver(ov)}
                                    onClick={() => setHoveredOver(ov)}
                                />
                            );
                        })}
                    </svg>
                )}

                {/* Floating Interactive Tooltip Card */}
                {activeHoverData && (
                    <div
                        className="scc-tooltip-card"
                        style={{
                            left: `${Math.min(85, Math.max(15, ((getX(activeHoverData.over) || 0) / SVG_WIDTH) * 100))}%`
                        }}
                    >
                        <div className="scc-tooltip-header">
                            <span className="scc-tt-over-badge">OVER {activeHoverData.over}</span>
                            {activeHoverData.t1 && activeHoverData.t2 && (
                                <span className="scc-tt-diff">
                                    {activeHoverData.t1.runs > activeHoverData.t2.runs ? (
                                        `${firstBatName} +${activeHoverData.t1.runs - activeHoverData.t2.runs} runs`
                                    ) : activeHoverData.t2.runs > activeHoverData.t1.runs ? (
                                        `${secondBatName} +${activeHoverData.t2.runs - activeHoverData.t1.runs} runs`
                                    ) : (
                                        'Scores Level'
                                    )}
                                </span>
                            )}
                        </div>

                        <div className="scc-tooltip-body">
                            {activeHoverData.t1 && (
                                <div className="scc-tt-team-row">
                                    <div className="scc-tt-team-dot" style={{ backgroundColor: COLOR_TEAM_A }} />
                                    <span className="scc-tt-team-name">{firstBatName}:</span>
                                    <strong className="scc-tt-team-score">
                                        {activeHoverData.t1.runs}/{activeHoverData.t1.wickets}
                                    </strong>
                                    <span className="scc-tt-details">
                                        (+{activeHoverData.t1.overRuns} in ov • CRR {activeHoverData.t1.crr})
                                    </span>
                                </div>
                            )}

                            {activeHoverData.t2 ? (
                                <div className="scc-tt-team-row">
                                    <div className="scc-tt-team-dot" style={{ backgroundColor: COLOR_TEAM_B }} />
                                    <span className="scc-tt-team-name">{secondBatName}:</span>
                                    <strong className="scc-tt-team-score">
                                        {activeHoverData.t2.runs}/{activeHoverData.t2.wickets}
                                    </strong>
                                    <span className="scc-tt-details">
                                        (+{activeHoverData.t2.overRuns} in ov • CRR {activeHoverData.t2.crr})
                                    </span>
                                </div>
                            ) : (
                                <div className="scc-tt-team-row muted">
                                    <div className="scc-tt-team-dot" style={{ backgroundColor: COLOR_TEAM_B }} />
                                    <span className="scc-tt-team-name">{secondBatName}:</span>
                                    <span className="scc-tt-details">Yet to bat in Over {activeHoverData.over}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Compact Phase Summary Grid: Tight, low-profile stat bar */}
            <div className="scc-summary-grid">
                {/* Card 1: Powerplay Comparison (Overs 1-6) */}
                <div className="scc-stat-card">
                    <div className="scc-card-top">
                        <span className="scc-stat-tag">POWERPLAY (OVERS 1–6)</span>
                    </div>
                    <div className="scc-stat-compare">
                        <div className="scc-stat-col">
                            <span className="scc-col-name">{firstBatName}</span>
                            <strong className="scc-col-score" style={{ color: COLOR_TEAM_A }}>
                                {phaseStats.t1PP.runs}/{phaseStats.t1PP.wickets}
                            </strong>
                            <span className="scc-col-sub">
                                RR {(phaseStats.t1PP.runs / 6).toFixed(2)}
                            </span>
                        </div>
                        <div className="scc-stat-vs">VS</div>
                        <div className="scc-stat-col" style={{ textAlign: 'right' }}>
                            <span className="scc-col-name">{secondBatName}</span>
                            {phaseStats.t2PP ? (
                                <>
                                    <strong className="scc-col-score" style={{ color: COLOR_TEAM_B }}>
                                        {phaseStats.t2PP.runs}/{phaseStats.t2PP.wickets}
                                    </strong>
                                    <span className="scc-col-sub">
                                        RR {(phaseStats.t2PP.runs / 6).toFixed(2)}
                                    </span>
                                </>
                            ) : (
                                <span className="scc-col-pending">Pending</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Card 2: Highest Scoring Over */}
                <div className="scc-stat-card">
                    <div className="scc-card-top">
                        <span className="scc-stat-tag">HIGHEST SCORING OVER</span>
                    </div>
                    <div className="scc-stat-compare">
                        <div className="scc-stat-col">
                            <span className="scc-col-name">{firstBatName}</span>
                            <strong className="scc-col-score" style={{ color: COLOR_TEAM_A }}>
                                {phaseStats.t1HighestOver ? `${phaseStats.t1HighestOver.overRuns} Runs` : '0'}
                            </strong>
                            <span className="scc-col-sub">
                                {phaseStats.t1HighestOver ? `Over ${phaseStats.t1HighestOver.over}` : '—'}
                            </span>
                        </div>
                        <div className="scc-stat-vs">VS</div>
                        <div className="scc-stat-col" style={{ textAlign: 'right' }}>
                            <span className="scc-col-name">{secondBatName}</span>
                            {phaseStats.t2HighestOver ? (
                                <>
                                    <strong className="scc-col-score" style={{ color: COLOR_TEAM_B }}>
                                        {phaseStats.t2HighestOver.overRuns} Runs
                                    </strong>
                                    <span className="scc-col-sub">
                                        Over {phaseStats.t2HighestOver.over}
                                    </span>
                                </>
                            ) : (
                                <span className="scc-col-pending">Pending</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
