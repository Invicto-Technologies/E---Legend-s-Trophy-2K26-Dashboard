import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    MdBolt,
    MdHandshake,
    MdCloudQueue,
    MdGroups,
    MdShield
} from 'react-icons/md';
import { GiCricketBat } from 'react-icons/gi';
import { MdSportsBaseball } from 'react-icons/md';
import { FaCrown } from 'react-icons/fa';
import { calculateDlsParScore } from '../../utils/dlsEngine';
import { generateSmartCommentary } from '../../utils/commentaryEngine';
import PageLoader from '../../components/common/PageLoader/PageLoader';
import './LiveScore3D.css';

const LiveScore3D = () => {
    const { matchTitle: routeMatchTitle } = useParams();
    const [liveData, setLiveData] = useState(null);
    const [activeMatchTitle, setActiveMatchTitle] = useState(routeMatchTitle || '');
    const [matchData, setMatchData] = useState(null);
    const [activeTournament, setActiveTournament] = useState(null);
    const [teams, setTeams] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [userSelectedInningsTab, setUserSelectedInningsTab] = useState(null);
    const [activeHubTab, setActiveHubTab] = useState('scorecard'); // 'scorecard', 'commentary', 'info'
    const [showWagonWheel, setShowWagonWheel] = useState(false);
    const [selectedBatsmanForWagon, setSelectedBatsmanForWagon] = useState(null);
    const [selectedOverFilter, setSelectedOverFilter] = useState('all');

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

    // 3a. Sync route title into activeMatchTitle if passed via URL
    useEffect(() => {
        if (routeMatchTitle) {
            setActiveMatchTitle(routeMatchTitle);
            setUserSelectedInningsTab(null);
        }
    }, [routeMatchTitle]);

    // 3b. Subscribe to LiveData to resolve default active match if not passed via URL
    useEffect(() => {
        const unsubLive = subscribeLiveData((data) => {
            setLiveData(data);
            setIsLoading(false);
            if (!routeMatchTitle) {
                const rawTarget = data?.isLive ? (data?.currentMatchPath || data?.liveScore?.matchTitle) : '';
                const target = rawTarget ? String(rawTarget).replace(/^\//, '').split('/').pop() : '';
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
        });

        return () => unsubMatch();
    }, [routeMatchTitle, activeMatchTitle]);

    // 5. Reset over filter when user selects a different innings
    useEffect(() => {
        setSelectedOverFilter('all');
    }, [userSelectedInningsTab]);

    const labels = resolveTournamentLabels(activeTournament);

    // Check if the current match being viewed is finished/concluded
    const isCurrentMatchFinished = Boolean(
        matchData?.common?.finished === 1 ||
        matchData?.common?.finished === true ||
        matchData?.common?.isFinished ||
        matchData?.finished === 1 ||
        matchData?.finished === true ||
        matchData?.isFinished ||
        (matchData?.common?.result && !['scheduled', 'match scheduled', 'tbd', 'live', 'draw pending'].includes(String(matchData.common.result).trim().toLowerCase())) ||
        (matchData?.result && !['scheduled', 'match scheduled', 'tbd', 'live', 'draw pending'].includes(String(matchData.result).trim().toLowerCase()))
    );

    const currentTarget = (routeMatchTitle || activeMatchTitle || '').trim();
    const currentClean = currentTarget.toLowerCase();
    const livePathClean = (liveData?.currentMatchPath || '').split('/').pop().toLowerCase();
    const liveTitleClean = (liveData?.liveScore?.matchTitle || '').split('/').pop().toLowerCase();
    const isLive = Boolean(
        !isCurrentMatchFinished &&
        liveData?.isLive &&
        currentClean &&
        (currentClean === livePathClean || currentClean === liveTitleClean)
    );

    // Helper to check if a player is dismissed in the batting innings
    const isPlayerDismissedLive = (p, teamData) => {
        if (!p) return false;
        const pIdStr = p.id != null ? String(p.id) : null;
        const pNameClean = (p.name || '').trim().toLowerCase();

        if (p.status === 'out') return true;
        if (p.dismissal && typeof p.dismissal === 'string' && p.dismissal.trim() !== '') {
            const dLow = p.dismissal.trim().toLowerCase();
            if (dLow !== 'yet to bat' && dLow !== 'not out') {
                return true;
            }
        }

        if (!teamData) return false;

        const pData = pIdStr && teamData.players ? teamData.players[pIdStr] : null;
        if (pData) {
            if (pData.status === 'out') return true;
            if (pData.dismissal && typeof pData.dismissal === 'string' && pData.dismissal.trim() !== '') {
                const dLow = pData.dismissal.trim().toLowerCase();
                if (dLow !== 'yet to bat' && dLow !== 'not out') {
                    return true;
                }
            }
        }

        if (teamData.fallOfWickets) {
            const inFow = Object.values(teamData.fallOfWickets).some(f => {
                if (!f) return false;
                const fOutId = f.outBatsman?.id != null ? String(f.outBatsman.id) : null;
                const fBatsmanName = (f.batsman || f.outBatsman?.name || '').trim().toLowerCase();
                if (fOutId && pIdStr && fOutId === pIdStr) return true;
                if (fBatsmanName && pNameClean && fBatsmanName === pNameClean) return true;
                return false;
            });
            if (inFow) return true;
        }

        if (teamData.partnerships) {
            const inParts = Object.values(teamData.partnerships).some(part => {
                if (!part || !part.outBatsman) return false;
                const partOutId = part.outBatsman.id != null ? String(part.outBatsman.id) : null;
                const partOutName = (part.outBatsman.name || '').trim().toLowerCase();
                if (partOutId && pIdStr && partOutId === pIdStr) return true;
                if (partOutName && pNameClean && partOutName === pNameClean) return true;
                return false;
            });
            if (inParts) return true;
        }

        return false;
    };

    // Helper to format authentic cricket broadcast commentary (Smart Non-Repeating System)
    const formatRealCommentary = (commItem) => {
        if (!commItem) return '';
        const rawText = (commItem.commentary || commItem.text || '').trim();

        // Check if existing text is already generated by the new smart engine (not a legacy repetitive placeholder)
        const isLegacyRepetitive = !rawText ||
            rawText.startsWith('Dot ball. Good delivery') ||
            rawText.startsWith('FOUR! Beautifully timed') ||
            rawText.startsWith('SIX! Sublimely struck') ||
            rawText.includes('run(s) worked away by') ||
            rawText.length < 15;

        if (!isLegacyRepetitive) {
            return rawText;
        }

        return generateSmartCommentary({
            runs: Number(commItem.runs ?? 0),
            isWicket: Boolean(commItem.isWicket),
            dismissalType: commItem.dismissalType || '',
            dismissalFielder: commItem.dismissalFielder || '',
            isExtra: Boolean(commItem.isExtra),
            extraType: commItem.extraType || '',
            extraRuns: Number(commItem.runs ?? 0),
            strikerName: commItem.batsman || 'Batsman',
            bowlerName: commItem.bowler || 'Bowler',
            wagonZone: commItem.wagonZone || ''
        });
    };

    // Helper to calculate exact extras breakdown (b, lb, w, nb, pen) from extraTypes
    const parseExtrasBreakdown = (extraTypes = [], totalExtraAmount = 0) => {
        let b = 0, lb = 0, w = 0, nb = 0, pen = 0;

        const list = Array.isArray(extraTypes)
            ? extraTypes
            : (extraTypes && typeof extraTypes === 'object' ? Object.values(extraTypes) : []);

        list.forEach(item => {
            if (!item) return;
            const str = String(item).trim().toUpperCase();
            const numMatch = str.match(/\d+/);
            const amt = numMatch ? parseInt(numMatch[0], 10) : 1;

            if (str.includes('P') || str.includes('PEN')) {
                pen += amt;
            } else if (str.includes('LB') || str.endsWith('L')) {
                lb += amt;
            } else if (str.includes('NB') || str.endsWith('N')) {
                nb += (amt === 0 ? 1 : amt);
            } else if (str.includes('WB') || str.includes('WD') || str.endsWith('W')) {
                w += (amt === 0 ? 1 : amt);
            } else if (str.includes('B')) {
                b += amt;
            } else {
                w += amt;
            }
        });

        const parts = [`b ${b}`, `lb ${lb}`, `w ${w}`, `nb ${nb}`];
        if (pen > 0) parts.push(`pen ${pen}`);

        return {
            total: totalExtraAmount || (b + lb + w + nb + pen),
            breakdownText: parts.join(', '),
            b, lb, w, nb, pen
        };
    };

    // Helper to evaluate delivery tag for commentary ball tokens
    const getDeliveryMeta = (commItem) => {
        const text = (commItem?.commentary || commItem?.text || '').toLowerCase();
        const runs = commItem?.runs;
        const extraType = (commItem?.extraType || '').toLowerCase();

        // Resolve extra runs beyond mandatory penalty
        const beyondPenaltyRuns = commItem?.extraRuns !== undefined
            ? Number(commItem.extraRuns)
            : (runs !== undefined ? Math.max(0, runs - 1) : 0);

        const isExplicitWicket = commItem?.isWicket === true || (
            commItem?.isWicket === undefined &&
            (text.startsWith('out!') || text.startsWith('bowled') || text.startsWith('caught') || text.startsWith('run out') || text.startsWith('lbw') || text.startsWith('stumped') || text.startsWith('retired'))
        );

        if (isExplicitWicket) {
            return { type: 'wicket', label: 'W' };
        }
        if (extraType.includes('penalty') || text.includes('penalty')) {
            return { type: 'penalty', label: runs !== undefined && runs > 0 ? `${runs}P` : 'PEN' };
        }
        if (extraType.includes('wide') || text.includes('wide') || text.includes('wd')) {
            return { type: 'extra', label: beyondPenaltyRuns > 0 ? `${beyondPenaltyRuns}WD` : 'WD' };
        }
        if (extraType.includes('no ball') || text.includes('no ball') || text.includes('nb')) {
            return { type: 'extra', label: beyondPenaltyRuns > 0 ? `${beyondPenaltyRuns}NB` : 'NB' };
        }
        if (extraType.includes('leg bye') || text.includes('leg bye') || text.includes('lb')) {
            const lbRuns = commItem?.extraRuns !== undefined ? Number(commItem.extraRuns) : Number(runs || 0);
            return { type: 'extra', label: lbRuns > 0 ? `${lbRuns}LB` : 'LB' };
        }
        if (extraType.includes('bye') || text.includes('bye')) {
            const bRuns = commItem?.extraRuns !== undefined ? Number(commItem.extraRuns) : Number(runs || 0);
            return { type: 'extra', label: bRuns > 0 ? `${bRuns}B` : 'B' };
        }
        if (commItem?.isSix || text.includes('six') || runs === 6) {
            return { type: 'six', label: '6' };
        }
        if (commItem?.isFour || text.includes('four') || runs === 4) {
            return { type: 'four', label: '4' };
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
            <PageLoader
                message="Connecting to Live Match Telemetry..."
                subtitle="Streaming ball-by-ball scorecards, radar stats & live commentary"
                tournamentName={labels.fullName || "E-Legends Trophy 2K26"}
            />
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

    // Helper to parse score string (e.g. "E21 29/3 (2.4) • E24 0/0 (0)" or "Team 1 145/6 (15.0) • Team 2 130/8 (14.2)")
    const parseScoreString = (scoreStr) => {
        if (!scoreStr || typeof scoreStr !== 'string') return null;
        const parts = scoreStr.split(' • ');
        const parsePart = (p) => {
            if (!p) return null;
            // Match pattern "runs/wickets (overs)" or "runs/wickets" with boundary so team names with numbers like "E21" aren't matched as runs
            let match = p.match(/(?:^|\s)(\d+)\/(\d+)(?:\s*\(([\d.]+)\))?/);
            if (match) {
                return {
                    runs: parseInt(match[1], 10) || 0,
                    wickets: parseInt(match[2], 10) || 0,
                    overs: match[3] ? parseFloat(match[3]) : 0
                };
            }
            match = p.match(/(?:^|\s)(\d+)(?:\s*\(([\d.]+)\))/);
            if (match) {
                return {
                    runs: parseInt(match[1], 10) || 0,
                    wickets: 0,
                    overs: match[2] ? parseFloat(match[2]) : 0
                };
            }
            return null;
        };

        return {
            part1: parsePart(parts[0]),
            part2: parts[1] ? parsePart(parts[1]) : null
        };
    };

    const fallbackScores = parseScoreString(common.score || matchData?.score);
    const parsedT1 = fallbackScores?.part1;
    const parsedT2 = fallbackScores?.part2;

    const t1Name = team1.name || (isCurrentMatchFinished && common.teams ? common.teams.split(' vs ')[0]?.trim() : '') || (!isCurrentMatchFinished && isLive ? liveData?.liveScore?.team1?.name : '') || 'Team 1';
    const t2Name = team2.name || (isCurrentMatchFinished && common.teams ? common.teams.split(' vs ')[1]?.trim() : '') || (!isCurrentMatchFinished && isLive ? liveData?.liveScore?.team2?.name : '') || 'Team 2';

    // Helper to find team data from master teams registry by name/key/id
    const findTeamData = (teamIdentifier) => {
        if (!teamIdentifier) return {};
        if (teams[teamIdentifier]) return teams[teamIdentifier];
        return Object.values(teams).find(t =>
            t?.name?.toLowerCase() === String(teamIdentifier).toLowerCase() ||
            t?.key?.toLowerCase() === String(teamIdentifier).toLowerCase() ||
            t?.shortName?.toLowerCase() === String(teamIdentifier).toLowerCase() ||
            String(t?.id) === String(teamIdentifier)
        ) || Object.entries(teams).find(([k, v]) =>
            k.toLowerCase() === String(teamIdentifier).toLowerCase() ||
            v?.name?.toLowerCase() === String(teamIdentifier).toLowerCase()
        )?.[1] || {};
    };

    const t1Obj = findTeamData(t1Name);
    const t2Obj = findTeamData(t2Name);
    const t1Logo = t1Obj.logo || t1Obj.logoUrl || t1Obj.crest;
    const t2Logo = t2Obj.logo || t2Obj.logoUrl || t2Obj.crest;

    const t1Score = (team1.totalRuns !== undefined && team1.totalRuns !== null && Number(team1.totalRuns) > 0)
        ? Number(team1.totalRuns)
        : (isCurrentMatchFinished && parsedT1 ? parsedT1.runs : Number(team1.totalRuns || 0));
    const t2Score = (team2.totalRuns !== undefined && team2.totalRuns !== null && Number(team2.totalRuns) > 0)
        ? Number(team2.totalRuns)
        : (isCurrentMatchFinished && parsedT2 ? parsedT2.runs : Number(team2.totalRuns || 0));
    const t1Wickets = (team1.totalWickets !== undefined && team1.totalWickets !== null && Number(team1.totalWickets) > 0)
        ? Number(team1.totalWickets)
        : (isCurrentMatchFinished && parsedT1 ? parsedT1.wickets : Number(team1.totalWickets || 0));
    const t2Wickets = (team2.totalWickets !== undefined && team2.totalWickets !== null && Number(team2.totalWickets) > 0)
        ? Number(team2.totalWickets)
        : (isCurrentMatchFinished && parsedT2 ? parsedT2.wickets : Number(team2.totalWickets || 0));
    const t1Overs = (team1.overs !== undefined && team1.overs !== null && Number(team1.overs) > 0)
        ? Number(team1.overs)
        : (isCurrentMatchFinished && parsedT1 ? parsedT1.overs : Number(team1.overs || 0));
    const t2Overs = (team2.overs !== undefined && team2.overs !== null && Number(team2.overs) > 0)
        ? Number(team2.overs)
        : (isCurrentMatchFinished && parsedT2 ? parsedT2.overs : Number(team2.overs || 0));

    // Resolve 1st batting team vs 2nd batting team keys based on matchData.common.firstBat
    const firstBatTeamKey = common.firstBat === 2 ? 'team2' : 'team1';
    const secondBatTeamKey = common.firstBat === 2 ? 'team1' : 'team2';
    const firstBatTeamData = firstBatTeamKey === 'team1' ? team1 : team2;
    const secondBatTeamData = secondBatTeamKey === 'team1' ? team1 : team2;
    const firstBatName = firstBatTeamData.name || (firstBatTeamKey === 'team1' ? t1Name : t2Name);
    const secondBatName = secondBatTeamData.name || (secondBatTeamKey === 'team1' ? t1Name : t2Name);

    const firstBatRuns = firstBatTeamKey === 'team1' ? t1Score : t2Score;
    const firstBatWickets = firstBatTeamKey === 'team1' ? t1Wickets : t2Wickets;
    const firstBatOvers = firstBatTeamKey === 'team1' ? t1Overs : t2Overs;

    const secondBatRuns = secondBatTeamKey === 'team1' ? t1Score : t2Score;
    const secondBatWickets = secondBatTeamKey === 'team1' ? t1Wickets : t2Wickets;
    const secondBatOvers = secondBatTeamKey === 'team1' ? t1Overs : t2Overs;

    // Live Match True Batting & Bowling Teams (Fixed to current live innings; does NOT shift on scorecard tab changes)
    const activeInningsNumber = common.activeInnings || 1;
    const liveBattingTeamKey = activeInningsNumber === 2 ? secondBatTeamKey : firstBatTeamKey;
    const liveBowlingTeamKey = activeInningsNumber === 2 ? firstBatTeamKey : secondBatTeamKey;
    const isLiveTeam1Batting = liveBattingTeamKey === 'team1';
    const liveBattingTeam = liveBattingTeamKey === 'team1' ? team1 : team2;
    const liveBowlingTeam = liveBowlingTeamKey === 'team1' ? team1 : team2;

    // Active Innings Tab (defaults to current live batting team; user can choose to view 1st / 2nd innings scorecard)
    const activeInningsTab = userSelectedInningsTab || (isCurrentMatchFinished ? firstBatTeamKey : liveBattingTeamKey);
    const isTabTeam1Batting = activeInningsTab === 'team1';
    const tabBattingTeam = isTabTeam1Batting ? team1 : team2;
    const tabBowlingTeam = isTabTeam1Batting ? team2 : team1;

    const tabBatRuns = isTabTeam1Batting ? t1Score : t2Score;
    const tabBatWickets = isTabTeam1Batting ? t1Wickets : t2Wickets;
    const tabBatOvers = isTabTeam1Batting ? t1Overs : t2Overs;

    const overLimit = Number(common.overLimit) || 15;

    const t1Crr = t1Overs > 0 ? (t1Score / t1Overs).toFixed(2) : '0.00';
    const t2Crr = t2Overs > 0 ? (t2Score / t2Overs).toFixed(2) : '0.00';

    // Target calculation for 2nd innings with DLS support
    const isDls = Boolean(common.dls?.isApplied);
    const dlsData = common.dls || null;
    const effectiveOvers = isDls && dlsData?.revisedOvers ? Number(dlsData.revisedOvers) : overLimit;
    const isChasing = common.activeInnings === 2 || (common.firstBat !== undefined ? (common.firstBat === 1 ? t2Overs > 0 : t1Overs > 0) : t2Overs > 0);
    const firstInningsScore = common.firstBat === 1 ? t1Score : t2Score;
    const targetScore = isDls && dlsData?.revisedTarget ? Number(dlsData.revisedTarget) : firstInningsScore + 1;
    const currentChaseScore = common.firstBat === 1 ? t2Score : t1Score;
    const currentChaseWickets = common.firstBat === 1 ? Number(team2.totalWickets) || 0 : Number(team1.totalWickets) || 0;
    const currentChaseOvers = common.firstBat === 1 ? t2Overs : t1Overs;
    const runsNeeded = Math.max(0, targetScore - currentChaseScore);
    const ballsBowled = Math.floor(currentChaseOvers) * 6 + Math.round((currentChaseOvers % 1) * 10);
    const totalMatchBalls = effectiveOvers * 6;
    const ballsRemaining = Math.max(0, totalMatchBalls - ballsBowled);
    const requiredRunRate = ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : '0.00';

    // Live DLS Par Score calculation during 2nd innings
    let dlsParInfo = null;
    if (isChasing && ballsBowled > 0) {
        dlsParInfo = calculateDlsParScore({
            totalOvers: overLimit,
            firstInningsScore,
            secondInningsOvers: effectiveOvers,
            secondInningsBallsBowled: ballsBowled,
            secondInningsWickets: currentChaseWickets
        });
    }

    // Helper to resolve structured roster (Playing XI & Bench Reserves separately)
    const resolveTeamRoster = (teamMatchData, teamName) => {
        const teamObj = findTeamData(teamName) || findTeamData(teamMatchData?.name) || {};
        const matchPlayersMap = { ...(teamMatchData?.players || {}) };

        // Merge any bench extraPlayers from master team registry if not yet present in matchData
        if (teamObj?.extraPlayers) {
            Object.values(teamObj.extraPlayers).forEach(ep => {
                const existingKey = Object.keys(matchPlayersMap).find(k =>
                    String(matchPlayersMap[k].id) === String(ep.id) ||
                    (matchPlayersMap[k].name && ep.name && matchPlayersMap[k].name.trim().toLowerCase() === ep.name.trim().toLowerCase())
                );
                if (!existingKey) {
                    matchPlayersMap[ep.id] = {
                        id: ep.id,
                        name: ep.name,
                        role: ep.role || 'All Rounder',
                        imageUrl: ep.imageUrl || ep.ImageURL || ep.image || ep.photo || '',
                        type: 'Reserve'
                    };
                }
            });
        }

        // Merge any registered squad players from teamObj.players if not present in matchData
        if (teamObj?.players) {
            Object.values(teamObj.players).forEach((sp, idx) => {
                const existingKey = Object.keys(matchPlayersMap).find(k =>
                    String(matchPlayersMap[k].id) === String(sp.id) ||
                    (matchPlayersMap[k].name && sp.name && matchPlayersMap[k].name.trim().toLowerCase() === sp.name.trim().toLowerCase())
                );
                if (!existingKey) {
                    matchPlayersMap[sp.id] = {
                        id: sp.id,
                        name: sp.name,
                        role: sp.role || 'All Rounder',
                        imageUrl: sp.imageUrl || sp.ImageURL || sp.image || sp.photo || '',
                        type: sp.type || (idx < 11 ? 'Playing XI' : 'Reserve')
                    };
                }
            });
        }

        const rawList = Object.values(matchPlayersMap);
        if (rawList.length === 0) {
            return { playingXI: [], reserves: [] };
        }

        const mapped = rawList.map((p, idx) => {
            const isExtra = Boolean(teamObj?.extraPlayers?.[p.id]) ||
                Object.values(teamObj?.extraPlayers || {}).some(ep =>
                    String(ep.id) === String(p.id) ||
                    (ep.name && p.name && ep.name.trim().toLowerCase() === p.name.trim().toLowerCase())
                );

            const squadPlayer = teamObj?.players?.[p.id] ||
                Object.values(teamObj?.players || {}).find(sp =>
                    String(sp.id) === String(p.id) ||
                    (sp.name && p.name && sp.name.trim().toLowerCase() === p.name.trim().toLowerCase())
                ) ||
                teamObj?.extraPlayers?.[p.id] ||
                Object.values(teamObj?.extraPlayers || {}).find(ep =>
                    String(ep.id) === String(p.id) ||
                    (ep.name && p.name && ep.name.trim().toLowerCase() === p.name.trim().toLowerCase())
                );

            // Check if player has match participation (batting / bowling / crease)
            const hasBatted = (p.balls || 0) > 0 || (p.runs || 0) > 0 || (p.dismissal && p.dismissal !== 'yet to bat');
            const hasBowled = teamMatchData?.bowlers?.[p.id] && ((teamMatchData.bowlers[p.id].overs || 0) > 0 || (teamMatchData.bowlers[p.id].balls || 0) > 0);
            const isStriker = teamMatchData?.ballFaceBatsman && String(teamMatchData.ballFaceBatsman.id) === String(p.id);
            const isNonStriker = teamMatchData?.otherSideBatsman && String(teamMatchData.otherSideBatsman.id) === String(p.id);
            const isBowler = teamMatchData?.bowler && String(teamMatchData.bowler.id) === String(p.id);
            const isLockedInXI = hasBatted || hasBowled || isStriker || isNonStriker || isBowler;

            let resolvedType = p.type;
            if (isLockedInXI) {
                resolvedType = 'Playing XI';
            } else if (!resolvedType) {
                if (isExtra) resolvedType = 'Reserve';
                else if (squadPlayer?.type) resolvedType = squadPlayer.type;
                else resolvedType = idx < 11 ? 'Playing XI' : 'Reserve';
            }

            const isCaptain = teamObj?.captain && p.name &&
                (teamObj.captain.trim().toLowerCase() === p.name.trim().toLowerCase());

            const rawHand = p.hand || squadPlayer?.hand || 'RHB';
            const normHand = (rawHand === 'LHB' || rawHand === 'LHS' || String(rawHand).toLowerCase().includes('left')) ? 'LHB' : 'RHB';
            const bowlingStyle = p.bowlingStyle || squadPlayer?.bowlingStyle || '';

            const lineupOrder = (p.lineupOrder !== undefined && p.lineupOrder !== null)
                ? Number(p.lineupOrder)
                : ((p.order !== undefined && p.order !== null)
                    ? Number(p.order)
                    : ((squadPlayer?.order !== undefined && squadPlayer?.order !== null)
                        ? Number(squadPlayer.order)
                        : ((squadPlayer?.battingOrder !== undefined && squadPlayer?.battingOrder !== null)
                            ? Number(squadPlayer.battingOrder)
                            : idx + 1)));

            return {
                ...p,
                lineupOrder,
                role: p.role || squadPlayer?.role || (isExtra ? 'Substitute' : 'All Rounder'),
                imageUrl: p.imageUrl || p.ImageURL || p.image || p.photo || squadPlayer?.imageUrl || '',
                type: resolvedType === 'Reserve' ? 'Reserve' : 'Playing XI',
                isCaptain: Boolean(isCaptain),
                hand: normHand,
                bowlingStyle
            };
        });

        return {
            playingXI: mapped.filter(p => p.type === 'Playing XI').sort((a, b) => (a.lineupOrder ?? 999) - (b.lineupOrder ?? 999)),
            reserves: mapped.filter(p => p.type === 'Reserve')
        };
    };

    // Helper to resolve playing squad for scorecards
    const resolveTeamSquad = (teamMatchData, teamName) => {
        const roster = resolveTeamRoster(teamMatchData, teamName);
        return roster.playingXI.length > 0
            ? roster.playingXI
            : Object.values(teamMatchData?.players || {}).sort((a, b) => (a.lineupOrder ?? a.order ?? 999) - (b.lineupOrder ?? b.order ?? 999));
    };

    // Helper to order batting performance list according to when batters come out to the ground
    const getBattersInGroundArrivalOrder = (teamData, playersList) => {
        if (!playersList || playersList.length === 0) return [];
        if (!teamData) return playersList;

        const arrivalOrder = [];
        const addedIds = new Set();

        const addPlayerId = (pid) => {
            if (!pid) return;
            const sId = String(pid);
            if (!addedIds.has(sId)) {
                addedIds.add(sId);
                arrivalOrder.push(sId);
            }
        };

        const isCurrentlyAtCrease = (p) => {
            return (teamData.ballFaceBatsman && String(teamData.ballFaceBatsman.id) === String(p.id)) ||
                (teamData.otherSideBatsman && String(teamData.otherSideBatsman.id) === String(p.id)) ||
                p.status === 'batting';
        };

        const hasBatted = (p) => {
            return isCurrentlyAtCrease(p) ||
                Number(p.balls || 0) > 0 ||
                Number(p.runs || 0) > 0 ||
                (p.dismissal && p.dismissal.trim() !== '' && p.dismissal.trim().toLowerCase() !== 'yet to bat') ||
                (p.groundArrivalOrder && Number(p.groundArrivalOrder) > 0);
        };

        // 1. Build an inferred arrival map from historical partnerships & fall of wickets
        const inferredMap = {};

        // A. Completed partnerships in ascending order
        const sortedPartnerships = Object.values(teamData.partnerships || {})
            .filter(Boolean)
            .sort((a, b) => Number(a.wicketNumber || 0) - Number(b.wicketNumber || 0));

        sortedPartnerships.forEach((part, idx) => {
            const wNum = Number(part.wicketNumber || idx + 1);
            if (wNum === 1) {
                if (part.batsman1?.id && inferredMap[String(part.batsman1.id)] === undefined) {
                    inferredMap[String(part.batsman1.id)] = 1;
                }
                if (part.batsman2?.id && inferredMap[String(part.batsman2.id)] === undefined) {
                    inferredMap[String(part.batsman2.id)] = 2;
                }
            } else {
                if (part.batsman1?.id && inferredMap[String(part.batsman1.id)] === undefined) {
                    inferredMap[String(part.batsman1.id)] = wNum + 1;
                }
                if (part.batsman2?.id && inferredMap[String(part.batsman2.id)] === undefined) {
                    inferredMap[String(part.batsman2.id)] = wNum + 1;
                }
            }
        });

        // B. Fall of Wickets in chronological order
        const sortedFow = Object.values(teamData.fallOfWickets || {}).filter(Boolean);
        sortedFow.forEach((fow, idx) => {
            const wNum = idx + 1;
            let pId = null;
            if (fow.outBatsman?.id) {
                pId = String(fow.outBatsman.id);
            } else if (fow.batsman) {
                const cleanName = fow.batsman.trim().toLowerCase();
                const matched = playersList.find(p => p.name && p.name.trim().toLowerCase() === cleanName);
                if (matched) pId = String(matched.id);
            }
            if (pId && inferredMap[pId] === undefined) {
                inferredMap[pId] = wNum === 1 ? 1 : wNum + 1;
            }
        });

        // Determine the max arrival rank among all previously arrived batters
        let maxKnownArrival = 2;
        playersList.forEach(p => {
            const sId = String(p.id);
            const order = Number(p.groundArrivalOrder || inferredMap[sId] || 0);
            if (order > maxKnownArrival) maxKnownArrival = order;
        });
        const totalWickets = Number(teamData.totalWickets || 0);
        if (totalWickets + 1 > maxKnownArrival) {
            maxKnownArrival = totalWickets + 1;
        }

        // C. Current Crease Batters
        const strikerId = teamData.ballFaceBatsman?.id ? String(teamData.ballFaceBatsman.id) : null;
        const nonStrikerId = teamData.otherSideBatsman?.id ? String(teamData.otherSideBatsman.id) : null;

        if (strikerId && nonStrikerId) {
            if (totalWickets === 0) {
                if (inferredMap[strikerId] === undefined) inferredMap[strikerId] = 1;
                if (inferredMap[nonStrikerId] === undefined) inferredMap[nonStrikerId] = 2;
            } else {
                // The new incoming batter must always appear AFTER the last ground-coming player (maxKnownArrival + 1)
                const sPlayer = playersList.find(p => String(p.id) === strikerId);
                const nsPlayer = playersList.find(p => String(p.id) === nonStrikerId);
                const sHasOrder = Number(sPlayer?.groundArrivalOrder || inferredMap[strikerId] || 0) > 0;
                const nsHasOrder = Number(nsPlayer?.groundArrivalOrder || inferredMap[nonStrikerId] || 0) > 0;

                if (sHasOrder && !nsHasOrder) {
                    inferredMap[nonStrikerId] = maxKnownArrival + 1;
                } else if (nsHasOrder && !sHasOrder) {
                    inferredMap[strikerId] = maxKnownArrival + 1;
                } else if (!sHasOrder && !nsHasOrder) {
                    const sBalls = Number(sPlayer?.balls || 0) + Number(sPlayer?.runs || 0);
                    const nsBalls = Number(nsPlayer?.balls || 0) + Number(nsPlayer?.runs || 0);
                    if (sBalls > 0 && nsBalls === 0) {
                        inferredMap[nonStrikerId] = maxKnownArrival + 1;
                    } else if (nsBalls > 0 && sBalls === 0) {
                        inferredMap[strikerId] = maxKnownArrival + 1;
                    }
                }
            }
        }

        const getEffectiveArrivalRank = (p) => {
            // Priority 1: Explicit groundArrivalOrder
            if (p.groundArrivalOrder !== undefined && p.groundArrivalOrder !== null && Number(p.groundArrivalOrder) > 0) {
                return Number(p.groundArrivalOrder);
            }
            // Priority 2: Inferred map
            const sId = String(p.id);
            if (inferredMap[sId] !== undefined) return inferredMap[sId];
            // Priority 3: Batting order
            if (p.battingOrder !== undefined && p.battingOrder !== null && Number(p.battingOrder) > 0) {
                return Number(p.battingOrder);
            }
            return 999;
        };

        // 2. Active/participated batters sorted strictly by arrival order
        const activeBatters = [...playersList]
            .filter(hasBatted)
            .sort((a, b) => {
                const rankA = getEffectiveArrivalRank(a);
                const rankB = getEffectiveArrivalRank(b);
                if (rankA !== rankB) return rankA - rankB;
                return (Number(a.lineupOrder ?? 999)) - (Number(b.lineupOrder ?? 999));
            });

        activeBatters.forEach(p => addPlayerId(p.id));

        // 3. Map in exact ground arrival order
        const arrived = [];
        arrivalOrder.forEach(id => {
            const found = playersList.find(p => String(p.id) === String(id));
            if (found) arrived.push(found);
        });

        // 4. Remaining unbatted players MUST be sorted strictly by initial team line up order
        const unbatted = playersList
            .filter(p => !addedIds.has(String(p.id)))
            .sort((a, b) => {
                const orderA = (a.lineupOrder !== undefined && a.lineupOrder !== null)
                    ? Number(a.lineupOrder)
                    : ((a.order !== undefined && a.order !== null)
                        ? Number(a.order)
                        : ((a.initialOrder !== undefined && a.initialOrder !== null)
                            ? Number(a.initialOrder)
                            : 999));
                const orderB = (b.lineupOrder !== undefined && b.lineupOrder !== null)
                    ? Number(b.lineupOrder)
                    : ((b.order !== undefined && b.order !== null)
                        ? Number(b.order)
                        : ((b.initialOrder !== undefined && b.initialOrder !== null)
                            ? Number(b.initialOrder)
                            : 999));
                if (orderA !== orderB) return orderA - orderB;
                return (Number(a.id) || 0) - (Number(b.id) || 0);
            });

        return [...arrived, ...unbatted];
    };

    // Helper to render role icon
    const renderRoleIcon = (role) => {
        const norm = (role || '').toLowerCase();
        if (norm.includes('bowl')) return <MdSportsBaseball className="r-role-icon bowler" />;
        if (norm.includes('bat')) return <GiCricketBat className="r-role-icon batter" />;
        if (norm.includes('keep') || norm.includes('wk')) return <MdShield className="r-role-icon keeper" />;
        return <MdBolt className="r-role-icon allrounder" />;
    };

    // Helper to render single roster player item
    const renderRosterItem = (player, teamName, pIdx, isReserve) => {
        const normRole = (player.role || 'all rounder').toLowerCase().replace(/[\s-_]/g, '');
        return (
            <li key={player.id || pIdx} className={`roster-player-item ${isReserve ? 'is-reserve-item' : 'is-xi-item'}`}>
                {renderPlayerAvatar(player, teamName, 'xs')}
                <span className="r-p-num">#{pIdx + 1}</span>
                <div className="r-p-details">
                    <div className="r-p-name-row">
                        <span className="r-p-name">{player.name}</span>
                        {player.isCaptain && (
                            <span className="roster-captain-tag" title="Team Captain">
                                <FaCrown className="r-crown-icon" /> Captain
                            </span>
                        )}
                    </div>
                    <div className="r-p-meta-row">
                        <span className={`roster-role-pill ${normRole}`}>
                            {renderRoleIcon(player.role)}
                            <span>{player.role || 'All Rounder'}</span>
                        </span>
                    </div>
                </div>
            </li>
        );
    };

    // Helper to resolve player photo/avatar URL
    const getPlayerPhoto = (player, teamName) => {
        if (!player) return null;
        if (player.imageUrl) return player.imageUrl;
        if (player.image) return player.image;
        if (player.photo) return player.photo;
        if (player.ImageURL) return player.ImageURL;

        if (teams) {
            const searchTeams = teamName
                ? [teams[teamName] || Object.values(teams).find(t =>
                    t?.name?.toLowerCase() === teamName?.toLowerCase() ||
                    t?.shortName?.toLowerCase() === teamName?.toLowerCase()
                )].filter(Boolean)
                : Object.values(teams);

            for (const t of searchTeams) {
                const allP = [
                    ...Object.values(t?.players || {}),
                    ...Object.values(t?.extraPlayers || {})
                ];
                const found = allP.find(p =>
                    (player.id && String(p.id) === String(player.id)) ||
                    (player.name && p.name && p.name.trim().toLowerCase() === player.name.trim().toLowerCase())
                );
                if (found && (found.imageUrl || found.image || found.photo || found.ImageURL)) {
                    return found.imageUrl || found.image || found.photo || found.ImageURL;
                }
            }
        }
        return null;
    };

    // Helper to render a player avatar with initials fallback
    const renderPlayerAvatar = (player, teamName, size = 'md') => {
        const photoUrl = getPlayerPhoto(player, teamName);
        const name = player?.name || '?';
        const initials = name
            .split(' ')
            .filter(Boolean)
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?';

        return (
            <div className={`cpb-player-avatar-wrap ${size}`}>
                {photoUrl ? (
                    <img
                        src={photoUrl}
                        alt={name}
                        className="cpb-player-avatar"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'flex';
                            }
                        }}
                    />
                ) : null}
                <div
                    className="cpb-player-initials-fallback"
                    style={{ display: photoUrl ? 'none' : 'flex' }}
                >
                    {initials}
                </div>
            </div>
        );
    };

    // Live Match Pitch Crease Players (Active striker, non-striker, bowler strictly from live match; does NOT shift on scorecard tab changes)
    const liveBatTeamName = liveBattingTeam.name || (isLiveTeam1Batting ? t1Name : t2Name);
    const liveBowlTeamName = liveBowlingTeam.name || (isLiveTeam1Batting ? t2Name : t1Name);
    const liveBattersList = resolveTeamSquad(liveBattingTeam, liveBatTeamName);
    const rawLiveBowlersList = Object.values(liveBowlingTeam.bowlers || {});
    const liveBowlersList = rawLiveBowlersList.length > 0
        ? rawLiveBowlersList
        : resolveTeamSquad(liveBowlingTeam, liveBowlTeamName);

    // Active Batsmen & Bowler at the crease (Always live, never affected by tabs)
    const notOutLiveBatters = liveBattersList.filter(p => !isPlayerDismissedLive(p, liveBattingTeam));

    let activeStriker = null;
    if (liveBattingTeam.ballFaceBatsman?.id != null && !isPlayerDismissedLive(liveBattingTeam.ballFaceBatsman, liveBattingTeam)) {
        activeStriker = liveBattingTeam.ballFaceBatsman;
    } else {
        activeStriker = notOutLiveBatters.find(p => p.status === 'striker' || p.status === 'batting')
            || notOutLiveBatters[0]
            || { name: 'Striker', runs: 0, balls: 0 };
    }

    let activeNonStriker = null;
    if (liveBattingTeam.otherSideBatsman?.id != null && !isPlayerDismissedLive(liveBattingTeam.otherSideBatsman, liveBattingTeam) && String(liveBattingTeam.otherSideBatsman.id) !== String(activeStriker?.id)) {
        activeNonStriker = liveBattingTeam.otherSideBatsman;
    } else {
        activeNonStriker = notOutLiveBatters.find(p => (p.status === 'non-striker' || p.status === 'batting') && String(p.id) !== String(activeStriker?.id))
            || notOutLiveBatters.find(p => String(p.id) !== String(activeStriker?.id))
            || { name: 'Non-Striker', runs: 0, balls: 0 };
    }
    const rawActiveBowler = liveBowlingTeam.bowler || liveBowlersList[0] || { name: 'Active Bowler', overs: 0, runs: 0, wickets: 0 };
    const liveBowlSquadAll = resolveTeamSquad(liveBowlingTeam, liveBowlTeamName);
    const matchedActiveBowler = liveBowlSquadAll.find(p => String(p.id) === String(rawActiveBowler.id) || (p.name && rawActiveBowler.name && p.name.trim().toLowerCase() === rawActiveBowler.name.trim().toLowerCase()));
    const activeBowler = {
        ...rawActiveBowler,
        bowlingStyle: rawActiveBowler.bowlingStyle || matchedActiveBowler?.bowlingStyle || ''
    };

    // Tab-Selected Scorecard Data (For Batting & Bowling tables below in the selected innings)
    const currentBatTeamName = tabBattingTeam.name || (isTabTeam1Batting ? t1Name : t2Name);
    const currentBowlTeamName = tabBowlingTeam.name || (isTabTeam1Batting ? t2Name : t1Name);
    const rawBattersList = resolveTeamSquad(tabBattingTeam, currentBatTeamName);
    const battersList = getBattersInGroundArrivalOrder(tabBattingTeam, rawBattersList);
    const tabBowlSquadAll = resolveTeamSquad(tabBowlingTeam, currentBowlTeamName);
    const rawBowlersList = Object.values(tabBowlingTeam.bowlers || {});
    const bowlersList = (rawBowlersList.length > 0
        ? rawBowlersList
        : tabBowlSquadAll.map(p => ({
            id: p.id,
            name: p.name,
            overs: 0,
            runs: 0,
            wickets: 0,
            maidens: 0,
            economy: '0.00'
        }))).map(b => {
            const matched = tabBowlSquadAll.find(p => String(p.id) === String(b.id) || (p.name && b.name && p.name.trim().toLowerCase() === b.name.trim().toLowerCase()));
            return {
                ...matched,
                ...b,
                bowlingStyle: b.bowlingStyle || matched?.bowlingStyle || ''
            };
        });
    const fallOfWickets = Object.values(tabBattingTeam.fallOfWickets || {}).filter(Boolean);
    const currentPartnership = tabBattingTeam.currentPartnership;
    const partnershipsList = Object.values(tabBattingTeam.partnerships || {}).filter(Boolean);

    // Commentary Stream: Latest delivery strictly at the top
    const parseDeliveryScore = (item) => {
        if (item?.timestamp) return Number(item.timestamp);
        if (item?.id && !isNaN(item.id)) return Number(item.id);
        if (item?.ball && !isNaN(item.ball)) return Number(item.ball) * 1000;
        if (item?.over && !isNaN(item.over)) return Number(item.over) * 1000;
        return 0;
    };
    const allCommentaryList = matchData?.commentary
        ? Object.entries(matchData.commentary)
            .map(([key, val]) => ({ ...val, _id: val.id || key }))
            .sort((a, b) => {
                const scoreB = parseDeliveryScore(b) || (Number(b._id) || 0);
                const scoreA = parseDeliveryScore(a) || (Number(a._id) || 0);
                return scoreB - scoreA;
            })
        : [];

    // Helper to determine if delivery belongs to the specified batting team / innings
    const isDeliveryForBattingTeam = (c, targetBattingTeamKey) => {
        if (!c) return false;
        // 1. Explicit battingTeam key match
        if (c.battingTeam) {
            return c.battingTeam === targetBattingTeamKey;
        }
        // 2. Explicit innings number match (1st innings vs 2nd innings)
        if (c.innings) {
            const targetInningsNum = targetBattingTeamKey === firstBatTeamKey ? 1 : 2;
            return Number(c.innings) === targetInningsNum;
        }
        // 3. Match batsman against squad roster
        const t1Players = Object.values(team1?.players || {});
        const t2Players = Object.values(team2?.players || {});
        const cBatsman = String(c.batsman || '').trim().toLowerCase();
        if (cBatsman) {
            const isT1Batter = t1Players.some(p => String(p?.name || '').trim().toLowerCase() === cBatsman);
            const isT2Batter = t2Players.some(p => String(p?.name || '').trim().toLowerCase() === cBatsman);
            if (isT1Batter && !isT2Batter) return targetBattingTeamKey === 'team1';
            if (isT2Batter && !isT1Batter) return targetBattingTeamKey === 'team2';
        }
        // 4. Match bowler against opponent squad / bowlers roster
        const cBowler = String(c.bowler || '').trim().toLowerCase();
        if (cBowler) {
            const isT1Bowler = (team1?.bowlers && Object.values(team1.bowlers).some(b => String(b?.name || '').trim().toLowerCase() === cBowler)) ||
                t1Players.some(p => String(p?.name || '').trim().toLowerCase() === cBowler);
            const isT2Bowler = (team2?.bowlers && Object.values(team2.bowlers).some(b => String(b?.name || '').trim().toLowerCase() === cBowler)) ||
                t2Players.some(p => String(p?.name || '').trim().toLowerCase() === cBowler);
            if (isT1Bowler && !isT2Bowler) return targetBattingTeamKey === 'team2';
            if (isT2Bowler && !isT1Bowler) return targetBattingTeamKey === 'team1';
        }
        return true;
    };

    // Innings-specific commentary list for the currently viewed scorecard tab
    const tabBattingTeamCommentary = tabBattingTeam?.commentary
        ? Object.entries(tabBattingTeam.commentary)
            .map(([key, val]) => ({ ...val, _id: val.id || key }))
            .sort((a, b) => (parseDeliveryScore(b) || Number(b._id) || 0) - (parseDeliveryScore(a) || Number(a._id) || 0))
        : null;

    const commentaryList = (tabBattingTeamCommentary && tabBattingTeamCommentary.length > 0)
        ? tabBattingTeamCommentary
        : allCommentaryList.filter(c => isDeliveryForBattingTeam(c, activeInningsTab));

    // Helper to extract 1-indexed over number from delivery
    const getDeliveryOverNum = (c) => {
        const raw = c?.over ?? c?.ball;
        if (raw === undefined || raw === null || raw === '') return null;
        const str = String(raw).trim();
        if (str.includes('.')) {
            const parts = str.split('.');
            const overPart = parseInt(parts[0], 10);
            const ballPart = parseInt(parts[1], 10);
            if (isNaN(overPart)) return null;
            if (ballPart === 0 && overPart > 0) return overPart;
            return overPart + 1;
        }
        const num = parseInt(str, 10);
        return !isNaN(num) ? num : null;
    };

    // Extract unique overs present in the selected innings commentaryList (sorted ascending)
    const availableOvers = Array.from(
        new Set(
            commentaryList
                .map(getDeliveryOverNum)
                .filter((ov) => ov !== null && !isNaN(ov))
        )
    ).sort((a, b) => a - b);

    // Filter commentary list by selected over or custom entry
    const isFilteredByOver = selectedOverFilter !== 'all' && selectedOverFilter !== '' && !isNaN(Number(selectedOverFilter));
    const filteredCommentary = isFilteredByOver
        ? commentaryList.filter((c) => getDeliveryOverNum(c) === Number(selectedOverFilter))
        : commentaryList;

    // Live crease recent deliveries (always represents active live innings)
    const liveInningsDeliveries = allCommentaryList.filter(c => isDeliveryForBattingTeam(c, liveBattingTeamKey));
    const recentDeliveries = (liveInningsDeliveries.length > 0 ? liveInningsDeliveries : allCommentaryList).slice(0, 8).reverse();

    // Top Performers for Concluded Matches
    const allBatters = [
        ...Object.values(team1.players || {}),
        ...Object.values(team2.players || {})
    ].filter(p => p && typeof p === 'object' && p.name);
    const topBatter = allBatters.sort((a, b) => (Number(b.runs) || 0) - (Number(a.runs) || 0))[0];

    const allBowlers = [
        ...Object.values(team1.bowlers || {}),
        ...Object.values(team2.bowlers || {})
    ].filter(b => b && typeof b === 'object' && b.name);
    const topBowler = allBowlers.sort((a, b) => (Number(b.wickets) || 0) - (Number(a.wickets) || 0))[0];

    // Extract or synthesize Wagon Wheel shots from recorded player shots / boundaries
    const wagonShots = selectedBatsmanForWagon ? (
        (() => {
            const b = selectedBatsmanForWagon;
            const shots = [];

            // 1. Prioritize ball-by-ball shots from commentary for this batsman (exact delivery accuracy)
            const batterCommentary = commentaryList.filter(c =>
                c.batsman && b.name &&
                c.batsman.trim().toLowerCase() === b.name.trim().toLowerCase() &&
                c.wagonZone && (Number(c.runs) > 0 || (c.extraType === 'No Ball' && Number(c.extraRuns) > 0))
            );

            if (batterCommentary.length > 0) {
                return batterCommentary.map((c, idx) => ({
                    zone: c.wagonZone,
                    runs: (c.extraType === 'No Ball' && Number(c.extraRuns) > 0) ? Number(c.extraRuns) : Number(c.runs),
                    ballId: c.id || c.timestamp || idx
                }));
            }

            // 2. If no commentary shots with wagonZone, use b.shots
            if (b.shots && Object.keys(b.shots).length > 0) {
                if (Array.isArray(b.shots)) {
                    return b.shots.filter(s => Number(s.runs) > 0);
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
            const sixes = b.boundaries?.sixes ?? b.sixes ?? 0;
            const fours = b.boundaries?.fours ?? b.fours ?? 0;
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
                                <MdCheckCircle className="ls-check-icon" /> COMPLETED MATCH • FULL SCORECARD
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Interactive Broadcast Console */}
            <main className="ls-main-section">
                <div className="ls-container">
                    {/* ========================================================= */}
                    {/* ROW 01: Top Section (Holographic Scoreboard + Smart Crease Spotlight) */}
                    {/* ========================================================= */}
                    <div className="ls-two-col-layout ls-row-top">
                        <div className="ls-col-left">
                            <div className="scoreboard-glass-card">
                                {/* Match Title & Format Ribbon */}
                                <div className="sb-header">
                                    <div className="sb-match-label">
                                        <span className="sb-title-badge">{common.title ? `${common.title} Match` : 'Tournament Match'}</span>
                                        <span className="sb-date">{common.date || 'Match Day'} • {common.time || '10:00 AM'}</span>
                                    </div>
                                    <div className="sb-header-meta">
                                        <span className="sb-overs-limit">
                                            {overLimit} OVERS PER SIDE
                                            {isDls && ` • REVISED TO ${effectiveOvers} OV (DLS)`}
                                        </span>
                                    </div>
                                </div>

                                {/* Dual Team Score Columns with Crests (First Batting Team Always on Left, Second Batting on Right) */}
                                {(() => {
                                    const isFirstBatCurrentlyBatting = isLive && (liveBattingTeamKey === firstBatTeamKey);
                                    const isSecondBatCurrentlyBatting = isLive && (liveBattingTeamKey === secondBatTeamKey);
                                    const firstBatLogo = firstBatTeamKey === 'team1' ? t1Logo : t2Logo;
                                    const secondBatLogo = secondBatTeamKey === 'team1' ? t1Logo : t2Logo;

                                    return (
                                        <div className="sb-teams-grid">
                                            {/* First Batting Team Card (Always Left Column) */}
                                            <div className={`sb-team-col ${isFirstBatCurrentlyBatting ? 'active-batting' : ''}`}>
                                                <div className="sb-team-identity">
                                                    {firstBatLogo ? (
                                                        <img
                                                            src={firstBatLogo}
                                                            alt={firstBatName}
                                                            className="sb-team-crest"
                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <div className="sb-team-fallback-crest">
                                                            {firstBatName.substring(0, 3)}
                                                        </div>
                                                    )}
                                                    <div className="sb-team-name-wrap">
                                                        <h2 className="sb-team-name">{firstBatName}</h2>
                                                        {isFirstBatCurrentlyBatting ? (
                                                            <span className="sb-batting-pill">
                                                                <GiCricketBat className="sb-role-icon" /> BATTING
                                                            </span>
                                                        ) : isLive && activeInningsNumber === 2 ? (
                                                            <span className="sb-bowling-pill">
                                                                <MdSportsBaseball className="sb-role-icon" /> BOWLING
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className="sb-score-big">
                                                    <span className="score-runs">{firstBatRuns}</span>
                                                    <span className="score-sep">/</span>
                                                    <span className="score-wickets">{firstBatWickets}</span>
                                                </div>
                                                <div className="sb-overs-pill">
                                                    <span>Overs <strong>{firstBatOvers}</strong>/{overLimit}</span>
                                                    <span className="sb-crr-dot">•</span>
                                                    <span>CRR <strong>{firstBatTeamKey === 'team1' ? t1Crr : t2Crr}</strong></span>
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
                                                        <span>Need <strong>{runsNeeded}</strong> runs in <strong>{ballsRemaining}</strong> balls (RRR: {requiredRunRate})</span>
                                                        {isDls && (
                                                            <span className="sb-dls-subtag" title={`DLS Method target revised from ${overLimit} overs`}>
                                                                <MdCloudQueue /> DLS Target: {targetScore} ({effectiveOvers} ov)
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Live DLS Par Score indicator during 2nd innings */}
                                                {isLive && isChasing && dlsParInfo && (
                                                    <div className="sb-dls-par-pill">
                                                        <span className="sb-dls-par-title">DLS Par: <strong>{dlsParInfo.parScore}</strong></span>
                                                        <span className={`sb-dls-par-margin ${currentChaseScore >= dlsParInfo.parScore ? 'ahead' : 'behind'}`}>
                                                            {currentChaseScore >= dlsParInfo.parScore
                                                                ? `(+${currentChaseScore - dlsParInfo.parScore} ahead)`
                                                                : `(${currentChaseScore - dlsParInfo.parScore} behind)`}
                                                        </span>
                                                    </div>
                                                )}

                                                {common.mom && (
                                                    <div className="sb-mom">
                                                        Man of the Match: <strong>{common.mom}</strong>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Second Batting Team Card (Always Right Column) */}
                                            <div className={`sb-team-col ${isSecondBatCurrentlyBatting ? 'active-batting' : ''}`}>
                                                <div className="sb-team-identity">
                                                    {secondBatLogo ? (
                                                        <img
                                                            src={secondBatLogo}
                                                            alt={secondBatName}
                                                            className="sb-team-crest"
                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <div className="sb-team-fallback-crest">
                                                            {secondBatName.substring(0, 3)}
                                                        </div>
                                                    )}
                                                    <div className="sb-team-name-wrap">
                                                        <h2 className="sb-team-name">{secondBatName}</h2>
                                                        {isSecondBatCurrentlyBatting ? (
                                                            <span className="sb-batting-pill">
                                                                <GiCricketBat className="sb-role-icon" /> BATTING
                                                            </span>
                                                        ) : isLive && activeInningsNumber === 1 ? (
                                                            <span className="sb-bowling-pill">
                                                                <MdSportsBaseball className="sb-role-icon" /> BOWLING
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className="sb-score-big">
                                                    <span className="score-runs">{secondBatRuns}</span>
                                                    <span className="score-sep">/</span>
                                                    <span className="score-wickets">{secondBatWickets}</span>
                                                </div>
                                                <div className="sb-overs-pill">
                                                    <span>Overs <strong>{secondBatOvers}</strong>/{isChasing && isDls ? effectiveOvers : overLimit}</span>
                                                    <span className="sb-crr-dot">•</span>
                                                    <span>CRR <strong>{secondBatTeamKey === 'team1' ? t1Crr : t2Crr}</strong></span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="ls-col-right">
                            <section className="ls-crease-section">
                                <div className="ls-crease-card">
                                    {isLive ? (
                                        <>
                                            {/* Two Column Space-Saving Crease Layout: Left=Bowler, Right=Striker & Non-Striker */}
                                            <div className="crease-two-col-layout">
                                                {/* Right Column: Striker & Non-Striker Batters */}
                                                <div className="crease-batters-col">
                                                    {/* Striker Mini Card */}
                                                    {activeStriker && (
                                                        <div className="crease-batter-mini-card striker">
                                                            <div className="cbm-header">
                                                                <div className="cbm-info">
                                                                    <div className="cbm-name-row">
                                                                        <span className="cbm-name">{activeStriker.name}</span>
                                                                        <span className={`cbm-hand-badge ${(activeStriker.hand === 'LHB' || activeStriker.hand === 'LHS' || String(activeStriker.hand || '').toLowerCase().includes('left')) ? 'lhb' : 'rhb'}`}>
                                                                            {(activeStriker.hand === 'LHB' || activeStriker.hand === 'LHS' || String(activeStriker.hand || '').toLowerCase().includes('left')) ? 'LHB' : 'RHB'}
                                                                        </span>
                                                                        <span className="cbm-badge striker-badge">
                                                                            <GiCricketBat /> STRIKER *
                                                                        </span>
                                                                    </div>
                                                                    <div className="cbm-stats-row">
                                                                        <span>4s: <strong>{activeStriker.boundaries?.fours ?? activeStriker.fours ?? 0}</strong></span>
                                                                        <span>6s: <strong>{activeStriker.boundaries?.sixes ?? activeStriker.sixes ?? 0}</strong></span>
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
                                                                        <span className={`cbm-hand-badge ${(activeNonStriker.hand === 'LHB' || activeNonStriker.hand === 'LHS' || String(activeNonStriker.hand || '').toLowerCase().includes('left')) ? 'lhb' : 'rhb'}`}>
                                                                            {(activeNonStriker.hand === 'LHB' || activeNonStriker.hand === 'LHS' || String(activeNonStriker.hand || '').toLowerCase().includes('left')) ? 'LHB' : 'RHB'}
                                                                        </span>
                                                                        <span className="cbm-badge non-striker-badge">
                                                                            NON-STRIKE
                                                                        </span>
                                                                    </div>
                                                                    <div className="cbm-stats-row">
                                                                        <span>4s: <strong>{activeNonStriker.boundaries?.fours ?? activeNonStriker.fours ?? 0}</strong></span>
                                                                        <span>6s: <strong>{activeNonStriker.boundaries?.sixes ?? activeNonStriker.sixes ?? 0}</strong></span>
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

                                                {/* Left Column: Active Bowler */}
                                                <div className="crease-bowler-col">
                                                    {activeBowler && (
                                                        <TiltCard className="crease-card bowler-spotlight-card" maxTilt={5}>
                                                            <div className="cc-tag bowler-tag">
                                                                <MdSportsBaseball className="cc-tag-icon" /> CURRENT BOWLER
                                                            </div>
                                                            <h3 className="cc-name">{activeBowler.name}</h3>
                                                            {activeBowler.bowlingStyle && (
                                                                <div className="cc-bowling-style-chip" title={`Bowling Style: ${activeBowler.bowlingStyle}`}>
                                                                    <MdSportsCricket /> {activeBowler.bowlingStyle}
                                                                </div>
                                                            )}
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
                                            </div>

                                            {/* Recent Deliveries Strip */}
                                            {recentDeliveries.length > 0 && (
                                                <div className="recent-balls-bar">
                                                    <span className="rbb-title">Recent Balls:</span>
                                                    <div className="rbb-tokens">
                                                        {recentDeliveries.map((c, idx) => {
                                                            const meta = getDeliveryMeta(c);
                                                            return (
                                                                <span
                                                                    key={idx}
                                                                    className={`delivery-token ${meta.type} len-${String(meta.label).length}`}
                                                                    title={`Ball ${c.ball || idx + 1}: ${c.commentary || c.text || ''}`}
                                                                >
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
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* ROW 02: Under Section (Hub Tabs + Batting & Bowling Side-by-Side) */}
                    {/* ========================================================= */}
                    <div className="ls-hub-card ls-row-under">
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

                        {/* TAB 1: SCORECARD (Batting & Bowling at same horizontal level) */}
                        {activeHubTab === 'scorecard' && (
                            <div className="hub-tab-pane">
                                <div className="innings-switcher-bar">
                                    <button
                                        className={`innings-switch-btn ${activeInningsTab === firstBatTeamKey ? 'active' : ''}`}
                                        onClick={() => setUserSelectedInningsTab(firstBatTeamKey)}
                                    >
                                        <span className="col-full">1st Innings: <strong>{firstBatName}</strong> ({firstBatRuns}/{firstBatWickets} in {firstBatOvers} ov)</span>
                                        <span className="col-short">1st: <strong>{firstBatName}</strong> ({firstBatRuns}/{firstBatWickets})</span>
                                    </button>
                                    <button
                                        className={`innings-switch-btn ${activeInningsTab === secondBatTeamKey ? 'active' : ''}`}
                                        onClick={() => setUserSelectedInningsTab(secondBatTeamKey)}
                                    >
                                        <span className="col-full">2nd Innings: <strong>{secondBatName}</strong> ({secondBatRuns}/{secondBatWickets} in {secondBatOvers} ov)</span>
                                        <span className="col-short">2nd: <strong>{secondBatName}</strong> ({secondBatRuns}/{secondBatWickets})</span>
                                    </button>
                                </div>

                                {/* Side-by-side Scorecard Grid */}
                                <div className="ls-two-col-layout ls-row-scorecard">
                                    {/* Left Column: Batting, Extras, Partnerships */}
                                    <div className="ls-col-left">
                                        {/* Batting Scorecard Block */}
                                        <div className="scorecard-block">
                                            <div className="block-header-bar">
                                                <h3 className="block-title">Batting • {tabBattingTeam.name || 'Team'}</h3>
                                                <div className="block-header-right">
                                                    <span className="block-total-pill">
                                                        Total: <strong>{tabBatRuns}/{tabBatWickets}</strong> ({tabBatOvers} ov)
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="table-responsive-wrapper">
                                                <div className="table-scroll-guide">
                                                    <span>⇄ Scroll horizontally to view full batting stats</span>
                                                </div>
                                                <div className="table-responsive batting-table-responsive has-scroll-hint">
                                                    <table className="score-table batting-score-table">
                                                        <thead>
                                                            <tr>
                                                                <th className="th-batter">Batter</th>
                                                                <th className="th-dismissal">Dismissal</th>
                                                                <th className="th-num" style={{ textAlign: 'center' }}>R</th>
                                                                <th className="th-num" style={{ textAlign: 'center' }}>B</th>
                                                                <th className="th-num" style={{ textAlign: 'center' }}>4s</th>
                                                                <th className="th-num" style={{ textAlign: 'center' }}>6s</th>
                                                                <th className="th-num" style={{ textAlign: 'center' }}>SR</th>
                                                                <th className="th-wagon" style={{ textAlign: 'center' }}>Wag</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {battersList.map((p, idx) => {
                                                                const isOut = isPlayerDismissedLive(p, tabBattingTeam);
                                                                const isStriker = !isOut && tabBattingTeam?.ballFaceBatsman && String(tabBattingTeam.ballFaceBatsman.id) === String(p.id);
                                                                const isNonStriker = !isOut && tabBattingTeam?.otherSideBatsman && String(tabBattingTeam.otherSideBatsman.id) === String(p.id);
                                                                const isCurrentlyBatting = !isOut && (isStriker || isNonStriker || p.status === 'batting');
                                                                const dismissalText = isOut
                                                                    ? ((p.dismissal && p.dismissal.trim() !== '' && p.dismissal.trim().toLowerCase() !== 'yet to bat' && p.dismissal.trim().toLowerCase() !== 'not out') ? p.dismissal : 'out')
                                                                    : (isCurrentlyBatting || Number(p.runs || 0) > 0 || Number(p.balls || 0) > 0 ? 'not out' : 'yet to bat');

                                                                return (
                                                                    <tr
                                                                        key={p.id || idx}
                                                                        className={isOut ? 'out-batter-row' : ''}
                                                                        style={isOut ? { color: '#94a3b8', fontStyle: 'italic', opacity: 0.8 } : {}}
                                                                    >
                                                                        <td className="player-name-cell" style={isOut ? { color: '#94a3b8', fontStyle: 'italic' } : {}}>
                                                                            <div className="table-player-cell-inner">
                                                                                {renderPlayerAvatar(p, currentBatTeamName, 'xs')}
                                                                                <div className="p-cell-wrap">
                                                                                    <div className="p-name-row-live">
                                                                                        <strong style={isOut ? { color: '#94a3b8', fontStyle: 'italic' } : {}}>{p.name}</strong>
                                                                                        <span className={`p-hand-sub ${isOut ? 'out-hand' : ''} ${(p.hand === 'LHB' || p.hand === 'LHS' || String(p.hand || '').toLowerCase().includes('left')) ? 'lhb' : 'rhb'}`}>
                                                                                            {(p.hand === 'LHB' || p.hand === 'LHS' || String(p.hand || '').toLowerCase().includes('left')) ? 'LHB' : 'RHB'}
                                                                                        </span>
                                                                                    </div>
                                                                                    {p.role && <span className="player-role-sub" style={isOut ? { color: '#94a3b8' } : {}}>{p.role}</span>}
                                                                                    <span className="mobile-dismissal-sub">
                                                                                        {isOut ? (
                                                                                            <span className="dismissal-out" style={{ fontStyle: 'italic', color: '#94a3b8' }}>{dismissalText}</span>
                                                                                        ) : (
                                                                                            <span className="dismissal-notout">{dismissalText}</span>
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="dismissal-cell desktop-dismissal" style={isOut ? { fontStyle: 'italic', color: '#94a3b8' } : {}}>
                                                                            {isOut ? (
                                                                                <span className="dismissal-out" style={{ fontStyle: 'italic', color: '#94a3b8' }}>{dismissalText}</span>
                                                                            ) : (
                                                                                <span className="dismissal-notout">{dismissalText}</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="runs-cell" style={{ textAlign: 'center', ...(isOut ? { color: '#94a3b8', fontStyle: 'italic' } : {}) }}>{p.runs ?? 0}</td>
                                                                        <td className="balls-cell" style={{ textAlign: 'center', ...(isOut ? { color: '#94a3b8', fontStyle: 'italic' } : {}) }}>{p.balls ?? 0}</td>
                                                                        <td className="fours-cell" style={{ textAlign: 'center', ...(isOut ? { color: '#94a3b8', fontStyle: 'italic' } : {}) }}>{p.boundaries?.fours ?? p.fours ?? 0}</td>
                                                                        <td className="sixes-cell" style={{ textAlign: 'center', ...(isOut ? { color: '#94a3b8', fontStyle: 'italic' } : {}) }}>{p.boundaries?.sixes ?? p.sixes ?? 0}</td>
                                                                        <td className="sr-cell" style={{ textAlign: 'center', ...(isOut ? { color: '#94a3b8', fontStyle: 'italic' } : {}) }}>
                                                                            {p.strikeRate || ((Number(p.runs || 0) / Math.max(1, Number(p.balls || 1))) * 100).toFixed(1)}
                                                                        </td>
                                                                        <td className="wagon-cell" style={{ textAlign: 'center' }}>
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
                                                                )
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Extras & Total summary bar */}
                                            {(() => {
                                                const extrasInfo = parseExtrasBreakdown(tabBattingTeam.extraTypes, tabBattingTeam.totalExtraAmount);
                                                return (
                                                    <div className="extras-row">
                                                        <div className="extras-details">
                                                            <span>Extras:</span>
                                                            <strong className="extras-highlight">{extrasInfo.total}</strong>
                                                            <small className="extras-subtext">({extrasInfo.breakdownText})</small>
                                                            {extrasInfo.pen > 0 && (
                                                                <span className="extras-penalty-badge" title="Umpire Penalty Marks Awarded">
                                                                    ⚡ +{extrasInfo.pen} Penalty
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="innings-total-summary">
                                                            <span>Innings Total:</span>
                                                            <strong className="total-highlight">{tabBatRuns}/{tabBatWickets}</strong>
                                                            <span className="total-ov">({tabBatOvers} Overs, RR: {(Number(tabBatOvers) > 0 ? (Number(tabBatRuns) / Number(tabBatOvers)).toFixed(2) : '0.00')})</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Partnerships Card: Current Stand & Innings History */}
                                        {(currentPartnership?.batsman1 || partnershipsList.length > 0) && (
                                            <div className="scorecard-block partnerships-block">
                                                <div className="block-header-bar">
                                                    <h3 className="block-title">
                                                        <MdHandshake className="block-header-icon" /> Partnerships • {tabBattingTeam.name || 'Batting Side'}
                                                    </h3>
                                                </div>

                                                {/* Live Current Partnership (Active Batter Stand) */}
                                                {currentPartnership?.batsman1 && (
                                                    <div className="current-partnership-card">
                                                        <div className="cpb-meta-top">
                                                            <div className="cpb-badge-wrap">
                                                                <span className="cpb-live-dot"></span>
                                                                <span className="cpb-badge-text">Current Stand</span>
                                                            </div>
                                                            <div className="cpb-score-wrap">
                                                                <strong className="cpb-runs">{Math.max(0, (tabBattingTeam.totalRuns || 0) - (currentPartnership.startScore || 0))}</strong>
                                                                <span className="cpb-sub">runs ({Math.max(0, (tabBattingTeam.totalBalls || 0) - (currentPartnership.startBalls || 0))} balls)</span>
                                                                <span className="cpb-rr-tag">
                                                                    CRR: {Math.max(0, (tabBattingTeam.totalBalls || 0) - (currentPartnership.startBalls || 0)) > 0
                                                                        ? (((Math.max(0, (tabBattingTeam.totalRuns || 0) - (currentPartnership.startScore || 0))) / Math.max(1, (tabBattingTeam.totalBalls || 0) - (currentPartnership.startBalls || 0))) * 6).toFixed(2)
                                                                        : '0.00'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Proportional Split Bar */}
                                                        {(() => {
                                                            const standRuns = Math.max(1, (tabBattingTeam.totalRuns || 0) - (currentPartnership.startScore || 0));
                                                            const b1Runs = currentPartnership.batsman1Runs || 0;
                                                            const b2Runs = currentPartnership.batsman2Runs || 0;
                                                            const b1Pct = Math.round((b1Runs / standRuns) * 100);
                                                            const b2Pct = Math.round((b2Runs / standRuns) * 100);
                                                            return (
                                                                <div className="cpb-bar-track">
                                                                    <div className="cpb-bar-left" style={{ width: `${Math.max(15, Math.min(85, b1Pct))}%` }}>
                                                                        <span>
                                                                            <span className="cpb-bar-name">{currentPartnership.batsman1.name?.split(' ')[0]}: </span>
                                                                            <strong className="cpb-bar-runs">{b1Runs}</strong>
                                                                        </span>
                                                                    </div>
                                                                    <div className="cpb-bar-right" style={{ width: `${Math.max(15, Math.min(85, b2Pct))}%` }}>
                                                                        <span>
                                                                            <span className="cpb-bar-name">{currentPartnership.batsman2.name?.split(' ')[0]}: </span>
                                                                            <strong className="cpb-bar-runs">{b2Runs}</strong>
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Batters Individual Contributions */}
                                                        <div className="cpb-batters-row">
                                                            <div className="cpb-batter-pill left">
                                                                {renderPlayerAvatar(currentPartnership.batsman1, currentBatTeamName, 'md')}
                                                                <div className="cpb-batter-details">
                                                                    <span className="cpb-pname">{currentPartnership.batsman1.name}</span>
                                                                    <span className="cpb-pstat">
                                                                        <strong>{currentPartnership.batsman1Runs || 0}</strong> ({currentPartnership.batsman1Balls || 0}b)
                                                                    </span>
                                                                    <span className="cpb-psr">
                                                                        SR: {(currentPartnership.batsman1Balls || 0) > 0 ? (((currentPartnership.batsman1Runs || 0) / currentPartnership.batsman1Balls) * 100).toFixed(1) : '0.0'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="cpb-extras-badge">
                                                                <span>Extras: <strong>{Math.max(0, ((tabBattingTeam.totalRuns || 0) - (currentPartnership.startScore || 0)) - ((currentPartnership.batsman1Runs || 0) + (currentPartnership.batsman2Runs || 0)))}</strong></span>
                                                            </div>

                                                            <div className="cpb-batter-pill right">
                                                                <div className="cpb-batter-details text-right">
                                                                    <span className="cpb-pname">{currentPartnership.batsman2.name}</span>
                                                                    <span className="cpb-pstat">
                                                                        <strong>{currentPartnership.batsman2Runs || 0}</strong> ({currentPartnership.batsman2Balls || 0}b)
                                                                    </span>
                                                                    <span className="cpb-psr">
                                                                        SR: {(currentPartnership.batsman2Balls || 0) > 0 ? (((currentPartnership.batsman2Runs || 0) / currentPartnership.batsman2Balls) * 100).toFixed(1) : '0.0'}
                                                                    </span>
                                                                </div>
                                                                {renderPlayerAvatar(currentPartnership.batsman2, currentBatTeamName, 'md')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Completed Partnerships Table */}
                                                {partnershipsList.length > 0 && (
                                                    <div className="partnerships-history-wrap">
                                                        <div className="partnerships-table-header-row">
                                                            <span className="partnerships-table-title">Partnership History</span>
                                                            <span className="partnerships-scroll-badge">⇄ Scroll to view details</span>
                                                        </div>
                                                        <div className="table-responsive partnerships-table-responsive">
                                                            <table className="score-table partnerships-table">
                                                                <thead>
                                                                    <tr>
                                                                        <th style={{ textAlign: 'left' }}><span className="col-full">Wicket</span><span className="col-short">W</span></th>
                                                                        <th style={{ textAlign: 'center' }}><span className="col-full">R (B)</span><span className="col-short">R</span></th>
                                                                        <th style={{ textAlign: 'center' }}><span className="col-full">Ov</span><span className="col-short">O</span></th>
                                                                        <th style={{ textAlign: 'center' }}><span className="col-full">Batters Breakdown</span><span className="col-short">B</span></th>
                                                                        <th style={{ textAlign: 'center' }}><span className="col-full">Extr</span><span className="col-short">E</span></th>
                                                                        <th style={{ textAlign: 'center' }}><span className="col-full">Sco</span><span className="col-short">S</span></th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {partnershipsList.map((p, idx) => (
                                                                        <tr key={p.id || idx} className={p?.isUnbroken ? 'unbroken-partnership-row' : ''}>
                                                                            <td className="wkt-cell" style={{ textAlign: 'left' }}>
                                                                                <strong>{p.wicketLabel || `${p.wicketNumber || idx + 1}${idx === 0 ? 'st' : idx === 1 ? 'nd' : idx === 2 ? 'rd' : 'th'} Wicket`}</strong>
                                                                                {p?.isUnbroken && <span className="unbroken-badge">Not Out</span>}
                                                                            </td>
                                                                            <td className="runs-cell" style={{ textAlign: 'center' }}>
                                                                                <span className="part-runs-bold">{p.runs}</span> <span className="text-muted">({p.balls}b)</span>
                                                                            </td>
                                                                            <td style={{ textAlign: 'center' }}>{p.overs || `${Math.floor((p.balls || 0) / 6)}.${(p.balls || 0) % 6}`}</td>
                                                                            <td className="part-batters-cell" style={{ textAlign: 'center', width: 'max-content' }}>
                                                                                <span className="part-b-seg">
                                                                                    <span className="part-b-info">
                                                                                        {p.batsman1?.name}: <strong>{p.batsman1Runs || 0}</strong> <small>({p.batsman1Balls || 0}b)</small>
                                                                                    </span>
                                                                                </span>
                                                                                <span className="part-b-seg">
                                                                                    <span className="part-b-info">
                                                                                        {p.batsman2?.name}: <strong>{p.batsman2Runs || 0}</strong> <small>({p.batsman2Balls || 0}b)</small>
                                                                                    </span>
                                                                                </span>
                                                                            </td>
                                                                            <td style={{ textAlign: 'center' }}>{p.extras ?? Math.max(0, p.runs - ((p.batsman1Runs || 0) + (p.batsman2Runs || 0)))}</td>
                                                                            <td className="end-score-cell" style={{ textAlign: 'center' }}>{p.endScore || '-'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column: Bowling, FoW, Commentary */}
                                    <div className="ls-col-right">
                                        <div className="scorecard-block right-col-bowling-block" >
                                            <div className="block-header-bar">
                                                <h3 className="block-title">Bowling • {tabBowlingTeam.name || 'Opponent'}</h3>
                                                <span className="block-total-pill">
                                                    Overs: <strong>{tabBatOvers}</strong> ({tabBatWickets} Wkts)
                                                </span>
                                            </div>
                                            <div className="table-responsive bowling-table-responsive">
                                                <table className="score-table bowling-score-table">
                                                    <thead>
                                                        <tr>
                                                            <th className="th-bowler">Bowler</th>
                                                            <th className="th-bowl-stat" style={{ textAlign: 'center' }}>O</th>
                                                            <th className="th-bowl-stat" style={{ textAlign: 'center' }}>M</th>
                                                            <th className="th-bowl-stat" style={{ textAlign: 'center' }}>R</th>
                                                            <th className="th-bowl-stat" style={{ textAlign: 'center' }}>W</th>
                                                            <th className="th-bowl-stat" style={{ textAlign: 'center' }}>Econ</th>
                                                            <th className="th-bowl-stat" style={{ textAlign: 'center' }}>Dots</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {bowlersList.length > 0 ? (
                                                            bowlersList.map((b, idx) => (
                                                                <tr key={b.id || idx}>
                                                                    <td className="player-name-cell bowler-name-cell">
                                                                        <div className="table-player-cell-inner">
                                                                            {renderPlayerAvatar(b, currentBowlTeamName, 'xs')}
                                                                            <div className="p-cell-wrap">
                                                                                <strong>{b.name}</strong>
                                                                                {b.bowlingStyle && (
                                                                                    <span className="bowler-style-sub">{b.bowlingStyle}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="bowl-stat-cell" style={{ textAlign: 'center' }}>{b.overs ?? 0}</td>
                                                                    <td className="bowl-stat-cell" style={{ textAlign: 'center' }}>{b.maidens ?? 0}</td>
                                                                    <td className="bowl-stat-cell runs-cell" style={{ textAlign: 'center' }}>{b.runs ?? 0}</td>
                                                                    <td className="bowl-stat-cell wicket-highlight" style={{ textAlign: 'center' }}>{b.wickets ?? 0}</td>
                                                                    <td className="bowl-stat-cell econ-cell" style={{ textAlign: 'center' }}>{b.economy ?? (b.overs ? (b.runs / b.overs).toFixed(2) : '0.00')}</td>
                                                                    <td className="bowl-stat-cell" style={{ textAlign: 'center' }}>{b.dots ?? 0}</td>
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

                                        {/* 3. Fall of Wickets Section */}
                                        {fallOfWickets.length > 0 && (
                                            <div className="fow-card right-col-fow">
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

                                        {/* 4. Full Live Commentary Section */}
                                        <div className="commentary-full-card">
                                            <div className="comm-top-header">
                                                <h3 className="comm-header-title">
                                                    <MdTimeline /> Ball by Ball Live Commentary • <span style={{ color: '#00e5ff', fontWeight: 600 }}>{activeInningsTab === firstBatTeamKey ? '1st Innings' : '2nd Innings'} ({tabBattingTeam.name || 'Batting Side'})</span>
                                                </h3>
                                                <span className="comm-count-tag">
                                                    {filteredCommentary.length} {filteredCommentary.length === 1 ? 'Delivery' : 'Deliveries'}
                                                    {selectedOverFilter !== 'all' ? ` (Over ${selectedOverFilter})` : ' Recorded'}
                                                </span>
                                            </div>

                                            {/* Over Filter Bar: Custom Entry Over Number OR All Overs Option */}
                                            <div className="comm-over-filter-bar">
                                                <div className="comm-filter-controls">
                                                    <button
                                                        type="button"
                                                        className={`comm-over-pill all-pill ${!isFilteredByOver ? 'active' : ''}`}
                                                        onClick={() => setSelectedOverFilter('all')}
                                                    >
                                                        All Overs
                                                    </button>

                                                    <div className="comm-custom-over-box">
                                                        <span className="comm-custom-label">Custom Over:</span>
                                                        <div className="comm-custom-input-wrap">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max="50"
                                                                placeholder="Over #"
                                                                className="comm-custom-over-input"
                                                                value={selectedOverFilter === 'all' ? '' : selectedOverFilter}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.trim();
                                                                    setSelectedOverFilter(val === '' ? 'all' : val);
                                                                }}
                                                            />
                                                            {isFilteredByOver && (
                                                                <button
                                                                    type="button"
                                                                    className="comm-clear-filter-btn"
                                                                    onClick={() => setSelectedOverFilter('all')}
                                                                    title="Clear filter (Show All Overs)"
                                                                >
                                                                    <MdClose />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {availableOvers.length > 0 && (
                                                    <div className="comm-over-pills-scroll">
                                                        {availableOvers.map((ov) => (
                                                            <button
                                                                key={ov}
                                                                type="button"
                                                                className={`comm-over-pill ${selectedOverFilter === String(ov) ? 'active' : ''}`}
                                                                onClick={() => setSelectedOverFilter(String(ov))}
                                                            >
                                                                Ov {ov}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="comm-feed-list">
                                                {filteredCommentary.length > 0 ? (
                                                    filteredCommentary.map((c, idx) => {
                                                        const meta = getDeliveryMeta(c);
                                                        const broadcastCommentary = formatRealCommentary(c);
                                                        return (
                                                            <div key={c._id || idx} className={`comm-stream-item ${meta.type}`}>
                                                                <div className="comm-token-col">
                                                                    <span className={`comm-ball-token ${meta.type} len-${String(meta.label).length}`}>
                                                                        {meta.label}
                                                                    </span>
                                                                    <span className="comm-ov-num">{c.over || c.ball || `${idx + 1}`}</span>
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
                                                        <p>
                                                            {selectedOverFilter !== 'all'
                                                                ? `No deliveries recorded in Over ${selectedOverFilter}.`
                                                                : 'Ball-by-ball stream will appear here as deliveries are recorded.'}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: MATCH INFO & ROSTERS */}
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

                                    {/* Playing XI & Reserve Rosters */}
                                    {(() => {
                                        const t1Roster = resolveTeamRoster(team1, t1Name);
                                        const t2Roster = resolveTeamRoster(team2, t2Name);

                                        return (
                                            <div className="rosters-comparison-grid">
                                                {/* Team 1 Squad */}
                                                <div className="roster-col">
                                                    <div className="roster-header">
                                                        {t1Logo && <img src={t1Logo} alt={t1Name} className="roster-logo" />}
                                                        <div className="roster-header-info">
                                                            <h4>{t1Name} Squad</h4>
                                                            <span className="roster-header-meta">
                                                                {t1Roster.playingXI.length} XI • {t1Roster.reserves.length} Reserves
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Section 1: Playing XI */}
                                                    <div className="roster-section-group">
                                                        <div className="roster-section-heading xi">
                                                            <div className="r-sec-title">
                                                                <MdGroups className="r-sec-icon" />
                                                                <span>Playing XI</span>
                                                                <span className="r-count-pill xi">{t1Roster.playingXI.length}</span>
                                                            </div>
                                                            <span className="r-sec-tag">Active Lineup</span>
                                                        </div>
                                                        <ul className="roster-list">
                                                            {t1Roster.playingXI.map((player, pIdx) => renderRosterItem(player, t1Name, pIdx, false))}
                                                        </ul>
                                                    </div>

                                                    {/* Section 2: Bench & Reserves */}
                                                    <div className="roster-section-group">
                                                        <div className="roster-section-heading reserve">
                                                            <div className="r-sec-title">
                                                                <MdShield className="r-sec-icon" />
                                                                <span>Bench &amp; Reserves</span>
                                                                <span className="r-count-pill reserve">{t1Roster.reserves.length}</span>
                                                            </div>
                                                            <span className="r-sec-tag">Substitutes</span>
                                                        </div>
                                                        {t1Roster.reserves.length === 0 ? (
                                                            <div className="roster-empty-reserves">
                                                                <span>No reserve players registered on standby</span>
                                                            </div>
                                                        ) : (
                                                            <ul className="roster-list">
                                                                {t1Roster.reserves.map((player, pIdx) => renderRosterItem(player, t1Name, pIdx, true))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Team 2 Squad */}
                                                <div className="roster-col">
                                                    <div className="roster-header">
                                                        {t2Logo && <img src={t2Logo} alt={t2Name} className="roster-logo" />}
                                                        <div className="roster-header-info">
                                                            <h4>{t2Name} Squad</h4>
                                                            <span className="roster-header-meta">
                                                                {t2Roster.playingXI.length} XI • {t2Roster.reserves.length} Reserves
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Section 1: Playing XI */}
                                                    <div className="roster-section-group">
                                                        <div className="roster-section-heading xi">
                                                            <div className="r-sec-title">
                                                                <MdGroups className="r-sec-icon" />
                                                                <span>Playing XI</span>
                                                                <span className="r-count-pill xi">{t2Roster.playingXI.length}</span>
                                                            </div>
                                                            <span className="r-sec-tag">Active Lineup</span>
                                                        </div>
                                                        <ul className="roster-list">
                                                            {t2Roster.playingXI.map((player, pIdx) => renderRosterItem(player, t2Name, pIdx, false))}
                                                        </ul>
                                                    </div>

                                                    {/* Section 2: Bench & Reserves */}
                                                    <div className="roster-section-group">
                                                        <div className="roster-section-heading reserve">
                                                            <div className="r-sec-title">
                                                                <MdShield className="r-sec-icon" />
                                                                <span>Bench &amp; Reserves</span>
                                                                <span className="r-count-pill reserve">{t2Roster.reserves.length}</span>
                                                            </div>
                                                            <span className="r-sec-tag">Substitutes</span>
                                                        </div>
                                                        {t2Roster.reserves.length === 0 ? (
                                                            <div className="roster-empty-reserves">
                                                                <span>No reserve players registered on standby</span>
                                                            </div>
                                                        ) : (
                                                            <ul className="roster-list">
                                                                {t2Roster.reserves.map((player, pIdx) => renderRosterItem(player, t2Name, pIdx, true))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Wagon Wheel Modal rendered into document.body to sit above all fixed headers */}
            {showWagonWheel && createPortal(
                <div className="wagon-modal-overlay" onClick={() => setShowWagonWheel(false)}>
                    <div className="wagon-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="wagon-modal-header">
                            <h2 className="wagon-modal-title">Wagon Wheel Shot Chart</h2>
                            <button
                                className="wagon-modal-close"
                                onClick={() => setShowWagonWheel(false)}
                                aria-label="Close Wagon Wheel"
                            >
                                <MdClose />
                            </button>
                        </div>
                        <WagonWheel
                            shots={wagonShots}
                            batsmanName={selectedBatsmanForWagon?.name}
                            batsmanHand={selectedBatsmanForWagon?.hand || 'Right Hand'}
                            size={340}
                        />
                    </div>
                </div>,
                document.body
            )}

            <Footer />
        </div>
    );
};

export default LiveScore3D;
