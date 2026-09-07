import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import ToastNotification from '../../../components/common/ToastNotification';
import Footer from '../../../components/common/Footer/Footer';
import {
    subscribeFixtures,
    subscribeMatch,
    subscribeTeams,
    subscribeLiveData,
    updateMatchData,
    setMatchData as setRtdbMatchData,
    getMatchData,
    updateLiveData,
    saveFinishedMatch,
    resolveTournamentKey
} from '../../../services/rtdbService';
import {
    MdUndo,
    MdSwapHoriz,
    MdCheckCircle,
    MdPlayArrow,
    MdSportsCricket,
    MdWarning,
    MdEventNote,
    MdLocationOn,
    MdAccessTime,
    MdPieChart,
    MdClose,
    MdTimeline,
    MdKeyboardArrowDown,
    MdCheck,
    MdEdit,
    MdDirectionsRun,
    MdSportsBaseball,
    MdTrackChanges,
    MdTimer
} from 'react-icons/md';
import { GiCricketBat } from 'react-icons/gi';
import { FaCoins, FaTrophy } from 'react-icons/fa6';
import AdminSubNav from '../../../components/Navigation/AdminSubNav';
import { useAdminTournament } from '../../../contexts/AdminTournamentContext';
import WagonWheel from '../../../components/3D/WagonWheel';
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
    const userClosedLauncherRef = useRef(false);

    // Published Matches Target-Tournament Style Dropdown State
    const [isMatchDropdownOpen, setIsMatchDropdownOpen] = useState(false);
    const matchDropdownRef = useRef(null);

    // Toss & Match Start Setup Modal State
    const [showTossModal, setShowTossModal] = useState(false);
    const [isEditingTossOnly, setIsEditingTossOnly] = useState(false);
    const [tossWinner, setTossWinner] = useState('');
    const [tossDecision, setTossDecision] = useState('bat');
    const [tossOverLimit, setTossOverLimit] = useState(15);
    const [pendingStartFixture, setPendingStartFixture] = useState(null);

    // Opening Crease Players for Match Start Setup
    const [openingStrikerId, setOpeningStrikerId] = useState(null);
    const [openingNonStrikerId, setOpeningNonStrikerId] = useState(null);
    const [openingBowlerId, setOpeningBowlerId] = useState(null);

    // Close Published Matches Dropdown on click outside or Escape
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (matchDropdownRef.current && !matchDropdownRef.current.contains(event.target)) {
                setIsMatchDropdownOpen(false);
            }
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsMatchDropdownOpen(false);
            }
        };
        if (isMatchDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMatchDropdownOpen]);

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
    const [selectedShotZone, setSelectedShotZone] = useState(null);
    const [showWagonPlacementModal, setShowWagonPlacementModal] = useState(false);
    const [pendingBallEvent, setPendingBallEvent] = useState(null);

    // Dismissal & Extras Modals
    const [showDismissalModal, setShowDismissalModal] = useState(false);
    const [dismissalType, setDismissalType] = useState('Caught');
    const [dismissalFielder, setDismissalFielder] = useState('');
    const [dismissalBatterId, setDismissalBatterId] = useState(null);
    const [showExtrasModal, setShowExtrasModal] = useState(false);
    const [extraType, setExtraType] = useState('Wide');
    const [extraRuns, setExtraRuns] = useState(0);
    const [showFinishModal, setShowFinishModal] = useState(false);
    const [showUndoConfirmModal, setShowUndoConfirmModal] = useState(false);
    const [momSelection, setMomSelection] = useState('');

    // Next Bowler Modal State (Compulsory after over finishes)
    const [showNextBowlerModal, setShowNextBowlerModal] = useState(false);
    const [selectedNextBowlerId, setSelectedNextBowlerId] = useState('');
    const [completedOverNumber, setCompletedOverNumber] = useState(0);
    const [lastBowlerId, setLastBowlerId] = useState(null);

    // Embedded Wheeler / Inline Config Panel Mode ('wheeler' | 'extras' | 'wicket')
    const [inlinePanelMode, setInlinePanelMode] = useState('wheeler');

    const handleOpenInlineExtra = (type) => {
        setExtraType(type);
        setExtraRuns(0); // 0 additional runs by default
        setInlinePanelMode('extras');
    };

    const handleOpenInlineWicket = (type) => {
        setDismissalType(type);
        setDismissalFielder('');
        setDismissalBatterId(strikerId);
        setInlinePanelMode('wicket');
    };

    // 15-step Undo History
    const [historyStack, setHistoryStack] = useState([]);
    const [teamsData, setTeamsData] = useState({});

    // Fetch teams
    useEffect(() => {
        const unsubTeams = subscribeTeams((teams) => {
            setTeamsData(teams || {});
        }, selectedTournamentId);
        return () => unsubTeams();
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

    // 1b. Automatically redirect to active match scoring board if a match is live in this tournament
    useEffect(() => {
        const unsubLive = subscribeLiveData((data) => {
            if (data?.isLive && !userClosedLauncherRef.current) {
                const liveTitle = data.currentMatchPath
                    ? data.currentMatchPath.split('/').pop()
                    : data.liveScore?.matchTitle;

                if (liveTitle && (!isScoringActive || activeMatchTitle !== liveTitle)) {
                    setActiveMatchTitle(liveTitle);
                    setSelectedMatchTitle(liveTitle);
                    setIsScoringActive(true);
                }
            }
        });

        return () => unsubLive();
    }, [isScoringActive, activeMatchTitle]);

    // Helper to retrieve structured squad player list for a team
    const getTeamPlayerList = (teamName) => {
        if (!teamName) return [];
        const teamObj = teamsData[teamName] || Object.values(teamsData || {}).find(t => t.name === teamName) || {};
        const rawList = Object.values(teamObj.players || {});
        if (rawList.length > 0) {
            return rawList.map((p, idx) => ({
                id: p.id || idx + 1,
                name: p.name || `${teamName} Player ${idx + 1}`,
                hand: p.hand || 'Right Hand',
                type: p.type || 'Playing XI'
            }));
        }
        return Array.from({ length: 11 }, (_, i) => ({
            id: i + 1,
            name: `${teamName} Player ${i + 1}`,
            hand: i % 4 === 0 ? 'Left Hand' : 'Right Hand',
            type: 'Playing XI'
        }));
    };

    // Helper to create a complete default match structure matching CricX/LiveScore schema
    const createDefaultMatch = (title, t1Name = 'Team 1', t2Name = 'Team 2', tossConfig = {}) => {
        const {
            tossWinner = t1Name,
            tossDecision = 'bat',
            firstBat = 1,
            firstBattingTeam = t1Name,
            overLimit = 15,
            status = 'Match In Progress',
            strikerId: chosenStrikerId,
            nonStrikerId: chosenNonStrikerId,
            bowlerId: chosenBowlerId
        } = tossConfig;

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

        // Resolve opening batsman and opening bowler according to firstBat
        let t1BallFace = p1List[0] || null;
        let t1OtherSide = p1List[1] || null;
        let t1Bowler = null;
        let t1BowlersDict = {};

        let t2BallFace = p2List[0] || null;
        let t2OtherSide = p2List[1] || null;
        let t2Bowler = null;
        let t2BowlersDict = {};

        if (firstBat === 1) {
            // Team 1 Batting First
            t1BallFace = (chosenStrikerId && t1Players[chosenStrikerId]) || p1List[0] || null;
            t1OtherSide = (chosenNonStrikerId && t1Players[chosenNonStrikerId]) || p1List[1] || p1List[0] || null;
            t2Bowler = (chosenBowlerId && t2Players[chosenBowlerId]) || p2List[0] || null;
            if (t2Bowler) {
                t2BowlersDict[t2Bowler.id] = {
                    id: t2Bowler.id,
                    name: t2Bowler.name,
                    overs: 0,
                    runs: 0,
                    wickets: 0,
                    economy: '0.00'
                };
            }
        } else {
            // Team 2 Batting First
            t2BallFace = (chosenStrikerId && t2Players[chosenStrikerId]) || p2List[0] || null;
            t2OtherSide = (chosenNonStrikerId && t2Players[chosenNonStrikerId]) || p2List[1] || p2List[0] || null;
            t1Bowler = (chosenBowlerId && t1Players[chosenBowlerId]) || p1List[0] || null;
            if (t1Bowler) {
                t1BowlersDict[t1Bowler.id] = {
                    id: t1Bowler.id,
                    name: t1Bowler.name,
                    overs: 0,
                    runs: 0,
                    wickets: 0,
                    economy: '0.00'
                };
            }
        }

        return {
            common: {
                matchId: title,
                title: title,
                teams: `${t1Name} vs ${t2Name}`,
                firstBat: firstBat,
                firstBattingTeam: firstBattingTeam,
                overLimit: overLimit,
                status: status || `${tossWinner} won toss & elected to ${tossDecision} first`,
                date: new Date().toLocaleDateString(),
                time: '10:00 AM',
                tossWinner: tossWinner,
                tossDecision: tossDecision,
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
                ballFaceBatsman: t1BallFace,
                otherSideBatsman: t1OtherSide,
                players: t1Players,
                bowler: t1Bowler,
                bowlers: t1BowlersDict,
                currentPartnership: {
                    batsman1: t1BallFace || { name: 'Player 1' },
                    batsman2: t1OtherSide || { name: 'Player 2' },
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
                ballFaceBatsman: t2BallFace,
                otherSideBatsman: t2OtherSide,
                players: t2Players,
                bowler: t2Bowler,
                bowlers: t2BowlersDict,
                currentPartnership: {
                    batsman1: t2BallFace || { name: 'Player 1' },
                    batsman2: t2OtherSide || { name: 'Player 2' },
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

    // 1. Initiate start or switch match scoring -> Triggers Toss Setup Modal
    const handleInitiateStartScoring = async (overrideTitle) => {
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

        let t1 = selectedFixture.team1;
        let t2 = selectedFixture.team2;
        if (!t1 || !t2) {
            const parts = (selectedFixture.teams || '').split(' vs ');
            t1 = t1 || parts[0] || 'Team 1';
            t2 = t2 || parts[1] || 'Team 2';
        }

        // Check if match already has saved toss in RTDB
        let existingWinner = t1;
        let existingDecision = 'bat';
        let existingOvers = selectedFixture.overLimit || 15;
        let existingStriker = null;
        let existingNonStriker = null;
        let existingBowler = null;

        try {
            const currentMatch = await getMatchData(targetTitle, selectedTournamentId);
            if (currentMatch?.common) {
                if (currentMatch.common.tossWinner) existingWinner = currentMatch.common.tossWinner;
                if (currentMatch.common.tossDecision) existingDecision = currentMatch.common.tossDecision;
                if (currentMatch.common.overLimit) existingOvers = currentMatch.common.overLimit;

                const isT1B = currentMatch.common.firstBat === 1;
                const bKey = isT1B ? 'team1' : 'team2';
                const bowlKey = isT1B ? 'team2' : 'team1';
                existingStriker = currentMatch[bKey]?.ballFaceBatsman?.id;
                existingNonStriker = currentMatch[bKey]?.otherSideBatsman?.id;
                existingBowler = currentMatch[bowlKey]?.bowler?.id;
            }
        } catch (err) {
            console.warn('Could not fetch existing match for toss prefill:', err);
        }

        const isT1BatFirst = (existingWinner === t1 && existingDecision === 'bat') || (existingWinner === t2 && existingDecision === 'bowl');
        const batTeamName = isT1BatFirst ? t1 : t2;
        const bowlTeamName = isT1BatFirst ? t2 : t1;
        const batList = getTeamPlayerList(batTeamName);
        const bowlList = getTeamPlayerList(bowlTeamName);

        setPendingStartFixture({
            ...selectedFixture,
            team1: t1,
            team2: t2,
            targetTitle: targetTitle
        });
        setTossWinner(existingWinner);
        setTossDecision(existingDecision);
        setTossOverLimit(existingOvers);

        setOpeningStrikerId(existingStriker || batList[0]?.id || 1);
        setOpeningNonStrikerId(existingNonStriker || batList[1]?.id || batList[0]?.id || 2);
        setOpeningBowlerId(existingBowler || bowlList[0]?.id || 1);

        setIsEditingTossOnly(false);
        setShowTossModal(true);
    };

    // 2. Open Toss Modal for currently active match (Edit Toss from Match Info)
    const handleOpenEditTossModal = () => {
        if (!matchData) return;
        const currentCommon = matchData.common || {};
        let [t1, t2] = (currentCommon.teams || '').split(' vs ');
        t1 = matchData.team1?.name || t1 || 'Team 1';
        t2 = matchData.team2?.name || t2 || 'Team 2';

        const isT1Bat = (currentCommon.tossWinner === t1 && currentCommon.tossDecision === 'bat') || (currentCommon.tossWinner === t2 && currentCommon.tossDecision === 'bowl');
        const bKey = isT1Bat ? 'team1' : 'team2';
        const bowlKey = isT1Bat ? 'team2' : 'team1';
        const batSquad = getTeamPlayerList(isT1Bat ? t1 : t2);
        const bowlSquad = getTeamPlayerList(isT1Bat ? t2 : t1);

        setPendingStartFixture({
            title: activeMatchTitle,
            targetTitle: activeMatchTitle,
            team1: t1,
            team2: t2,
            teams: currentCommon.teams || `${t1} vs ${t2}`,
            overLimit: currentCommon.overLimit || 15
        });
        setTossWinner(currentCommon.tossWinner || t1);
        setTossDecision(currentCommon.tossDecision || 'bat');
        setTossOverLimit(currentCommon.overLimit || 15);
        setOpeningStrikerId(matchData[bKey]?.ballFaceBatsman?.id || strikerId || batSquad[0]?.id || 1);
        setOpeningNonStrikerId(matchData[bKey]?.otherSideBatsman?.id || nonStrikerId || batSquad[1]?.id || 2);
        setOpeningBowlerId(matchData[bowlKey]?.bowler?.id || bowlerId || bowlSquad[0]?.id || 1);
        setIsEditingTossOnly(true);
        setShowTossModal(true);
    };

    // Handle interactive toggle in Toss Modal
    const handleSelectTossWinner = (winner) => {
        setTossWinner(winner);
        if (!pendingStartFixture) return;
        const t1 = pendingStartFixture.team1;
        const t2 = pendingStartFixture.team2;
        const isT1Bat = (winner === t1 && tossDecision === 'bat') || (winner === t2 && tossDecision === 'bowl');
        const batList = getTeamPlayerList(isT1Bat ? t1 : t2);
        const bowlList = getTeamPlayerList(isT1Bat ? t2 : t1);
        setOpeningStrikerId(batList[0]?.id || 1);
        setOpeningNonStrikerId(batList[1]?.id || batList[0]?.id || 2);
        setOpeningBowlerId(bowlList[0]?.id || 1);
    };

    const handleSelectTossDecision = (decision) => {
        setTossDecision(decision);
        if (!pendingStartFixture) return;
        const t1 = pendingStartFixture.team1;
        const t2 = pendingStartFixture.team2;
        const isT1Bat = (tossWinner === t1 && decision === 'bat') || (tossWinner === t2 && decision === 'bowl');
        const batList = getTeamPlayerList(isT1Bat ? t1 : t2);
        const bowlList = getTeamPlayerList(isT1Bat ? t2 : t1);
        setOpeningStrikerId(batList[0]?.id || 1);
        setOpeningNonStrikerId(batList[1]?.id || batList[0]?.id || 2);
        setOpeningBowlerId(bowlList[0]?.id || 1);
    };

    // 3. Confirm Toss & Execute Match Launch or Update
    const handleConfirmTossAndStart = async () => {
        if (!pendingStartFixture) return;
        const fixture = pendingStartFixture;
        const targetTitle = fixture.targetTitle || fixture.title;
        const t1 = fixture.team1;
        const t2 = fixture.team2;

        const isT1BattingFirst = (tossWinner === t1 && tossDecision === 'bat') || (tossWinner === t2 && tossDecision === 'bowl');
        const firstBat = isT1BattingFirst ? 1 : 2;
        const firstBattingTeam = isT1BattingFirst ? t1 : t2;
        const oversNum = Number(tossOverLimit) || 15;
        const tossStatusText = `${tossWinner} won toss & elected to ${tossDecision} first`;

        setShowTossModal(false);

        if (isEditingTossOnly && activeMatchTitle) {
            try {
                const bKey = firstBat === 1 ? 'team1' : 'team2';
                const bowlKey = firstBat === 1 ? 'team2' : 'team1';
                const bSquad = Object.values(matchData?.[bKey]?.players || {});
                const bowlSquad = Object.values(matchData?.[bowlKey]?.bowlers || matchData?.[bowlKey]?.players || {});
                const newStriker = bSquad.find(p => String(p.id) === String(openingStrikerId)) || bSquad[0];
                const newNonStriker = bSquad.find(p => String(p.id) === String(openingNonStrikerId)) || bSquad[1];
                const newBowler = bowlSquad.find(p => String(p.id) === String(openingBowlerId)) || bowlSquad[0];

                const updates = {
                    'common/tossWinner': tossWinner,
                    'common/tossDecision': tossDecision,
                    'common/firstBat': firstBat,
                    'common/firstBattingTeam': firstBattingTeam,
                    'common/overLimit': oversNum,
                    'common/status': tossStatusText
                };
                if (newStriker) {
                    updates[`${bKey}/ballFaceBatsman`] = newStriker;
                    setStrikerId(newStriker.id);
                }
                if (newNonStriker) {
                    updates[`${bKey}/otherSideBatsman`] = newNonStriker;
                    setNonStrikerId(newNonStriker.id);
                }
                if (newBowler) {
                    updates[`${bowlKey}/bowler`] = newBowler;
                    updates[`${bowlKey}/bowlers/${newBowler.id}`] = newBowler;
                    setBowlerId(newBowler.id);
                }

                await updateMatchData(activeMatchTitle, updates, selectedTournamentId);

                const targetKey = resolveTournamentKey(selectedTournamentId);
                const cleanTitle = activeMatchTitle.replace(/^\//, '');
                await updateLiveData({
                    isLive: 1,
                    currentMatchPath: `Tournaments/${targetKey}/${cleanTitle}`,
                    liveScore: {
                        matchTitle: activeMatchTitle,
                        firstBat: firstBat,
                        status: `${t1} vs ${t2} • ${tossStatusText}`,
                        team1: {
                            name: matchData?.team1?.name || t1,
                            overs: matchData?.team1?.overs ?? 0,
                            score: matchData?.team1?.totalRuns ?? 0,
                            wicket: matchData?.team1?.totalWickets ?? 0
                        },
                        team2: {
                            name: matchData?.team2?.name || t2,
                            overs: matchData?.team2?.overs ?? 0,
                            score: matchData?.team2?.totalRuns ?? 0,
                            wicket: matchData?.team2?.totalWickets ?? 0
                        }
                    }
                });

                toastRef.current?.showToast('success', `Toss updated: ${tossWinner} elected to ${tossDecision} first.`);
            } catch (err) {
                console.error('Error updating toss details:', err);
                toastRef.current?.showToast('error', 'Failed to update toss information.');
            }
            return;
        }

        // Otherwise, launching match scoring engine
        await executeStartScoring(targetTitle, {
            tossWinner,
            tossDecision,
            firstBat,
            firstBattingTeam,
            overLimit: oversNum,
            tossStatusText,
            t1,
            t2,
            fixture,
            strikerId: openingStrikerId,
            nonStrikerId: openingNonStrikerId,
            bowlerId: openingBowlerId
        });
    };

    // 4. Execute Start Scoring Engine
    const executeStartScoring = async (targetTitle, tossConfig) => {
        setIsStartingMatch(true);
        const {
            tossWinner,
            tossDecision,
            firstBat,
            firstBattingTeam,
            overLimit,
            tossStatusText,
            t1,
            t2,
            fixture,
            strikerId: chosenStrikerId,
            nonStrikerId: chosenNonStrikerId,
            bowlerId: chosenBowlerId
        } = tossConfig;

        try {
            let currentMatch = await getMatchData(targetTitle, selectedTournamentId);
            const hasValidPlayers = currentMatch?.team1?.players && Object.keys(currentMatch.team1.players).length > 0;

            if (!currentMatch || !hasValidPlayers) {
                const newMatch = createDefaultMatch(targetTitle, t1, t2, {
                    tossWinner,
                    tossDecision,
                    firstBat,
                    firstBattingTeam,
                    overLimit,
                    status: tossStatusText,
                    strikerId: chosenStrikerId,
                    nonStrikerId: chosenNonStrikerId,
                    bowlerId: chosenBowlerId
                });
                if (fixture?.date) newMatch.common.date = fixture.date;
                if (fixture?.time) newMatch.common.time = fixture.time;
                if (fixture?.venue) newMatch.common.venue = fixture.venue;
                newMatch.common.status = tossStatusText;
                newMatch.common.finished = 0;
                await setRtdbMatchData(targetTitle, newMatch, selectedTournamentId);
                currentMatch = newMatch;
            } else {
                const bKey = firstBat === 1 ? 'team1' : 'team2';
                const bowlKey = firstBat === 1 ? 'team2' : 'team1';
                const bSquad = Object.values(currentMatch[bKey]?.players || {});
                const bowlSquad = Object.values(currentMatch[bowlKey]?.bowlers || currentMatch[bowlKey]?.players || {});

                const selStriker = bSquad.find(p => String(p.id) === String(chosenStrikerId)) || bSquad[0] || { name: 'Striker', id: chosenStrikerId || 1 };
                const selNonStriker = bSquad.find(p => String(p.id) === String(chosenNonStrikerId)) || bSquad[1] || { name: 'Non-Striker', id: chosenNonStrikerId || 2 };
                const selBowler = bowlSquad.find(p => String(p.id) === String(chosenBowlerId)) || bowlSquad[0] || { name: 'Opening Bowler', id: chosenBowlerId || 1 };

                currentMatch.common = currentMatch.common || {};
                currentMatch.common.tossWinner = tossWinner;
                currentMatch.common.tossDecision = tossDecision;
                currentMatch.common.firstBat = firstBat;
                currentMatch.common.firstBattingTeam = firstBattingTeam;
                currentMatch.common.overLimit = overLimit;
                currentMatch.common.status = tossStatusText;
                currentMatch.common.finished = 0;

                currentMatch[bKey].ballFaceBatsman = selStriker;
                currentMatch[bKey].otherSideBatsman = selNonStriker;
                currentMatch[bKey].currentPartnership = {
                    batsman1: selStriker,
                    batsman2: selNonStriker,
                    batsman1Runs: 0,
                    batsman1Balls: 0,
                    batsman2Runs: 0,
                    batsman2Balls: 0,
                    startScore: 0,
                    startBalls: 0
                };

                currentMatch[bowlKey].bowler = selBowler;
                currentMatch[bowlKey].bowlers = currentMatch[bowlKey].bowlers || {};
                currentMatch[bowlKey].bowlers[selBowler.id] = currentMatch[bowlKey].bowlers[selBowler.id] || {
                    id: selBowler.id,
                    name: selBowler.name,
                    overs: 0,
                    runs: 0,
                    wickets: 0,
                    economy: '0.00'
                };

                await updateMatchData(targetTitle, {
                    'common/tossWinner': tossWinner,
                    'common/tossDecision': tossDecision,
                    'common/firstBat': firstBat,
                    'common/firstBattingTeam': firstBattingTeam,
                    'common/overLimit': overLimit,
                    'common/status': tossStatusText,
                    'common/finished': 0,
                    [`${bKey}/ballFaceBatsman`]: selStriker,
                    [`${bKey}/otherSideBatsman`]: selNonStriker,
                    [`${bKey}/currentPartnership`]: currentMatch[bKey].currentPartnership,
                    [`${bowlKey}/bowler`]: selBowler,
                    [`${bowlKey}/bowlers/${selBowler.id}`]: currentMatch[bowlKey].bowlers[selBowler.id]
                }, selectedTournamentId);
            }

            const activeStrikerObj = currentMatch[firstBat === 1 ? 'team1' : 'team2']?.ballFaceBatsman || { name: 'Striker', id: chosenStrikerId };
            const activeNonStrikerObj = currentMatch[firstBat === 1 ? 'team1' : 'team2']?.otherSideBatsman || { name: 'Non-Striker', id: chosenNonStrikerId };
            const activeBowlerObj = currentMatch[firstBat === 1 ? 'team2' : 'team1']?.bowler || { name: 'Bowler', id: chosenBowlerId };

            setStrikerId(activeStrikerObj.id);
            setNonStrikerId(activeNonStrikerObj.id);
            setBowlerId(activeBowlerObj.id);

            const targetKey = resolveTournamentKey(selectedTournamentId);
            const cleanTitle = targetTitle.replace(/^\//, '');
            await updateLiveData({
                isLive: 1,
                currentMatchPath: `Tournaments/${targetKey}/${cleanTitle}`,
                liveScore: {
                    matchTitle: targetTitle,
                    firstBat: firstBat,
                    status: `${t1} vs ${t2} • ${activeStrikerObj.name} & ${activeNonStrikerObj.name} batting, ${activeBowlerObj.name} bowling`,
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

            userClosedLauncherRef.current = false;
            setActiveMatchTitle(targetTitle);
            setSelectedMatchTitle(targetTitle);
            setMatchData(currentMatch);
            setIsScoringActive(true);
            setHistoryStack([]);
            setActiveInningsTab(firstBat === 1 ? 'team1' : 'team2');
            toastRef.current?.showToast('success', `Live scoring connected! ${activeStrikerObj.name} on strike.`);
        } catch (error) {
            console.error('Error starting match scoring:', error);
            toastRef.current?.showToast('error', 'Failed to initialize match scoring engine.');
        } finally {
            setIsStartingMatch(false);
        }
    };


    const selectedFixture = publishedMatches.find(m => m.title === selectedMatchTitle);
    const isMatchSelected = Boolean(selectedMatchTitle && selectedFixture);

    // Render Toss Setup & Inning Assignment Modal
    const renderTossModal = () => {
        if (!showTossModal || !pendingStartFixture) return null;

        let t1 = pendingStartFixture.team1;
        let t2 = pendingStartFixture.team2;
        if (!t1 || !t2) {
            const parts = (pendingStartFixture.teams || '').split(' vs ');
            t1 = t1 || parts[0] || 'Team 1';
            t2 = t2 || parts[1] || 'Team 2';
        }

        const t1Obj = teamsData[t1] || {};
        const t2Obj = teamsData[t2] || {};
        const t1Logo = t1Obj.logo || t1Obj.crest || t1Obj.logoUrl;
        const t2Logo = t2Obj.logo || t2Obj.crest || t2Obj.logoUrl;

        const isT1BattingFirst = (tossWinner === t1 && tossDecision === 'bat') || (tossWinner === t2 && tossDecision === 'bowl');
        const battingTeamName = isT1BattingFirst ? t1 : t2;
        const bowlingTeamName = isT1BattingFirst ? t2 : t1;

        const battingSquad = getTeamPlayerList(battingTeamName);
        const bowlingSquad = getTeamPlayerList(bowlingTeamName);

        const currentStriker = battingSquad.find(p => String(p.id) === String(openingStrikerId)) || battingSquad[0];
        const currentNonStriker = battingSquad.find(p => String(p.id) === String(openingNonStrikerId)) || battingSquad[1] || battingSquad[0];
        const currentBowler = bowlingSquad.find(p => String(p.id) === String(openingBowlerId)) || bowlingSquad[0];

        return (
            <div className="sc-toss-modal-overlay" onClick={() => setShowTossModal(false)}>
                <div className="sc-toss-modal-card" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="sc-toss-modal-header">
                        <div className="sc-toss-header-left">
                            <div className="sc-toss-header-icon-bubble">
                                <FaCoins />
                            </div>
                            <div>
                                <div className="sc-toss-super-badge">
                                    <FaCoins className="sc-toss-badge-icon" /> OFFICIAL MATCH TOSS &amp; INNINGS SETUP
                                </div>
                                <h3>{isEditingTossOnly ? 'Edit Match Toss & Crease Settings' : 'Match Toss & Innings Setup'}</h3>
                                <span className="sc-toss-match-subtitle">
                                    {pendingStartFixture.title} • {t1} vs {t2}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="sc-toss-close-btn"
                            onClick={() => setShowTossModal(false)}
                            title="Close Modal"
                        >
                            <MdClose />
                        </button>
                    </div>

                    <div className="sc-toss-modal-body">
                        {/* 1. Who Won Coin Toss */}
                        <div className="sc-toss-section">
                            <div className="sc-toss-section-header">
                                <span className="sc-toss-step-num">01</span>
                                <div className="sc-toss-step-title-wrap">
                                    <span className="sc-toss-step-title">Who won the coin toss?</span>
                                    <span className="sc-toss-step-hint">Select the winning captain's team</span>
                                </div>
                            </div>
                            <div className="sc-toss-team-cards-grid">
                                <button
                                    type="button"
                                    className={`sc-toss-team-card ${tossWinner === t1 ? 'selected' : ''}`}
                                    onClick={() => handleSelectTossWinner(t1)}
                                >
                                    <div className="sc-toss-team-icon-bubble">
                                        {t1Logo ? (
                                            <img src={t1Logo} alt={t1} className="sc-toss-team-logo-img" onError={(e) => { e.target.style.display = 'none'; }} />
                                        ) : (
                                            <span className="sc-toss-team-fallback-text">{t1.substring(0, 3).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="sc-toss-team-details">
                                        <span className="sc-toss-team-title">{t1}</span>
                                        <span className="sc-toss-team-sub">
                                            {tossWinner === t1 ? (
                                                <span className="sc-toss-winner-tag">
                                                    <FaCoins className="sc-winner-coin-icon" /> Toss Winner
                                                </span>
                                            ) : (
                                                'Opponent Team'
                                            )}
                                        </span>
                                    </div>
                                    <div className="sc-toss-card-radio">
                                        {tossWinner === t1 ? <MdCheckCircle className="sc-toss-card-check" /> : <div className="sc-toss-card-uncheck" />}
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    className={`sc-toss-team-card ${tossWinner === t2 ? 'selected' : ''}`}
                                    onClick={() => handleSelectTossWinner(t2)}
                                >
                                    <div className="sc-toss-team-icon-bubble">
                                        {t2Logo ? (
                                            <img src={t2Logo} alt={t2} className="sc-toss-team-logo-img" onError={(e) => { e.target.style.display = 'none'; }} />
                                        ) : (
                                            <span className="sc-toss-team-fallback-text">{t2.substring(0, 3).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="sc-toss-team-details">
                                        <span className="sc-toss-team-title">{t2}</span>
                                        <span className="sc-toss-team-sub">
                                            {tossWinner === t2 ? (
                                                <span className="sc-toss-winner-tag">
                                                    <FaCoins className="sc-winner-coin-icon" /> Toss Winner
                                                </span>
                                            ) : (
                                                'Opponent Team'
                                            )}
                                        </span>
                                    </div>
                                    <div className="sc-toss-card-radio">
                                        {tossWinner === t2 ? <MdCheckCircle className="sc-toss-card-check" /> : <div className="sc-toss-card-uncheck" />}
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* 2. Toss Decision */}
                        <div className="sc-toss-section">
                            <div className="sc-toss-section-header">
                                <span className="sc-toss-step-num">02</span>
                                <div className="sc-toss-step-title-wrap">
                                    <span className="sc-toss-step-title">
                                        What did <strong>{tossWinner || 'the toss winner'}</strong> elect to do?
                                    </span>
                                    <span className="sc-toss-step-hint">Determines 1st innings batting &amp; fielding sides</span>
                                </div>
                            </div>
                            <div className="sc-toss-decision-grid">
                                <button
                                    type="button"
                                    className={`sc-toss-decision-card bat-card ${tossDecision === 'bat' ? 'selected' : ''}`}
                                    onClick={() => handleSelectTossDecision('bat')}
                                >
                                    <div className="sc-decision-badge bat">
                                        <GiCricketBat />
                                    </div>
                                    <div className="sc-decision-info">
                                        <span className="sc-decision-title">Bat First</span>
                                        <span className="sc-decision-sub">Take the crease for 1st Innings</span>
                                    </div>
                                    <div className="sc-decision-radio">
                                        {tossDecision === 'bat' ? <MdCheckCircle className="sc-decision-check" /> : <div className="sc-decision-uncheck" />}
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    className={`sc-toss-decision-card bowl-card ${tossDecision === 'bowl' ? 'selected' : ''}`}
                                    onClick={() => handleSelectTossDecision('bowl')}
                                >
                                    <div className="sc-decision-badge bowl">
                                        <MdSportsBaseball />
                                    </div>
                                    <div className="sc-decision-info">
                                        <span className="sc-decision-title">Bowl First</span>
                                        <span className="sc-decision-sub">Field &amp; bowl in 1st Innings</span>
                                    </div>
                                    <div className="sc-decision-radio">
                                        {tossDecision === 'bowl' ? <MdCheckCircle className="sc-decision-check" /> : <div className="sc-decision-uncheck" />}
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* 3. Opening Crease Assignment */}
                        <div className="sc-toss-section">
                            <div className="sc-toss-section-header">
                                <span className="sc-toss-step-num">03</span>
                                <div className="sc-toss-step-title-wrap">
                                    <span className="sc-toss-step-title">Opening Batsmen &amp; First Over Bowler</span>
                                    <span className="sc-toss-step-hint">Assign the players starting live on the pitch</span>
                                </div>
                            </div>
                            <div className="sc-opening-crease-grid">
                                {/* Striker Card */}
                                <div className="sc-opening-crease-card striker-card">
                                    <div className="sc-occ-header">
                                        <span className="sc-occ-badge striker">
                                            <GiCricketBat className="sc-occ-badge-icon" /> Striker (*)
                                        </span>
                                        <span className="sc-occ-team" title={battingTeamName}>{battingTeamName}</span>
                                    </div>
                                    <div className="sc-occ-body">
                                        <label className="sc-occ-label">Takes 1st Ball Strike</label>
                                        <div className="sc-select-wrap">
                                            <select
                                                className="sc-toss-player-select"
                                                value={openingStrikerId || ''}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value) || e.target.value;
                                                    setOpeningStrikerId(val);
                                                    if (String(val) === String(openingNonStrikerId)) {
                                                        const alt = battingSquad.find(p => String(p.id) !== String(val));
                                                        if (alt) setOpeningNonStrikerId(alt.id);
                                                    }
                                                }}
                                            >
                                                {battingSquad.map(player => (
                                                    <option
                                                        key={player.id}
                                                        value={player.id}
                                                        disabled={String(player.id) === String(openingNonStrikerId)}
                                                    >
                                                        {player.name} {player.role ? `(${player.role})` : ''} {String(player.id) === String(openingNonStrikerId) ? '(Non-Striker)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <MdKeyboardArrowDown className="sc-select-chevron" />
                                        </div>
                                    </div>
                                </div>

                                {/* Non-Striker Card */}
                                <div className="sc-opening-crease-card non-striker-card">
                                    <div className="sc-occ-header">
                                        <span className="sc-occ-badge non-striker">
                                            <MdDirectionsRun className="sc-occ-badge-icon" /> Non-Striker
                                        </span>
                                        <span className="sc-occ-team" title={battingTeamName}>{battingTeamName}</span>
                                    </div>
                                    <div className="sc-occ-body">
                                        <label className="sc-occ-label">Partner at Runner End</label>
                                        <div className="sc-select-wrap">
                                            <select
                                                className="sc-toss-player-select"
                                                value={openingNonStrikerId || ''}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value) || e.target.value;
                                                    setOpeningNonStrikerId(val);
                                                    if (String(val) === String(openingStrikerId)) {
                                                        const alt = battingSquad.find(p => String(p.id) !== String(val));
                                                        if (alt) setOpeningStrikerId(alt.id);
                                                    }
                                                }}
                                            >
                                                {battingSquad.map(player => (
                                                    <option
                                                        key={player.id}
                                                        value={player.id}
                                                        disabled={String(player.id) === String(openingStrikerId)}
                                                    >
                                                        {player.name} {player.role ? `(${player.role})` : ''} {String(player.id) === String(openingStrikerId) ? '(Striker)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <MdKeyboardArrowDown className="sc-select-chevron" />
                                        </div>
                                    </div>
                                </div>

                                {/* Bowler Card */}
                                <div className="sc-opening-crease-card bowler-card">
                                    <div className="sc-occ-header">
                                        <span className="sc-occ-badge bowler">
                                            <MdSportsBaseball className="sc-occ-badge-icon" /> Opening Bowler
                                        </span>
                                        <span className="sc-occ-team" title={bowlingTeamName}>{bowlingTeamName}</span>
                                    </div>
                                    <div className="sc-occ-body">
                                        <label className="sc-occ-label">Bowls the 1st Over</label>
                                        <div className="sc-select-wrap">
                                            <select
                                                className="sc-toss-player-select"
                                                value={openingBowlerId || ''}
                                                onChange={(e) => setOpeningBowlerId(Number(e.target.value) || e.target.value)}
                                            >
                                                {bowlingSquad.map(player => (
                                                    <option key={player.id} value={player.id}>
                                                        {player.name} {player.role ? `(${player.role})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <MdKeyboardArrowDown className="sc-select-chevron" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Match Overs Limit */}
                        <div className="sc-toss-section">
                            <div className="sc-toss-section-header">
                                <span className="sc-toss-step-num">04</span>
                                <div className="sc-toss-step-title-wrap">
                                    <span className="sc-toss-step-title">Match Overs Limit</span>
                                    <span className="sc-toss-step-hint">Maximum overs quota per innings</span>
                                </div>
                            </div>
                            <div className="sc-toss-overs-control">
                                <div className="sc-toss-overs-presets">
                                    {[5, 8, 10, 15, 20].map((ov) => (
                                        <button
                                            key={ov}
                                            type="button"
                                            className={`sc-overs-chip ${Number(tossOverLimit) === ov ? 'active' : ''}`}
                                            onClick={() => setTossOverLimit(ov)}
                                        >
                                            {ov} Overs
                                        </button>
                                    ))}
                                </div>
                                <div className="sc-overs-custom-wrap">
                                    <MdTimer className="sc-overs-timer-icon" />
                                    <label>Custom:</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={tossOverLimit}
                                        onChange={(e) => setTossOverLimit(e.target.value)}
                                        className="sc-overs-input"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 5. Live Match Summary Banner */}
                        <div className="sc-toss-summary-banner">
                            <div className="sc-tsb-header">
                                <div className="sc-tsb-pill">
                                    <span className="sc-tsb-pulse-dot" /> READY FOR LIVE SCORING
                                </div>
                                <span className="sc-tsb-overs-badge">{tossOverLimit} Overs / Innings</span>
                            </div>

                            <div className="sc-tsb-grid">
                                <div className="sc-tsb-item">
                                    <div className="sc-tsb-icon-wrap coin">
                                        <FaCoins />
                                    </div>
                                    <div className="sc-tsb-details">
                                        <span className="sc-tsb-item-label">Toss Result</span>
                                        <span className="sc-tsb-item-val">
                                            <strong>{tossWinner}</strong> won &amp; elected to <strong>{tossDecision === 'bat' ? 'Bat' : 'Bowl'}</strong> first
                                        </span>
                                    </div>
                                </div>

                                <div className="sc-tsb-item">
                                    <div className="sc-tsb-icon-wrap bat">
                                        <GiCricketBat />
                                    </div>
                                    <div className="sc-tsb-details">
                                        <span className="sc-tsb-item-label">1st Innings Setup</span>
                                        <span className="sc-tsb-item-val">
                                            <strong className="sc-tsb-highlight-bat">{battingTeamName}</strong> (Batting) vs <strong className="sc-tsb-highlight-bowl">{bowlingTeamName}</strong> (Bowling)
                                        </span>
                                    </div>
                                </div>

                                <div className="sc-tsb-item">
                                    <div className="sc-tsb-icon-wrap target">
                                        <MdTrackChanges />
                                    </div>
                                    <div className="sc-tsb-details">
                                        <span className="sc-tsb-item-label">Opening Pitch Crease</span>
                                        <span className="sc-tsb-item-val">
                                            <strong className="sc-tsb-highlight-bat">{currentStriker?.name || 'Striker'} (*)</strong> &amp; <strong className="sc-tsb-highlight-bat">{currentNonStriker?.name || 'Non-Striker'}</strong> batting • <strong className="sc-tsb-highlight-bowl">{currentBowler?.name || 'Bowler'}</strong> bowling
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="sc-toss-modal-footer">
                        <button
                            type="button"
                            className="sc-toss-cancel-btn"
                            onClick={() => setShowTossModal(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            id="btn-confirm-toss-start"
                            className="sc-toss-confirm-btn"
                            onClick={handleConfirmTossAndStart}
                            disabled={isStartingMatch}
                        >
                            <MdPlayArrow className="sc-confirm-play-icon" />
                            <span>{isEditingTossOnly ? 'Save & Update Toss Settings' : 'Confirm & Start Live Scoring'}</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

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
                            <FaTrophy className="sc-tourney-badge-icon" /> <strong>{selectedTournamentId}</strong>
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

                            {/* Target Tournament Dropdown Styled Selector for Published Draw Matches */}
                            <div className="sc-dropdown-group">
                                <label className="sc-dropdown-label" htmlFor="sc-match-dropdown">
                                    Published Draw Matches:
                                </label>
                                <div className="admin-tourney-selector-wrap sc-draw-selector-wrap" ref={matchDropdownRef}>
                                    <button
                                        type="button"
                                        className={`custom-select-trigger sc-draw-select-trigger ${isMatchDropdownOpen ? 'menu-open' : ''}`}
                                        onClick={() => setIsMatchDropdownOpen((prev) => !prev)}
                                        aria-expanded={isMatchDropdownOpen}
                                        aria-haspopup="listbox"
                                        id="sc-match-dropdown"
                                        title={selectedFixture ? `Selected: ${selectedFixture.title}` : 'Click to select a match'}
                                    >
                                        <div className={`selector-icon-bubble ${!selectedMatchTitle ? 'neutral' : ''}`}>
                                            <MdSportsCricket className="selector-trophy-icon" />
                                        </div>
                                        <div className="selector-field">
                                            <span className="selector-caption">Published Draw Match</span>
                                            <span
                                                className={`selected-tourney-name ${!selectedMatchTitle ? 'is-placeholder' : ''}`}
                                                title={selectedFixture ? `${selectedFixture.title}: ${selectedFixture.teams || `${selectedFixture.team1} vs ${selectedFixture.team2}`}` : 'Select Match from Published Draw'}
                                            >
                                                {selectedFixture
                                                    ? `${selectedFixture.title}: ${selectedFixture.teams || `${selectedFixture.team1} vs ${selectedFixture.team2}`}`
                                                    : 'Select Match from Published Draw'}
                                            </span>
                                        </div>
                                        <MdKeyboardArrowDown className={`select-dropdown-arrow ${isMatchDropdownOpen ? 'rotated' : ''}`} />
                                    </button>

                                    {isMatchDropdownOpen && (
                                        <div className="custom-dropdown-panel sc-draw-dropdown-panel" role="listbox" aria-labelledby="sc-match-dropdown">
                                            <div className="dropdown-panel-header">
                                                <span className="dropdown-panel-title">CHOOSE PUBLISHED MATCH</span>
                                                <span className="dropdown-panel-count">{publishedMatches.length} Fixtures</span>
                                            </div>

                                            <div className="dropdown-options-list">
                                                {publishedMatches.length === 0 ? (
                                                    <div className="sc-dropdown-empty-item">
                                                        No published matches available for this tournament
                                                    </div>
                                                ) : (
                                                    publishedMatches.map((m) => {
                                                        const isSelected = selectedMatchTitle === m.title;
                                                        const scheduleInfo = m.date ? ` • ${m.date}${m.time ? ` at ${m.time}` : ''}` : '';
                                                        const stageTag = m.stage || (m.finished ? 'FINISHED' : 'SCHEDULED');
                                                        return (
                                                            <button
                                                                key={m.id || m.title}
                                                                type="button"
                                                                role="option"
                                                                aria-selected={isSelected}
                                                                className={`dropdown-option-item ${isSelected ? 'selected' : ''}`}
                                                                onClick={() => {
                                                                    setSelectedMatchTitle(m.title);
                                                                    setIsMatchDropdownOpen(false);
                                                                }}
                                                            >
                                                                <div className={`option-trophy-bubble ${isSelected ? '' : 'neutral'}`}>
                                                                    <MdSportsCricket />
                                                                </div>
                                                                <div className="option-details">
                                                                    <div className="option-title-row">
                                                                        <span className="option-name">{m.title}</span>
                                                                        <span className="option-meta-pill">{stageTag}</span>
                                                                    </div>
                                                                    <span className="option-sub">
                                                                        {m.teams || `${m.team1} vs ${m.team2}`}{scheduleInfo}
                                                                    </span>
                                                                </div>
                                                                {isSelected && <MdCheck className="option-check-icon" />}
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedFixture && (
                                <div className="sc-fixture-preview-bar">
                                    <div className="fpb-left-block">
                                        <span className="fpb-title-badge">{selectedFixture.title}</span>
                                        <span className="fpb-status-pill">{selectedFixture.score || selectedFixture.result || 'Scheduled'}</span>
                                    </div>
                                    <div className="fpb-matchup-block">
                                        <span className="fpb-team-name">{selectedFixture.team1 || selectedFixture.teams?.split(' vs ')[0] || 'Team 1'}</span>
                                        <span className="fpb-vs-tag">VS</span>
                                        <span className="fpb-team-name">{selectedFixture.team2 || selectedFixture.teams?.split(' vs ')[1] || 'Team 2'}</span>
                                    </div>
                                    <div className="fpb-meta-block">
                                        {selectedFixture.date && (
                                            <span className="fpb-meta-item">
                                                <MdEventNote /> {selectedFixture.date}
                                            </span>
                                        )}
                                        {selectedFixture.time && (
                                            <span className="fpb-meta-item">
                                                <MdAccessTime /> {selectedFixture.time}
                                            </span>
                                        )}
                                        <span className="fpb-meta-item">
                                            <MdLocationOn /> {selectedFixture.venue || 'Faculty Grounds'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="sc-launch-actions">
                                <button
                                    id="btn-start-scoring"
                                    className={`sc-start-scoring-btn ${isMatchSelected ? 'enabled' : 'disabled'}`}
                                    disabled={!isMatchSelected || isStartingMatch}
                                    onClick={() => handleInitiateStartScoring()}
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
                {renderTossModal()}
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
                { name: "Mid-on", key: "Midon", startAngle: 0, endAngle: 45 },
                { name: "Mid-wicket", key: "Midwicket", startAngle: 45, endAngle: 90 },
                { name: "Square Leg", key: "SquareLeg", startAngle: 90, endAngle: 135 },
                { name: "Fine Leg", key: "FineLeg", startAngle: 135, endAngle: 180 },
                { name: "Third Man", key: "ThirdMan", startAngle: 180, endAngle: 225 },
                { name: "Point", key: "Point", startAngle: 225, endAngle: 270 },
                { name: "Cover", key: "Cover", startAngle: 270, endAngle: 315 },
                { name: "Mid-off", key: "Midoff", startAngle: 315, endAngle: 360 }
            ];
        }
        return [
            { name: "Mid-off", key: "Midoff", startAngle: 0, endAngle: 45 },
            { name: "Cover", key: "Cover", startAngle: 45, endAngle: 90 },
            { name: "Point", key: "Point", startAngle: 90, endAngle: 135 },
            { name: "Third Man", key: "ThirdMan", startAngle: 135, endAngle: 180 },
            { name: "Fine Leg", key: "FineLeg", startAngle: 180, endAngle: 225 },
            { name: "Square Leg", key: "SquareLeg", startAngle: 225, endAngle: 270 },
            { name: "Mid-wicket", key: "Midwicket", startAngle: 270, endAngle: 315 },
            { name: "Mid-on", key: "Midon", startAngle: 315, endAngle: 360 }
        ];
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

        const isExtra = Boolean(ballEvent.isExtra);
        const extraType = ballEvent.extraType || '';
        const additionalExtraRuns = Number(ballEvent.extraRuns ?? 0);
        const runs = Number(ballEvent.runs ?? 0);
        const isWicket = Boolean(ballEvent.isWicket);
        const wagonZone = ballEvent.wagonZone || 'Cover';
        const outBatterId = ballEvent.dismissalBatterId || striker.id;

        const updated = JSON.parse(JSON.stringify(matchData));
        const bTeam = updated[currentBattingTeamKey];
        const bowlTeam = updated[currentBowlingTeamKey];

        // 1. Legal ball calculation (Wide & No Ball are NOT legal balls)
        const legalBall = !(extraType === 'Wide' || extraType === 'No Ball');
        if (legalBall) {
            bTeam.totalBalls = (bTeam.totalBalls || 0) + 1;
            const fullOvers = Math.floor(bTeam.totalBalls / 6);
            const ballInOver = bTeam.totalBalls % 6;
            bTeam.overs = Number(`${fullOvers}.${ballInOver}`);
        }

        // 2. Extra & Total Runs Breakdown according to Cricket Laws
        let deliveryTotalRuns = 0;
        let extraAmountForTeam = 0;
        let bowlerConcededRuns = 0;
        let strikerRunsScored = 0;

        if (isExtra) {
            if (extraType === 'Wide') {
                // Law 22: +1 Automatic Penalty Run + additional runs run by batters
                extraAmountForTeam = 1 + additionalExtraRuns;
                deliveryTotalRuns = extraAmountForTeam;
                bowlerConcededRuns = extraAmountForTeam;
                strikerRunsScored = 0;
            } else if (extraType === 'No Ball') {
                // Law 21: +1 Automatic Penalty Run to extras + bat runs to striker
                extraAmountForTeam = 1;
                strikerRunsScored = additionalExtraRuns;
                deliveryTotalRuns = 1 + strikerRunsScored;
                bowlerConcededRuns = deliveryTotalRuns;
            } else if (extraType === 'Bye' || extraType === 'Leg Bye') {
                // Law 23/24: 0 Penalty Runs. Bye/Leg Bye runs go to team extras. Bowler is NOT charged.
                extraAmountForTeam = additionalExtraRuns;
                deliveryTotalRuns = extraAmountForTeam;
                bowlerConcededRuns = 0;
                strikerRunsScored = 0;
            }
        } else {
            // Normal delivery off the bat
            deliveryTotalRuns = runs;
            bowlerConcededRuns = runs;
            strikerRunsScored = runs;
        }

        // Update Team Total Runs & Extras Tally
        bTeam.totalRuns = (bTeam.totalRuns || 0) + deliveryTotalRuns;

        if (isExtra && extraAmountForTeam > 0) {
            bTeam.totalExtraAmount = (bTeam.totalExtraAmount || 0) + extraAmountForTeam;
            bTeam.extraTypes = bTeam.extraTypes || [];
            bTeam.extraTypes.push(`${extraAmountForTeam}${extraType[0] || 'E'}`);
        }

        // Update Striker Stats
        if (extraType !== 'Wide' && extraType !== 'Bye' && extraType !== 'Leg Bye') {
            const sPlayer = bTeam.players?.[striker.id];
            if (sPlayer) {
                sPlayer.runs = (sPlayer.runs || 0) + strikerRunsScored;
                if (legalBall || extraType === 'No Ball') sPlayer.balls = (sPlayer.balls || 0) + 1;

                sPlayer.boundaries = sPlayer.boundaries || { fours: 0, sixes: 0, singles: 0, twos: 0 };
                if (strikerRunsScored === 4) sPlayer.boundaries.fours = (sPlayer.boundaries.fours || 0) + 1;
                if (strikerRunsScored === 6) sPlayer.boundaries.sixes = (sPlayer.boundaries.sixes || 0) + 1;
                if (strikerRunsScored === 1) sPlayer.boundaries.singles = (sPlayer.boundaries.singles || 0) + 1;
                if (strikerRunsScored === 2) sPlayer.boundaries.twos = (sPlayer.boundaries.twos || 0) + 1;
                sPlayer.strikeRate = Number(((sPlayer.runs / Math.max(1, sPlayer.balls)) * 100).toFixed(2));

                // Save shot zone (ONLY for bat scoring runs > 0; NO dot balls or extras)
                if (wagonZone && strikerRunsScored > 0 && !isExtra) {
                    sPlayer.shots = sPlayer.shots || {};
                    sPlayer.shots[wagonZone] = sPlayer.shots[wagonZone] || { runs: 0, count: 0 };
                    sPlayer.shots[wagonZone].runs += strikerRunsScored;
                    sPlayer.shots[wagonZone].count += 1;
                }
            }
        } else if (extraType === 'Bye' || extraType === 'Leg Bye') {
            // Striker faced the ball (legal delivery)
            const sPlayer = bTeam.players?.[striker.id];
            if (sPlayer) {
                sPlayer.balls = (sPlayer.balls || 0) + 1;
                sPlayer.strikeRate = Number(((sPlayer.runs / Math.max(1, sPlayer.balls)) * 100).toFixed(2));
            }
        }

        // Update Bowler Stats
        const currentBowlerObj = bowlTeam.bowlers?.[bowler.id] || (bowlTeam.players?.[bowler.id] ? { ...bowlTeam.players[bowler.id], overs: 0, runs: 0, wickets: 0, balls: 0 } : null);
        if (currentBowlerObj) {
            if (legalBall) {
                currentBowlerObj.balls = (currentBowlerObj.balls || 0) + 1;
                const bOvers = Math.floor(currentBowlerObj.balls / 6);
                const bBalls = currentBowlerObj.balls % 6;
                currentBowlerObj.overs = Number(`${bOvers}.${bBalls}`);
            }

            // Bowler runs conceded (Byes/Leg Byes excluded)
            currentBowlerObj.runs = (currentBowlerObj.runs || 0) + bowlerConcededRuns;

            // Bowler Wicket Credit: NOT credited for Run Out or Retired Out (MCC Laws 25.4 & 38)
            if (isWicket && ballEvent.dismissalType !== 'Run Out' && ballEvent.dismissalType !== 'Retired Out') {
                currentBowlerObj.wickets = (currentBowlerObj.wickets || 0) + 1;
            }

            currentBowlerObj.economy = Number(((currentBowlerObj.runs / Math.max(0.1, (currentBowlerObj.balls || 1) / 6))).toFixed(2));
            bowlTeam.bowlers = bowlTeam.bowlers || {};
            bowlTeam.bowlers[bowler.id] = currentBowlerObj;
        }

        // Update Current Partnership
        bTeam.currentPartnership = bTeam.currentPartnership || {
            batsman1: striker,
            batsman2: nonStriker,
            batsman1Runs: 0,
            batsman1Balls: 0,
            batsman2Runs: 0,
            batsman2Balls: 0,
            startScore: bTeam.totalRuns - deliveryTotalRuns,
            startBalls: bTeam.totalBalls - (legalBall ? 1 : 0)
        };

        bTeam.currentPartnership.batsman1Runs = (bTeam.currentPartnership.batsman1Runs || 0) + strikerRunsScored;
        if (legalBall) {
            bTeam.currentPartnership.batsman1Balls = (bTeam.currentPartnership.batsman1Balls || 0) + 1;
        }

        // Handle Wicket
        if (isWicket) {
            bTeam.totalWickets = (bTeam.totalWickets || 0) + 1;
            const outPlayer = bTeam.players?.[outBatterId];
            const isOutStriker = String(outBatterId) === String(striker.id);

            if (outPlayer) {
                let dismissText = '';
                if (ballEvent.dismissalType === 'Retired Out') {
                    dismissText = 'ret. out';
                } else if (ballEvent.dismissalType === 'Run Out') {
                    dismissText = ballEvent.dismissalFielder ? `run out (${ballEvent.dismissalFielder})` : 'run out';
                } else if (ballEvent.dismissalFielder) {
                    dismissText = `c ${ballEvent.dismissalFielder} b ${bowler.name}`;
                } else {
                    dismissText = `b ${bowler.name} (${ballEvent.dismissalType})`;
                }
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

            // Select next batter from playing XI
            const nextBatter = playingXI.find(p => p.id !== striker.id && p.id !== nonStriker.id && !p.dismissal);
            if (nextBatter) {
                if (isOutStriker) {
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
                } else {
                    setNonStrikerId(nextBatter.id);
                    bTeam.currentPartnership = {
                        batsman1: striker,
                        batsman2: nextBatter,
                        batsman1Runs: 0,
                        batsman1Balls: 0,
                        batsman2Runs: 0,
                        batsman2Balls: 0,
                        startScore: bTeam.totalRuns,
                        startBalls: bTeam.totalBalls
                    };
                }
            }
        }

        // Strike Rotation
        if (deliveryTotalRuns % 2 !== 0 && !isWicket) {
            const temp = strikerId;
            setStrikerId(nonStrikerId);
            setNonStrikerId(temp);
        }

        if (legalBall && bTeam.totalBalls % 6 === 0 && bTeam.totalBalls > 0) {
            const temp = strikerId;
            setStrikerId(nonStrikerId);
            setNonStrikerId(temp);
            const overNum = Math.floor(bTeam.totalBalls / 6);
            toastRef.current?.showToast('info', `Over ${overNum} complete! Strike rotated.`);

            // Trigger compulsory Next Bowler Selection Modal
            setLastBowlerId(bowler.id);
            setCompletedOverNumber(overNum);
            setSelectedNextBowlerId('');
            setShowNextBowlerModal(true);
        }

        // Commentary Text
        const commTimestamp = Date.now();
        let commText = '';
        const outBatterName = isWicket ? (bTeam.players?.[outBatterId]?.name || striker.name) : striker.name;

        if (isWicket) {
            if (ballEvent.dismissalType === 'Retired Out') {
                commText = `RETIRED OUT! ${outBatterName} has retired out. Wicket added to ${bTeam.name}.`;
            } else if (ballEvent.dismissalType === 'Run Out') {
                commText = `RUN OUT! ${outBatterName} is run out ${ballEvent.dismissalFielder ? 'by ' + ballEvent.dismissalFielder : ''}!`;
            } else {
                commText = `WICKET! ${outBatterName} ${ballEvent.dismissalType} ${ballEvent.dismissalFielder ? 'by ' + ballEvent.dismissalFielder : ''}. Big breakthrough for ${bowler.name}!`;
            }
        } else if (isExtra) {
            commText = `${extraType}! ${deliveryTotalRuns} run(s) total (${extraAmountForTeam} extra run(s) credited to team).`;
        } else if (runs === 6) {
            commText = `SIX! Sublimely struck by ${striker.name} soaring high over ${wagonZone}!`;
        } else if (runs === 4) {
            commText = `FOUR! Beautifully timed by ${striker.name} racing through ${wagonZone}!`;
        } else if (runs === 0) {
            commText = `Dot ball. Good delivery by ${bowler.name} towards ${wagonZone}.`;
        } else {
            commText = `${runs} run(s) worked away by ${striker.name} into ${wagonZone}.`;
        }

        updated.commentary = updated.commentary || {};
        updated.commentary[commTimestamp] = {
            id: commTimestamp,
            over: `${getOversString(bTeam)}`,
            runs: deliveryTotalRuns,
            isWicket,
            isExtra,
            text: commText,
            timestamp: commTimestamp,
            batsman: striker.name,
            bowler: bowler.name,
            wagonZone
        };

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

        toastRef.current?.showToast('success', `${deliveryTotalRuns} run(s) recorded ${isWicket ? '(Wicket!)' : ''}`);
    };

    const handleSelectWheelerZone = (zoneName) => {
        setSelectedShotZone(prev => prev === zoneName ? null : zoneName);
    };

    const handleScoreClick = (runs) => {
        const zone = selectedShotZone || 'Cover';
        executeBallDelivery({ runs, isExtra: false, isWicket: false, wagonZone: zone });
        setSelectedShotZone(null);
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

    // Shift Striker & Non-Striker Batters
    const handleShiftBatters = async () => {
        if (!strikerId || !nonStrikerId) return;
        const oldStrikerId = strikerId;
        const oldNonStrikerId = nonStrikerId;

        setStrikerId(oldNonStrikerId);
        setNonStrikerId(oldStrikerId);

        if (matchData && activeMatchTitle) {
            const bKey = isTeam1Batting ? 'team1' : 'team2';
            const updated = JSON.parse(JSON.stringify(matchData));
            const bSquad = Object.values(updated[bKey]?.players || {});

            const newStrikerObj = bSquad.find(p => p.id === oldNonStrikerId) || striker;
            const newNonStrikerObj = bSquad.find(p => p.id === oldStrikerId) || nonStriker;

            updated[bKey] = updated[bKey] || {};
            updated[bKey].ballFaceBatsman = newStrikerObj;
            updated[bKey].otherSideBatsman = newNonStrikerObj;

            setMatchData(updated);

            await updateMatchData(activeMatchTitle, {
                [`${bKey}/ballFaceBatsman`]: newStrikerObj,
                [`${bKey}/otherSideBatsman`]: newNonStrikerObj
            }, selectedTournamentId);

            await updateLiveData({
                isLive: 1,
                currentMatchPath: activeMatchTitle,
                liveScore: {
                    matchTitle: activeMatchTitle,
                    firstBat: common.firstBat,
                    status: `${newStrikerObj.name} on strike | ${bowler.name} bowling`,
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
        }

        toastRef.current?.showToast('info', 'Shifted Striker and Non-Striker batters at the crease.');
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
                {/* ROW 1: Scorecard Summary & Crease Controls (Left) | Wheeler, Keypad & Live Commentary (Right) */}
                <div className="sc-admin-row1-grid">
                    {/* LEFT COLUMN TOP: Scorecard header card + Crease controls (Striker, Non-Striker, Bowler) */}
                    <div className="sc-admin-row1-left">
                        {/* 1. Scorecard Summary Header */}
                        <div className="cx-score-header-card compact">
                            <div className="cx-sh-top">
                                <span>{common.title} • {common.date}</span>
                                <span className={`cx-status-pill ${common.finished === 0 ? 'cx-live' : ''}`}>
                                    {common.finished === 0 ? '● LIVE' : 'FINISHED'}
                                </span>
                            </div>

                            <div className="cx-score-display">
                                <div className="cx-team-score active-bat">
                                    <div className="cx-team-name-row">
                                        <h2>{isTeam1Batting ? t1Name : t2Name}</h2>
                                        <span className="cx-batting-badge">🏏 BATTING</span>
                                    </div>
                                    <div className="cx-score-number">
                                        {(isTeam1Batting ? team1.totalRuns : team2.totalRuns) ?? 0}/{(isTeam1Batting ? team1.totalWickets : team2.totalWickets) ?? 0}
                                        <span>({getOversString(isTeam1Batting ? team1 : team2)} ov)</span>
                                    </div>
                                </div>

                                <div className="cx-vs-divider">VS</div>

                                <div className="cx-team-score cx-align-right">
                                    <div className="cx-team-name-row cx-justify-end">
                                        <span className="cx-bowling-badge">🥎 BOWLING</span>
                                        <h2>{isTeam1Batting ? t2Name : t1Name}</h2>
                                    </div>
                                    <div className="cx-score-number">
                                        {(!isTeam1Batting ? team1.totalRuns : team2.totalRuns) ?? 0}/{(!isTeam1Batting ? team1.totalWickets : team2.totalWickets) ?? 0}
                                        <span>({getOversString(!isTeam1Batting ? team1 : team2)} ov)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="cx-match-status-text">
                                {common.result ? common.result : (common.status || `${striker.name} on strike | ${bowler.name} bowling`)}
                            </div>
                        </div>

                        {/* 2. Striker, Non-Striker and Bowler Section (Space-Saving Row-by-Row) */}
                        <div className="sc-crease-grid compact-rows">
                            {/* Striker Row Card */}
                            <div className="sc-crease-box striker compact-row">
                                <div className="sc-cb-top-line">
                                    <div className="sc-cb-label-wrap">
                                        <span className="sc-crease-label">STRIKER (*)</span>
                                        <button
                                            type="button"
                                            className="sc-crease-wheeler-btn"
                                            onClick={() => handleOpenWWheel(striker)}
                                            title={`Preview Wagon Wheel for ${striker.name}`}
                                        >
                                            <MdPieChart />
                                        </button>
                                    </div>
                                    <select
                                        value={striker.id}
                                        onChange={(e) => setStrikerId(Number(e.target.value))}
                                        className="sc-crease-select compact"
                                    >
                                        {activeBattingSquad.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="sc-crease-stats compact">
                                    <span>R: <strong>{striker.runs || 0}</strong></span>
                                    <span>B: <strong>{striker.balls || 0}</strong></span>
                                    <span>4s: <strong>{striker.boundaries?.fours || 0}</strong></span>
                                    <span>6s: <strong>{striker.boundaries?.sixes || 0}</strong></span>
                                    <span>SR: <strong>{striker.strikeRate || '0.00'}</strong></span>
                                </div>
                            </div>

                            {/* Non-Striker Row Card */}
                            <div className="sc-crease-box non-striker compact-row">
                                <div className="sc-cb-top-line">
                                    <div className="sc-cb-label-wrap">
                                        <span className="sc-crease-label">NON-STRIKER</span>
                                        <button
                                            type="button"
                                            className="sc-crease-wheeler-btn"
                                            onClick={() => handleOpenWWheel(nonStriker)}
                                            title={`Preview Wagon Wheel for ${nonStriker.name}`}
                                        >
                                            <MdPieChart />
                                        </button>
                                    </div>
                                    <select
                                        value={nonStriker.id}
                                        onChange={(e) => setNonStrikerId(Number(e.target.value))}
                                        className="sc-crease-select compact"
                                    >
                                        {activeBattingSquad.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="sc-crease-stats compact">
                                    <span>R: <strong>{nonStriker.runs || 0}</strong></span>
                                    <span>B: <strong>{nonStriker.balls || 0}</strong></span>
                                    <span>4s: <strong>{nonStriker.boundaries?.fours || 0}</strong></span>
                                    <span>6s: <strong>{nonStriker.boundaries?.sixes || 0}</strong></span>
                                    <span>SR: <strong>{nonStriker.strikeRate || '0.00'}</strong></span>
                                </div>
                            </div>

                            {/* Bowler Row Card */}
                            <div className="sc-crease-box bowler compact-row">
                                <div className="sc-cb-top-line">
                                    <span className="sc-crease-label">BOWLER (🔴)</span>
                                    <select
                                        value={bowler.id}
                                        onChange={(e) => setBowlerId(Number(e.target.value))}
                                        className="sc-crease-select compact"
                                    >
                                        {activeBowlingSquad.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="sc-crease-stats compact">
                                    <span>O: <strong>{bowler.overs ?? 0}</strong></span>
                                    <span>R: <strong>{bowler.runs ?? 0}</strong></span>
                                    <span>W: <strong>{bowler.wickets ?? 0}</strong></span>
                                    <span>Econ: <strong>{bowler.economy ?? '0.00'}</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Shot Placement Wheeler, Scoring Keypad & Live Commentary */}
                    <div className="sc-admin-row1-right">
                        <div className="sc-control-card">
                            <div className="sc-control-header">
                                <div className="sc-control-title">
                                    <MdSportsCricket />
                                    <h4>Scoring Console</h4>
                                </div>
                                <div className="sc-control-actions">
                                    <button className="sc-action-btn undo" onClick={() => setShowUndoConfirmModal(true)} title="Undo Last Delivery">
                                        <MdUndo /> Undo
                                    </button>
                                    <button className="sc-action-btn shift" onClick={handleShiftBatters} title="Shift Striker & Non-Striker Batters">
                                        <MdSwapHoriz /> Shift
                                    </button>
                                    <button className="sc-action-btn finish" onClick={() => setShowFinishModal(true)} title="Finalize Match">
                                        <MdCheckCircle /> Finish
                                    </button>
                                </div>
                            </div>

                            {/* 2 SUB-COLUMNS: Left = Wheeler, Right = Divided Action Buttons */}
                            <div className="sc-scoring-subgrid">
                                {/* Left Sub-Column: Embedded SHOT PLACEMENT WHEELER & INLINE FORMS */}
                                <div className="sc-embedded-wheeler-panel">
                                    {inlinePanelMode === 'wheeler' && (
                                        <>
                                            <div className="sc-embedded-wheeler-header">
                                                <span className="sc-ew-title">🎯 SHOT PLACEMENT WHEELER</span>
                                                {selectedShotZone ? (
                                                    <div className="sc-selected-zone-tag">
                                                        <span>Selected: <strong>{selectedShotZone}</strong></span>
                                                        <button
                                                            type="button"
                                                            className="sc-btn-clear-zone"
                                                            onClick={() => setSelectedShotZone(null)}
                                                            title="Clear Selection"
                                                        >
                                                            <MdClose />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="sc-ew-hint">Mark field to enable 1, 2, 3, 4, 6</span>
                                                )}
                                            </div>

                                            <div className="sc-embedded-wheeler-svg-wrap">
                                                <svg viewBox="0 0 300 300" className="sc-embedded-wheeler-svg">
                                                    <circle cx="150" cy="150" r="140" fill="none" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="2" strokeDasharray="5 5" className="sc-ew-outer-circle" />
                                                    <circle cx="150" cy="150" r="75" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" strokeDasharray="3 3" className="sc-ew-inner-circle" />

                                                    {getActiveSectors(striker.hand || 'Right Hand').map((s) => {
                                                        const pathData = describeArc(150, 150, 134, s.startAngle, s.endAngle);
                                                        const textCoords = getLabelCoords(150, 150, 134, s.startAngle, s.endAngle);
                                                        const isSelected = selectedShotZone === s.name;

                                                        return (
                                                            <g
                                                                key={s.key}
                                                                className={`sc-ew-sector ${isSelected ? 'selected' : ''}`}
                                                                onClick={() => handleSelectWheelerZone(s.name)}
                                                            >
                                                                <path
                                                                    d={pathData}
                                                                    className="sc-ew-sector-slice"
                                                                />
                                                                <text
                                                                    x={textCoords.x}
                                                                    y={textCoords.y}
                                                                    textAnchor="middle"
                                                                    alignmentBaseline="middle"
                                                                    className="sc-ew-sector-label"
                                                                >
                                                                    {s.name}
                                                                </text>
                                                            </g>
                                                        );
                                                    })}

                                                    <rect x="144" y="118" width="12" height="64" fill="#f59e0b" opacity="0.85" rx="3" />
                                                    <circle cx="150" cy="150" r="4" fill="#00f0ff" />
                                                </svg>
                                            </div>
                                        </>
                                    )}

                                    {inlinePanelMode === 'extras' && (
                                        <div className="sc-inline-config-box extras-mode">
                                            <div className="sc-icb-header">
                                                <span className="sc-icb-title extra">⚡ RECORD EXTRA ({extraType.toUpperCase()})</span>
                                                <button className="sc-btn-close-icb" onClick={() => setInlinePanelMode('wheeler')} title="Back to Wheeler">
                                                    <MdClose />
                                                </button>
                                            </div>
                                            <div className="sc-icb-body">
                                                <div className="sc-icb-field">
                                                    <label>Extra Type</label>
                                                    <select
                                                        value={extraType}
                                                        onChange={(e) => setExtraType(e.target.value)}
                                                        className="sc-icb-select"
                                                    >
                                                        <option value="Wide">Wide (WD)</option>
                                                        <option value="No Ball">No Ball (NB)</option>
                                                        <option value="Bye">Bye</option>
                                                        <option value="Leg Bye">Leg Bye</option>
                                                    </select>
                                                </div>
                                                <div className="sc-icb-field">
                                                    <label>Extra Runs (beyond mandatory penalty)</label>
                                                    <div className="sc-icb-runs-grid">
                                                        {[0, 1, 2, 3, 4, 5].map((r) => (
                                                            <button
                                                                key={r}
                                                                type="button"
                                                                className={`sc-icb-run-btn ${extraRuns === r ? 'active' : ''}`}
                                                                onClick={() => setExtraRuns(r)}
                                                            >
                                                                +{r}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="sc-icb-rule-hint">
                                                        {extraType === 'Wide' && `⚡ Auto +1 penalty run applied. Additional runs: +${extraRuns} (Total: ${1 + extraRuns} runs)`}
                                                        {extraType === 'No Ball' && `⚡ Auto +1 penalty run applied. Striker bat runs: +${extraRuns} (Total: ${1 + extraRuns} runs)`}
                                                        {(extraType === 'Bye' || extraType === 'Leg Bye') && `⚡ 0 penalty. ${extraType} runs: ${extraRuns} (Total: ${extraRuns} runs)`}
                                                    </div>
                                                </div>
                                                <div className="sc-icb-actions">
                                                    <button type="button" className="sc-icb-btn cancel" onClick={() => setInlinePanelMode('wheeler')}>
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="sc-icb-btn confirm extra"
                                                        onClick={() => {
                                                            executeBallDelivery({
                                                                runs: 0,
                                                                isExtra: true,
                                                                extraType,
                                                                extraRuns
                                                            });
                                                            setInlinePanelMode('wheeler');
                                                        }}
                                                    >
                                                        Confirm Extra
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {inlinePanelMode === 'wicket' && (
                                        <div className="sc-inline-config-box wicket-mode">
                                            <div className="sc-icb-header">
                                                <span className="sc-icb-title wicket">💥 RECORD WICKET ({dismissalType.toUpperCase()})</span>
                                                <button className="sc-btn-close-icb" onClick={() => setInlinePanelMode('wheeler')} title="Back to Wheeler">
                                                    <MdClose />
                                                </button>
                                            </div>
                                            <div className="sc-icb-body">
                                                <div className="sc-icb-field">
                                                    <label>Dismissal Type</label>
                                                    <select
                                                        value={dismissalType}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setDismissalType(val);
                                                            if (val !== 'Run Out' && val !== 'Retired Out') {
                                                                setDismissalBatterId(strikerId);
                                                            }
                                                        }}
                                                        className="sc-icb-select"
                                                    >
                                                        <option value="Bowled">Bowled</option>
                                                        <option value="Caught">Caught</option>
                                                        <option value="LBW">LBW</option>
                                                        <option value="Run Out">Run Out</option>
                                                        <option value="Stumped">Stumped</option>
                                                        <option value="Hit Wicket">Hit Wicket</option>
                                                        <option value="Retired Out">Retired Out</option>
                                                    </select>
                                                </div>

                                                {(dismissalType === 'Run Out' || dismissalType === 'Retired Out') && (
                                                    <div className="sc-icb-field">
                                                        <label>Which Batter is Out?</label>
                                                        <div className="sc-icb-batter-toggle">
                                                            <button
                                                                type="button"
                                                                className={`sc-icb-batter-btn ${dismissalBatterId === strikerId ? 'active' : ''}`}
                                                                onClick={() => setDismissalBatterId(strikerId)}
                                                            >
                                                                Striker ({striker?.name || 'Striker'})
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className={`sc-icb-batter-btn ${dismissalBatterId === nonStrikerId ? 'active' : ''}`}
                                                                onClick={() => setDismissalBatterId(nonStrikerId)}
                                                            >
                                                                Non-Striker ({nonStriker?.name || 'Non-Striker'})
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {(dismissalType === 'Caught' || dismissalType === 'Run Out' || dismissalType === 'Stumped') && (
                                                    <div className="sc-icb-field">
                                                        <label>Fielder (Optional)</label>
                                                        <select
                                                            value={dismissalFielder}
                                                            onChange={(e) => setDismissalFielder(e.target.value)}
                                                            className="sc-icb-select"
                                                        >
                                                            <option value="">Select Fielder...</option>
                                                            {bowlingPlayersList.map(p => (
                                                                <option key={p.id} value={p.name}>{p.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                <div className="sc-icb-actions">
                                                    <button type="button" className="sc-icb-btn cancel" onClick={() => setInlinePanelMode('wheeler')}>
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="sc-icb-btn confirm wicket"
                                                        onClick={() => {
                                                            executeBallDelivery({
                                                                runs: 0,
                                                                isWicket: true,
                                                                dismissalType,
                                                                dismissalFielder,
                                                                dismissalBatterId: (dismissalType === 'Run Out' || dismissalType === 'Retired Out') ? (dismissalBatterId || strikerId) : strikerId,
                                                                wagonZone: selectedShotZone || 'Point'
                                                            });
                                                            setInlinePanelMode('wheeler');
                                                        }}
                                                    >
                                                        Confirm Wicket
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Sub-Column: Divided Delivery Keypad Action Buttons */}
                                <div className="sc-keypad-section divided">
                                    {/* 1. RUN SCORES GROUP */}
                                    <div className="sc-keypad-group">
                                        <div className="sc-kg-header">
                                            <span className="sc-kg-title score-title">🏏 RUN SCORES</span>
                                        </div>
                                        <div className="keypad-grid score-grid">
                                            <button className="kp-btn dot" onClick={() => handleScoreClick(0)}>
                                                0 <small>DOT</small>
                                            </button>
                                            <button
                                                className="kp-btn"
                                                disabled={!selectedShotZone}
                                                onClick={() => handleScoreClick(1)}
                                                title={!selectedShotZone ? 'Select shot placement on Wheeler to enable' : '1 Run'}
                                            >
                                                1 <small>SINGLE</small>
                                            </button>
                                            <button
                                                className="kp-btn"
                                                disabled={!selectedShotZone}
                                                onClick={() => handleScoreClick(2)}
                                                title={!selectedShotZone ? 'Select shot placement on Wheeler to enable' : '2 Runs'}
                                            >
                                                2 <small>DOUBLE</small>
                                            </button>
                                            <button
                                                className="kp-btn"
                                                disabled={!selectedShotZone}
                                                onClick={() => handleScoreClick(3)}
                                                title={!selectedShotZone ? 'Select shot placement on Wheeler to enable' : '3 Runs'}
                                            >
                                                3 <small>THREE</small>
                                            </button>
                                            <button
                                                className="kp-btn boundary-four"
                                                disabled={!selectedShotZone}
                                                onClick={() => handleScoreClick(4)}
                                                title={!selectedShotZone ? 'Select shot placement on Wheeler to enable' : '4 Runs'}
                                            >
                                                4 <small>FOUR</small>
                                            </button>
                                            <button
                                                className="kp-btn boundary-six"
                                                disabled={!selectedShotZone}
                                                onClick={() => handleScoreClick(6)}
                                                title={!selectedShotZone ? 'Select shot placement on Wheeler to enable' : '6 Runs'}
                                            >
                                                6 <small>SIX</small>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 2. EXTRAS GROUP */}
                                    <div className="sc-keypad-group">
                                        <div className="sc-kg-header">
                                            <span className="sc-kg-title extra-title">⚡ EXTRAS</span>
                                        </div>
                                        <div className="keypad-grid extra-grid">
                                            <button
                                                className="kp-btn extra"
                                                onClick={() => handleOpenInlineExtra('Wide')}
                                            >
                                                WD <small>WIDE</small>
                                            </button>
                                            <button
                                                className="kp-btn extra"
                                                onClick={() => handleOpenInlineExtra('No Ball')}
                                            >
                                                NB <small>NO BALL</small>
                                            </button>
                                            <button
                                                className="kp-btn extra"
                                                onClick={() => handleOpenInlineExtra('Bye')}
                                            >
                                                BYE <small>BYE</small>
                                            </button>
                                            <button
                                                className="kp-btn extra"
                                                onClick={() => handleOpenInlineExtra('Leg Bye')}
                                            >
                                                LB <small>LEG BYE</small>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 3. WICKET GROUP */}
                                    <div className="sc-keypad-group">
                                        <div className="sc-kg-header">
                                            <span className="sc-kg-title wicket-title">💥 WICKET DISMISSALS</span>
                                        </div>
                                        <div className="keypad-grid wicket-grid">
                                            <button
                                                className="kp-btn wicket-btn"
                                                onClick={() => handleOpenInlineWicket('Bowled')}
                                            >
                                                BOWL <small>BOWLED</small>
                                            </button>
                                            <button
                                                className="kp-btn wicket-btn"
                                                onClick={() => handleOpenInlineWicket('Caught')}
                                            >
                                                CATCH <small>CAUGHT</small>
                                            </button>
                                            <button
                                                className="kp-btn wicket-btn"
                                                onClick={() => handleOpenInlineWicket('LBW')}
                                            >
                                                LBW <small>LBW</small>
                                            </button>
                                            <button
                                                className="kp-btn wicket-btn"
                                                onClick={() => handleOpenInlineWicket('Run Out')}
                                            >
                                                RUN OUT <small>RUN OUT</small>
                                            </button>
                                            <button
                                                className="kp-btn wicket-btn"
                                                onClick={() => handleOpenInlineWicket('Stumped')}
                                            >
                                                STUMP <small>STUMPED</small>
                                            </button>
                                            <button
                                                className="kp-btn wicket-btn"
                                                onClick={() => handleOpenInlineWicket('Hit Wicket')}
                                            >
                                                W <small>OTHER WICKET</small>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ROW 2: Complete Scorecard Section (Left Batting, Right Bowling, No Scroll Container) */}
                <div className="sc-admin-row2-full">
                    {/* Innings Selection Tabs: First Batting Team displayed in the 1st Tab */}
                    <div className="cx-innings-tabs">
                        <button
                            className={`cx-innings-tab-btn ${activeInningsTab === (isTeam1Batting ? 'team1' : 'team2') ? 'active' : ''}`}
                            onClick={() => setActiveInningsTab(isTeam1Batting ? 'team1' : 'team2')}
                        >
                            {isTeam1Batting ? t1Name : t2Name} Innings (1st Bat)
                        </button>
                        <button
                            className={`cx-innings-tab-btn ${activeInningsTab === (isTeam1Batting ? 'team2' : 'team1') ? 'active' : ''}`}
                            onClick={() => setActiveInningsTab(isTeam1Batting ? 'team2' : 'team1')}
                        >
                            {isTeam1Batting ? t2Name : t1Name} Innings (2nd Bat)
                        </button>
                    </div>

                    <div className="sc-scorecard-two-col">
                        {/* Left Sub-Column: Batting Scorecard */}
                        <div className="cx-glass-panel sc-scorecard-panel">
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
                                        <th className="text-center">Wheel</th>
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
                                                            <MdPieChart />
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

                        {/* Right Sub-Column: Bowling Scorecard & Match Details */}
                        <div className="cx-glass-panel sc-scorecard-panel">
                            <div className="cx-panel-header-with-icon">
                                <h3>{bowlingTeamName} Bowling Overview</h3>
                            </div>

                            <table className="cx-scorecard-table">
                                <thead>
                                    <tr>
                                        <th>Bowler</th>
                                        <th className="text-center">O</th>
                                        <th className="text-center">R</th>
                                        <th className="text-center">W</th>
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

                            {/* Partnerships & Match Info Meta Grid inside Row 2 Right Column */}
                            <div className="sc-meta-panels-grid" style={{ marginTop: '16px' }}>
                                <div className="cx-glass-panel" style={{ padding: '12px 14px' }}>
                                    <div className="cx-panel-header-with-icon">
                                        <h3 className="text-center" style={{ fontSize: '0.9rem' }}>Current Partnership</h3>
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

                                <div className="cx-glass-panel" style={{ padding: '12px 14px' }}>
                                    <div className="cx-panel-header-with-icon">
                                        <h3 className="text-center" style={{ fontSize: '0.9rem' }}>Match Details</h3>
                                    </div>
                                    <div className="cx-info-row">
                                        <span>Toss</span>
                                        <span className="cx-info-val sc-toss-info-val">
                                            <span>
                                                {common.tossWinner
                                                    ? `${common.tossWinner} (${common.tossDecision || 'bat'})`
                                                    : 'Pending'}
                                            </span>
                                            <button
                                                type="button"
                                                className="cx-toss-edit-badge-btn"
                                                onClick={handleOpenEditTossModal}
                                                title="Edit Toss Details"
                                            >
                                                <MdEdit /> Edit
                                            </button>
                                        </span>
                                    </div>
                                    <div className="cx-info-row">
                                        <span>Venue</span>
                                        <span className="cx-info-val">{common.venue || 'Faculty Grounds'}</span>
                                    </div>
                                    <div className="cx-info-row">
                                        <span>Overs</span>
                                        <span className="cx-info-val">{common.overLimit || 15} Ov T20</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ROW 3: Full Width Live Commentary at bottom of all content */}
                    <div className="cx-commentary-section sc-full-width-commentary" style={{ marginTop: '20px' }}>
                        <div className="cx-commentary-header">
                            <div className="cx-commentary-title-wrap">
                                <MdTimeline className="comm-icon" />
                                <h3>Live Commentary</h3>
                            </div>
                            <span className="comm-counter">{commentaryList.length} deliveries</span>
                        </div>

                        <div className="cx-commentary-list-wrapper sc-full-comm-list">
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
                                <div className="cx-no-commentary">Deliveries scored above will appear here in real-time.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ============================================================= */}
                {/* 5. WAGON WHEEL MODAL (Exact SVG Sector Generator from LiveScore) */}
                {/* ============================================================= */}
                {showWWheelModal && selectedBatsmanForWheel && (() => {
                    const extractedShots = [];
                    if (selectedBatsmanForWheel.shots) {
                        Object.entries(selectedBatsmanForWheel.shots).forEach(([zoneName, zoneData]) => {
                            const count = zoneData?.count || 0;
                            const totalRuns = zoneData?.runs || 0;
                            const avgRuns = count > 0 ? Math.max(1, Math.round(totalRuns / count)) : 0;
                            if (avgRuns > 0) {
                                for (let i = 0; i < count; i++) {
                                    extractedShots.push({
                                        zone: zoneName,
                                        runs: avgRuns
                                    });
                                }
                            }
                        });
                    }

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

                                <div className="cx-ww-modal-body" style={{ justifyContent: 'center' }}>
                                    <WagonWheel
                                        shots={extractedShots}
                                        batsmanName={selectedBatsmanForWheel.name}
                                        batsmanHand={selectedBatsmanForWheel.hand || 'Right Hand'}
                                        size={380}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* SHOT PLACEMENT QUICK MODAL (Interactive Wagon Wheeler) */}
                {showWagonPlacementModal && pendingBallEvent && (() => {
                    const activeSectors = getActiveSectors(striker.hand || 'Right Hand');
                    return (
                        <div className="sc-modal-overlay" onClick={() => setShowWagonPlacementModal(false)}>
                            <div className="sc-modal-card sc-wagon-wheeler-card" onClick={(e) => e.stopPropagation()}>
                                <div className="sc-ww-card-header">
                                    <div>
                                        <div className="sc-ww-badge">🎯 SHOT PLACEMENT WHEELER</div>
                                        <h3>Select Batted Area</h3>
                                        <p className="sc-modal-sub">
                                            {striker.name} ({striker.hand || 'Right Hand'} Batsman) • <strong>{pendingBallEvent.runs} Run(s)</strong>
                                        </p>
                                    </div>
                                    <button className="cx-btn-close-ww" onClick={() => setShowWagonPlacementModal(false)} title="Close">
                                        <MdClose />
                                    </button>
                                </div>

                                <div className="sc-wheeler-visual-container">
                                    <svg viewBox="0 0 300 300" className="sc-wheeler-svg">
                                        {/* Outer boundary circle */}
                                        <circle cx="150" cy="150" r="140" fill="#07111e" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="2" strokeDasharray="5 5" />
                                        {/* 30-yard circle */}
                                        <circle cx="150" cy="150" r="75" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" strokeDasharray="3 3" />

                                        {/* 8 Clickable Wheeler Sectors */}
                                        {activeSectors.map((s) => {
                                            const pathData = describeArc(150, 150, 134, s.startAngle, s.endAngle);
                                            const textCoords = getLabelCoords(150, 150, 134, s.startAngle, s.endAngle);
                                            return (
                                                <g
                                                    key={s.key}
                                                    className="sc-wheeler-sector"
                                                    onClick={() => handleConfirmWagonPlacement(s.name)}
                                                >
                                                    <path
                                                        d={pathData}
                                                        className="sc-wheeler-sector-slice"
                                                    />
                                                    <text
                                                        x={textCoords.x}
                                                        y={textCoords.y}
                                                        textAnchor="middle"
                                                        alignmentBaseline="middle"
                                                        className="sc-wheeler-sector-label"
                                                    >
                                                        {s.name}
                                                    </text>
                                                </g>
                                            );
                                        })}

                                        {/* Central Pitch */}
                                        <rect x="144" y="118" width="12" height="64" fill="#f59e0b" opacity="0.85" rx="3" />
                                        {/* Batsman Marker */}
                                        <circle cx="150" cy="150" r="4" fill="#00f0ff" />
                                    </svg>
                                </div>

                                <div className="sc-wheeler-quick-chips">
                                    <span className="sc-chips-label">Quick select:</span>
                                    {activeSectors.map(s => (
                                        <button
                                            key={s.key}
                                            type="button"
                                            className="sc-wheel-chip-btn"
                                            onClick={() => handleConfirmWagonPlacement(s.name)}
                                        >
                                            {s.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })()}

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
                                    Declare Result &amp; Finish
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* UNDO CONFIRMATION MODAL */}
                {showUndoConfirmModal && (
                    <div className="sc-modal-overlay" onClick={() => setShowUndoConfirmModal(false)}>
                        <div className="sc-modal-card" onClick={(e) => e.stopPropagation()}>
                            <div className="sc-modal-header-with-badge danger" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MdWarning style={{ fontSize: '1.8rem', color: '#f59e0b' }} />
                                <h3 style={{ margin: 0, color: '#f59e0b' }}>Confirm Undo Delivery</h3>
                            </div>
                            <p className="sc-modal-sub" style={{ marginTop: '10px', lineHeight: '1.5', color: '#cbd5e1' }}>
                                Are you sure you want to undo the last recorded ball delivery? This will restore team scores, wickets, overs, and crease stats to the previous delivery state.
                            </p>

                            <div className="sc-modal-actions" style={{ marginTop: '16px' }}>
                                <button className="cx-btn-secondary" onClick={() => setShowUndoConfirmModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    className="cx-btn-confirm danger"
                                    onClick={() => {
                                        setShowUndoConfirmModal(false);
                                        handleUndo();
                                    }}
                                >
                                    Confirm Undo
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* COMPULSORY NEXT BOWLER SELECTION MODAL (OVER COMPLETE) */}
                {showNextBowlerModal && (
                    <div className="sc-modal-overlay mandatory-modal">
                        <div className="sc-modal-card sc-next-bowler-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="sc-nb-header">
                                <div className="sc-nb-title-group">
                                    <span className="sc-nb-badge">OVER {completedOverNumber} COMPLETE</span>
                                    <h3>🔄 Select Next Bowler</h3>
                                    <p>Over {completedOverNumber} finished! Choose the bowler for Over {completedOverNumber + 1}.</p>
                                </div>
                            </div>

                            <div className="sc-nb-body">
                                <div className="sc-nb-field">
                                    <label>Select Bowler for Over {completedOverNumber + 1}</label>
                                    <div className="sc-nb-bowlers-grid">
                                        {bowlingPlayersList.filter(p => p.type === 'Playing XI').map(p => {
                                            const isJustBowled = String(p.id) === String(lastBowlerId);
                                            const isSelected = String(p.id) === String(selectedNextBowlerId);
                                            const pStats = matchData[currentBowlingTeamKey]?.bowlers?.[p.id] || { overs: 0, runs: 0, wickets: 0 };

                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    disabled={isJustBowled}
                                                    className={`sc-nb-bowler-card ${isSelected ? 'active' : ''} ${isJustBowled ? 'disabled' : ''}`}
                                                    onClick={() => !isJustBowled && setSelectedNextBowlerId(p.id)}
                                                >
                                                    <div className="sc-nb-bname">
                                                        <strong>{p.name}</strong>
                                                        {isJustBowled && <span className="sc-nb-law-tag">Just Bowled (Law 17.1)</span>}
                                                    </div>
                                                    <div className="sc-nb-bstats">
                                                        <span>{pStats.overs || 0} ov</span> •
                                                        <span> {pStats.runs || 0}r</span> •
                                                        <span> {pStats.wickets || 0}w</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="sc-nb-footer">
                                    <button
                                        type="button"
                                        disabled={!selectedNextBowlerId || String(selectedNextBowlerId) === String(lastBowlerId)}
                                        className="sc-nb-confirm-btn"
                                        onClick={async () => {
                                            if (!selectedNextBowlerId) return;
                                            const newBowlerObj = bowlingPlayersList.find(p => String(p.id) === String(selectedNextBowlerId)) || { id: selectedNextBowlerId, name: 'Bowler' };

                                            setBowlerId(selectedNextBowlerId);

                                            const updated = JSON.parse(JSON.stringify(matchData));
                                            const bowlTeam = updated[currentBowlingTeamKey];
                                            if (bowlTeam) {
                                                bowlTeam.bowler = bowlTeam.bowlers?.[selectedNextBowlerId] || newBowlerObj;
                                                bowlTeam.bowlers = bowlTeam.bowlers || {};
                                                if (!bowlTeam.bowlers[selectedNextBowlerId]) {
                                                    bowlTeam.bowlers[selectedNextBowlerId] = {
                                                        id: selectedNextBowlerId,
                                                        name: newBowlerObj.name,
                                                        overs: 0,
                                                        runs: 0,
                                                        wickets: 0,
                                                        economy: '0.00'
                                                    };
                                                }
                                            }

                                            setMatchData(updated);
                                            await updateMatchData(activeMatchTitle, updated, selectedTournamentId);
                                            setShowNextBowlerModal(false);
                                            toastRef.current?.showToast('success', `Bowler changed to ${newBowlerObj.name} for Over ${completedOverNumber + 1}`);
                                        }}
                                    >
                                        Confirm Next Bowler
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {renderTossModal()}
            </div>
            <Footer />
        </div>
    );
};

export default ScoringConsole;
