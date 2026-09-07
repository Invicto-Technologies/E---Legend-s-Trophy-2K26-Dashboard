import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import TiltCard from '../../components/3D/TiltCard';
import WagonWheel from '../../components/3D/WagonWheel';
import ThreeStadiumRadarScene from '../../components/3D/ThreeStadiumRadarScene';
import Footer from '../../components/common/Footer/Footer';
import {
    subscribeLiveData,
    subscribeMatch,
    subscribeTeams,
    subscribeActiveTournament,
    resolveTournamentLabels
} from '../../services/rtdbService';
import {
    MdPieChart,
    MdTimeline,
    MdClose,
    MdEmojiEvents,
    MdCalendarToday,
    MdSportsCricket,
    MdLocationOn,
    MdInfo,
    MdFormatListNumbered,
    MdCheckCircle,
    MdBolt
} from 'react-icons/md';
import { GiCricketBat } from 'react-icons/gi';
import { MdSportsBaseball } from 'react-icons/md';
import './LiveScore3D.css';

const LiveScore3D = () => {
    const { matchTitle: routeMatchTitle } = useParams();
    const [liveData, setLiveData] = useState(null);
    const [activeMatchTitle, setActiveMatchTitle] = useState(routeMatchTitle || '');
    const [matchData, setMatchData] = useState(null);
    const [activeTournament, setActiveTournament] = useState(null);
    const [teams, setTeams] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [activeInningsTab, setActiveInningsTab] = useState('team1');
    const [activeHubTab, setActiveHubTab] = useState('scorecard'); // 'scorecard', 'commentary', 'info'
    const [showWagonWheel, setShowWagonWheel] = useState(false);
    const [selectedBatsmanForWagon, setSelectedBatsmanForWagon] = useState(null);

    // 1. Subscribe to Active Tournament
    useEffect(() => {
        const unsubTourney = subscribeActiveTournament((tourney) => {
            setActiveTournament(tourney);
        });
        return () => unsubTourney();
    }, []);

    // 2. Subscribe to Teams for official logos and crests
    useEffect(() => {
        const unsubTeams = subscribeTeams((teamsMap) => {
            setTeams(teamsMap || {});
        });
        return () => unsubTeams();
    }, []);

    // 3. Subscribe to LiveData to resolve default active match if not passed via URL
    useEffect(() => {
        const unsubLive = subscribeLiveData((data) => {
            setLiveData(data);
            setIsLoading(false);
            if (!routeMatchTitle) {
                const target = data?.isLive ? (data?.currentMatchPath || data?.liveScore?.matchTitle) : '';
                setActiveMatchTitle(target || '');
            }
        });
        return () => unsubLive();
    }, [routeMatchTitle]);

    // 4. Subscribe to the specific match if a route title or active live match exists
    useEffect(() => {
        const targetTitle = routeMatchTitle || activeMatchTitle;
        if (!targetTitle) {
            setMatchData(null);
            return;
        }

        const unsubMatch = subscribeMatch(targetTitle, (data) => {
            setMatchData(data);
            setIsLoading(false);
            if (data?.common?.firstBat !== undefined) {
                setActiveInningsTab(data.common.firstBat === 1 ? 'team1' : 'team2');
            }
        });

        return () => unsubMatch();
    }, [routeMatchTitle, activeMatchTitle]);

    const labels = resolveTournamentLabels(activeTournament);
    const isLive = Boolean(liveData?.isLive && activeMatchTitle && (activeMatchTitle === liveData?.currentMatchPath || activeMatchTitle === liveData?.liveScore?.matchTitle));

    // Helper to format authentic cricket broadcast commentary
    const formatRealCommentary = (commItem) => {
        if (!commItem) return '';
        const rawText = (commItem.commentary || commItem.text || '').trim();
        const runs = commItem.runs;
        const bowler = commItem.bowler || 'Bowler';
        const batsman = commItem.batsman || 'Batsman';
        const zone = commItem.wagonZone || '';

        // If existing commentary is already descriptive (not just a short phrase)
        if (rawText.length > 25 && !rawText.startsWith('Dot ball') && !rawText.includes('gathered by')) {
            return rawText;
        }

        if (commItem.isWicket || rawText.toLowerCase().includes('wicket')) {
            const howOut = commItem.dismissalType || 'out';
            const fielder = commItem.dismissalFielder ? `caught by ${commItem.dismissalFielder}` : '';
            return `OUT! ${bowler} strikes! ${batsman} departs (${howOut} ${fielder}). Silence descends on the batting dugout as the breakthrough is made!`.replace(/\s+/g, ' ');
        }

        if (commItem.isSix || runs === 6) {
            const zonePhrases = zone ? `magnificently dispatched over ${zone}` : 'hammered deep into the stands';
            return `SIX! In the slot and punished! ${batsman} stands tall and sends it soaring ${zonePhrases} for a maximum!`;
        }

        if (commItem.isFour || runs === 4) {
            const zonePhrases = zone ? `threaded exquisitely through ${zone}` : 'cracked through the infield';
            return `FOUR! Pure timing! ${batsman} leans into the stroke and beats the ropes ${zonePhrases}!`;
        }

        if (commItem.isExtra) {
            return `EXTRA! ${bowler} strays off line - signaled wide/no-ball. Free runs gifted to the batting side.`;
        }

        if (runs === 0) {
            const dotPhrases = [
                `Good length delivery just outside off, ${batsman} shoulders arms safely through to the keeper.`,
                `Fuller length on middle, defended solidly off the front foot back down the pitch to ${bowler}.`,
                `Beaten! Sharp seam movement off the deck, whiskers past the outside edge!`,
                `Pushed firmly towards ${zone || 'mid-off'}, fielder swoops in quickly - no run taken.`,
                `Back of a length, tucked away towards square leg but straight to the fielder on the ring.`
            ];
            // Deterministic hash based on timestamp or ball string
            const seed = (commItem.timestamp || (commItem.ball ? String(commItem.ball).length : 0)) % dotPhrases.length;
            return dotPhrases[seed];
        }

        if (runs === 1) {
            const singlePhrases = zone ? `Worked gently into the gap at ${zone}` : 'Dropped into the gap with soft hands';
            return `Single taken. ${singlePhrases}, batsmen cross over with quick running between the wickets.`;
        }

        if (runs === 2) {
            const twoPhrases = zone ? `punched into the deep pocket at ${zone}` : 'flicked through the vacant pocket';
            return `Couple of runs! ${batsman} plays it softly ${twoPhrases} and hustles back for a sharp brace.`;
        }

        if (runs === 3) {
            return `Superb running! Pushed into the deep, fielders chase it down before the boundary - excellent three!`;
        }

        return rawText || `${runs} run(s) scored.`;
    };

    // Helper to evaluate delivery tag for commentary ball tokens
    const getDeliveryMeta = (commItem) => {
        const text = (commItem?.commentary || commItem?.text || '').toLowerCase();
        const runs = commItem?.runs;

        if (commItem?.isWicket || text.includes('wicket') || text.includes('out!')) {
            return { type: 'wicket', label: 'W' };
        }
        if (commItem?.isSix || text.includes('six') || runs === 6) {
            return { type: 'six', label: '6' };
        }
        if (commItem?.isFour || text.includes('four') || runs === 4) {
            return { type: 'four', label: '4' };
        }
        if (text.includes('wide') || text.includes('wd')) {
            return { type: 'extra', label: 'Wd' };
        }
        if (text.includes('no ball') || text.includes('nb')) {
            return { type: 'extra', label: 'Nb' };
        }
        if (runs === 0 || text.includes('no run') || text.includes('dot')) {
            return { type: 'dot', label: '•' };
        }
        if (runs !== undefined && runs > 0) {
            return { type: 'run', label: String(runs) };
        }
        return { type: 'run', label: commItem?.ball ? String(commItem.ball).slice(-1) : '•' };
    };

    // Loading State
    if (isLoading) {
        return (
            <div className="live-score-loading">
                <div className="loading-spinner" />
                <p>Connecting to Match Telemetry...</p>
            </div>
        );
    }

    // 3D STANDBY VIEW: When viewing /live and no match is currently in progress
    if (!routeMatchTitle && !isLive) {
        return (
            <div className="livescore-3d-page livescore-standby-screen">
                {/* 3D Animated Stadium Radar Standby Card - Two Column Layout */}
                <main className="ls-standby-hero-section">
                    <div className="ls-container">
                        <div className="no-live-standby-card-3d">
                            {/* Left Column: 3D Animated Stadium Radar */}
                            <div className="standby-col-animation">
                                <div className="standby-animation-header">
                                    <span className="standby-radar-ping" />
                                    <span>RADAR TELEMETRY</span>
                                </div>
                                <div className="standby-3d-canvas-wrap">
                                    <ThreeStadiumRadarScene height="100%" />
                                </div>
                            </div>

                            {/* Right Column: Content & Quick Navigation */}
                            <div className="standby-col-content">
                                <div className="standby-badge">
                                    <span className="standby-radar-ping" />
                                    <span>{labels.fullName.toUpperCase()} • TELEMETRY ACTIVE</span>
                                </div>

                                <h1 className="standby-title">No Live Match Currently in Progress</h1>

                                <p className="standby-desc">
                                    The match day floodlights and stadium telemetry are in standby mode for {labels.fullName}.
                                    Live ball-by-ball scoring, interactive wagon wheels, and radar metrics will automatically stream here the moment match officials signal play.
                                </p>

                                <div className="standby-telemetry-chips">
                                    <div className="telemetry-chip">
                                        <span className="tc-dot pulse" />
                                        <span>Radar: <strong>Online &amp; Listening</strong></span>
                                    </div>
                                    <div className="telemetry-chip">
                                        <span className="tc-dot" />
                                        <span>Active Tournament: <strong>{labels.editionCode}</strong></span>
                                    </div>
                                    <div className="telemetry-chip">
                                        <span className="tc-dot" />
                                        <span>Venue: <strong>Faculty Grounds, Kilinochchi</strong></span>
                                    </div>
                                </div>

                                <div className="standby-actions-grid">
                                    <Link to="/fixtures" className="cx-btn-primary">
                                        <MdCalendarToday /> View Match Fixtures
                                    </Link>
                                    <Link to="/rankings" className="cx-btn-glass">
                                        <MdTimeline /> View Standings
                                    </Link>
                                    <Link to="/history" className="cx-btn-glass">
                                        <MdEmojiEvents /> Tournament Archive
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                <footer className="standby-bottom-bar">
                    <div className="ls-container standby-bottom-inner">
                        <span>© {labels.year} {labels.fullName}. All rights reserved.</span>
                        <div className="standby-bottom-links">
                            <Link to="/home">Home</Link>
                            <Link to="/fixtures">Fixtures</Link>
                            <Link to="/rankings">Rankings</Link>
                            <Link to="/history">History</Link>
                        </div>
                    </div>
                </footer>
            </div>
        );
    }

    // Match Not Found State
    if (routeMatchTitle && !matchData) {
        return (
            <div className="livescore-3d-page">
                <div className="ls-container">
                    <div className="match-not-found-card">
                        <MdSportsCricket className="mnf-icon" />
                        <h2>Scorecard Not Found</h2>
                        <p>No recorded scorecard was found for match "{routeMatchTitle}" in {labels.fullName}.</p>
                        <div className="mnf-actions">
                            <Link to="/fixtures" className="cx-btn-primary">
                                Browse Tournament Fixtures
                            </Link>
                            <Link to="/history" className="cx-btn-glass">
                                Explore Past Results
                            </Link>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    const { common = {}, team1 = {}, team2 = {} } = matchData || {};

    const t1Name = team1.name || 'Team 1';
    const t2Name = team2.name || 'Team 2';
    const t1Obj = teams[t1Name] || {};
    const t2Obj = teams[t2Name] || {};
    const t1Logo = t1Obj.logo || t1Obj.logoUrl || t1Obj.crest;
    const t2Logo = t2Obj.logo || t2Obj.logoUrl || t2Obj.crest;

    // Resolve 1st batting team vs 2nd batting team keys based on matchData.common.firstBat
    const firstBatTeamKey = common.firstBat === 2 ? 'team2' : 'team1';
    const secondBatTeamKey = common.firstBat === 2 ? 'team1' : 'team2';
    const firstBatTeamData = firstBatTeamKey === 'team1' ? team1 : team2;
    const secondBatTeamData = secondBatTeamKey === 'team1' ? team1 : team2;
    const firstBatName = firstBatTeamData.name || (firstBatTeamKey === 'team1' ? t1Name : t2Name);
    const secondBatName = secondBatTeamData.name || (secondBatTeamKey === 'team1' ? t1Name : t2Name);

    // Active Batting / Bowling Team Data
    const isTeam1Batting = activeInningsTab === 'team1';
    const battingTeam = isTeam1Batting ? team1 : team2;
    const bowlingTeam = isTeam1Batting ? team2 : team1;

    // Calculate match equations and run rates
    const t1Overs = Number(team1.overs) || 0;
    const t2Overs = Number(team2.overs) || 0;
    const t1Score = Number(team1.totalRuns) || 0;
    const t2Score = Number(team2.totalRuns) || 0;
    const overLimit = Number(common.overLimit) || 15;

    const t1Crr = t1Overs > 0 ? (t1Score / t1Overs).toFixed(2) : '0.00';
    const t2Crr = t2Overs > 0 ? (t2Score / t2Overs).toFixed(2) : '0.00';

    // Target calculation for 2nd innings
    const isChasing = common.firstBat !== undefined ? (common.firstBat === 1 ? t2Overs > 0 : t1Overs > 0) : t2Overs > 0;
    const targetScore = (common.firstBat === 1 ? t1Score : t2Score) + 1;
    const currentChaseScore = common.firstBat === 1 ? t2Score : t1Score;
    const currentChaseOvers = common.firstBat === 1 ? t2Overs : t1Overs;
    const runsNeeded = Math.max(0, targetScore - currentChaseScore);
    const ballsBowled = Math.floor(currentChaseOvers) * 6 + Math.round((currentChaseOvers % 1) * 10);
    const totalMatchBalls = overLimit * 6;
    const ballsRemaining = Math.max(0, totalMatchBalls - ballsBowled);
    const requiredRunRate = ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : '0.00';

    // Parse Batters & Bowlers
    const battersList = Object.values(battingTeam.players || {});
    const bowlersList = Object.values(bowlingTeam.bowlers || {});
    const fallOfWickets = Object.values(battingTeam.fallOfWickets || {}).filter(Boolean);

    // Active Batsmen & Bowler at the crease
    const activeStriker = battingTeam.ballFaceBatsman || battersList.find(p => p.status === 'striker' || p.status === 'batting') || battersList[0] || { name: 'Striker', runs: 0, balls: 0 };
    const activeNonStriker = battingTeam.otherSideBatsman || battersList.find(p => p.status === 'non-striker') || battersList[1] || { name: 'Non-Striker', runs: 0, balls: 0 };
    const activeBowler = bowlingTeam.bowler || bowlersList[0] || { name: 'Active Bowler', overs: 0, runs: 0, wickets: 0 };

    // Commentary Stream: Latest delivery strictly at the top
    const parseDeliveryScore = (item) => {
        if (item?.timestamp) return Number(item.timestamp);
        if (item?.id && !isNaN(item.id)) return Number(item.id);
        if (item?.ball && !isNaN(item.ball)) return Number(item.ball) * 1000;
        if (item?.over && !isNaN(item.over)) return Number(item.over) * 1000;
        return 0;
    };
    const commentaryList = matchData?.commentary
        ? Object.entries(matchData.commentary)
            .map(([key, val]) => ({ ...val, _id: val.id || key }))
            .sort((a, b) => {
                const scoreB = parseDeliveryScore(b) || (Number(b._id) || 0);
                const scoreA = parseDeliveryScore(a) || (Number(a._id) || 0);
                return scoreB - scoreA;
            })
        : [];

    // Recent deliveries (last 8 balls in chronological bowling order: oldest -> latest)
    const recentDeliveries = [...commentaryList].slice(0, 8).reverse();

    // Top Performers for Concluded Matches
    const allBatters = [
        ...Object.values(team1.players || {}),
        ...Object.values(team2.players || {})
    ];
    const topBatter = allBatters.sort((a, b) => (Number(b.runs) || 0) - (Number(a.runs) || 0))[0];

    const allBowlers = [
        ...Object.values(team1.bowlers || {}),
        ...Object.values(team2.bowlers || {})
    ];
    const topBowler = allBowlers.sort((a, b) => (Number(b.wickets) || 0) - (Number(a.wickets) || 0))[0];

    // Extract or synthesize Wagon Wheel shots from recorded player shots / boundaries
    const wagonShots = selectedBatsmanForWagon ? (
        (() => {
            const b = selectedBatsmanForWagon;
            const shots = [];

            if (b.shots && Object.keys(b.shots).length > 0) {
                if (Array.isArray(b.shots)) {
                    return b.shots;
                } else {
                    Object.entries(b.shots).forEach(([zoneName, zoneData]) => {
                        const count = zoneData?.count || 0;
                        const totalRuns = zoneData?.runs || 0;
                        const avgRuns = count > 0 ? Math.max(1, Math.round(totalRuns / count)) : 1;
                        for (let i = 0; i < count; i++) {
                            shots.push({
                                zone: zoneName,
                                runs: avgRuns
                            });
                        }
                    });
                    if (shots.length > 0) return shots;
                }
            }

            // Fallback: Synthesize shots from player's recorded boundaries & runs
            const sixes = b.boundaries?.sixes || 0;
            const fours = b.boundaries?.fours || 0;
            const singles = b.boundaries?.singles || Math.max(0, (b.runs || 0) - (sixes * 6 + fours * 4));

            for (let i = 0; i < sixes; i++) shots.push({ runs: 6, zone: ['Cover', 'Mid-wicket', 'Square Leg', 'Third Man'][i % 4] });
            for (let i = 0; i < fours; i++) shots.push({ runs: 4, zone: ['Point', 'Cover', 'Fine Leg', 'Mid-off'][i % 4] });
            for (let i = 0; i < singles; i++) shots.push({ runs: 1, zone: ['Mid-on', 'Mid-wicket', 'Point', 'Square Leg'][i % 4] });
            return shots;
        })()
    ) : [];

    return (
        <div className="livescore-3d-page">
            {/* Top Navigation Breadcrumb */}
            <div className="livescore-top-bar">
                <div className="ls-container">
                    <div className="ls-top-badges">
                        <span className="ls-meta-tag">
                            <MdLocationOn /> Faculty Grounds • {overLimit} Overs
                        </span>
                        {isLive ? (
                            <span className="ls-live-pill">
                                <span className="ls-ping" /> LIVE MATCH IN PROGRESS
                            </span>
                        ) : (
                            <span className="ls-standby-pill">
                                <MdCheckCircle className="ls-check-icon" /> MATCH FINISHED
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Interactive Broadcast Console */}
            <main className="ls-main-section">
                <div className="ls-container">
                    <div className="ls-two-col-layout">
                        {/* ========================================================= */}
                        {/* LEFT COLUMN: Holographic Scoreboard + Scorecard & Match Info Hub */}
                        {/* ========================================================= */}
                        <div className="ls-col-left">
                            {/* 1. Premier Stadium Holographic Scoreboard */}
                            <div className="scoreboard-glass-card">
                                {/* Match Title & Format Ribbon */}
                                <div className="sb-header">
                                    <div className="sb-match-label">
                                        <span className="sb-title-badge">{common.title ? `${common.title} Match` : 'Tournament Match'}</span>
                                        <span className="sb-date">{common.date || 'Match Day'} • {common.time || '10:00 AM'}</span>
                                    </div>
                                    <div className="sb-header-meta">
                                        <span className="sb-overs-limit">T20 • {overLimit} OVERS PER SIDE</span>
                                    </div>
                                </div>

                                {/* Dual Team Score Columns with Crests (Batting Team In Front) */}
                                <div className="sb-teams-grid">
                                    {/* Batting Team Card (In Front) */}
                                    <div className="sb-team-col active-batting">
                                        <div className="sb-team-identity">
                                            {(isTeam1Batting ? t1Logo : t2Logo) ? (
                                                <img
                                                    src={isTeam1Batting ? t1Logo : t2Logo}
                                                    alt={battingTeam.name || (isTeam1Batting ? t1Name : t2Name)}
                                                    className="sb-team-crest"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            ) : (
                                                <div className="sb-team-fallback-crest">
                                                    {(battingTeam.name || (isTeam1Batting ? t1Name : t2Name)).substring(0, 3)}
                                                </div>
                                            )}
                                            <div className="sb-team-name-wrap">
                                                <h2 className="sb-team-name">{battingTeam.name || (isTeam1Batting ? t1Name : t2Name)}</h2>
                                                {isLive && (
                                                    <span className="sb-batting-pill">
                                                        <GiCricketBat className="sb-role-icon" /> BATTING
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="sb-score-big">
                                            <span className="score-runs">{battingTeam.totalRuns ?? 0}</span>
                                            <span className="score-sep">/</span>
                                            <span className="score-wickets">{battingTeam.totalWickets ?? 0}</span>
                                        </div>
                                        <div className="sb-overs-pill">
                                            <span>Overs <strong>{battingTeam.overs ?? 0}</strong>/{overLimit}</span>
                                            <span className="sb-crr-dot">•</span>
                                            <span>CRR <strong>{isTeam1Batting ? t1Crr : t2Crr}</strong></span>
                                        </div>
                                    </div>

                                    {/* Center Status Column */}
                                    <div className="sb-center-col">
                                        <div className="sb-vs-ring">VS</div>
                                        <div className="sb-result-badge">
                                            {common.finished ? (
                                                <span className="status-finished">
                                                    {common.result || 'Match Concluded'}
                                                </span>
                                            ) : (
                                                <span className="status-live">
                                                    {common.status || 'Live Match In Progress'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Chasing equation pill if in 2nd innings */}
                                        {isLive && isChasing && ballsRemaining > 0 && runsNeeded > 0 && (
                                            <div className="sb-chase-equation">
                                                Need <strong>{runsNeeded}</strong> runs in <strong>{ballsRemaining}</strong> balls (RRR: {requiredRunRate})
                                            </div>
                                        )}

                                        {common.mom && (
                                            <div className="sb-mom">
                                                <MdEmojiEvents /> PoTM: <strong>{common.mom}</strong>
                                            </div>
                                        )}
                                    </div>

                                    {/* Bowling / Opponent Team Card */}
                                    <div className="sb-team-col">
                                        <div className="sb-team-identity">
                                            {(!isTeam1Batting ? t1Logo : t2Logo) ? (
                                                <img
                                                    src={!isTeam1Batting ? t1Logo : t2Logo}
                                                    alt={bowlingTeam.name || (!isTeam1Batting ? t1Name : t2Name)}
                                                    className="sb-team-crest"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            ) : (
                                                <div className="sb-team-fallback-crest">
                                                    {(bowlingTeam.name || (!isTeam1Batting ? t1Name : t2Name)).substring(0, 3)}
                                                </div>
                                            )}
                                            <div className="sb-team-name-wrap">
                                                <h2 className="sb-team-name">{bowlingTeam.name || (!isTeam1Batting ? t1Name : t2Name)}</h2>
                                                {isLive && (
                                                    <span className="sb-bowling-pill">
                                                        <MdSportsBaseball className="sb-role-icon" /> BOWLING
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="sb-score-big">
                                            <span className="score-runs">{bowlingTeam.totalRuns ?? 0}</span>
                                            <span className="score-sep">/</span>
                                            <span className="score-wickets">{bowlingTeam.totalWickets ?? 0}</span>
                                        </div>
                                        <div className="sb-overs-pill">
                                            <span>Overs <strong>{bowlingTeam.overs ?? 0}</strong>/{overLimit}</span>
                                            <span className="sb-crr-dot">•</span>
                                            <span>CRR <strong>{!isTeam1Batting ? t1Crr : t2Crr}</strong></span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Match Hub Section (Scorecard and Match Info & Rosters Tabs) */}
                            <div className="ls-hub-card">
                                <div className="hub-tabs-header">
                                    <button
                                        className={`hub-tab-btn ${activeHubTab === 'scorecard' ? 'active' : ''}`}
                                        onClick={() => setActiveHubTab('scorecard')}
                                    >
                                        <MdFormatListNumbered /> Scorecard
                                    </button>
                                    <button
                                        className={`hub-tab-btn ${activeHubTab === 'info' ? 'active' : ''}`}
                                        onClick={() => setActiveHubTab('info')}
                                    >
                                        <MdInfo /> Match Info &amp; Rosters
                                    </button>
                                </div>

                                {/* TAB 1: SCORECARD */}
                                {activeHubTab === 'scorecard' && (
                                    <div className="hub-tab-pane">
                                        {/* Innings Switcher Toggle Bar */}
                                        <div className="innings-switcher-bar">
                                            <button
                                                className={`innings-switch-btn ${activeInningsTab === firstBatTeamKey ? 'active' : ''}`}
                                                onClick={() => setActiveInningsTab(firstBatTeamKey)}
                                            >
                                                1st Innings: <strong>{firstBatName}</strong> ({firstBatTeamData.totalRuns ?? 0}/{firstBatTeamData.totalWickets ?? 0} in {firstBatTeamData.overs ?? 0} ov)
                                            </button>
                                            <button
                                                className={`innings-switch-btn ${activeInningsTab === secondBatTeamKey ? 'active' : ''}`}
                                                onClick={() => setActiveInningsTab(secondBatTeamKey)}
                                            >
                                                2nd Innings: <strong>{secondBatName}</strong> ({secondBatTeamData.totalRuns ?? 0}/{secondBatTeamData.totalWickets ?? 0} in {secondBatTeamData.overs ?? 0} ov)
                                            </button>
                                        </div>

                                        {/* Batting Scorecard Block */}
                                        <div className="scorecard-block">
                                            <div className="block-header-bar">
                                                <h3 className="block-title">Batting • {battingTeam.name || 'Team'}</h3>
                                                <span className="block-total-pill">
                                                    Total: <strong>{battingTeam.totalRuns ?? 0}/{battingTeam.totalWickets ?? 0}</strong> ({battingTeam.overs ?? 0} ov)
                                                </span>
                                            </div>
                                            <div className="table-responsive">
                                                <table className="score-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Batter</th>
                                                            <th>Dismissal</th>
                                                            <th>R</th>
                                                            <th>B</th>
                                                            <th>4s</th>
                                                            <th>6s</th>
                                                            <th>SR</th>
                                                            <th>Wagon</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {battersList.map((p, idx) => (
                                                            <tr key={p.id || idx}>
                                                                <td className="player-name-cell">
                                                                    <div className="p-cell-wrap">
                                                                        <strong>{p.name}</strong>
                                                                        {p.role && <span className="player-role-sub">{p.role}</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="dismissal-cell">
                                                                    {p.dismissal ? (
                                                                        <span className="dismissal-out">{p.dismissal}</span>
                                                                    ) : (
                                                                        <span className="dismissal-notout">{p.runs > 0 || p.balls > 0 ? 'not out' : 'yet to bat'}</span>
                                                                    )}
                                                                </td>
                                                                <td className="runs-cell">{p.runs ?? 0}</td>
                                                                <td className="balls-cell">{p.balls ?? 0}</td>
                                                                <td>{p.boundaries?.fours || 0}</td>
                                                                <td>{p.boundaries?.sixes || 0}</td>
                                                                <td className="sr-cell">
                                                                    {p.strikeRate || ((Number(p.runs || 0) / Math.max(1, Number(p.balls || 1))) * 100).toFixed(1)}
                                                                </td>
                                                                <td>
                                                                    <button
                                                                        className="table-wagon-btn"
                                                                        onClick={() => {
                                                                            setSelectedBatsmanForWagon(p);
                                                                            setShowWagonWheel(true);
                                                                        }}
                                                                        title="View Wagon Wheel"
                                                                    >
                                                                        <MdPieChart />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Extras & Total summary bar */}
                                            <div className="extras-row">
                                                <div className="extras-details">
                                                    <span>Extras:</span>
                                                    <strong>{battingTeam.totalExtraAmount || 0}</strong>
                                                    <small className="extras-subtext">(wides, no balls, byes, leg byes)</small>
                                                </div>
                                                <div className="innings-total-summary">
                                                    <span>Innings Total:</span>
                                                    <strong className="total-highlight">{battingTeam.totalRuns ?? 0}/{battingTeam.totalWickets ?? 0}</strong>
                                                    <span className="total-ov">({battingTeam.overs ?? 0} Overs, RR: {(Number(battingTeam.overs) > 0 ? (Number(battingTeam.totalRuns) / Number(battingTeam.overs)).toFixed(2) : '0.00')})</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bowling Scorecard Block */}
                                        <div className="scorecard-block">
                                            <div className="block-header-bar">
                                                <h3 className="block-title">Bowling • {bowlingTeam.name || 'Opponent'}</h3>
                                            </div>
                                            <div className="table-responsive">
                                                <table className="score-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Bowler</th>
                                                            <th>O</th>
                                                            <th>M</th>
                                                            <th>R</th>
                                                            <th>W</th>
                                                            <th>Econ</th>
                                                            <th>Dots</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {bowlersList.length > 0 ? (
                                                            bowlersList.map((b, idx) => (
                                                                <tr key={b.id || idx}>
                                                                    <td className="player-name-cell">
                                                                        <strong>{b.name}</strong>
                                                                    </td>
                                                                    <td>{b.overs ?? 0}</td>
                                                                    <td>{b.maidens ?? 0}</td>
                                                                    <td className="runs-cell">{b.runs ?? 0}</td>
                                                                    <td className="wicket-highlight">{b.wickets ?? 0}</td>
                                                                    <td>{b.economy ?? (b.overs ? (b.runs / b.overs).toFixed(2) : '0.00')}</td>
                                                                    <td>{b.dots ?? 0}</td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan="7" className="text-center-muted">No bowling stats recorded yet.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Fall of Wickets Card */}
                                        {fallOfWickets.length > 0 && (
                                            <div className="fow-card">
                                                <h4 className="fow-title">Fall of Wickets</h4>
                                                <div className="fow-pills-list">
                                                    {fallOfWickets.map((f, idx) => (
                                                        <div key={idx} className="fow-pill">
                                                            <span className="fow-score">{f.score}</span>
                                                            <span className="fow-batsman">{f.batsman}</span>
                                                            <span className="fow-ov">({f.over} ov)</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 2: MATCH INFO & ROSTERS */}
                                {activeHubTab === 'info' && (
                                    <div className="hub-tab-pane">
                                        <div className="match-info-card">
                                            <h3 className="block-title">Match Information</h3>
                                            <div className="info-grid">
                                                <div className="info-item">
                                                    <span className="info-label">Tournament:</span>
                                                    <strong className="info-val">{labels.fullName}</strong>
                                                </div>
                                                <div className="info-item">
                                                    <span className="info-label">Match:</span>
                                                    <strong className="info-val">{common.title || 'Official Clash'}</strong>
                                                </div>
                                                <div className="info-item">
                                                    <span className="info-label">Date &amp; Time:</span>
                                                    <strong className="info-val">{common.date || 'TBD'} • {common.time || '10:00 AM'}</strong>
                                                </div>
                                                <div className="info-item">
                                                    <span className="info-label">Venue:</span>
                                                    <strong className="info-val">Faculty of Engineering Grounds, Kilinochchi</strong>
                                                </div>
                                                <div className="info-item">
                                                    <span className="info-label">Format:</span>
                                                    <strong className="info-val">15 Overs per side • White Ball T20</strong>
                                                </div>
                                                <div className="info-item">
                                                    <span className="info-label">Toss:</span>
                                                    <strong className="info-val">{common.status || 'Decided prior to start'}</strong>
                                                </div>
                                            </div>

                                            {/* Playing XI Rosters */}
                                            <div className="rosters-comparison-grid">
                                                {/* Team 1 Squad */}
                                                <div className="roster-col">
                                                    <div className="roster-header">
                                                        {t1Logo && <img src={t1Logo} alt={t1Name} className="roster-logo" />}
                                                        <h4>{t1Name} Squad</h4>
                                                    </div>
                                                    <ul className="roster-list">
                                                        {Object.values(team1.players || {}).map((player, pIdx) => (
                                                            <li key={player.id || pIdx} className="roster-player-item">
                                                                <span className="r-p-num">{pIdx + 1}.</span>
                                                                <span className="r-p-name">{player.name}</span>
                                                                {player.role && <span className="r-p-role">{player.role}</span>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Team 2 Squad */}
                                                <div className="roster-col">
                                                    <div className="roster-header">
                                                        {t2Logo && <img src={t2Logo} alt={t2Name} className="roster-logo" />}
                                                        <h4>{t2Name} Squad</h4>
                                                    </div>
                                                    <ul className="roster-list">
                                                        {Object.values(team2.players || {}).map((player, pIdx) => (
                                                            <li key={player.id || pIdx} className="roster-player-item">
                                                                <span className="r-p-num">{pIdx + 1}.</span>
                                                                <span className="r-p-name">{player.name}</span>
                                                                {player.role && <span className="r-p-role">{player.role}</span>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ========================================================= */}
                        {/* RIGHT COLUMN: Crease Spotlights (Top) + Live Commentary (Underneath) */}
                        {/* ========================================================= */}
                        <div className="ls-col-right">
                            {/* 1. Smart Crease Spotlights (Active Bowler, Striker, Non-Striker) / Concluded Key Performers */}
                            <section className="ls-crease-section">
                                <div className="ls-crease-card">
                                    {isLive ? (
                                        <>
                                            {/* Two Column Space-Saving Crease Layout: Left=Bowler, Right=Striker & Non-Striker */}
                                            <div className="crease-two-col-layout">
                                                {/* Left Column: Active Bowler */}
                                                <div className="crease-bowler-col">
                                                    {activeBowler && (
                                                        <TiltCard className="crease-card bowler-spotlight-card" maxTilt={5}>
                                                            <div className="cc-tag bowler-tag">
                                                                <MdSportsBaseball className="cc-tag-icon" /> CURRENT BOWLER
                                                            </div>
                                                            <h3 className="cc-name">{activeBowler.name}</h3>
                                                            <div className="cc-score-row">
                                                                <span className="cc-runs">{activeBowler.wickets ?? 0}</span>
                                                                <span className="cc-balls">for {activeBowler.runs ?? 0}</span>
                                                            </div>
                                                            <div className="cc-compact-stats">
                                                                <span className="cc-stat-chip">Overs: <strong>{activeBowler.overs ?? 0}</strong></span>
                                                                <span className="cc-stat-chip">Mdns: <strong>{activeBowler.maidens ?? 0}</strong></span>
                                                                <span className="cc-stat-chip">Econ: <strong>{activeBowler.economy ?? (activeBowler.overs ? (activeBowler.runs / activeBowler.overs).toFixed(2) : '0.00')}</strong></span>
                                                            </div>
                                                        </TiltCard>
                                                    )}
                                                </div>

                                                {/* Right Column: Striker & Non-Striker Batters */}
                                                <div className="crease-batters-col">
                                                    {/* Striker Mini Card */}
                                                    {activeStriker && (
                                                        <div className="crease-batter-mini-card striker">
                                                            <div className="cbm-header">
                                                                <div className="cbm-info">
                                                                    <div className="cbm-name-row">
                                                                        <span className="cbm-name">{activeStriker.name}</span>
                                                                        <span className="cbm-badge striker-badge">
                                                                            <GiCricketBat /> STRIKER *
                                                                        </span>
                                                                    </div>
                                                                    <div className="cbm-stats-row">
                                                                        <span>4s: <strong>{activeStriker.boundaries?.fours || 0}</strong></span>
                                                                        <span>6s: <strong>{activeStriker.boundaries?.sixes || 0}</strong></span>
                                                                        <span>SR: <strong>{activeStriker.strikeRate || ((Number(activeStriker.runs || 0) / Math.max(1, Number(activeStriker.balls || 1))) * 100).toFixed(1)}</strong></span>
                                                                    </div>
                                                                </div>
                                                                <div className="cbm-score-box">
                                                                    <span className="cbm-runs">{activeStriker.runs ?? 0}</span>
                                                                    <span className="cbm-balls">({activeStriker.balls ?? 0}b)</span>
                                                                    <button
                                                                        className="wagon-mini-btn"
                                                                        onClick={() => {
                                                                            setSelectedBatsmanForWagon(activeStriker);
                                                                            setShowWagonWheel(true);
                                                                        }}
                                                                        title="View Striker Wagon Wheel"
                                                                    >
                                                                        <MdPieChart /> Wagon
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Non-Striker Mini Card */}
                                                    {activeNonStriker && (
                                                        <div className="crease-batter-mini-card non-striker">
                                                            <div className="cbm-header">
                                                                <div className="cbm-info">
                                                                    <div className="cbm-name-row">
                                                                        <span className="cbm-name">{activeNonStriker.name}</span>
                                                                        <span className="cbm-badge non-striker-badge">
                                                                            NON-STRIKE
                                                                        </span>
                                                                    </div>
                                                                    <div className="cbm-stats-row">
                                                                        <span>4s: <strong>{activeNonStriker.boundaries?.fours || 0}</strong></span>
                                                                        <span>6s: <strong>{activeNonStriker.boundaries?.sixes || 0}</strong></span>
                                                                        <span>SR: <strong>{activeNonStriker.strikeRate || ((Number(activeNonStriker.runs || 0) / Math.max(1, Number(activeNonStriker.balls || 1))) * 100).toFixed(1)}</strong></span>
                                                                    </div>
                                                                </div>
                                                                <div className="cbm-score-box">
                                                                    <span className="cbm-runs">{activeNonStriker.runs ?? 0}</span>
                                                                    <span className="cbm-balls">({activeNonStriker.balls ?? 0}b)</span>
                                                                    <button
                                                                        className="wagon-mini-btn"
                                                                        onClick={() => {
                                                                            setSelectedBatsmanForWagon(activeNonStriker);
                                                                            setShowWagonWheel(true);
                                                                        }}
                                                                        title="View Non-Striker Wagon Wheel"
                                                                    >
                                                                        <MdPieChart /> Wagon
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Recent Deliveries Strip */}
                                            {recentDeliveries.length > 0 && (
                                                <div className="recent-balls-bar">
                                                    <span className="rbb-title">Recent Balls:</span>
                                                    <div className="rbb-tokens">
                                                        {recentDeliveries.map((c, idx) => {
                                                            const meta = getDeliveryMeta(c);
                                                            return (
                                                                <span key={idx} className={`delivery-token ${meta.type}`} title={`Ball ${c.ball || idx + 1}: ${c.commentary || c.text || ''}`}>
                                                                    {meta.label}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        /* Concluded Match Top Performers Showcase */
                                        <div className="concluded-performers-grid">
                                            {common.mom && (
                                                <div className="performer-highlight-card potm">
                                                    <div className="ph-badge">
                                                        <MdEmojiEvents /> PLAYER OF THE MATCH
                                                    </div>
                                                    <h3 className="ph-name">{common.mom}</h3>
                                                    <p className="ph-caption">Outstanding Match-Winning Performance</p>
                                                </div>
                                            )}
                                            {topBatter && (
                                                <div className="performer-highlight-card batter">
                                                    <div className="ph-badge">
                                                        <MdSportsCricket /> TOP RUN SCORER
                                                    </div>
                                                    <h3 className="ph-name">{topBatter.name}</h3>
                                                    <p className="ph-score">{topBatter.runs} runs ({topBatter.balls} balls) • SR {topBatter.strikeRate || '100'}</p>
                                                </div>
                                            )}
                                            {topBowler && (
                                                <div className="performer-highlight-card bowler">
                                                    <div className="ph-badge">
                                                        <MdBolt /> TOP WICKET TAKER
                                                    </div>
                                                    <h3 className="ph-name">{topBowler.name}</h3>
                                                    <p className="ph-score">{topBowler.wickets} wkts ({topBowler.runs} runs in {topBowler.overs} ov)</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* 2. Full Live Commentary Section */}
                            <div className="commentary-full-card">
                                <div className="comm-top-header">
                                    <h3 className="comm-header-title">
                                        <MdTimeline /> Ball by Ball Live Commentary
                                    </h3>
                                    <span className="comm-count-tag">{commentaryList.length} Deliveries Recorded</span>
                                </div>

                                <div className="comm-feed-list">
                                    {commentaryList.length > 0 ? (
                                        commentaryList.map((c, idx) => {
                                            const meta = getDeliveryMeta(c);
                                            const broadcastCommentary = formatRealCommentary(c);
                                            return (
                                                <div key={idx} className={`comm-stream-item ${meta.type}`}>
                                                    <div className="comm-token-col">
                                                        <span className={`comm-ball-token ${meta.type}`}>
                                                            {meta.label}
                                                        </span>
                                                        <span className="comm-ov-num">{c.ball || `${idx + 1}`}</span>
                                                    </div>
                                                    <div className="comm-text-col">
                                                        <p className="comm-message">{broadcastCommentary}</p>
                                                        {c.wagonZone && (
                                                            <span className="comm-zone-tag">
                                                                Shot Zone: <strong>{c.wagonZone}</strong>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="comm-empty-state">
                                            <MdTimeline className="comm-empty-icon" />
                                            <p>Ball-by-ball stream will appear here as deliveries are recorded.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Wagon Wheel Modal */}
            {showWagonWheel && (
                <div className="wagon-modal-overlay" onClick={() => setShowWagonWheel(false)}>
                    <div className="wagon-modal-card" onClick={(e) => e.stopPropagation()}>
                        <button className="wagon-modal-close" onClick={() => setShowWagonWheel(false)}>
                            <MdClose />
                        </button>
                        <h2 className="wagon-modal-title">Wagon Wheel Shot Chart</h2>
                        <WagonWheel
                            shots={wagonShots}
                            batsmanName={selectedBatsmanForWagon?.name}
                            batsmanHand={selectedBatsmanForWagon?.hand || 'Right Hand'}
                            size={400}
                        />
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default LiveScore3D;
