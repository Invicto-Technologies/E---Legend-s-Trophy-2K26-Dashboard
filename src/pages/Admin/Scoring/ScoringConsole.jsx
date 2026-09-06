import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import ToastNotification from '../../../components/common/ToastNotification';
import Footer from '../../../components/common/Footer/Footer';
import {
    subscribeFixtures,
    subscribeMatch,
    subscribeTeams,
    updateMatchData,
    setMatchData,
    getMatchData,
    updateLiveData,
    saveFinishedMatch,
    resolveTournamentKey,
    subscribeActiveTournament,
    resolveTournamentLabels
} from '../../../services/rtdbService';
import {
    MdUndo,
    MdSwapHoriz,
    MdCheckCircle,
    MdPlayArrow,
    MdSportsCricket,
    MdWarning,
    MdArrowBack,
    MdEventNote,
    MdLocationOn,
    MdAccessTime,
    MdPieChart,
    MdClose,
    MdTimeline,
    MdEmojiEvents
} from 'react-icons/md';
import AdminSubNav from '../../../components/Navigation/AdminSubNav';
import { useAdminTournament } from '../../../contexts/AdminTournamentContext';
import './ScoringConsole.css';

const ScoringConsole = () => {
    const location = useLocation();
    const toastRef = useRef();
    const { selectedTournamentId } = useAdminTournament();

    // Query param match selection
    const queryParams = new URLSearchParams(location.search);
    const initialMatch = queryParams.get('match') || '';

    const [publishedMatches, setPublishedMatches] = useState([]);
    const [isDrawPublished, setIsDrawPublished] = useState(false);
    const [selectedMatchTitle, setSelectedMatchTitle] = useState(initialMatch);
    const [activeMatchTitle, setActiveMatchTitle] = useState('');
    const [isScoringActive, setIsScoringActive] = useState(false);
    const [isStartingMatch, setIsStartingMatch] = useState(false);
    const [matchData, setMatchData] = useState(null);
    const [activeTournament, setActiveTournament] = useState(null);

    // Active Innings Tab ('team1' or 'team2')
    const [activeInningsTab, setActiveInningsTab] = useState('team1');

    // Crease state
    const [strikerId, setStrikerId] = useState(null);
    const [nonStrikerId, setNonStrikerId] = useState(null);
    const [bowlerId, setBowlerId] = useState(null);

    // Wagon Wheel Modal State (for batsman stats inspection)
    const [showWWheelModal, setShowWWheelModal] = useState(false);
    const [selectedBatsmanForWheel, setSelectedBatsmanForWheel] = useState(null);

    // Shot placement during live scoring delivery
    const [showWagonPlacementModal, setShowWagonPlacementModal] = useState(false);
    const [pendingBallEvent, setPendingBallEvent] = useState(null);

    // Dismissal & Extras Modals
    const [showDismissalModal, setShowDismissalModal] = useState(false);
    const [dismissalType, setDismissalType] = useState('Caught');
    const [dismissalFielder, setDismissalFielder] = useState('');
    const [showExtrasModal, setShowExtrasModal] = useState(false);
    const [extraType, setExtraType] = useState('Wide');
    const [extraRuns, setExtraRuns] = useState(1);
    const [showFinishModal, setShowFinishModal] = useState(false);
    const [momSelection, setMomSelection] = useState('');

    // 15-step Undo History
    const [historyStack, setHistoryStack] = useState([]);
    const [teamsData, setTeamsData] = useState({});

    // Fetch teams
    useEffect(() => {
        const unsubTeams = subscribeTeams((teams) => {
            setTeamsData(teams || {});
        }, selectedTournamentId);
        const unsubTourney = subscribeActiveTournament((tourney) => {
            setActiveTournament(tourney);
        });
        return () => {
            unsubTeams();
            unsubTourney();
        };
    }, [selectedTournamentId]);

    // 1. Fetch published matches strictly from published draw
    useEffect(() => {
        const unsubFix = subscribeFixtures((data) => {
            const published = data?.isFixtures === 1;
            setIsDrawPublished(published);
            if (published && data?.finishedMatches) {
                const list = Array.isArray(data.finishedMatches)
                    ? data.finishedMatches.filter(Boolean)
                    : Object.values(data.finishedMatches).filter(Boolean);
                setPublishedMatches(list);

                if (initialMatch && list.some(m => m.title === initialMatch)) {
                    setSelectedMatchTitle(initialMatch);
                }
            } else {
                setPublishedMatches([]);
            }
        }, selectedTournamentId);

        return () => unsubFix();
    }, [selectedTournamentId, initialMatch]);

    // Helper to create a complete default match structure matching CricX/LiveScore schema
    const createDefaultMatch = (title, t1Name = 'Team 1', t2Name = 'Team 2') => {
        const t1Obj = teamsData[t1Name] || {};
        const t2Obj = teamsData[t2Name] || {};

        const buildPlayers = (teamObj, defaultPrefix) => {
            const result = {};
            const pList = Object.values(teamObj?.players || {});
            if (pList.length > 0) {
                pList.forEach((p, idx) => {
                    const pid = p.id || idx + 1;
                    result[pid] = {
                        id: pid,
                        name: p.name || `${defaultPrefix} Player ${idx + 1}`,
                        runs: p.runs || 0,
                        balls: p.balls || 0,
                        boundaries: { fours: p.fours || 0, sixes: p.sixes || 0, singles: 0, twos: 0 },
                        strikeRate: '0.00',
                        dismissal: '',
                        hand: p.hand || (idx % 3 === 0 ? 'Left Hand' : 'Right Hand'),
                        type: p.type || 'Playing XI',
                        shots: {}
                    };
                });
            } else {
                for (let i = 1; i <= 15; i++) {
                    result[i] = {
                        id: i,
                        name: `${defaultPrefix} Player ${i}`,
                        runs: 0,
                        balls: 0,
                        boundaries: { fours: 0, sixes: 0, singles: 0, twos: 0 },
                        strikeRate: '0.00',
                        dismissal: '',
                        hand: i % 4 === 0 ? 'Left Hand' : 'Right Hand',
                        type: i <= 11 ? 'Playing XI' : 'Reserve',
                        shots: {}
                    };
                }
            }
            return result;
        };

        const t1Players = buildPlayers(t1Obj, t1Name);
        const t2Players = buildPlayers(t2Obj, t2Name);

        const p1List = Object.values(t1Players);
        const p2List = Object.values(t2Players);

        return {
            common: {
                matchId: title,
                title: title,
                teams: `${t1Name} vs ${t2Name}`,
                firstBat: 1,
                firstBattingTeam: t1Name,
                overLimit: 15,
                status: 'Match In Progress',
                date: new Date().toLocaleDateString(),
                time: '10:00 AM',
                tossWinner: t1Name,
                tossDecision: 'bat',
                ballType: 'Hard Ball',
                finished: 0,
                result: ''
            },
            team1: {
                name: t1Name,
                totalRuns: 0,
                totalWickets: 0,
                totalBalls: 0,
                overs: 0,
                totalExtraAmount: 0,
                extraTypes: [],
                ballFaceBatsman: p1List[0] || null,
                otherSideBatsman: p1List[1] || null,
                players: t1Players,
                bowlers: {},
                currentPartnership: {
                    batsman1: p1List[0] || { name: 'Player 1' },
                    batsman2: p1List[1] || { name: 'Player 2' },
                    batsman1Runs: 0,
                    batsman1Balls: 0,
                    batsman2Runs: 0,
                    batsman2Balls: 0,
                    startScore: 0,
                    startBalls: 0
                },
                partnerships: {}
            },
            team2: {
                name: t2Name,
                totalRuns: 0,
                totalWickets: 0,
                totalBalls: 0,
                overs: 0,
                totalExtraAmount: 0,
                extraTypes: [],
                ballFaceBatsman: p2List[0] || null,
                otherSideBatsman: p2List[1] || null,
                players: t2Players,
                bowlers: {},
                currentPartnership: {
                    batsman1: p2List[0] || { name: 'Player 1' },
                    batsman2: p2List[1] || { name: 'Player 2' },
                    batsman1Runs: 0,
                    batsman1Balls: 0,
                    batsman2Runs: 0,
                    batsman2Balls: 0,
                    startScore: 0,
                    startBalls: 0
                },
                partnerships: {}
            },
            commentary: {}
        };
    };

    // 2. Subscribe to active match during live scoring
    useEffect(() => {
        if (!isScoringActive || !activeMatchTitle) return;

        const unsubMatch = subscribeMatch(activeMatchTitle, (data) => {
            if (data) {
                setMatchData(data);
                const currentBatting = data.common?.firstBat === 1 ? data.team1 : data.team2;
                const currentBowling = data.common?.firstBat === 1 ? data.team2 : data.team1;

                const bList = Object.values(currentBatting?.players || {});
                if (bList.length >= 2) {
                    if (!strikerId) setStrikerId(bList[0].id);
                    if (!nonStrikerId) setNonStrikerId(bList[1].id);
                }

                const bowlList = Object.values(currentBowling?.bowlers || currentBowling?.players || {});
                if (bowlList.length > 0 && !bowlerId) {
                    setBowlerId(bowlList[0].id);
                }
            } else {
                setMatchData(null);
            }
        }, selectedTournamentId);

        return () => unsubMatch();
    }, [isScoringActive, activeMatchTitle, selectedTournamentId, strikerId, nonStrikerId, bowlerId]);

    // Start or switch match scoring
    const handleStartScoring = async (overrideTitle) => {
        const targetTitle = typeof overrideTitle === 'string' ? overrideTitle : selectedMatchTitle;
        if (!targetTitle) {
            toastRef.current?.showToast('warning', 'Please select a match from the published draw first.');
            return;
        }

        const selectedFixture = publishedMatches.find(m => m.title === targetTitle);
        if (!selectedFixture) {
            toastRef.current?.showToast('error', 'Selected match is not in the published tournament draw.');
            return;
        }

        setIsStartingMatch(true);

        let t1 = selectedFixture.team1;
        let t2 = selectedFixture.team2;
        if (!t1 || !t2) {
            const parts = (selectedFixture.teams || '').split(' vs ');
            t1 = t1 || parts[0] || 'Team 1';
            t2 = t2 || parts[1] || 'Team 2';
        }

        try {
            let currentMatch = await getMatchData(targetTitle, selectedTournamentId);
            const hasValidPlayers = currentMatch?.team1?.players && Object.keys(currentMatch.team1.players).length > 0;

            if (!currentMatch || !hasValidPlayers) {
                const newMatch = createDefaultMatch(targetTitle, t1, t2);
                if (selectedFixture.date) newMatch.common.date = selectedFixture.date;
                if (selectedFixture.time) newMatch.common.time = selectedFixture.time;
                if (selectedFixture.venue) newMatch.common.venue = selectedFixture.venue;
                newMatch.common.status = 'Match In Progress';
                await setMatchData(targetTitle, newMatch, selectedTournamentId);
                currentMatch = newMatch;
            } else {
                if (currentMatch.common?.status === 'Match Scheduled' || !currentMatch.common?.status) {
                    currentMatch.common = currentMatch.common || {};
                    currentMatch.common.status = 'Match In Progress';
                    currentMatch.common.finished = 0;
                    await updateMatchData(targetTitle, {
                        'common/status': 'Match In Progress',
                        'common/finished': 0
                    }, selectedTournamentId);
                }
            }

            const targetKey = resolveTournamentKey(selectedTournamentId);
            const cleanTitle = targetTitle.replace(/^\//, '');
            await updateLiveData({
                isLive: 1,
                currentMatchPath: `Tournaments/${targetKey}/${cleanTitle}`,
                liveScore: {
                    matchTitle: targetTitle,
                    firstBat: currentMatch.common?.firstBat ?? 1,
                    status: `${t1} vs ${t2} • Match In Progress`,
                    team1: {
                        name: currentMatch.team1?.name || t1,
                        overs: currentMatch.team1?.overs ?? 0,
                        score: currentMatch.team1?.totalRuns ?? 0,
                        wicket: currentMatch.team1?.totalWickets ?? 0
                    },
                    team2: {
                        name: currentMatch.team2?.name || t2,
                        overs: currentMatch.team2?.overs ?? 0,
                        score: currentMatch.team2?.totalRuns ?? 0,
                        wicket: currentMatch.team2?.totalWickets ?? 0
                    }
                }
            });

            setActiveMatchTitle(targetTitle);
            setSelectedMatchTitle(targetTitle);
            setMatchData(currentMatch);
            setIsScoringActive(true);
            setHistoryStack([]);
            setActiveInningsTab(currentMatch.common?.firstBat === 1 ? 'team1' : 'team2');
            toastRef.current?.showToast('success', `Live scoring connected for ${targetTitle} (${t1} vs ${t2})!`);
        } catch (error) {
            console.error('Error starting match scoring:', error);
            toastRef.current?.showToast('error', 'Failed to initialize match scoring engine.');
        } finally {
            setIsStartingMatch(false);
        }
    };

    const selectedFixture = publishedMatches.find(m => m.title === selectedMatchTitle);
    const isMatchSelected = Boolean(selectedMatchTitle && selectedFixture);

    // =========================================================================
    // RENDER: LAUNCHPAD SCREEN (When scoring is not yet active)
    // =========================================================================
    if (!isScoringActive || !matchData) {
        return (
            <div className="scoring-console-page">
                <AdminSubNav />
                <ToastNotification ref={toastRef} />

                <div className="sc-launchpad-container">
                    <div className="sc-launchpad-header">
                        <span className="sc-tag">REAL-TIME BALL-BY-BALL SCORING ENGINE</span>
                        <h1 className="sc-title">Live Scoring Console</h1>
                        <p className="sc-launchpad-sub">
                            Select a fixture from the official published tournament draw to start live real-time scoring.
                        </p>
                    </div>

                    <div className="sc-launchpad-meta-row">
                        <div className="sc-meta-badge tournament-badge">
                            🏆 <strong>{selectedTournamentId}</strong>
                        </div>
                        <div className={`sc-meta-badge ${isDrawPublished && publishedMatches.length > 0 ? 'status-published' : 'status-unpublished'}`}>
                            {isDrawPublished && publishedMatches.length > 0
                                ? `✓ Draw Published (${publishedMatches.length} Fixtures Available)`
                                : '⚠ Draw Not Published'}
                        </div>
                    </div>

                    {!isDrawPublished || publishedMatches.length === 0 ? (
                        <div className="sc-draw-warning-card">
                            <div className="sc-warning-icon-wrap">
                                <MdWarning />
                            </div>
                            <h3>Tournament Draw Not Published</h3>
                            <p>
                                Live scoring is strictly linked to published fixtures. There are currently no published fixtures for <strong>{selectedTournamentId}</strong>.
                            </p>
                            <p className="sc-warning-hint">
                                Please navigate to <strong>Draw Management</strong> to generate, schedule, and publish the tournament draw first.
                            </p>
                            <Link to="/admin/draw" className="sc-go-to-draw-btn">
                                Go to Draw Management
                            </Link>
                        </div>
                    ) : (
                        <div className="sc-launchpad-card">
                            <div className="sc-card-top-header">
                                <MdSportsCricket className="sc-card-icon" />
                                <div>
                                    <h3>Select Match to Score</h3>
                                    <p>Choose any match from the published draw below to enable scoring.</p>
                                </div>
                            </div>

                            <div className="sc-dropdown-group">
                                <label htmlFor="sc-match-dropdown">Published Draw Matches:</label>
                                <select
                                    id="sc-match-dropdown"
                                    value={selectedMatchTitle}
                                    onChange={(e) => setSelectedMatchTitle(e.target.value)}
                                    className="sc-select-large"
                                >
                                    <option value="">-- Select Match from Published Draw --</option>
                                    {publishedMatches.map(m => {
                                        const scheduleInfo = m.date ? ` • ${m.date}${m.time ? ` at ${m.time}` : ''}` : '';
                                        return (
                                            <option key={m.id || m.title} value={m.title}>
                                                {m.title}: {m.teams}{scheduleInfo}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {selectedFixture && (
                                <div className="sc-fixture-preview-card">
                                    <div className="fpc-header">
                                        <span className="fpc-title-badge">{selectedFixture.title}</span>
                                        <span className="fpc-status-pill">{selectedFixture.score || selectedFixture.result || 'Scheduled'}</span>
                                    </div>
                                    <div className="fpc-matchup">
                                        <div className="fpc-team">
                                            <span className="fpc-team-name">{selectedFixture.team1 || selectedFixture.teams?.split(' vs ')[0] || 'Team 1'}</span>
                                        </div>
                                        <span className="fpc-vs">VS</span>
                                        <div className="fpc-team">
                                            <span className="fpc-team-name">{selectedFixture.team2 || selectedFixture.teams?.split(' vs ')[1] || 'Team 2'}</span>
                                        </div>
                                    </div>
                                    <div className="fpc-details-grid">
                                        <div className="fpc-detail-item">
                                            <MdEventNote />
                                            <span>{selectedFixture.date || 'Date Unscheduled'}</span>
                                        </div>
                                        <div className="fpc-detail-item">
                                            <MdAccessTime />
                                            <span>{selectedFixture.time || 'Time Unscheduled'}</span>
                                        </div>
                                        <div className="fpc-detail-item">
                                            <MdLocationOn />
                                            <span>{selectedFixture.venue || 'Faculty Cricket Grounds'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="sc-launch-actions">
                                <button
                                    id="btn-start-scoring"
                                    className={`sc-start-scoring-btn ${isMatchSelected ? 'enabled' : 'disabled'}`}
                                    disabled={!isMatchSelected || isStartingMatch}
                                    onClick={() => handleStartScoring()}
                                    title={!isMatchSelected ? 'Select a match from the published draw dropdown above to enable scoring' : `Start scoring ${selectedMatchTitle}`}
                                >
                                    {isMatchSelected ? <MdPlayArrow className="btn-icon" /> : <MdSportsCricket className="btn-icon" />}
                                    <span>
                                        {isStartingMatch
                                            ? 'Connecting Scoring Engine...'
                                            : isMatchSelected
                                                ? `Start Scoring: ${selectedMatchTitle}`
                                                : 'Select a Match to Enable Scoring'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <Footer />
            </div>
        );
    }

    // =========================================================================
    // LIVE MATCH DATA RESOLUTION (Exact structure & variables from LiveScore)
    // =========================================================================
    const { common = {}, team1 = {}, team2 = {} } = matchData;
    const [t1Name, t2Name] = (common.teams || 'Team 1 vs Team 2').split(' vs ');

    const isTeam1Batting = common.firstBat === 1;
    const currentBattingTeamKey = isTeam1Batting ? 'team1' : 'team2';
    const currentBowlingTeamKey = isTeam1Batting ? 'team2' : 'team1';

    // Active tab data
    const isTabTeam1 = activeInningsTab === 'team1';
    const battingTeamData = isTabTeam1 ? team1 : team2;
    const bowlingTeamData = isTabTeam1 ? team2 : team1;
    const battingTeamName = isTabTeam1 ? t1Name : t2Name;
    const bowlingTeamName = isTabTeam1 ? t2Name : t1Name;

    // Parse Batting Players
    const rawPlayersList = Object.values(battingTeamData.players || {});
    const playersList = rawPlayersList.map(p => {
        const teamObj = Object.values(teamsData || {}).find(t => t.name === battingTeamData.name);
        const squadPlayer = teamObj?.players?.[p.id] || Object.values(teamObj?.players || {}).find(sp => sp.nic === p.nic || sp.name === p.name);
        return {
            ...p,
            type: squadPlayer?.type || p.type || 'Playing XI',
            hand: squadPlayer?.hand || p.hand || 'Right Hand'
        };
    });
    const playingXI = playersList.filter(p => p.type === 'Playing XI' || !p.type);
    const reserves = playersList.filter(p => p.type === 'Reserve');

    // Parse Bowling Players
    const rawBowlingPlayersList = Object.values(bowlingTeamData.players || {});
    const bowlingPlayersList = rawBowlingPlayersList.map(p => {
        const teamObj = Object.values(teamsData || {}).find(t => t.name === bowlingTeamData.name);
        const squadPlayer = teamObj?.players?.[p.id] || Object.values(teamObj?.players || {}).find(sp => sp.nic === p.nic || sp.name === p.name);
        return {
            ...p,
            type: squadPlayer?.type || p.type || 'Playing XI',
            hand: squadPlayer?.hand || p.hand || 'Right Hand'
        };
    });
    const bowlingReserves = bowlingPlayersList.filter(p => p.type === 'Reserve');

    // Parse Bowlers
    const rawBowlersList = Object.values(bowlingTeamData.bowlers || {});
    const bowlersList = rawBowlersList.filter(b => {
        const teamObj = Object.values(teamsData || {}).find(t => t.name === bowlingTeamData.name);
        const squadPlayer = teamObj?.players?.[b.id] || Object.values(teamObj?.players || {}).find(sp => sp.nic === b.nic || sp.name === b.name);
        const type = b.type || squadPlayer?.type || 'Playing XI';
        return type === 'Playing XI';
    });

    // Partnerships
    const cp = battingTeamData.currentPartnership;
    const previousPartnerships = Object.values(battingTeamData.partnerships || {})
        .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

    // Active players on the crease for scoring
    const activeBattingSquad = Object.values(matchData[currentBattingTeamKey]?.players || {});
    const activeBowlingSquad = Object.values(matchData[currentBowlingTeamKey]?.bowlers || matchData[currentBowlingTeamKey]?.players || {});

    const striker = activeBattingSquad.find(p => p.id === strikerId) || activeBattingSquad[0] || { name: 'Striker', runs: 0, balls: 0, id: 1 };
    const nonStriker = activeBattingSquad.find(p => p.id === nonStrikerId) || activeBattingSquad[1] || { name: 'Non-Striker', runs: 0, balls: 0, id: 2 };
    const bowler = activeBowlingSquad.find(p => p.id === bowlerId) || activeBowlingSquad[0] || { name: 'Bowler', overs: 0, runs: 0, wickets: 0, id: 1 };

    // Commentary List
    const commentaryList = matchData.commentary
        ? Object.values(matchData.commentary).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        : [];

    // Overs string formatter
    const getOversString = (teamObj) => {
        if (!teamObj) return "0.0";
        if (teamObj.overs !== undefined && teamObj.overs !== null) return teamObj.overs;
        const balls = teamObj.totalBalls || 0;
        return `${Math.floor(balls / 6)}.${balls % 6}`;
    };

    // =========================================================================
    // WAGON WHEEL MATH & SVG GENERATION (From LiveScore.jsx)
    // =========================================================================
    const describeArc = (x, y, radius, startAngle, endAngle) => {
        const startX = x + radius * Math.cos((startAngle - 90) * Math.PI / 180);
        const startY = y + radius * Math.sin((startAngle - 90) * Math.PI / 180);
        const endX = x + radius * Math.cos((endAngle - 90) * Math.PI / 180);
        const endY = y + radius * Math.sin((endAngle - 90) * Math.PI / 180);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        return ["M", startX, startY, "A", radius, radius, 0, largeArcFlag, 1, endX, endY, "L", x, y, "Z"].join(" ");
    };

    const getLabelCoords = (x, y, radius, startAngle, endAngle) => {
        const midAngle = (startAngle + endAngle) / 2;
        const lx = x + radius * 0.7 * Math.cos((midAngle - 90) * Math.PI / 180);
        const ly = y + radius * 0.7 * Math.sin((midAngle - 90) * Math.PI / 180);
        return { x: lx, y: ly };
    };

    const getActiveSectors = (batsmanHand) => {
        if (batsmanHand === 'Left Hand') {
            return [
                { name: "Fine Leg", key: "FineLeg", startAngle: 0, endAngle: 45 },
                { name: "Square Leg", key: "SquareLeg", startAngle: 45, endAngle: 90 },
                { name: "Mid-wicket", key: "Midwicket", startAngle: 90, endAngle: 135 },
                { name: "Mid-on", key: "Midon", startAngle: 135, endAngle: 180 },
                { name: "Mid-off", key: "Midoff", startAngle: 180, endAngle: 225 },
                { name: "Cover", key: "Cover", startAngle: 225, endAngle: 270 },
                { name: "Point", key: "Point", startAngle: 270, endAngle: 315 },
                { name: "Third Man", key: "ThirdMan", startAngle: 315, endAngle: 360 }
            ];
        }
        return [
            { name: "Third Man", key: "ThirdMan", startAngle: 0, endAngle: 45 },
            { name: "Point", key: "Point", startAngle: 45, endAngle: 90 },
            { name: "Cover", key: "Cover", startAngle: 90, endAngle: 135 },
            { name: "Mid-off", key: "Midoff", startAngle: 135, endAngle: 180 },
            { name: "Mid-on", key: "Midon", startAngle: 180, endAngle: 225 },
            { name: "Mid-wicket", key: "Midwicket", startAngle: 225, endAngle: 270 },
            { name: "Square Leg", key: "SquareLeg", startAngle: 270, endAngle: 315 },
            { name: "Fine Leg", key: "FineLeg", startAngle: 315, endAngle: 360 }
        ];
    };

    const getZoneRuns = (zoneKey, player) => {
        if (!player) return 0;
        if (player.shots && player.shots[zoneKey]) {
            return player.shots[zoneKey].runs || 0;
        }
        return 0;
    };

    const getZoneShots = (zoneKey, player) => {
        if (!player) return 0;
        if (player.shots && player.shots[zoneKey]) {
            return player.shots[zoneKey].count || 0;
        }
        return 0;
    };

    const handleOpenWWheel = (player) => {
        setSelectedBatsmanForWheel(player);
        setShowWWheelModal(true);
    };

    // =========================================================================
    // SCORING ENGINE: BALL DELIVERY EXECUTION & HISTORY
    // =========================================================================
    const pushHistoryState = () => {
        setHistoryStack(prev => {
            const next = [JSON.parse(JSON.stringify(matchData)), ...prev];
            return next.slice(0, 15);
        });
    };

    const executeBallDelivery = async (ballEvent) => {
        pushHistoryState();

        const runs = ballEvent.runs || 0;
        const isExtra = Boolean(ballEvent.isExtra);
        const extraType = ballEvent.extraType || '';
        const isWicket = Boolean(ballEvent.isWicket);
        const wagonZone = ballEvent.wagonZone || 'Cover';

        const updated = JSON.parse(JSON.stringify(matchData));
        const bTeam = updated[currentBattingTeamKey];
        const bowlTeam = updated[currentBowlingTeamKey];

        // 1. Legal ball & totals
        const legalBall = !(extraType === 'Wide' || extraType === 'No Ball');
        if (legalBall) {
            bTeam.totalBalls = (bTeam.totalBalls || 0) + 1;
            const fullOvers = Math.floor(bTeam.totalBalls / 6);
            const ballInOver = bTeam.totalBalls % 6;
            bTeam.overs = Number(`${fullOvers}.${ballInOver}`);
        }

        bTeam.totalRuns = (bTeam.totalRuns || 0) + runs + (ballEvent.extraRuns || 0);

        if (isExtra) {
            bTeam.totalExtraAmount = (bTeam.totalExtraAmount || 0) + (ballEvent.extraRuns || 1);
            bTeam.extraTypes = bTeam.extraTypes || [];
            bTeam.extraTypes.push(`${ballEvent.extraRuns || 1}${extraType[0] || 'E'}`);
        }

        // 2. Striker stats & shots
        if (extraType !== 'Wide' && extraType !== 'Bye' && extraType !== 'Leg Bye') {
            const sPlayer = bTeam.players?.[striker.id];
            if (sPlayer) {
                sPlayer.runs = (sPlayer.runs || 0) + runs;
                if (legalBall) sPlayer.balls = (sPlayer.balls || 0) + 1;
                sPlayer.boundaries = sPlayer.boundaries || { fours: 0, sixes: 0, singles: 0, twos: 0 };
                if (runs === 4) sPlayer.boundaries.fours = (sPlayer.boundaries.fours || 0) + 1;
                if (runs === 6) sPlayer.boundaries.sixes = (sPlayer.boundaries.sixes || 0) + 1;
                if (runs === 1) sPlayer.boundaries.singles = (sPlayer.boundaries.singles || 0) + 1;
                if (runs === 2) sPlayer.boundaries.twos = (sPlayer.boundaries.twos || 0) + 1;
                sPlayer.strikeRate = Number(((sPlayer.runs / Math.max(1, sPlayer.balls)) * 100).toFixed(2));

                // Save shot zone
                sPlayer.shots = sPlayer.shots || {};
                sPlayer.shots[wagonZone] = sPlayer.shots[wagonZone] || { runs: 0, count: 0 };
                sPlayer.shots[wagonZone].runs += runs;
                sPlayer.shots[wagonZone].count += 1;
            }
        }

        // 3. Bowler stats
        const currentBowlerObj = bowlTeam.bowlers?.[bowler.id] || (bowlTeam.players?.[bowler.id] ? { ...bowlTeam.players[bowler.id], overs: 0, runs: 0, wickets: 0, balls: 0 } : null);
        if (currentBowlerObj) {
            if (legalBall) {
                currentBowlerObj.balls = (currentBowlerObj.balls || 0) + 1;
                const bOvers = Math.floor(currentBowlerObj.balls / 6);
                const bBalls = currentBowlerObj.balls % 6;
                currentBowlerObj.overs = Number(`${bOvers}.${bBalls}`);
            }
            if (extraType !== 'Bye' && extraType !== 'Leg Bye') {
                currentBowlerObj.runs = (currentBowlerObj.runs || 0) + runs + (ballEvent.extraRuns || 0);
            }
            if (isWicket && ballEvent.dismissalType !== 'Run Out') {
                currentBowlerObj.wickets = (currentBowlerObj.wickets || 0) + 1;
            }
            currentBowlerObj.economy = Number(((currentBowlerObj.runs / Math.max(0.1, (currentBowlerObj.balls || 1) / 6))).toFixed(2));
            bowlTeam.bowlers = bowlTeam.bowlers || {};
            bowlTeam.bowlers[bowler.id] = currentBowlerObj;
        }

        // 4. Update Current Partnership
        bTeam.currentPartnership = bTeam.currentPartnership || {
            batsman1: striker,
            batsman2: nonStriker,
            batsman1Runs: 0,
            batsman1Balls: 0,
            batsman2Runs: 0,
            batsman2Balls: 0,
            startScore: bTeam.totalRuns - runs,
            startBalls: bTeam.totalBalls - 1
        };

        bTeam.currentPartnership.batsman1Runs = (bTeam.currentPartnership.batsman1Runs || 0) + runs;
        if (legalBall) {
            bTeam.currentPartnership.batsman1Balls = (bTeam.currentPartnership.batsman1Balls || 0) + 1;
        }

        // 5. Handle Wicket
        if (isWicket) {
            bTeam.totalWickets = (bTeam.totalWickets || 0) + 1;
            const outPlayer = bTeam.players?.[ballEvent.dismissalBatterId || striker.id];
            if (outPlayer) {
                const dismissText = ballEvent.dismissalFielder
                    ? `c ${ballEvent.dismissalFielder} b ${bowler.name}`
                    : `b ${bowler.name} (${ballEvent.dismissalType})`;
                outPlayer.dismissal = dismissText;
            }

            // Save completed partnership to history
            bTeam.partnerships = bTeam.partnerships || {};
            const pIdx = Object.keys(bTeam.partnerships).length + 1;
            bTeam.partnerships[pIdx] = {
                batsman1: bTeam.currentPartnership.batsman1,
                batsman2: bTeam.currentPartnership.batsman2,
                runs: bTeam.totalRuns - (bTeam.currentPartnership.startScore || 0),
                balls: bTeam.totalBalls - (bTeam.currentPartnership.startBalls || 0),
                endScore: `${bTeam.totalRuns}/${bTeam.totalWickets}`,
                timestamp: new Date().toISOString()
            };

            // Select next batter
            const nextBatter = playingXI.find(p => p.id !== striker.id && p.id !== nonStriker.id && !p.dismissal);
            if (nextBatter) {
                setStrikerId(nextBatter.id);
                bTeam.currentPartnership = {
                    batsman1: nextBatter,
                    batsman2: nonStriker,
                    batsman1Runs: 0,
                    batsman1Balls: 0,
                    batsman2Runs: 0,
                    batsman2Balls: 0,
                    startScore: bTeam.totalRuns,
                    startBalls: bTeam.totalBalls
                };
            }
        }

        // 6. Strike rotation
        if (runs % 2 !== 0 && !isWicket) {
            const temp = strikerId;
            setStrikerId(nonStrikerId);
            setNonStrikerId(temp);
        }

        if (legalBall && bTeam.totalBalls % 6 === 0) {
            const temp = strikerId;
            setStrikerId(nonStrikerId);
            setNonStrikerId(temp);
            toastRef.current?.showToast('info', `Over ${Math.floor(bTeam.totalBalls / 6)} complete! Strike rotated.`);
        }

        // 7. Auto-Generate Ball-by-Ball Commentary
        const commTimestamp = Date.now();
        let commText = '';
        if (isWicket) {
            commText = `WICKET! ${striker.name} ${ballEvent.dismissalType} ${ballEvent.dismissalFielder ? 'by ' + ballEvent.dismissalFielder : ''}. Big moment for ${bTeam.name}!`;
        } else if (runs === 6) {
            commText = `SIX! Glorious strike by ${striker.name} soaring high over ${wagonZone}!`;
        } else if (runs === 4) {
            commText = `FOUR! Classical placement by ${striker.name} piercing the ${wagonZone} fence!`;
        } else if (isExtra) {
            commText = `${extraType}! ${ballEvent.extraRuns || 1} extra run(s) conceded by ${bowler.name}.`;
        } else if (runs === 0) {
            commText = `Dot ball. Crisp delivery by ${bowler.name} towards ${wagonZone}, no run conceded.`;
        } else {
            commText = `${runs} run(s) gathered by ${striker.name} towards ${wagonZone}.`;
        }

        updated.commentary = updated.commentary || {};
        updated.commentary[commTimestamp] = {
            id: commTimestamp,
            over: `${getOversString(bTeam)}`,
            runs,
            isWicket,
            isExtra,
            text: commText,
            timestamp: commTimestamp,
            batsman: striker.name,
            bowler: bowler.name,
            wagonZone
        };

        // Striker / Non-striker sync
        bTeam.ballFaceBatsman = bTeam.players?.[strikerId] || striker;
        bTeam.otherSideBatsman = bTeam.players?.[nonStrikerId] || nonStriker;
        bowlTeam.bowler = bowlTeam.bowlers?.[bowlerId] || bowler;

        setMatchData(updated);
        await updateMatchData(activeMatchTitle, updated, selectedTournamentId);

        // Sync with RTDB LiveData
        await updateLiveData({
            isLive: 1,
            currentMatchPath: activeMatchTitle,
            liveScore: {
                matchTitle: activeMatchTitle,
                firstBat: common.firstBat,
                status: `${striker.name} ${striker.runs}* | ${bowler.name} bowling`,
                team1: {
                    name: updated.team1?.name,
                    overs: updated.team1?.overs ?? 0,
                    score: updated.team1?.totalRuns ?? 0,
                    wicket: updated.team1?.totalWickets ?? 0
                },
                team2: {
                    name: updated.team2?.name,
                    overs: updated.team2?.overs ?? 0,
                    score: updated.team2?.totalRuns ?? 0,
                    wicket: updated.team2?.totalWickets ?? 0
                }
            }
        });

        toastRef.current?.showToast('success', `${runs} run(s) recorded (${wagonZone})`);
    };

    const handleScoreClick = (runs) => {
        if (runs >= 4 || runs === 1 || runs === 2) {
            setPendingBallEvent({ runs, isExtra: false, isWicket: false });
            setShowWagonPlacementModal(true);
        } else {
            executeBallDelivery({ runs, isExtra: false, isWicket: false, wagonZone: 'Cover' });
        }
    };

    const handleConfirmWagonPlacement = (zoneName) => {
        if (!pendingBallEvent) return;
        executeBallDelivery({ ...pendingBallEvent, wagonZone: zoneName });
        setPendingBallEvent(null);
        setShowWagonPlacementModal(false);
    };

    // Undo Ball
    const handleUndo = async () => {
        if (historyStack.length === 0) {
            toastRef.current?.showToast('warning', 'No previous balls in history to undo.');
            return;
        }

        const previousState = historyStack[0];
        setHistoryStack(prev => prev.slice(1));
        setMatchData(previousState);

        await updateMatchData(activeMatchTitle, previousState, selectedTournamentId);
        await updateLiveData({
            isLive: 1,
            currentMatchPath: activeMatchTitle,
            liveScore: {
                matchTitle: activeMatchTitle,
                firstBat: previousState.common?.firstBat,
                status: 'Ball undone by admin',
                team1: {
                    name: previousState.team1?.name,
                    overs: previousState.team1?.overs ?? 0,
                    score: previousState.team1?.totalRuns ?? 0,
                    wicket: previousState.team1?.totalWickets ?? 0
                },
                team2: {
                    name: previousState.team2?.name,
                    overs: previousState.team2?.overs ?? 0,
                    score: previousState.team2?.totalRuns ?? 0,
                    wicket: previousState.team2?.totalWickets ?? 0
                }
            }
        });

        toastRef.current?.showToast('info', 'Last ball delivery undone successfully.');
    };

    // Switch Innings
    const handleSwitchInnings = async () => {
        pushHistoryState();
        const nextBat = common.firstBat === 1 ? 2 : 1;
        const updated = {
            ...matchData,
            common: {
                ...matchData.common,
                firstBat: nextBat,
                status: `Innings break: ${nextBat === 1 ? team1.name : team2.name} batting`
            }
        };
        setMatchData(updated);
        setActiveInningsTab(nextBat === 1 ? 'team1' : 'team2');
        await updateMatchData(activeMatchTitle, updated, selectedTournamentId);
        toastRef.current?.showToast('success', 'Innings switched successfully!');
    };

    // Finish Match
    const handleFinishMatch = async () => {
        const t1Score = team1.totalRuns || 0;
        const t2Score = team2.totalRuns || 0;
        let resultString = '';
        if (t1Score > t2Score) {
            resultString = `${team1.name} won by ${t1Score - t2Score} runs`;
        } else if (t2Score > t1Score) {
            resultString = `${team2.name} won by ${10 - (team2.totalWickets || 0)} wickets`;
        } else {
            resultString = 'Match Tied';
        }

        const finishedMatchPayload = {
            ...matchData,
            common: {
                ...matchData.common,
                finished: 1,
                result: resultString,
                mom: momSelection || 'Match Hero',
                status: 'Match Completed'
            }
        };

        setMatchData(finishedMatchPayload);
        await updateMatchData(activeMatchTitle, finishedMatchPayload, selectedTournamentId);

        const fixtureId = Date.now();
        await saveFinishedMatch(fixtureId, {
            id: fixtureId,
            title: activeMatchTitle,
            teams: `${team1.name} vs ${team2.name}`,
            score: `${team1.name} ${t1Score}/${team1.totalWickets || 0} (${team1.overs || 0}) • ${team2.name} ${t2Score}/${team2.totalWickets || 0} (${team2.overs || 0})`,
            result: resultString,
            mom: momSelection || '',
            time: new Date().toISOString().split('T')[0]
        }, selectedTournamentId);

        await updateLiveData({
            isLive: 0,
            currentMatchPath: '',
            liveScore: null
        });

        setShowFinishModal(false);
        setIsScoringActive(false);
        setActiveMatchTitle('');
        setSelectedMatchTitle('');
        toastRef.current?.showToast('success', `Match finalized! ${resultString}`);
    };

    // =========================================================================
    // RENDER: LIVE SCORING CONSOLE (Using exact LiveScore structure & layout)
    // =========================================================================
    return (
        <div className="scoring-console-page cx-live-page">
            <AdminSubNav />
            <ToastNotification ref={toastRef} />

            <div className="cx-live-container">
                {/* Admin Header & Match Switcher Bar */}
                <div className="sc-console-top-bar">
                    <div className="sc-active-match-banner">
                        <span className="live-pulse-dot" />
                        <span className="sc-active-match-title">SCORING IN PROGRESS: <strong>{activeMatchTitle}</strong></span>
                    </div>

                    <div className="sc-console-switcher-group">
                        <select
                            id="header-match-select"
                            value={selectedMatchTitle}
                            onChange={(e) => setSelectedMatchTitle(e.target.value)}
                            className="sc-console-select"
                        >
                            <option value="" disabled>-- Switch Match --</option>
                            {publishedMatches.map(m => (
                                <option key={m.id || m.title} value={m.title}>
                                    {m.title}: {m.teams}
                                </option>
                            ))}
                        </select>
                        <button
                            className={`sc-console-btn switch-btn ${selectedMatchTitle && selectedMatchTitle !== activeMatchTitle ? 'active' : ''}`}
                            disabled={!selectedMatchTitle || selectedMatchTitle === activeMatchTitle || isStartingMatch}
                            onClick={() => handleStartScoring()}
                        >
                            <MdSportsCricket /> Switch
                        </button>
                        <button
                            className="sc-console-btn back-btn"
                            onClick={() => setIsScoringActive(false)}
                            title="Return to Match Launcher"
                        >
                            <MdArrowBack /> Launcher
                        </button>
                    </div>
                </div>

                {/* 1. Score Header Card (Matching LiveScore structure) */}
                <div className="cx-score-header-card">
                    <div className="cx-sh-top">
                        <span>{common.title} • {common.date}</span>
                        <span className={`cx-status-pill ${common.finished === 0 ? 'cx-live' : ''}`}>
                            {common.finished === 0 ? '● LIVE IN PROGRESS' : 'FINISHED'}
                        </span>
                    </div>

                    <div className="cx-score-display">
                        <div className={`cx-team-score ${isTeam1Batting ? 'active-bat' : ''}`}>
                            <h2>{t1Name}</h2>
                            <div className="cx-score-number">
                                {team1.totalRuns ?? 0}/{team1.totalWickets ?? 0}
                                <span>({getOversString(team1)} ov)</span>
                            </div>
                        </div>

                        <div className="cx-vs-divider">VS</div>

                        <div className={`cx-team-score cx-align-right ${!isTeam1Batting ? 'active-bat' : ''}`}>
                            <h2>{t2Name}</h2>
                            <div className="cx-score-number">
                                {team2.totalRuns ?? 0}/{team2.totalWickets ?? 0}
                                <span>({getOversString(team2)} ov)</span>
                            </div>
                        </div>
                    </div>

                    <div className="cx-match-status-text">
                        {common.result ? common.result : (common.status || `${striker.name} on strike | ${bowler.name} bowling`)}
                    </div>
                </div>

                {/* 4. Scrollable Ball to Ball Commentary (Directly under score card matching LiveScore) */}
                <div className="cx-commentary-section">
                    <div className="cx-commentary-header">
                        <div className="cx-commentary-title-wrap">
                            <MdTimeline className="comm-icon" />
                            <h3>Ball-by-Ball Commentary</h3>
                        </div>
                        <span className="comm-counter">{commentaryList.length} deliveries recorded</span>
                    </div>

                    <div className="cx-commentary-list-wrapper">
                        {commentaryList.length > 0 ? (
                            commentaryList.map((comm) => (
                                <div key={comm.id || comm.timestamp} className={`cx-comm-row ${comm.isWicket ? 'cx-comm-wicket' : ''} ${comm.runs >= 4 ? 'cx-comm-boundary' : ''}`}>
                                    <div className="cx-comm-over-badge">
                                        {comm.over}
                                    </div>
                                    <div className="cx-comm-text-side">
                                        <div className="cx-comm-indicators">
                                            {comm.isWicket && <span className="cx-badge-wicket">WICKET</span>}
                                            {comm.runs === 4 && <span className="cx-badge-four">FOUR (4)</span>}
                                            {comm.runs === 6 && <span className="cx-badge-six">SIX (6)</span>}
                                            {comm.isExtra && <span className="cx-badge-extra">EXTRA</span>}
                                            {comm.wagonZone && <span className="cx-badge-zone">{comm.wagonZone}</span>}
                                        </div>
                                        <p className="cx-comm-desc">{comm.text || comm.commentary}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="cx-no-commentary">Deliveries scored below will appear here in real-time.</div>
                        )}
                    </div>
                </div>

                {/* 2. Admin Live Scoring Keypad & Crease Control Panel */}
                <div className="sc-control-card">
                    <div className="sc-control-header">
                        <div className="sc-control-title">
                            <MdSportsCricket />
                            <h4>Live Match Scoring Pad</h4>
                        </div>
                        <div className="sc-control-actions">
                            <button className="sc-action-btn undo" onClick={handleUndo} title="Undo Last Delivery">
                                <MdUndo /> Undo Ball
                            </button>
                            <button className="sc-action-btn switch" onClick={handleSwitchInnings} title="Switch Batting Innings">
                                <MdSwapHoriz /> Switch Innings
                            </button>
                            <button className="sc-action-btn finish" onClick={() => setShowFinishModal(true)} title="Finalize Match">
                                <MdCheckCircle /> Finish Match
                            </button>
                        </div>
                    </div>

                    {/* Crease Selectors Grid */}
                    <div className="sc-crease-grid">
                        {/* Striker Select */}
                        <div className="sc-crease-box striker">
                            <span className="sc-crease-label">STRIKER (*)</span>
                            <select
                                value={striker.id}
                                onChange={(e) => setStrikerId(Number(e.target.value))}
                                className="sc-crease-select"
                            >
                                {activeBattingSquad.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.runs || 0}r, {p.balls || 0}b)
                                    </option>
                                ))}
                            </select>
                            <div className="sc-crease-stats">
                                <span>R: <strong>{striker.runs || 0}</strong></span>
                                <span>B: <strong>{striker.balls || 0}</strong></span>
                                <span>4s: <strong>{striker.boundaries?.fours || 0}</strong></span>
                                <span>6s: <strong>{striker.boundaries?.sixes || 0}</strong></span>
                                <span>SR: <strong>{striker.strikeRate || '0.00'}</strong></span>
                            </div>
                        </div>

                        {/* Non-Striker Select */}
                        <div className="sc-crease-box non-striker">
                            <span className="sc-crease-label">NON-STRIKER</span>
                            <select
                                value={nonStriker.id}
                                onChange={(e) => setNonStrikerId(Number(e.target.value))}
                                className="sc-crease-select"
                            >
                                {activeBattingSquad.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.runs || 0}r, {p.balls || 0}b)
                                    </option>
                                ))}
                            </select>
                            <div className="sc-crease-stats">
                                <span>R: <strong>{nonStriker.runs || 0}</strong></span>
                                <span>B: <strong>{nonStriker.balls || 0}</strong></span>
                                <span>4s: <strong>{nonStriker.boundaries?.fours || 0}</strong></span>
                                <span>6s: <strong>{nonStriker.boundaries?.sixes || 0}</strong></span>
                                <span>SR: <strong>{nonStriker.strikeRate || '0.00'}</strong></span>
                            </div>
                        </div>

                        {/* Bowler Select */}
                        <div className="sc-crease-box bowler">
                            <span className="sc-crease-label">ACTIVE BOWLER (🔴)</span>
                            <select
                                value={bowler.id}
                                onChange={(e) => setBowlerId(Number(e.target.value))}
                                className="sc-crease-select"
                            >
                                {activeBowlingSquad.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                            <div className="sc-crease-stats">
                                <span>Overs: <strong>{bowler.overs ?? 0}</strong></span>
                                <span>R: <strong>{bowler.runs ?? 0}</strong></span>
                                <span>W: <strong>{bowler.wickets ?? 0}</strong></span>
                                <span>Econ: <strong>{bowler.economy ?? '0.00'}</strong></span>
                            </div>
                        </div>
                    </div>

                    {/* Delivery Keypad */}
                    <div className="sc-keypad-section">
                        <div className="keypad-grid">
                            <button className="kp-btn dot" onClick={() => handleScoreClick(0)}>
                                0 <small>DOT</small>
                            </button>
                            <button className="kp-btn" onClick={() => handleScoreClick(1)}>
                                1 <small>SINGLE</small>
                            </button>
                            <button className="kp-btn" onClick={() => handleScoreClick(2)}>
                                2 <small>DOUBLE</small>
                            </button>
                            <button className="kp-btn" onClick={() => handleScoreClick(3)}>
                                3 <small>THREE</small>
                            </button>
                            <button className="kp-btn boundary-four" onClick={() => handleScoreClick(4)}>
                                4 <small>FOUR</small>
                            </button>
                            <button className="kp-btn boundary-six" onClick={() => handleScoreClick(6)}>
                                6 <small>SIX</small>
                            </button>

                            <button
                                className="kp-btn extra"
                                onClick={() => {
                                    setExtraType('Wide');
                                    setExtraRuns(1);
                                    setShowExtrasModal(true);
                                }}
                            >
                                WD <small>WIDE</small>
                            </button>
                            <button
                                className="kp-btn extra"
                                onClick={() => {
                                    setExtraType('No Ball');
                                    setExtraRuns(1);
                                    setShowExtrasModal(true);
                                }}
                            >
                                NB <small>NO BALL</small>
                            </button>
                            <button
                                className="kp-btn extra"
                                onClick={() => {
                                    setExtraType('Bye');
                                    setExtraRuns(1);
                                    setShowExtrasModal(true);
                                }}
                            >
                                BYE <small>BYE</small>
                            </button>
                            <button
                                className="kp-btn extra"
                                onClick={() => {
                                    setExtraType('Leg Bye');
                                    setExtraRuns(1);
                                    setShowExtrasModal(true);
                                }}
                            >
                                LB <small>LEG BYE</small>
                            </button>

                            <button
                                className="kp-btn wicket-btn"
                                onClick={() => setShowDismissalModal(true)}
                            >
                                W <small>WICKET</small>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. Innings Selection Tabs (Matching LiveScore structure) */}
                <div className="cx-innings-tabs">
                    <button
                        className={`cx-innings-tab-btn ${activeInningsTab === 'team1' ? 'active' : ''}`}
                        onClick={() => setActiveInningsTab('team1')}
                    >
                        {t1Name} Innings
                    </button>
                    <button
                        className={`cx-innings-tab-btn ${activeInningsTab === 'team2' ? 'active' : ''}`}
                        onClick={() => setActiveInningsTab('team2')}
                    >
                        {t2Name} Innings
                    </button>
                </div>

                {/* 4. Main Stats Content Grid (Matching LiveScore structure) */}
                <div className="cx-score-grid">
                    {/* LEFT COLUMN: Batting Scorecard and Bowling Overview */}
                    <div className="cx-main-stats">
                        {/* A. Batting Scorecard Panel */}
                        <div className="cx-glass-panel">
                            <div className="cx-panel-header-with-icon">
                                <h3>{battingTeamName} Batting Scorecard</h3>
                            </div>

                            <h4 className="cx-table-subtitle">Playing XI</h4>
                            <table className="cx-scorecard-table">
                                <thead>
                                    <tr>
                                        <th>Batter</th>
                                        <th className="text-center">R</th>
                                        <th className="text-center">B</th>
                                        <th className="text-center">4s</th>
                                        <th className="text-center">6s</th>
                                        <th className="text-center">SR</th>
                                        <th className="text-center">Shots</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {playingXI.length > 0 ? (
                                        playingXI.map(p => {
                                            const isStriker = battingTeamData.ballFaceBatsman && battingTeamData.ballFaceBatsman.id === p.id;
                                            const isNonStriker = battingTeamData.otherSideBatsman && battingTeamData.otherSideBatsman.id === p.id;
                                            const isCurrentlyBatting = isStriker || isNonStriker;
                                            const isOut = !!(p.dismissal && p.dismissal.trim() !== '' && !isCurrentlyBatting);
                                            return (
                                                <tr key={p.id} className={isCurrentlyBatting ? 'cx-row-active-batting' : ''} style={isOut ? { opacity: 0.55 } : {}}>
                                                    <td className="cx-player-name-cell">
                                                        <div className="cx-pname-line">
                                                            <strong>{p.name}</strong>
                                                            <span className={`cx-scorecard-player-hand ${p.hand === 'Left Hand' ? 'lhb' : 'rhb'}`}>
                                                                {p.hand === 'Left Hand' ? 'LHB' : 'RHB'}
                                                            </span>
                                                            {isStriker && <span className="cx-striker-symbol" title="On Strike">🏏</span>}
                                                        </div>
                                                        <div className="cx-dismissal-text">
                                                            {p.dismissal || (isCurrentlyBatting ? 'Not out' : (p.runs || p.balls ? 'Not out' : 'Yet to bat'))}
                                                        </div>
                                                    </td>
                                                    <td className="cx-stat-highlight text-center">{p.runs || 0}</td>
                                                    <td className="text-center">{p.balls || 0}</td>
                                                    <td className="text-center">{p.boundaries?.fours || 0}</td>
                                                    <td className="text-center">{p.boundaries?.sixes || 0}</td>
                                                    <td className="text-center">{p.strikeRate || '0.00'}</td>
                                                    <td className="text-center">
                                                        <button className="cx-btn-wagonwheel" onClick={() => handleOpenWWheel(p)}>
                                                            <MdPieChart /> Wheel
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="text-center text-muted">No playing XI players listed.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Reserve Players List */}
                            {reserves.length > 0 && (
                                <div className="cx-reserves-section-inline">
                                    <h4 className="cx-table-subtitle">Reserve Players</h4>
                                    <div className="cx-reserves-list-names">
                                        {reserves.map((p, idx) => (
                                            <span key={p.id} className="cx-reserve-tag">
                                                {p.name}{idx < reserves.length - 1 ? ',' : ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* B. Bowling Scorecard Panel */}
                        <div className="cx-glass-panel">
                            <div className="cx-panel-header-with-icon">
                                <h3>{bowlingTeamName} Bowling Overview</h3>
                            </div>

                            <table className="cx-scorecard-table">
                                <thead>
                                    <tr>
                                        <th>Bowler</th>
                                        <th className="text-center">Overs</th>
                                        <th className="text-center">Runs</th>
                                        <th className="text-center">Wickets</th>
                                        <th className="text-center">Econ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bowlersList.length > 0 ? (
                                        bowlersList.map(b => (
                                            <tr key={b.id} className={matchData[currentBowlingTeamKey]?.bowler?.id === b.id ? 'cx-row-active-bowling' : ''}>
                                                <td className="cx-player-name-cell">
                                                    <strong>{b.name}</strong>
                                                    {matchData[currentBowlingTeamKey]?.bowler?.id === b.id && <span className="active-bowler-dot" title="Active Bowler">🔴</span>}
                                                </td>
                                                <td className="text-center">{b.overs || '0.0'}</td>
                                                <td className="text-center">{b.runs || 0}</td>
                                                <td className="cx-stat-highlight text-center">{b.wickets || 0}</td>
                                                <td className="text-center">{b.economy || '0.00'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="text-center text-muted">No bowlers recorded yet for this innings.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Bowling Reserves List */}
                            {bowlingReserves.length > 0 && (
                                <div className="cx-reserves-section-inline">
                                    <h4 className="cx-table-subtitle">Reserve Players</h4>
                                    <div className="cx-reserves-list-names">
                                        {bowlingReserves.map((p, idx) => (
                                            <span key={p.id} className="cx-reserve-tag">
                                                {p.name}{idx < bowlingReserves.length - 1 ? ',' : ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Partnerships & Match Info */}
                    <div className="cx-side-stats">
                        {/* A. Current Partnership Card */}
                        <div className="cx-glass-panel">
                            <div className="cx-panel-header-with-icon">
                                <h3 className="text-center">Current Partnership</h3>
                            </div>
                            {cp && cp.batsman1 ? (
                                <div className="cx-partnership-stats-box">
                                    <div className="cx-psb-total">
                                        <span className="cx-psb-total-runs">{(battingTeamData.totalRuns || 0) - (cp.startScore || 0)} runs</span>
                                        <span className="cx-psb-total-balls">({(battingTeamData.totalBalls || 0) - (cp.startBalls || 0)} balls)</span>
                                    </div>
                                    <div className="cx-psb-batters">
                                        <div className="cx-psb-batter">
                                            <span className="cx-psb-name">{cp.batsman1.name}</span>
                                            <span className="cx-psb-run">{cp.batsman1Runs || 0} R ({cp.batsman1Balls || 0} B)</span>
                                        </div>
                                        <div className="cx-psb-divider">&</div>
                                        <div className="cx-psb-batter">
                                            <span className="cx-psb-name">{cp.batsman2.name}</span>
                                            <span className="cx-psb-run">{cp.batsman2Runs || 0} R ({cp.batsman2Balls || 0} B)</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="cx-no-partnership">No active partnership.</div>
                            )}
                        </div>

                        {/* B. Partnership History Card */}
                        <div className="cx-glass-panel">
                            <div className="cx-panel-header-with-icon">
                                <h3 className="text-center">Partnership History</h3>
                            </div>
                            <div className="cx-partnership-history-list">
                                {previousPartnerships.length > 0 ? (
                                    previousPartnerships.map((p, idx) => (
                                        <div key={idx} className="cx-history-item">
                                            <div className="cx-hi-wicket">Wkt {idx + 1}</div>
                                            <div className="cx-hi-details">
                                                <div className="cx-hi-names">{p.batsman1?.name} & {p.batsman2?.name}</div>
                                                <div className="cx-hi-stats">
                                                    <strong>{p.runs} runs</strong> ({p.balls} balls) • Score: {p.endScore}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="cx-no-partnership-history">No wickets fallen in this innings yet.</div>
                                )}
                            </div>
                        </div>

                        {/* C. Match Info Card */}
                        <div className="cx-glass-panel">
                            <div className="cx-panel-header-with-icon">
                                <h3 className="text-center">Match Info</h3>
                            </div>
                            <div className="cx-info-row">
                                <span>Toss</span>
                                <span className="cx-info-val">
                                    {common.tossWinner
                                        ? `${common.tossWinner} elected to ${common.tossDecision || 'bat'}`
                                        : 'Toss Pending'}
                                </span>
                            </div>
                            <div className="cx-info-row">
                                <span>Venue</span>
                                <span className="cx-info-val">{common.venue || 'Faculty Cricket Grounds'}</span>
                            </div>
                            <div className="cx-info-row">
                                <span>Overs Limit</span>
                                <span className="cx-info-val">{common.overLimit || 15} Overs T20</span>
                            </div>
                            <div className="cx-info-row">
                                <span>Ball Type</span>
                                <span className="cx-info-val">{common.ballType || 'Hard Ball'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ============================================================= */}
                {/* 5. WAGON WHEEL MODAL (Exact SVG Sector Generator from LiveScore) */}
                {/* ============================================================= */}
                {showWWheelModal && selectedBatsmanForWheel && (() => {
                    const activeSectors = getActiveSectors(selectedBatsmanForWheel.hand || 'Right Hand');
                    const maxZoneRuns = Math.max(...activeSectors.map(s => getZoneRuns(s.key, selectedBatsmanForWheel)), 1);

                    return (
                        <div className="cx-ww-modal-backdrop" onClick={() => setShowWWheelModal(false)}>
                            <div className="cx-ww-modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="cx-ww-modal-header">
                                    <div>
                                        <h3>{selectedBatsmanForWheel.name}'s Shot Zone Analysis</h3>
                                        <p className="cx-ww-modal-sub">
                                            {selectedBatsmanForWheel.hand || 'Right Hand'} Batsman • Visual Wagon Wheel
                                        </p>
                                    </div>
                                    <button className="cx-btn-close-ww" onClick={() => setShowWWheelModal(false)}>
                                        <MdClose />
                                    </button>
                                </div>

                                <div className="cx-ww-modal-body">
                                    {/* SVG Cricket Field Wagon Wheel */}
                                    <div className="cx-ww-field-container">
                                        <svg viewBox="0 0 300 300" className="cx-ww-svg">
                                            <circle cx="150" cy="150" r="140" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />
                                            <rect x="145" y="120" width="10" height="60" fill="#f59e0b" opacity="0.5" rx="2" />

                                            {activeSectors.map((s) => {
                                                const pathData = describeArc(150, 150, 130, s.startAngle, s.endAngle);
                                                const textCoords = getLabelCoords(150, 150, 130, s.startAngle, s.endAngle);
                                                const runs = getZoneRuns(s.key, selectedBatsmanForWheel);
                                                const intensity = runs > 0 ? 0.25 + (runs / maxZoneRuns) * 0.65 : 0.06;

                                                return (
                                                    <g key={s.key} className="cx-ww-sector-group">
                                                        <path
                                                            d={pathData}
                                                            fill={`rgba(0, 240, 255, ${intensity})`}
                                                            stroke="rgba(255, 255, 255, 0.12)"
                                                            strokeWidth="1.5"
                                                            className="cx-ww-sector-path"
                                                        />
                                                        <text
                                                            x={textCoords.x}
                                                            y={textCoords.y}
                                                            textAnchor="middle"
                                                            alignmentBaseline="middle"
                                                            className="cx-ww-sector-label"
                                                            fill={runs > 0 ? '#ffffff' : 'rgba(255, 255, 255, 0.45)'}
                                                        >
                                                            {s.name}
                                                        </text>
                                                        <text
                                                            x={textCoords.x}
                                                            y={textCoords.y + 13}
                                                            textAnchor="middle"
                                                            alignmentBaseline="middle"
                                                            className="cx-ww-sector-runs"
                                                            fill="#00f0ff"
                                                        >
                                                            {runs > 0 ? `${runs} runs` : ''}
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                        </svg>
                                    </div>

                                    {/* Shot Statistics Breakdown List */}
                                    <div className="cx-ww-stats-list">
                                        <h4>Zone Summary Breakdown</h4>
                                        <div className="cx-ww-summary-rows">
                                            {activeSectors.map(s => {
                                                const runs = getZoneRuns(s.key, selectedBatsmanForWheel);
                                                const count = getZoneShots(s.key, selectedBatsmanForWheel);
                                                return (
                                                    <div key={s.key} className="cx-ww-summary-row">
                                                        <span>{s.name}</span>
                                                        <span><strong>{runs} runs</strong> ({count} shots)</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* SHOT PLACEMENT QUICK MODAL (Triggered when recording runs) */}
                {showWagonPlacementModal && pendingBallEvent && (
                    <div className="sc-modal-overlay" onClick={() => setShowWagonPlacementModal(false)}>
                        <div className="sc-modal-card" onClick={(e) => e.stopPropagation()}>
                            <h3>Select Shot Placement Zone</h3>
                            <p className="sc-modal-sub">{striker.name} • {pendingBallEvent.runs} run(s)</p>

                            <div className="sc-zone-buttons-grid">
                                {['Third Man', 'Point', 'Cover', 'Mid-off', 'Mid-on', 'Mid-wicket', 'Square Leg', 'Fine Leg'].map(z => (
                                    <button
                                        key={z}
                                        className="sc-zone-btn"
                                        onClick={() => handleConfirmWagonPlacement(z)}
                                    >
                                        {z}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* DISMISSAL MODAL */}
                {showDismissalModal && (
                    <div className="sc-modal-overlay" onClick={() => setShowDismissalModal(false)}>
                        <div className="sc-modal-card" onClick={(e) => e.stopPropagation()}>
                            <h3 className="danger-title">Record Dismissal / Wicket</h3>

                            <div className="sc-form-group">
                                <label>Dismissal Type</label>
                                <select
                                    value={dismissalType}
                                    onChange={(e) => setDismissalType(e.target.value)}
                                    className="sc-modal-select"
                                >
                                    <option value="Caught">Caught</option>
                                    <option value="Bowled">Bowled</option>
                                    <option value="Run Out">Run Out</option>
                                    <option value="LBW">LBW</option>
                                    <option value="Stumped">Stumped</option>
                                    <option value="Hit Wicket">Hit Wicket</option>
                                </select>
                            </div>

                            {dismissalType === 'Caught' && (
                                <div className="sc-form-group">
                                    <label>Fielder</label>
                                    <select
                                        value={dismissalFielder}
                                        onChange={(e) => setDismissalFielder(e.target.value)}
                                        className="sc-modal-select"
                                    >
                                        <option value="">Select Fielder...</option>
                                        {bowlingPlayersList.map(p => (
                                            <option key={p.id} value={p.name}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="sc-modal-actions">
                                <button className="cx-btn-secondary" onClick={() => setShowDismissalModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    className="cx-btn-confirm danger"
                                    onClick={() => {
                                        setShowDismissalModal(false);
                                        executeBallDelivery({
                                            runs: 0,
                                            isWicket: true,
                                            dismissalType,
                                            dismissalFielder,
                                            dismissalBatterId: striker.id,
                                            wagonZone: 'Point'
                                        });
                                    }}
                                >
                                    Confirm Wicket
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* EXTRAS MODAL */}
                {showExtrasModal && (
                    <div className="sc-modal-overlay" onClick={() => setShowExtrasModal(false)}>
                        <div className="sc-modal-card" onClick={(e) => e.stopPropagation()}>
                            <h3>Record Extra Delivery</h3>

                            <div className="sc-form-group">
                                <label>Extra Type</label>
                                <select
                                    value={extraType}
                                    onChange={(e) => setExtraType(e.target.value)}
                                    className="sc-modal-select"
                                >
                                    <option value="Wide">Wide</option>
                                    <option value="No Ball">No Ball</option>
                                    <option value="Bye">Bye</option>
                                    <option value="Leg Bye">Leg Bye</option>
                                </select>
                            </div>

                            <div className="sc-form-group">
                                <label>Total Extra Runs</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="7"
                                    value={extraRuns}
                                    onChange={(e) => setExtraRuns(Number(e.target.value))}
                                    className="sc-modal-input"
                                />
                            </div>

                            <div className="sc-modal-actions">
                                <button className="cx-btn-secondary" onClick={() => setShowExtrasModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    className="cx-btn-confirm primary"
                                    onClick={() => {
                                        setShowExtrasModal(false);
                                        executeBallDelivery({
                                            runs: 0,
                                            isExtra: true,
                                            extraType,
                                            extraRuns
                                        });
                                    }}
                                >
                                    Confirm Extra
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* FINISH MATCH MODAL */}
                {showFinishModal && (
                    <div className="sc-modal-overlay" onClick={() => setShowFinishModal(false)}>
                        <div className="sc-modal-card" onClick={(e) => e.stopPropagation()}>
                            <h3>Finalize Match & Save Results</h3>
                            <p className="sc-modal-sub">
                                {team1.name} ({team1.totalRuns}/{team1.totalWickets}) vs {team2.name} ({team2.totalRuns}/{team2.totalWickets})
                            </p>

                            <div className="sc-form-group">
                                <label>Player of the Match (PoTM)</label>
                                <select
                                    value={momSelection}
                                    onChange={(e) => setMomSelection(e.target.value)}
                                    className="sc-modal-select"
                                >
                                    <option value="">Select PoTM...</option>
                                    {[...playingXI, ...bowlingPlayersList].map((p, idx) => (
                                        <option key={idx} value={p.name}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="sc-modal-actions">
                                <button className="cx-btn-secondary" onClick={() => setShowFinishModal(false)}>
                                    Cancel
                                </button>
                                <button className="cx-btn-confirm primary" onClick={handleFinishMatch}>
                                    Declare Result
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default ScoringConsole;
