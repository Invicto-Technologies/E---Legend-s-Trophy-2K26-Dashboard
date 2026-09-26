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
    recordMatchRankings,
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
    MdTimer,
    MdBolt,
    MdAutorenew,
    MdCloudQueue,
    MdGroups,
    MdLock,
    MdLockOpen,
    MdPersonPin
} from 'react-icons/md';
import { GiCricketBat } from 'react-icons/gi';
import { FaCoins, FaTrophy } from 'react-icons/fa6';
import AdminSubNav from '../../../components/Navigation/AdminSubNav';
import { useAdminTournament } from '../../../contexts/AdminTournamentContext';
import { useAdminProcessing } from '../../../contexts/AdminProcessingContext';
import { generateSmartCommentary } from '../../../utils/commentaryEngine';
import WagonWheel from '../../../components/3D/WagonWheel';
import { calculateDlsTarget } from '../../../utils/dlsEngine';
import { calculateMatchResult } from '../../../utils/cricketEngine';
import { isMatchFinished } from '../../../components/common/MatchCard/MatchCard';
import './ScoringConsole.css';

// Reusable helper to check if a player is dismissed in the batting innings
export const isPlayerDismissedInInnings = (player, battingTeamData) => {
    if (!player) return false;
    const pIdStr = player.id != null ? String(player.id) : null;
    const pNameClean = (player.name || '').trim().toLowerCase();

    // 1. Direct status or dismissal property
    if (player.status === 'out') return true;
    if (player.dismissal && typeof player.dismissal === 'string' && player.dismissal.trim() !== '') {
        const dLow = player.dismissal.trim().toLowerCase();
        if (dLow !== 'yet to bat' && dLow !== 'not out') {
            return true;
        }
    }

    if (!battingTeamData) return false;

    // 2. Check team's player map entry
    const pData = pIdStr && battingTeamData.players ? battingTeamData.players[pIdStr] : null;
    if (pData) {
        if (pData.status === 'out') return true;
        if (pData.dismissal && typeof pData.dismissal === 'string' && pData.dismissal.trim() !== '') {
            const dLow = pData.dismissal.trim().toLowerCase();
            if (dLow !== 'yet to bat' && dLow !== 'not out') {
                return true;
            }
        }
    }

    // 3. Check fallOfWickets
    if (battingTeamData.fallOfWickets) {
        const inFow = Object.values(battingTeamData.fallOfWickets).some(f => {
            if (!f) return false;
            const fOutId = f.outBatsman?.id != null ? String(f.outBatsman.id) : null;
            const fBatsmanName = (f.batsman || f.outBatsman?.name || '').trim().toLowerCase();
            if (fOutId && pIdStr && fOutId === pIdStr) return true;
            if (fBatsmanName && pNameClean && fBatsmanName === pNameClean) return true;
            return false;
        });
        if (inFow) return true;
    }

    // 4. Check completed partnerships outBatsman
    if (battingTeamData.partnerships) {
        const inParts = Object.values(battingTeamData.partnerships).some(part => {
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

const ScoringConsole = () => {
    const location = useLocation();
    const toastRef = useRef();
    const { selectedTournamentId } = useAdminTournament();
    const { withProcessing } = useAdminProcessing();

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
    const [adminCommOverFilter, setAdminCommOverFilter] = useState('all');
    const userClosedLauncherRef = useRef(false);
    const liveDataRef = useRef(null);

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

    // Squad Manager (Playing XI & Reserves) Modal State
    const [showSquadManagerModal, setShowSquadManagerModal] = useState(false);
    const [squadManagerTeamKey, setSquadManagerTeamKey] = useState('team1');
    const [squadSwapTarget, setSquadSwapTarget] = useState(null);
    const [squadSwapSelectedId, setSquadSwapSelectedId] = useState('');

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

    // Active Innings Tab ('team1' or 'team2', defaults to currentBattingTeamKey)
    const [activeInningsTab, setActiveInningsTab] = useState(null);

    // Crease state
    const [strikerId, setStrikerId] = useState(null);
    const [nonStrikerId, setNonStrikerId] = useState(null);
    const [bowlerId, setBowlerId] = useState(null);

    // Force Crease Batters Modal & Inline Unlock
    const [showForceChangeModal, setShowForceChangeModal] = useState(false);
    const [forceStrikerId, setForceStrikerId] = useState('');
    const [forceNonStrikerId, setForceNonStrikerId] = useState('');
    const [forceReinstateOut, setForceReinstateOut] = useState(true);
    const [isForceCreaseUnlocked, setIsForceCreaseUnlocked] = useState(false);

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
    const [runOutRuns, setRunOutRuns] = useState(0);
    const [showExtrasModal, setShowExtrasModal] = useState(false);
    const [extraType, setExtraType] = useState('Wide');
    const [extraRuns, setExtraRuns] = useState(0);
    const [noBallRunsSource, setNoBallRunsSource] = useState('bat'); // 'bat' | 'bye' | 'legBye'
    const [showFinishModal, setShowFinishModal] = useState(false);
    const [showUndoConfirmModal, setShowUndoConfirmModal] = useState(false);
    const [showSwitchInningsModal, setShowSwitchInningsModal] = useState(false);
    const [secondInningsStrikerId, setSecondInningsStrikerId] = useState('');
    const [secondInningsNonStrikerId, setSecondInningsNonStrikerId] = useState('');
    const [secondInningsBowlerId, setSecondInningsBowlerId] = useState('');
    const [momSelection, setMomSelection] = useState('');

    // DLS / Rain Delay State
    const [showDlsModal, setShowDlsModal] = useState(false);
    const [dlsRevisedOvers, setDlsRevisedOvers] = useState('');
    const [dlsOfficialTarget, setDlsOfficialTarget] = useState('');
    const [dlsCalculationData, setDlsCalculationData] = useState(null);
    const [dlsIsManual, setDlsIsManual] = useState(false);

    // Next Bowler Modal State (Compulsory after over finishes)
    const [showNextBowlerModal, setShowNextBowlerModal] = useState(false);
    const [selectedNextBowlerId, setSelectedNextBowlerId] = useState('');
    const [completedOverNumber, setCompletedOverNumber] = useState(0);
    const [lastBowlerId, setLastBowlerId] = useState(null);

    // Next Batsman Modal State (Compulsory after wicket falls)
    const [showNextBatterModal, setShowNextBatterModal] = useState(false);
    const [nextBatterModalData, setNextBatterModalData] = useState(null);
    const [selectedNextBatterId, setSelectedNextBatterId] = useState('');
    const [nextBatterStrikeRole, setNextBatterStrikeRole] = useState('striker'); // 'striker' | 'nonStriker'

    // Embedded Wheeler / Inline Config Panel Mode ('wheeler' | 'extras' | 'wicket')
    const [inlinePanelMode, setInlinePanelMode] = useState('wheeler');

    const handleOpenInlineExtra = (type) => {
        setExtraType(type);
        setNoBallRunsSource('bat');
        if (type === 'Penalty') {
            setExtraRuns(5); // 5 runs standard penalty by default
        } else if (type === 'Bye' || type === 'Leg Bye') {
            setExtraRuns(1); // 1 run (no mandatory penalty) by default
        } else {
            setExtraRuns(0); // 0 extra runs beyond +1 mandatory penalty by default
        }
        setInlinePanelMode('extras');
    };

    const handleOpenInlineWicket = (type) => {
        setDismissalType(type);
        setDismissalFielder('');
        setDismissalBatterId(strikerId);
        setRunOutRuns(0);
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
            const published = data?.isFixtures === 1 && !data?.isDraft;
            setIsDrawPublished(published);
            if (published && data?.finishedMatches) {
                const list = Array.isArray(data.finishedMatches)
                    ? data.finishedMatches.filter(Boolean)
                    : Object.values(data.finishedMatches).filter(Boolean);
                setPublishedMatches(list);

                if (initialMatch && list.some(m => m.title === initialMatch)) {
                    const targetMatch = list.find(m => m.title === initialMatch);
                    if (!isMatchFinished(targetMatch)) {
                        setSelectedMatchTitle(initialMatch);
                    }
                }
            } else {
                setPublishedMatches([]);
                setSelectedMatchTitle('');
            }
        }, selectedTournamentId);

        return () => unsubFix();
    }, [selectedTournamentId, initialMatch]);

    // Alert if user navigated directly with a match parameter while the draw is unpublished
    useEffect(() => {
        if (initialMatch && !isDrawPublished && publishedMatches.length === 0) {
            const timer = setTimeout(() => {
                if (!isDrawPublished) {
                    toastRef.current?.showToast(
                        'warning',
                        `Cannot score "${initialMatch}": Tournament draw is unpublished. Fixtures must be published in Draw Management before starting match scoring.`
                    );
                }
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [initialMatch, isDrawPublished, publishedMatches.length]);

    // 1b. Automatically redirect to active match scoring board if a match is live in this tournament
    useEffect(() => {
        const unsubLive = subscribeLiveData((data) => {
            liveDataRef.current = data;
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
        const teamObj = findTeamData(teamName) || {};
        const squadList = Object.values(teamObj.players || {}).map((p, idx) => ({
            id: p.id || idx + 1,
            name: p.name || `${teamName} Player ${idx + 1}`,
            hand: p.hand || 'Right Hand',
            role: p.role || '',
            type: p.type || (idx < 11 ? 'Playing XI' : 'Reserve'),
            imageUrl: p.imageUrl || p.ImageURL || p.image || p.photo || ''
        }));
        const extraList = Object.values(teamObj.extraPlayers || {}).map((p, idx) => ({
            id: p.id || (squadList.length + idx + 1),
            name: p.name || `${teamName} Reserve ${idx + 1}`,
            hand: p.hand || 'Right Hand',
            role: p.role || '',
            type: p.type || 'Reserve',
            imageUrl: p.imageUrl || p.ImageURL || p.image || p.photo || ''
        }));
        const rawList = [...squadList, ...extraList];
        if (rawList.length > 0) {
            return rawList;
        }
        return Array.from({ length: 11 }, (_, i) => ({
            id: i + 1,
            name: `${teamName} Player ${i + 1}`,
            hand: i % 4 === 0 ? 'Left Hand' : 'Right Hand',
            role: '',
            type: 'Playing XI',
            imageUrl: ''
        }));
    };

    // Helper to find team data from teamsData registry by name/key/id
    const findTeamData = (teamIdentifier) => {
        if (!teamIdentifier) return null;
        if (teamsData[teamIdentifier]) return teamsData[teamIdentifier];
        return Object.values(teamsData).find(t =>
            t?.name?.toLowerCase() === String(teamIdentifier).toLowerCase() ||
            t?.key?.toLowerCase() === String(teamIdentifier).toLowerCase() ||
            String(t?.id) === String(teamIdentifier)
        ) || Object.entries(teamsData).find(([k, v]) =>
            k.toLowerCase() === String(teamIdentifier).toLowerCase() ||
            v?.name?.toLowerCase() === String(teamIdentifier).toLowerCase()
        )?.[1] || {};
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

    // Helper to robustly resolve player type (Playing XI vs Reserve)
    const resolvePlayerType = (p, teamObj, isLocked = false, rosterIndex = 0) => {
        if (isLocked) return 'Playing XI';
        if (p?.type === 'Playing XI' || p?.type === 'Reserve') {
            return p.type;
        }
        const isExtraPlayer = Boolean(teamObj?.extraPlayers?.[p?.id]) ||
            Object.values(teamObj?.extraPlayers || {}).some(ep =>
                String(ep.id) === String(p?.id) ||
                (ep.name && p?.name && ep.name.trim().toLowerCase() === p.name.trim().toLowerCase())
            );
        if (isExtraPlayer) {
            return 'Reserve';
        }
        const squadPlayer = teamObj?.players?.[p?.id] ||
            Object.values(teamObj?.players || {}).find(sp =>
                String(sp.id) === String(p?.id) ||
                (sp.nic && sp.nic === p?.nic) ||
                (sp.name && p?.name && sp.name.trim().toLowerCase() === p.name.trim().toLowerCase())
            );
        if (squadPlayer?.type) {
            return squadPlayer.type;
        }
        return rosterIndex < 11 ? 'Playing XI' : 'Reserve';
    };

    // Helper to construct structured player roster for a team
    const buildPlayers = (teamObj, defaultPrefix = 'Player') => {
        const result = {};
        const squadList = Object.values(teamObj?.players || {})
            .sort((a, b) => {
                const orderA = (a.order !== undefined && a.order !== null) ? Number(a.order) : ((a.battingOrder !== undefined && a.battingOrder !== null) ? Number(a.battingOrder) : 999);
                const orderB = (b.order !== undefined && b.order !== null) ? Number(b.order) : ((b.battingOrder !== undefined && b.battingOrder !== null) ? Number(b.battingOrder) : 999);
                return orderA - orderB;
            })
            .map((p, idx) => ({
                ...p,
                lineupOrder: idx + 1,
                type: p.type || (idx < 11 ? 'Playing XI' : 'Reserve')
            }));
        const extraList = Object.values(teamObj?.extraPlayers || {}).map(p => ({
            ...p,
            type: p.type || 'Reserve'
        }));
        const rawList = [...squadList, ...extraList];
        if (rawList.length > 0) {
            rawList.forEach((p, idx) => {
                const pid = p.id || idx + 1;
                result[pid] = {
                    id: pid,
                    name: p.name || `${defaultPrefix} Player ${idx + 1}`,
                    imageUrl: p.imageUrl || p.ImageURL || p.imageuRL || p.image || p.photo || '',
                    role: p.role || 'All Rounder',
                    lineupOrder: p.lineupOrder || idx + 1,
                    runs: p.runs || 0,
                    balls: p.balls || 0,
                    boundaries: { fours: p.fours || 0, sixes: p.sixes || 0, singles: 0, twos: 0 },
                    strikeRate: '0.00',
                    dismissal: '',
                    status: p.status || 'yet to bat',
                    hand: p.hand || (idx % 3 === 0 ? 'Left Hand' : 'Right Hand'),
                    type: p.type || (idx < 11 ? 'Playing XI' : 'Reserve'),
                    shots: {}
                };
            });
        } else {
            for (let i = 1; i <= 15; i++) {
                result[i] = {
                    id: i,
                    name: `${defaultPrefix} Player ${i}`,
                    imageUrl: '',
                    role: 'Player',
                    runs: 0,
                    balls: 0,
                    boundaries: { fours: 0, sixes: 0, singles: 0, twos: 0 },
                    strikeRate: '0.00',
                    dismissal: '',
                    status: 'yet to bat',
                    hand: i % 4 === 0 ? 'Left Hand' : 'Right Hand',
                    type: i <= 11 ? 'Playing XI' : 'Reserve',
                    shots: {}
                };
            }
        }
        return result;
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
            bowlerId: chosenBowlerId,
            isSpecial: isSpecialMatch = false,
            matchType: matchTypeVal = 'tournament'
        } = tossConfig;

        const t1Obj = findTeamData(t1Name) || {};
        const t2Obj = findTeamData(t2Name) || {};

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
            if (t1BallFace) {
                t1BallFace.status = 'batting';
                t1BallFace.groundArrivalOrder = 1;
                t1BallFace.battingOrder = 1;
                if (t1Players[t1BallFace.id]) {
                    t1Players[t1BallFace.id].status = 'batting';
                    t1Players[t1BallFace.id].groundArrivalOrder = 1;
                    t1Players[t1BallFace.id].battingOrder = 1;
                }
            }
            if (t1OtherSide) {
                t1OtherSide.status = 'batting';
                t1OtherSide.groundArrivalOrder = 2;
                t1OtherSide.battingOrder = 2;
                if (t1Players[t1OtherSide.id]) {
                    t1Players[t1OtherSide.id].status = 'batting';
                    t1Players[t1OtherSide.id].groundArrivalOrder = 2;
                    t1Players[t1OtherSide.id].battingOrder = 2;
                }
            }
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
            if (t2BallFace) {
                t2BallFace.status = 'batting';
                t2BallFace.groundArrivalOrder = 1;
                t2BallFace.battingOrder = 1;
                if (t2Players[t2BallFace.id]) {
                    t2Players[t2BallFace.id].status = 'batting';
                    t2Players[t2BallFace.id].groundArrivalOrder = 1;
                    t2Players[t2BallFace.id].battingOrder = 1;
                }
            }
            if (t2OtherSide) {
                t2OtherSide.status = 'batting';
                t2OtherSide.groundArrivalOrder = 2;
                t2OtherSide.battingOrder = 2;
                if (t2Players[t2OtherSide.id]) {
                    t2Players[t2OtherSide.id].status = 'batting';
                    t2Players[t2OtherSide.id].groundArrivalOrder = 2;
                    t2Players[t2OtherSide.id].battingOrder = 2;
                }
            }
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
                result: '',
                isSpecial: Boolean(isSpecialMatch),
                matchType: matchTypeVal
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
                const activeInningsNum = data.common?.activeInnings || 1;
                const isT1Bat = activeInningsNum === 1 ? (data.common?.firstBat === 1) : (data.common?.firstBat !== 1);
                const bKey = isT1Bat ? 'team1' : 'team2';
                const bowlKey = isT1Bat ? 'team2' : 'team1';
                const currentBatting = data[bKey];
                const currentBowling = data[bowlKey];

                const bList = Object.values(currentBatting?.players || {});
                const totalBalls = Number(currentBatting?.totalBalls || 0);
                const totalWickets = Number(currentBatting?.totalWickets || 0);

                // Safe resolution of Striker (never pick a player who is already dismissed)
                let resolvedStrikerId = null;
                if (currentBatting?.ballFaceBatsman?.id != null) {
                    const sId = currentBatting.ballFaceBatsman.id;
                    const sPlayer = bList.find(p => String(p.id) === String(sId)) || currentBatting.players?.[sId] || currentBatting.ballFaceBatsman;
                    if (!isPlayerDismissedInInnings(sPlayer, currentBatting)) {
                        resolvedStrikerId = sId;
                    }
                }

                // Safe resolution of Non-Striker (never pick a player who is already dismissed or striker)
                let resolvedNonStrikerId = null;
                if (currentBatting?.otherSideBatsman?.id != null) {
                    const nsId = currentBatting.otherSideBatsman.id;
                    const nsPlayer = bList.find(p => String(p.id) === String(nsId)) || currentBatting.players?.[nsId] || currentBatting.otherSideBatsman;
                    if (!isPlayerDismissedInInnings(nsPlayer, currentBatting) && String(nsId) !== String(resolvedStrikerId)) {
                        resolvedNonStrikerId = nsId;
                    }
                }

                // If either is missing, check active currentPartnership
                const curPart = currentBatting?.currentPartnership;
                if (curPart) {
                    if (resolvedStrikerId == null && curPart.batsman1?.id != null && !isPlayerDismissedInInnings(curPart.batsman1, currentBatting)) {
                        resolvedStrikerId = curPart.batsman1.id;
                    }
                    if (resolvedNonStrikerId == null && curPart.batsman2?.id != null && !isPlayerDismissedInInnings(curPart.batsman2, currentBatting) && String(curPart.batsman2.id) !== String(resolvedStrikerId)) {
                        resolvedNonStrikerId = curPart.batsman2.id;
                    }
                }

                // Fallback check to players marked as 'batting' / 'striker' / 'non-striker'
                const notOutBatters = bList.filter(p => !isPlayerDismissedInInnings(p, currentBatting));
                if (resolvedStrikerId == null) {
                    const activeBat = notOutBatters.find(p => (p.status === 'batting' || p.status === 'striker') && String(p.id) !== String(resolvedNonStrikerId));
                    if (activeBat) resolvedStrikerId = activeBat.id;
                }
                if (resolvedNonStrikerId == null) {
                    const activeNonBat = notOutBatters.find(p => (p.status === 'non-striker' || (p.status === 'batting' && String(p.id) !== String(resolvedStrikerId))));
                    if (activeNonBat) resolvedNonStrikerId = activeNonBat.id;
                }

                // ONLY if the innings has NOT started yet (0 balls & 0 wickets): default to first 2 available not-out openers
                if (totalBalls === 0 && totalWickets === 0) {
                    if (resolvedStrikerId == null && notOutBatters.length >= 1) {
                        resolvedStrikerId = notOutBatters[0].id;
                    }
                    if (resolvedNonStrikerId == null && notOutBatters.length >= 2) {
                        resolvedNonStrikerId = notOutBatters.find(p => String(p.id) !== String(resolvedStrikerId))?.id || notOutBatters[1]?.id;
                    }
                }

                // If a wicket just fell during live play, resolvedStrikerId or resolvedNonStrikerId will properly stay null (Select Batsman...)
                setStrikerId(resolvedStrikerId != null ? resolvedStrikerId : null);
                setNonStrikerId(resolvedNonStrikerId != null ? resolvedNonStrikerId : null);

                const bowlList = Object.values(currentBowling?.bowlers || currentBowling?.players || {});
                if (currentBowling?.bowler?.id != null) {
                    setBowlerId(currentBowling.bowler.id);
                } else if (bowlList.length > 0) {
                    setBowlerId(prev => prev || bowlList[0].id);
                }
            } else {
                setMatchData(null);
            }
        }, selectedTournamentId);

        return () => unsubMatch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isScoringActive, activeMatchTitle, selectedTournamentId]);

    // 1. Initiate start or switch match scoring -> Triggers Toss Setup Modal
    const handleInitiateStartScoring = async (overrideTitle) => {
        if (!isDrawPublished) {
            toastRef.current?.showToast(
                'error',
                'Cannot start match scoring: The tournament draw is currently unpublished. Please publish the draw in Draw Management before starting match scoring.'
            );
            return;
        }

        const targetTitle = typeof overrideTitle === 'string' ? overrideTitle : selectedMatchTitle;
        if (!targetTitle) {
            toastRef.current?.showToast('warning', 'Please select a match from the published draw first.');
            return;
        }

        // Rule: matches can't start when another match is live
        const currentLive = liveDataRef.current;
        if (currentLive?.isLive) {
            const liveMatchName = (currentLive.currentMatchPath
                ? currentLive.currentMatchPath.split('/').pop()
                : currentLive.liveScore?.matchTitle || '').trim();

            if (liveMatchName && liveMatchName.toLowerCase() !== targetTitle.toLowerCase()) {
                toastRef.current?.showToast(
                    'error',
                    `Cannot start scoring: Match "${liveMatchName}" is currently LIVE! Only one match can be live at a time.`
                );
                return;
            }
        }

        const selectedFixture = publishedMatches.find(m => m.title === targetTitle);
        if (!selectedFixture) {
            toastRef.current?.showToast('error', 'Selected match is not in the published tournament draw.');
            return;
        }

        if (isMatchFinished(selectedFixture)) {
            toastRef.current?.showToast(
                'error',
                `Cannot start scoring: Match "${targetTitle}" is already completed and finalized! Completed matches cannot be restarted.`
            );
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
        if (!isEditingTossOnly && !isDrawPublished) {
            toastRef.current?.showToast(
                'error',
                'Cannot start match scoring: The tournament draw is currently unpublished. Please publish the draw in Draw Management before starting match scoring.'
            );
            return;
        }

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
            await withProcessing(async () => {
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
                    if (matchData?.team1?.players) updates['team1/players'] = matchData.team1.players;
                    // Check if previous opening batters changed before batting any ball
                    const prevStrikerId = matchData?.[bKey]?.ballFaceBatsman?.id;
                    const prevNonStrikerId = matchData?.[bKey]?.otherSideBatsman?.id;
                    if (prevStrikerId && String(prevStrikerId) !== String(newStriker?.id) && String(prevStrikerId) !== String(newNonStriker?.id)) {
                        const prevP = matchData?.[bKey]?.players?.[prevStrikerId];
                        if (prevP && (prevP.balls || 0) === 0 && (prevP.runs || 0) === 0) {
                            updates[`${bKey}/players/${prevStrikerId}/status`] = 'yet to bat';
                            updates[`${bKey}/players/${prevStrikerId}/dismissal`] = '';
                            updates[`${bKey}/players/${prevStrikerId}/battingOrder`] = null;
                            updates[`${bKey}/players/${prevStrikerId}/groundArrivalOrder`] = null;
                        }
                    }
                    if (prevNonStrikerId && String(prevNonStrikerId) !== String(newStriker?.id) && String(prevNonStrikerId) !== String(newNonStriker?.id)) {
                        const prevP = matchData?.[bKey]?.players?.[prevNonStrikerId];
                        if (prevP && (prevP.balls || 0) === 0 && (prevP.runs || 0) === 0) {
                            updates[`${bKey}/players/${prevNonStrikerId}/status`] = 'yet to bat';
                            updates[`${bKey}/players/${prevNonStrikerId}/dismissal`] = '';
                            updates[`${bKey}/players/${prevNonStrikerId}/battingOrder`] = null;
                            updates[`${bKey}/players/${prevNonStrikerId}/groundArrivalOrder`] = null;
                        }
                    }

                    if (newStriker) {
                        updates[`${bKey}/ballFaceBatsman`] = newStriker;
                        updates[`${bKey}/players/${newStriker.id}/status`] = 'batting';
                        updates[`${bKey}/players/${newStriker.id}/dismissal`] = '';
                        updates[`${bKey}/players/${newStriker.id}/battingOrder`] = 1;
                        updates[`${bKey}/players/${newStriker.id}/groundArrivalOrder`] = 1;
                        setStrikerId(newStriker.id);
                    }
                    if (newNonStriker) {
                        updates[`${bKey}/otherSideBatsman`] = newNonStriker;
                        updates[`${bKey}/players/${newNonStriker.id}/status`] = 'batting';
                        updates[`${bKey}/players/${newNonStriker.id}/dismissal`] = '';
                        updates[`${bKey}/players/${newNonStriker.id}/battingOrder`] = 2;
                        updates[`${bKey}/players/${newNonStriker.id}/groundArrivalOrder`] = 2;
                        setNonStrikerId(newNonStriker.id);
                    }
                    if (newBowler) {
                        updates[`${bowlKey}/bowler`] = newBowler;
                        updates[`${bowlKey}/bowlers/${newBowler.id}`] = newBowler;
                        setBowlerId(newBowler.id);
                    }

                    await updateMatchData(activeMatchTitle, updates, selectedTournamentId);

                    const cleanTitle = activeMatchTitle.replace(/^\//, '').split('/').pop();
                    await updateLiveData({
                        isLive: 1,
                        currentMatchPath: cleanTitle,
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
            }, 'Updating Toss...', 'Saving match toss and crease setup in real-time database...');
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
        await withProcessing(async () => {
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
                const isSpecialFixture = Boolean(fixture?.isSpecial || fixture?.matchType === 'special');
                const newMatch = createDefaultMatch(targetTitle, t1, t2, {
                    tossWinner,
                    tossDecision,
                    firstBat,
                    firstBattingTeam,
                    overLimit,
                    status: tossStatusText,
                    strikerId: chosenStrikerId,
                    nonStrikerId: chosenNonStrikerId,
                    bowlerId: chosenBowlerId,
                    isSpecial: isSpecialFixture,
                    matchType: isSpecialFixture ? 'special' : 'tournament'
                });
                newMatch.isSpecial = isSpecialFixture;
                newMatch.matchType = isSpecialFixture ? 'special' : 'tournament';

                // If currentMatch already has customized player rosters from Draw Management / Teams,
                // preserve their identity (id, name, hand, role, image, type) but reset all scoring stats to 0!
                const resetPlayerStats = (playerObj, isBattingNow) => ({
                    ...playerObj,
                    runs: 0,
                    balls: 0,
                    fours: 0,
                    sixes: 0,
                    boundaries: { fours: 0, sixes: 0, singles: 0, twos: 0 },
                    strikeRate: '0.00',
                    dismissal: '',
                    status: isBattingNow ? 'batting' : 'yet to bat',
                    shots: {}
                });

                if (currentMatch?.team1?.players && Object.keys(currentMatch.team1.players).length > 0) {
                    const freshP1 = {};
                    Object.values(currentMatch.team1.players).forEach((p, idx) => {
                        const pid = p.id || idx + 1;
                        const isBatting = firstBat === 1 && (String(pid) === String(chosenStrikerId) || String(pid) === String(chosenNonStrikerId));
                        freshP1[pid] = resetPlayerStats(p, isBatting);
                    });
                    newMatch.team1.players = freshP1;
                }

                if (currentMatch?.team2?.players && Object.keys(currentMatch.team2.players).length > 0) {
                    const freshP2 = {};
                    Object.values(currentMatch.team2.players).forEach((p, idx) => {
                        const pid = p.id || idx + 1;
                        const isBatting = firstBat === 2 && (String(pid) === String(chosenStrikerId) || String(pid) === String(chosenNonStrikerId));
                        freshP2[pid] = resetPlayerStats(p, isBatting);
                    });
                    newMatch.team2.players = freshP2;
                }

                const bKey = firstBat === 1 ? 'team1' : 'team2';
                const bowlKey = firstBat === 1 ? 'team2' : 'team1';
                const bSquad = Object.values(newMatch[bKey]?.players || {});
                const bowlSquad = Object.values(newMatch[bowlKey]?.players || {});

                const selStriker = bSquad.find(p => String(p.id) === String(chosenStrikerId)) || bSquad[0] || { name: 'Striker', id: chosenStrikerId || 1 };
                const selNonStriker = bSquad.find(p => String(p.id) === String(chosenNonStrikerId)) || bSquad[1] || { name: 'Non-Striker', id: chosenNonStrikerId || 2 };
                const selBowler = bowlSquad.find(p => String(p.id) === String(chosenBowlerId)) || bowlSquad[0] || { name: 'Opening Bowler', id: chosenBowlerId || 1 };

                selStriker.status = 'batting';
                selStriker.groundArrivalOrder = 1;
                selStriker.battingOrder = 1;
                selNonStriker.status = 'batting';
                selNonStriker.groundArrivalOrder = 2;
                selNonStriker.battingOrder = 2;
                if (newMatch[bKey].players[selStriker.id]) {
                    newMatch[bKey].players[selStriker.id].status = 'batting';
                    newMatch[bKey].players[selStriker.id].groundArrivalOrder = 1;
                    newMatch[bKey].players[selStriker.id].battingOrder = 1;
                }
                if (newMatch[bKey].players[selNonStriker.id]) {
                    newMatch[bKey].players[selNonStriker.id].status = 'batting';
                    newMatch[bKey].players[selNonStriker.id].groundArrivalOrder = 2;
                    newMatch[bKey].players[selNonStriker.id].battingOrder = 2;
                }

                newMatch[bKey].ballFaceBatsman = selStriker;
                newMatch[bKey].otherSideBatsman = selNonStriker;
                newMatch[bKey].currentPartnership = {
                    batsman1: selStriker,
                    batsman2: selNonStriker,
                    batsman1Runs: 0,
                    batsman1Balls: 0,
                    batsman2Runs: 0,
                    batsman2Balls: 0,
                    startScore: 0,
                    startBalls: 0
                };

                newMatch[bowlKey].bowler = selBowler;
                newMatch[bowlKey].bowlers = {
                    [selBowler.id]: {
                        id: selBowler.id,
                        name: selBowler.name,
                        overs: 0,
                        runs: 0,
                        wickets: 0,
                        economy: '0.00'
                    }
                };

                if (fixture?.date) newMatch.common.date = fixture.date;
                if (fixture?.time) newMatch.common.time = fixture.time;
                if (fixture?.venue) newMatch.common.venue = fixture.venue;
                newMatch.common.status = tossStatusText;
                newMatch.common.finished = 0;
                newMatch.common.result = '';
                newMatch.common.score = '0/0 (0.0)';
                newMatch.common.activeInnings = 1;

                // Completely set the new match node in Firebase RTDB to guarantee a brand new scorecard
                await setRtdbMatchData(targetTitle, newMatch, selectedTournamentId);
                currentMatch = newMatch;

                const activeStrikerObj = selStriker;
                const activeNonStrikerObj = selNonStriker;
                const activeBowlerObj = selBowler;

                setStrikerId(activeStrikerObj.id);
                setNonStrikerId(activeNonStrikerObj.id);
                setBowlerId(activeBowlerObj.id);

                const cleanTitle = targetTitle.replace(/^\//, '').split('/').pop();
                await updateLiveData({
                    isLive: 1,
                    currentMatchPath: cleanTitle,
                    liveScore: {
                        matchTitle: targetTitle,
                        firstBat: firstBat,
                        status: `${t1} vs ${t2} • ${activeStrikerObj.name} & ${activeNonStrikerObj.name} batting, ${activeBowlerObj.name} bowling`,
                        team1: {
                            name: currentMatch.team1?.name || t1,
                            overs: 0,
                            score: 0,
                            wicket: 0
                        },
                        team2: {
                            name: currentMatch.team2?.name || t2,
                            overs: 0,
                            score: 0,
                            wicket: 0
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
        }, 'Starting Match Scoring...', 'Initializing live scorecard and crease lineups in database...');
    };


    const selectedFixture = publishedMatches.find(m => m.title === selectedMatchTitle);
    const isSelectedFixtureFinished = Boolean(selectedFixture && isMatchFinished(selectedFixture));
    const isMatchSelected = Boolean(selectedMatchTitle && selectedFixture && !isSelectedFixtureFinished);

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
                                                        const isCompleted = isMatchFinished(m);
                                                        const scheduleInfo = m.date ? ` • ${m.date}${m.time ? ` at ${m.time}` : ''}` : '';
                                                        const stageTag = isCompleted ? 'COMPLETED' : (m.stage || 'SCHEDULED');
                                                        return (
                                                            <button
                                                                key={m.id || m.title}
                                                                type="button"
                                                                role="option"
                                                                aria-selected={isSelected}
                                                                aria-disabled={isCompleted}
                                                                disabled={isCompleted}
                                                                className={`dropdown-option-item ${isSelected ? 'selected' : ''} ${isCompleted ? 'is-completed-match-option' : ''}`}
                                                                onClick={() => {
                                                                    if (isCompleted) return;
                                                                    setSelectedMatchTitle(m.title);
                                                                    setIsMatchDropdownOpen(false);
                                                                }}
                                                                title={isCompleted ? `"${m.title}" is already completed and finalized. It cannot be selected for scoring.` : `Select ${m.title}`}
                                                            >
                                                                <div className={`option-trophy-bubble ${isSelected ? '' : isCompleted ? 'completed' : 'neutral'}`}>
                                                                    {isCompleted ? <MdLock /> : <MdSportsCricket />}
                                                                </div>
                                                                <div className="option-details">
                                                                    <div className="option-title-row">
                                                                        <span className="option-name">{m.title}</span>
                                                                        <span className={`option-meta-pill ${isCompleted ? 'pill-completed' : ''}`}>{stageTag}</span>
                                                                    </div>
                                                                    <span className="option-sub">
                                                                        {m.teams || `${m.team1} vs ${m.team2}`}{scheduleInfo}
                                                                        {isCompleted && m.result && (
                                                                            <span className="completed-result-hint"> • {m.result}</span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                {isSelected && <MdCheck className="option-check-icon" />}
                                                                {isCompleted && (
                                                                    <span className="option-lock-tag" title="Finalized / Completed">
                                                                        <MdLock /> Finalized
                                                                    </span>
                                                                )}
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
                                    className={`sc-start-scoring-btn ${isMatchSelected ? 'enabled' : 'disabled'} ${isSelectedFixtureFinished ? 'fixture-finalized' : ''}`}
                                    disabled={!isMatchSelected || isStartingMatch}
                                    onClick={() => handleInitiateStartScoring()}
                                    title={
                                        isSelectedFixtureFinished
                                            ? `"${selectedMatchTitle}" is already completed and finalized. It cannot be re-scored.`
                                            : !isMatchSelected
                                                ? 'Select an upcoming match from the published draw dropdown above to enable scoring'
                                                : `Start scoring ${selectedMatchTitle}`
                                    }
                                >
                                    {isSelectedFixtureFinished ? (
                                        <MdLock className="btn-icon" />
                                    ) : isMatchSelected ? (
                                        <MdPlayArrow className="btn-icon" />
                                    ) : (
                                        <MdSportsCricket className="btn-icon" />
                                    )}
                                    <span>
                                        {isStartingMatch
                                            ? 'Connecting Scoring Engine...'
                                            : isSelectedFixtureFinished
                                                ? 'Match Already Completed (Finalized)'
                                                : isMatchSelected
                                                    ? `Start Scoring: ${selectedMatchTitle}`
                                                    : 'Select an Upcoming Match to Enable Scoring'}
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

    const activeInningsNumber = common.activeInnings || 1;
    const isTeam1Batting = activeInningsNumber === 1 ? (common.firstBat === 1) : (common.firstBat !== 1);
    const currentBattingTeamKey = isTeam1Batting ? 'team1' : 'team2';
    const currentBowlingTeamKey = isTeam1Batting ? 'team2' : 'team1';

    // Active Match Batting & Fielding Teams currently in play on the pitch
    // (ALWAYS strictly bound to the live innings, never hijacked by scorecard review tabs)
    const battingTeamData = matchData[currentBattingTeamKey] || (isTeam1Batting ? team1 : team2);
    const bowlingTeamData = matchData[currentBowlingTeamKey] || (isTeam1Batting ? team2 : team1);
    const bowlingTeamName = currentBowlingTeamKey === 'team1' ? t1Name : t2Name;

    // Parse Batting Players (Batting side currently taking the crease)
    const rawPlayersList = Object.values(battingTeamData.players || {});
    const battingTeamObj = findTeamData(battingTeamData.name) || findTeamData(currentBattingTeamKey === 'team1' ? t1Name : t2Name) || {};
    const playersList = rawPlayersList.map((p, idx) => {
        const squadPlayer = battingTeamObj?.players?.[p.id] || Object.values(battingTeamObj?.players || {}).find(sp => sp.nic === p.nic || sp.name === p.name);
        const rawHand = squadPlayer?.hand || p.hand || 'RHB';
        const normHand = (rawHand === 'LHB' || rawHand === 'LHS' || String(rawHand).toLowerCase().includes('left')) ? 'LHB' : 'RHB';
        return {
            ...p,
            type: resolvePlayerType(p, battingTeamObj, false, idx),
            hand: normHand,
            bowlingStyle: squadPlayer?.bowlingStyle || p.bowlingStyle || ''
        };
    });
    const playingXI = playersList.filter(p => p.type === 'Playing XI');
    const reserves = playersList.filter(p => p.type === 'Reserve');

    // Parse Bowling / Fielding Players (Fielding side currently out on the ground)
    const rawBowlingPlayersList = Object.values(bowlingTeamData.players || {});
    const bowlingTeamObj = findTeamData(bowlingTeamData.name) || findTeamData(currentBowlingTeamKey === 'team1' ? t1Name : t2Name) || {};
    const bowlingPlayersList = rawBowlingPlayersList.map((p, idx) => {
        const squadPlayer = bowlingTeamObj?.players?.[p.id] || Object.values(bowlingTeamObj?.players || {}).find(sp => sp.nic === p.nic || sp.name === p.name);
        const rawHand = squadPlayer?.hand || p.hand || 'RHB';
        const normHand = (rawHand === 'LHB' || rawHand === 'LHS' || String(rawHand).toLowerCase().includes('left')) ? 'LHB' : 'RHB';
        return {
            ...p,
            type: resolvePlayerType(p, bowlingTeamObj, false, idx),
            hand: normHand,
            bowlingStyle: squadPlayer?.bowlingStyle || p.bowlingStyle || ''
        };
    });
    const bowlingReserves = bowlingPlayersList.filter(p => p.type === 'Reserve');

    // Scorecard Tab Selection (For reviewing 1st / 2nd innings scorecard breakdown at bottom of console)
    // Default active innings tab is always the current batting team tab
    const tabBattingTeamKey = activeInningsTab || currentBattingTeamKey;
    const tabBattingTeamData = matchData[tabBattingTeamKey] || (tabBattingTeamKey === 'team1' ? team1 : team2);
    const tabBowlingTeamKey = tabBattingTeamKey === 'team1' ? 'team2' : 'team1';
    const tabBowlingTeamData = matchData[tabBowlingTeamKey] || (tabBowlingTeamKey === 'team1' ? team2 : team1);
    const tabBattingTeamName = tabBattingTeamKey === 'team1' ? t1Name : t2Name;
    const tabBowlingTeamName = tabBowlingTeamKey === 'team1' ? t2Name : t1Name;

    const rawTabPlayersList = Object.values(tabBattingTeamData.players || {});
    const tabBattingTeamObj = findTeamData(tabBattingTeamData.name) || findTeamData(tabBattingTeamName) || {};
    const tabPlayersList = rawTabPlayersList.map((p, idx) => {
        const squadPlayer = tabBattingTeamObj?.players?.[p.id] || Object.values(tabBattingTeamObj?.players || {}).find(sp => sp.nic === p.nic || sp.name === p.name);
        const rawHand = squadPlayer?.hand || p.hand || 'RHB';
        const normHand = (rawHand === 'LHB' || rawHand === 'LHS' || String(rawHand).toLowerCase().includes('left')) ? 'LHB' : 'RHB';
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
            type: resolvePlayerType(p, tabBattingTeamObj, false, idx),
            hand: normHand,
            bowlingStyle: squadPlayer?.bowlingStyle || p.bowlingStyle || ''
        };
    });
    const rawTabPlayingXI = tabPlayersList
        .filter(p => p.type === 'Playing XI')
        .sort((a, b) => (a.lineupOrder ?? 999) - (b.lineupOrder ?? 999));
    const tabPlayingXI = getBattersInGroundArrivalOrder(tabBattingTeamData, rawTabPlayingXI);
    const tabReserves = tabPlayersList.filter(p => p.type === 'Reserve');

    const rawTabBowlersList = Object.values(tabBowlingTeamData.bowlers || {});
    const tabBowlingTeamObj = findTeamData(tabBowlingTeamData.name) || findTeamData(tabBowlingTeamName) || {};
    const tabBowlersList = rawTabBowlersList
        .filter(b => {
            const type = resolvePlayerType(b, tabBowlingTeamObj, false, 0);
            return type === 'Playing XI';
        })
        .map(b => {
            const squadPlayer = tabBowlingTeamObj?.players?.[b.id] || Object.values(tabBowlingTeamObj?.players || {}).find(sp => sp.nic === b.nic || sp.name === b.name);
            return {
                ...b,
                bowlingStyle: squadPlayer?.bowlingStyle || b.bowlingStyle || ''
            };
        });

    // Partnerships
    const cp = battingTeamData.currentPartnership;

    // Second innings teams & squad resolution (for mandatory 2nd innings switch modal)
    const firstBatTeamKeyForSwitch = common.firstBat === 1 ? 'team1' : 'team2';
    const secondBatTeamKeyForSwitch = common.firstBat === 1 ? 'team2' : 'team1';
    const firstBatTeamNameForSwitch = firstBatTeamKeyForSwitch === 'team1' ? t1Name : t2Name;
    const secondBatTeamNameForSwitch = secondBatTeamKeyForSwitch === 'team1' ? t1Name : t2Name;

    const secondBatTeamObjForSwitch = findTeamData(matchData[secondBatTeamKeyForSwitch]?.name) || findTeamData(secondBatTeamNameForSwitch) || {};
    const rawSecondBatList = Object.values(matchData[secondBatTeamKeyForSwitch]?.players || {});
    const secondBatResolvedList = rawSecondBatList.map((p, idx) => {
        const squadPlayer = secondBatTeamObjForSwitch?.players?.[p.id] || Object.values(secondBatTeamObjForSwitch?.players || {}).find(sp => sp.nic === p.nic || sp.name === p.name);
        return {
            ...p,
            type: resolvePlayerType(p, secondBatTeamObjForSwitch, false, idx),
            bowlingStyle: squadPlayer?.bowlingStyle || p.bowlingStyle || ''
        };
    });
    const secondBatXI = secondBatResolvedList.filter(p => p.type === 'Playing XI');
    const secondBatOpeningSquad = secondBatXI.length > 0 ? secondBatXI : (rawSecondBatList.length > 0 ? rawSecondBatList : getTeamPlayerList(secondBatTeamNameForSwitch));

    const firstBatTeamObjForSwitch = findTeamData(matchData[firstBatTeamKeyForSwitch]?.name) || findTeamData(firstBatTeamNameForSwitch) || {};
    const rawFirstBatList = Object.values(matchData[firstBatTeamKeyForSwitch]?.players || {});
    const firstBatResolvedList = rawFirstBatList.map((p, idx) => {
        const squadPlayer = firstBatTeamObjForSwitch?.players?.[p.id] || Object.values(firstBatTeamObjForSwitch?.players || {}).find(sp => sp.nic === p.nic || sp.name === p.name);
        return {
            ...p,
            type: resolvePlayerType(p, firstBatTeamObjForSwitch, false, idx),
            bowlingStyle: squadPlayer?.bowlingStyle || p.bowlingStyle || ''
        };
    });
    const firstBatXI = firstBatResolvedList.filter(p => p.type === 'Playing XI');
    const firstBatOpeningSquad = firstBatXI.length > 0 ? firstBatXI : (rawFirstBatList.length > 0 ? rawFirstBatList : getTeamPlayerList(firstBatTeamNameForSwitch));

    // Active players on the crease for scoring (Prioritizing Playing XI)
    const activeBattingSquad = playersList.length > 0 ? playersList : Object.values(matchData[currentBattingTeamKey]?.players || {});
    const activeBowlingSquad = bowlingPlayersList.filter(p => p.type === 'Playing XI').length > 0
        ? bowlingPlayersList.filter(p => p.type === 'Playing XI')
        : Object.values(matchData[currentBowlingTeamKey]?.bowlers || matchData[currentBowlingTeamKey]?.players || {});

    const isStrikerValid = strikerId != null && strikerId !== '' && !isPlayerDismissedInInnings({ id: strikerId }, battingTeamData);
    const striker = isStrikerValid
        ? (activeBattingSquad.find(p => String(p.id) === String(strikerId)) || battingTeamData.players?.[strikerId] || { name: 'Striker', runs: 0, balls: 0, id: strikerId })
        : (showNextBatterModal || battingTeamData.ballFaceBatsman?.id == null || isPlayerDismissedInInnings(battingTeamData.ballFaceBatsman, battingTeamData)
            ? { id: '', name: 'Select Batsman...', runs: 0, balls: 0 }
            : (battingTeamData.ballFaceBatsman?.id
                ? battingTeamData.ballFaceBatsman
                : activeBattingSquad.find(p => !isPlayerDismissedInInnings(p, battingTeamData)) || { name: 'Select Batsman...', runs: 0, balls: 0, id: '' }));

    const isNonStrikerValid = nonStrikerId != null && nonStrikerId !== '' && !isPlayerDismissedInInnings({ id: nonStrikerId }, battingTeamData);
    const nonStriker = isNonStrikerValid
        ? (activeBattingSquad.find(p => String(p.id) === String(nonStrikerId)) || battingTeamData.players?.[nonStrikerId] || { name: 'Non-Striker', runs: 0, balls: 0, id: nonStrikerId })
        : (showNextBatterModal || battingTeamData.otherSideBatsman?.id == null || isPlayerDismissedInInnings(battingTeamData.otherSideBatsman, battingTeamData)
            ? { id: '', name: 'Select Batsman...', runs: 0, balls: 0 }
            : (battingTeamData.otherSideBatsman?.id
                ? battingTeamData.otherSideBatsman
                : activeBattingSquad.find(p => String(p.id) !== String(striker?.id) && !isPlayerDismissedInInnings(p, battingTeamData)) || { name: 'Select Batsman...', runs: 0, balls: 0, id: '' }));

    const bowler = activeBowlingSquad.find(p => String(p.id) === String(bowlerId)) || (bowlingTeamData.bowler && activeBowlingSquad.find(p => String(p.id) === String(bowlingTeamData.bowler.id))) || activeBowlingSquad[0] || { name: 'Bowler', overs: 0, runs: 0, wickets: 0, id: 1 };

    const isStrikerLHB = String(striker?.hand || '').toUpperCase() === 'LHB' || String(striker?.hand || '').toUpperCase() === 'LHS' || String(striker?.hand || '').toLowerCase().includes('left');
    const isNonStrikerLHB = String(nonStriker?.hand || '').toUpperCase() === 'LHB' || String(nonStriker?.hand || '').toUpperCase() === 'LHS' || String(nonStriker?.hand || '').toLowerCase().includes('left');

    // Crease locking conditions:
    // - Striker/Non-Striker locked once they've faced balls or batted (or partnership deliveries occurred)
    // - Bowler locked once 1 or more balls bowled in ongoing over
    const isStrikerLocked = Boolean(
        striker && (
            (striker.balls || 0) > 0 ||
            (striker.runs || 0) > 0 ||
            (cp && ((battingTeamData.totalBalls || 0) > (cp.startBalls || 0)))
        )
    );

    const isNonStrikerLocked = Boolean(
        nonStriker && (
            (nonStriker.balls || 0) > 0 ||
            (nonStriker.runs || 0) > 0 ||
            (cp && ((battingTeamData.totalBalls || 0) > (cp.startBalls || 0)))
        )
    );

    const currentOverBallsCount = Array.isArray(common?.overBallsTypes)
        ? common.overBallsTypes.length
        : Object.keys(common?.overBallsTypes || {}).length;

    const isBowlerLocked = currentOverBallsCount > 0;

    // Commentary List
    const commentaryList = matchData.commentary
        ? Object.values(matchData.commentary).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        : [];

    // Helper to extract 1-indexed over number from delivery
    const getCommDeliveryOverNum = (comm) => {
        const raw = comm?.over ?? comm?.ball;
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

    const availableCommOvers = Array.from(
        new Set(
            commentaryList
                .map(getCommDeliveryOverNum)
                .filter((ov) => ov !== null && !isNaN(ov))
        )
    ).sort((a, b) => a - b);

    const filteredCommentaryList = (!adminCommOverFilter || adminCommOverFilter === 'all')
        ? commentaryList
        : commentaryList.filter((comm) => getCommDeliveryOverNum(comm) === Number(adminCommOverFilter));

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
        const isLeft = batsmanHand === 'Left Hand' || batsmanHand === 'LHS' || batsmanHand === 'LHB' || batsmanHand === 'Left' || String(batsmanHand).toUpperCase().includes('LEFT') || String(batsmanHand).toUpperCase() === 'LHS' || String(batsmanHand).toUpperCase() === 'LHB';
        if (isLeft) {
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
        await withProcessing(async () => {
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

            // 1. Legal ball calculation (Wide, No Ball, and Penalty are NOT legal balls)
            const legalBall = !(extraType === 'Wide' || extraType === 'No Ball' || extraType === 'Penalty');
            if (legalBall) {
                bTeam.totalBalls = (bTeam.totalBalls || 0) + 1;
                const fullOvers = Math.floor(bTeam.totalBalls / 6);
                const ballInOver = bTeam.totalBalls % 6;
                bTeam.overs = Number(`${fullOvers}.${ballInOver}`);
            }

            // 2. Extra & Total Runs Breakdown according to Official Cricket Extras Theory
            let deliveryTotalRuns = 0;
            let extraAmountForTeam = 0;
            let bowlerConcededRuns = 0;
            let strikerRunsScored = 0;
            const noBallRunsSource = ballEvent.noBallRunsSource || 'bat'; // 'bat' | 'bye' | 'legBye'

            if (isExtra) {
                if (extraType === 'Wide') {
                    // Wide: 1 run mandatory penalty + extra runs run/boundary -> all to Extras (Wides). Bowler charged with all. Striker 0 runs/balls.
                    extraAmountForTeam = 1 + additionalExtraRuns;
                    deliveryTotalRuns = extraAmountForTeam;
                    bowlerConcededRuns = extraAmountForTeam;
                    strikerRunsScored = 0;
                } else if (extraType === 'No Ball') {
                    // No Ball: 1 run mandatory penalty (Extras -> No Ball).
                    // Extra runs beyond penalty:
                    // - Runs off the bat: Credited to Batsman's score. Bowler charged with 1 penalty + bat runs.
                    // - Runs not off the bat (byes/leg byes off no-ball): Credited to Extras (Byes/Leg Byes). Bowler charged 1 run penalty only. Striker gets 0 runs.
                    if (noBallRunsSource === 'bye' || noBallRunsSource === 'legBye') {
                        extraAmountForTeam = 1 + additionalExtraRuns;
                        strikerRunsScored = 0;
                        deliveryTotalRuns = 1 + additionalExtraRuns;
                        bowlerConcededRuns = 1;
                    } else {
                        extraAmountForTeam = 1;
                        strikerRunsScored = additionalExtraRuns;
                        deliveryTotalRuns = 1 + strikerRunsScored;
                        bowlerConcededRuns = deliveryTotalRuns;
                    }
                } else if (extraType === 'Bye' || extraType === 'Leg Bye') {
                    // Bye / Leg Bye: Mandatory penalty = None. All runs run/boundary to Extras (Byes / Leg Byes). Bowler is NOT charged. Legal ball.
                    extraAmountForTeam = additionalExtraRuns;
                    deliveryTotalRuns = extraAmountForTeam;
                    bowlerConcededRuns = 0;
                    strikerRunsScored = 0;
                } else if (extraType === 'Penalty') {
                    // Law 41/42/28: Custom Penalty marks awarded directly to batting team extras. Bowler is NOT charged, no legal delivery.
                    extraAmountForTeam = additionalExtraRuns > 0 ? additionalExtraRuns : 5;
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
                if (extraType === 'Wide') {
                    bTeam.extraTypes.push(`${extraAmountForTeam}WD`);
                } else if (extraType === 'No Ball') {
                    bTeam.extraTypes.push('1NB');
                    if ((noBallRunsSource === 'bye' || noBallRunsSource === 'legBye') && additionalExtraRuns > 0) {
                        bTeam.extraTypes.push(`${additionalExtraRuns}${noBallRunsSource === 'legBye' ? 'LB' : 'B'}`);
                    }
                } else if (extraType === 'Bye') {
                    bTeam.extraTypes.push(`${additionalExtraRuns}B`);
                } else if (extraType === 'Leg Bye') {
                    bTeam.extraTypes.push(`${additionalExtraRuns}LB`);
                } else if (extraType === 'Penalty') {
                    bTeam.extraTypes.push(`${extraAmountForTeam}P`);
                } else {
                    bTeam.extraTypes.push(`${extraAmountForTeam}E`);
                }
            }

            // Update Striker Stats
            if (extraType !== 'Wide' && extraType !== 'Bye' && extraType !== 'Leg Bye' && extraType !== 'Penalty') {
                const isNbBatRuns = extraType === 'No Ball' && noBallRunsSource === 'bat';
                const sPlayer = bTeam.players?.[striker.id];
                if (sPlayer) {
                    sPlayer.runs = (sPlayer.runs || 0) + strikerRunsScored;
                    if (legalBall || extraType === 'No Ball') sPlayer.balls = (sPlayer.balls || 0) + 1;

                    if ((!isExtra || isNbBatRuns) && strikerRunsScored > 0) {
                        sPlayer.boundaries = sPlayer.boundaries || { fours: 0, sixes: 0, singles: 0, twos: 0 };
                        if (strikerRunsScored === 4) sPlayer.boundaries.fours = (sPlayer.boundaries.fours || 0) + 1;
                        if (strikerRunsScored === 6) sPlayer.boundaries.sixes = (sPlayer.boundaries.sixes || 0) + 1;
                        if (strikerRunsScored === 1) sPlayer.boundaries.singles = (sPlayer.boundaries.singles || 0) + 1;
                        if (strikerRunsScored === 2) sPlayer.boundaries.twos = (sPlayer.boundaries.twos || 0) + 1;
                    }
                    sPlayer.strikeRate = Number(((sPlayer.runs / Math.max(1, sPlayer.balls)) * 100).toFixed(2));

                    // Save shot zone (for normal bat scoring runs > 0 OR No Ball with bat runs > 0)
                    if (wagonZone && strikerRunsScored > 0 && (!isExtra || isNbBatRuns)) {
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

            const cp = bTeam.currentPartnership;
            if (!cp.batsman1) cp.batsman1 = striker;
            if (!cp.batsman2) cp.batsman2 = nonStriker;

            // Correctly attribute runs and balls to whichever partner is facing the delivery
            const isB1OnStrike = String(striker.id) === String(cp.batsman1?.id);
            if (isB1OnStrike) {
                cp.batsman1Runs = (cp.batsman1Runs || 0) + strikerRunsScored;
                if (legalBall) {
                    cp.batsman1Balls = (cp.batsman1Balls || 0) + 1;
                }
            } else {
                cp.batsman2Runs = (cp.batsman2Runs || 0) + strikerRunsScored;
                if (legalBall) {
                    cp.batsman2Balls = (cp.batsman2Balls || 0) + 1;
                }
            }

            // Helper to check if a player has been dismissed or is already recorded in fall of wickets
            const isDismissedPlayer = (p) => {
                if (!p) return false;
                const pData = bTeam.players?.[p.id] || p;
                const pIdStr = p.id != null ? String(p.id) : null;
                const pNameClean = (p.name || '').trim().toLowerCase();

                if (p.dismissal || p.status === 'out' || pData?.dismissal || pData?.status === 'out') {
                    return true;
                }
                if (isWicket && outBatterId != null && pIdStr && pIdStr === String(outBatterId)) {
                    return true;
                }

                const inFow = Object.values(bTeam.fallOfWickets || {}).some(f => {
                    if (!f) return false;
                    const fOutId = f.outBatsman?.id != null ? String(f.outBatsman.id) : null;
                    const fBatsmanName = (f.batsman || f.outBatsman?.name || '').trim().toLowerCase();
                    if (fOutId && pIdStr && fOutId === pIdStr) return true;
                    if (fBatsmanName && pNameClean && fBatsmanName === pNameClean) return true;
                    return false;
                });
                if (inFow) return true;

                const inParts = Object.values(bTeam.partnerships || {}).some(part => {
                    if (!part || !part.outBatsman) return false;
                    const partOutId = part.outBatsman.id != null ? String(part.outBatsman.id) : null;
                    const partOutName = (part.outBatsman.name || '').trim().toLowerCase();
                    if (partOutId && pIdStr && partOutId === pIdStr) return true;
                    if (partOutName && pNameClean && partOutName === pNameClean) return true;
                    return false;
                });
                if (inParts) return true;

                return false;
            };

            // Next Batter & Strike Rotation Resolution
            let nextStrikerId = strikerId;
            let nextNonStrikerId = nonStrikerId;
            let isOutStriker = false;
            let remainingBatter = null;
            let outPlayer = null;

            // Handle Wicket
            if (isWicket) {
                bTeam.totalWickets = (bTeam.totalWickets || 0) + 1;
                outPlayer = bTeam.players?.[outBatterId];
                isOutStriker = String(outBatterId) === String(striker.id);
                remainingBatter = isOutStriker ? nonStriker : striker;

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
                    outPlayer.status = 'out';
                }

                // Save completed partnership to history
                bTeam.partnerships = bTeam.partnerships || {};
                const pIdx = Object.keys(bTeam.partnerships).length + 1;
                const partRuns = Math.max(0, bTeam.totalRuns - (bTeam.currentPartnership.startScore || 0));
                const partBalls = Math.max(0, bTeam.totalBalls - (bTeam.currentPartnership.startBalls || 0));
                const pB1Runs = bTeam.currentPartnership.batsman1Runs || 0;
                const pB1Balls = bTeam.currentPartnership.batsman1Balls || 0;
                const pB2Runs = bTeam.currentPartnership.batsman2Runs || 0;
                const pB2Balls = bTeam.currentPartnership.batsman2Balls || 0;
                const pExtras = Math.max(0, partRuns - (pB1Runs + pB2Runs));

                bTeam.partnerships[pIdx] = {
                    wicketNumber: bTeam.totalWickets,
                    wicketLabel: `${bTeam.totalWickets}${bTeam.totalWickets === 1 ? 'st' : bTeam.totalWickets === 2 ? 'nd' : bTeam.totalWickets === 3 ? 'rd' : 'th'} Wicket`,
                    batsman1: bTeam.currentPartnership.batsman1,
                    batsman2: bTeam.currentPartnership.batsman2,
                    batsman1Runs: pB1Runs,
                    batsman1Balls: pB1Balls,
                    batsman2Runs: pB2Runs,
                    batsman2Balls: pB2Balls,
                    extras: pExtras,
                    runs: partRuns,
                    balls: partBalls,
                    overs: `${Math.floor(partBalls / 6)}.${partBalls % 6}`,
                    runRate: partBalls > 0 ? ((partRuns / partBalls) * 6).toFixed(2) : '0.00',
                    outBatsman: outPlayer ? { id: outPlayer.id, name: outPlayer.name, dismissal: outPlayer.dismissal } : null,
                    notOutBatsman: isOutStriker ? bTeam.currentPartnership.batsman2 : bTeam.currentPartnership.batsman1,
                    endScore: `${bTeam.totalRuns}/${bTeam.totalWickets}`,
                    timestamp: new Date().toISOString()
                };

                // Save Fall of Wickets
                bTeam.fallOfWickets = bTeam.fallOfWickets || {};
                const fowIdx = Object.keys(bTeam.fallOfWickets).length + 1;
                bTeam.fallOfWickets[fowIdx] = {
                    score: `${bTeam.totalRuns}-${bTeam.totalWickets}`,
                    batsman: outPlayer?.name || 'Batsman',
                    over: getOversString(bTeam)
                };

                // Check available incoming batsmen (strictly excluding out players and current crease batters)
                const allCandidatePlayers = (playingXI && playingXI.length > 0)
                    ? [...playingXI, ...playersList.filter(p => !playingXI.some(xi => String(xi.id) === String(p.id)))]
                    : (playersList.length > 0 ? playersList : Object.values(bTeam.players || {}));

                const availableIncomingBatters = allCandidatePlayers.filter(p => {
                    if (!p) return false;
                    const pIdStr = p.id != null ? String(p.id) : null;
                    const isOut = isDismissedPlayer(p) || (outBatterId != null && pIdStr === String(outBatterId));
                    const isCurrentCrease = remainingBatter?.id != null && pIdStr === String(remainingBatter.id);
                    return !isOut && !isCurrentCrease;
                });
                const isAllOut = bTeam.totalWickets >= (playingXI.length > 0 ? (playingXI.length - 1) : 10) || bTeam.totalWickets >= 10 || availableIncomingBatters.length === 0;

                if (isAllOut) {
                    toastRef.current?.showToast('warning', `All Out! ${bTeam.name || 'Batting Team'} innings complete.`);
                    if ((common.activeInnings || 1) === 1) {
                        setSecondInningsStrikerId('');
                        setSecondInningsNonStrikerId('');
                        setSecondInningsBowlerId('');
                        setShowSwitchInningsModal(true);
                    }
                } else {
                    // Determine over completion on this ball
                    const overCompleted = legalBall && bTeam.totalBalls % 6 === 0 && bTeam.totalBalls > 0;

                    // Intelligently determine default strike role for incoming batsman:
                    // - If over ended on this ball: strike rotates at end of over.
                    // - For Run Out with completed runs: if odd runs (1, 3) were completed, batsmen crossed ends before wicket!
                    const crossed = (ballEvent.dismissalType === 'Run Out' && (runs % 2 !== 0));
                    let defaultStrikeRole = 'striker';
                    if (overCompleted) {
                        defaultStrikeRole = crossed
                            ? (isOutStriker ? 'striker' : 'nonStriker')
                            : (isOutStriker ? 'nonStriker' : 'striker');
                    } else {
                        defaultStrikeRole = crossed
                            ? (isOutStriker ? 'nonStriker' : 'striker')
                            : (isOutStriker ? 'striker' : 'nonStriker');
                    }
                    setNextBatterStrikeRole(defaultStrikeRole);

                    // Trigger compulsory Next Batsman Selection Modal (cannot be closed without setting next batsman)
                    setNextBatterModalData({
                        isOutStriker,
                        outBatter: outPlayer ? { id: outPlayer.id, name: outPlayer.name, dismissal: outPlayer.dismissal } : { id: outBatterId, name: (isOutStriker ? striker.name : nonStriker.name), dismissal: 'out' },
                        wicketNumber: bTeam.totalWickets,
                        battingTeamKey: currentBattingTeamKey,
                        remainingBatter,
                        overCompletedOnThisBall: overCompleted,
                        completedOverNum: Math.floor(bTeam.totalBalls / 6),
                        lastBowlerId: bowler.id
                    });
                    setSelectedNextBatterId('');
                    setShowNextBatterModal(true);

                    // Vacate dismissed batsman's spot so admin chooses incoming batsman from yet-to-bat list
                    if (isOutStriker) {
                        nextStrikerId = null;
                        nextNonStrikerId = remainingBatter.id;
                    } else {
                        nextStrikerId = remainingBatter.id;
                        nextNonStrikerId = null;
                    }
                    bTeam.currentPartnership = null;
                }
            } else {
                // According to WD, NB, BYE, and LB: strike rotation depends on physical runs run beyond mandatory penalty (or normal bat runs)
                const physicalRunsRun = isExtra
                    ? (extraType === 'Penalty' ? 0 : additionalExtraRuns)
                    : runs;

                if (physicalRunsRun % 2 !== 0) {
                    const temp = nextStrikerId;
                    nextStrikerId = nextNonStrikerId;
                    nextNonStrikerId = temp;
                }
            }

            if (legalBall && bTeam.totalBalls % 6 === 0 && bTeam.totalBalls > 0) {
                if (!isWicket) {
                    const temp = nextStrikerId;
                    nextStrikerId = nextNonStrikerId;
                    nextNonStrikerId = temp;
                }
                const overNum = Math.floor(bTeam.totalBalls / 6);
                toastRef.current?.showToast('info', `Over ${overNum} complete! Strike rotated.`);

                const overLimit = Number(common.overLimit || 15);
                const isFirstInnings = (common.activeInnings || 1) === 1;
                const is1stInningsOverLimitReached = isFirstInnings && bTeam.totalBalls >= (overLimit * 6);

                if (is1stInningsOverLimitReached) {
                    toastRef.current?.showToast('info', `1st Innings overs completed (${overLimit} overs)!`);
                    setSecondInningsStrikerId('');
                    setSecondInningsNonStrikerId('');
                    setSecondInningsBowlerId('');
                    setShowSwitchInningsModal(true);
                } else {
                    // Trigger compulsory Next Bowler Selection Modal
                    // If next batter modal is active, defer next bowler modal until incoming batter is confirmed
                    const availableIncomingBatters = playingXI.filter(p => {
                        const isOut = isDismissedPlayer(p);
                        const isCurrentCrease = String(p.id) === String(striker.id) || String(p.id) === String(nonStriker.id);
                        return !isOut && !isCurrentCrease;
                    });
                    const isAllOut = bTeam.totalWickets >= (playingXI.length - 1) || bTeam.totalWickets >= 10 || availableIncomingBatters.length === 0;

                    if (!isWicket || isAllOut) {
                        setLastBowlerId(bowler.id);
                        setCompletedOverNumber(overNum);
                        setSelectedNextBowlerId('');
                        setShowNextBowlerModal(true);
                    }
                }
            }

            setStrikerId(nextStrikerId);
            setNonStrikerId(nextNonStrikerId);

            // Commentary Text (Advanced Professional Wording System with Anti-Repetition)
            const commTimestamp = Date.now();
            const outBatterName = isWicket ? (bTeam.players?.[outBatterId]?.name || striker.name) : striker.name;

            const commText = generateSmartCommentary({
                runs,
                isWicket,
                dismissalType: ballEvent.dismissalType,
                dismissalFielder: ballEvent.dismissalFielder,
                isExtra,
                extraType,
                extraRuns: extraAmountForTeam,
                strikerName: outBatterName,
                bowlerName: bowler.name,
                wagonZone,
                battingTeamName: bTeam.name || 'Batting Team',
                ballIndex: bTeam.totalBalls || 0
            });

            updated.commentary = updated.commentary || {};
            const commEntry = {
                id: commTimestamp,
                over: `${getOversString(bTeam)}`,
                runs: deliveryTotalRuns,
                isWicket,
                isExtra,
                extraType,
                extraRuns: additionalExtraRuns,
                text: commText,
                timestamp: commTimestamp,
                batsman: striker.name,
                bowler: bowler.name
            };
            const isNbBatRuns = isExtra && extraType === 'No Ball' && additionalExtraRuns > 0;
            if (wagonZone && (deliveryTotalRuns > 0 && (!isExtra || isNbBatRuns))) {
                commEntry.wagonZone = wagonZone;
            }
            updated.commentary[commTimestamp] = commEntry;

            // Maintain overBallsTypes in common for live over timeline (Flutter & Web)
            let ballToken = String(runs);
            if (isWicket) {
                ballToken = runs > 0 ? `${runs}W` : 'W';
            } else if (isExtra) {
                if (extraType === 'Penalty') ballToken = `${extraAmountForTeam}P`;
                else if (extraType === 'Wide') ballToken = additionalExtraRuns > 0 ? `${1 + additionalExtraRuns}WD` : 'WD';
                else if (extraType === 'No Ball') {
                    if (noBallRunsSource === 'bye' && additionalExtraRuns > 0) ballToken = `NB+${additionalExtraRuns}B`;
                    else if (noBallRunsSource === 'legBye' && additionalExtraRuns > 0) ballToken = `NB+${additionalExtraRuns}LB`;
                    else ballToken = additionalExtraRuns > 0 ? `${additionalExtraRuns}NB` : 'NB';
                }
                else if (extraType === 'Leg Bye') ballToken = additionalExtraRuns > 0 ? `${additionalExtraRuns}LB` : 'LB';
                else if (extraType === 'Bye') ballToken = additionalExtraRuns > 0 ? `${additionalExtraRuns}B` : 'B';
                else ballToken = `${additionalExtraRuns}EX`;
            }

            updated.common = updated.common || {};
            const existingOverBalls = Array.isArray(updated.common.overBallsTypes)
                ? [...updated.common.overBallsTypes]
                : Object.values(updated.common.overBallsTypes || {});

            if (legalBall && bTeam.totalBalls % 6 === 0 && bTeam.totalBalls > 0) {
                updated.common.overBallsTypes = [];
            } else {
                updated.common.overBallsTypes = [...existingOverBalls, ballToken];
            }

            const currentBatSquad = Object.values(bTeam.players || {});
            if (isWicket) {
                const crossed = (ballEvent.dismissalType === 'Run Out' && (runs % 2 !== 0));
                const remainingGoesToStrikerEnd = crossed ? isOutStriker : !isOutStriker;

                bTeam.ballFaceBatsman = remainingGoesToStrikerEnd
                    ? (currentBatSquad.find(p => String(p.id) === String(remainingBatter.id)) || bTeam.players?.[remainingBatter.id] || remainingBatter)
                    : { id: null, name: 'Select Batsman...', runs: 0, balls: 0 };

                bTeam.otherSideBatsman = !remainingGoesToStrikerEnd
                    ? (currentBatSquad.find(p => String(p.id) === String(remainingBatter.id)) || bTeam.players?.[remainingBatter.id] || remainingBatter)
                    : { id: null, name: 'Select Batsman...', runs: 0, balls: 0 };
            } else {
                bTeam.ballFaceBatsman = currentBatSquad.find(p => p.id === nextStrikerId) || bTeam.players?.[nextStrikerId] || striker;
                bTeam.otherSideBatsman = currentBatSquad.find(p => p.id === nextNonStrikerId) || bTeam.players?.[nextNonStrikerId] || nonStriker;
            }
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
                    status: isWicket
                        ? `Wicket! (${outPlayer?.name || 'Batsman'} out) | ${bowler.name} bowling`
                        : `${striker.name} ${striker.runs}* | ${bowler.name} bowling`,
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
        }, 'Recording Delivery...', 'Transmitting ball data and synchronizing live scorecard...');
    };

    const handleSelectWheelerZone = (zoneName) => {
        setSelectedShotZone(prev => prev === zoneName ? null : zoneName);
    };

    const handleScoreClick = (runs) => {
        const zone = runs > 0 ? (selectedShotZone || 'Cover') : '';
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

        await withProcessing(async () => {
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
        }, 'Undoing Delivery...', 'Reverting last ball and synchronizing scorecard...');
    };

    // Shift Striker & Non-Striker Batters
    const handleShiftBatters = async () => {
        if (!strikerId || !nonStrikerId) return;

        await withProcessing(async () => {
            const oldStrikerId = strikerId;
            const oldNonStrikerId = nonStrikerId;

            setStrikerId(oldNonStrikerId);
            setNonStrikerId(oldStrikerId);

            if (matchData && activeMatchTitle) {
                const bKey = isTeam1Batting ? 'team1' : 'team2';
                const updated = JSON.parse(JSON.stringify(matchData));
                const bSquad = Object.values(updated[bKey]?.players || {});

                const newStrikerObj = bSquad.find(p => String(p.id) === String(oldNonStrikerId)) || striker;
                const newNonStrikerObj = bSquad.find(p => String(p.id) === String(oldStrikerId)) || nonStriker;

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
        }, 'Shifting Crease Batters...', 'Swapping striker and non-striker positions...');
    };

    // Open Force Player Change Modal
    const handleOpenForceChangeModal = () => {
        setForceStrikerId(striker.id || '');
        setForceNonStrikerId(nonStriker.id || '');
        setForceReinstateOut(true);
        setShowForceChangeModal(true);
    };

    // Force Change Striker & Non-Striker Batters
    const handleExecuteForceChange = async (overrideStrikerId, overrideNonStrikerId, reinstateOut = forceReinstateOut) => {
        const finalStrikerId = overrideStrikerId !== undefined ? overrideStrikerId : forceStrikerId;
        const finalNonStrikerId = overrideNonStrikerId !== undefined ? overrideNonStrikerId : forceNonStrikerId;

        if (!finalStrikerId || !finalNonStrikerId) {
            toastRef.current?.showToast('error', 'Please select both Striker and Non-Striker.');
            return;
        }

        if (String(finalStrikerId) === String(finalNonStrikerId)) {
            toastRef.current?.showToast('error', 'Striker and Non-Striker must be different players.');
            return;
        }

        if (!matchData || !activeMatchTitle) return;

        await withProcessing(async () => {
            const bKey = isTeam1Batting ? 'team1' : 'team2';
            const updated = JSON.parse(JSON.stringify(matchData));
            updated[bKey] = updated[bKey] || {};
            updated[bKey].players = updated[bKey].players || {};

            const teamRoster = playersList.length > 0 ? playersList : Object.values(updated[bKey].players || {});

            const rawStrikerObj = updated[bKey].players[finalStrikerId] || teamRoster.find(p => String(p.id) === String(finalStrikerId)) || { id: finalStrikerId, name: 'Striker' };
            const rawNonStrikerObj = updated[bKey].players[finalNonStrikerId] || teamRoster.find(p => String(p.id) === String(finalNonStrikerId)) || { id: finalNonStrikerId, name: 'Non-Striker' };

            // Save history for undo safety
            setHistoryStack(prev => [JSON.parse(JSON.stringify(matchData)), ...prev].slice(0, 10));

            // Process Striker
            if (!updated[bKey].players[finalStrikerId]) {
                updated[bKey].players[finalStrikerId] = {
                    ...rawStrikerObj,
                    runs: 0,
                    balls: 0,
                    fours: 0,
                    sixes: 0,
                    boundaries: { fours: 0, sixes: 0, singles: 0, twos: 0 },
                    strikeRate: '0.00',
                    dismissal: '',
                    status: 'batting'
                };
            } else {
                updated[bKey].players[finalStrikerId].status = 'batting';
                if (reinstateOut) {
                    updated[bKey].players[finalStrikerId].dismissal = '';
                }
            }

            // Process Non-Striker
            if (!updated[bKey].players[finalNonStrikerId]) {
                updated[bKey].players[finalNonStrikerId] = {
                    ...rawNonStrikerObj,
                    runs: 0,
                    balls: 0,
                    fours: 0,
                    sixes: 0,
                    boundaries: { fours: 0, sixes: 0, singles: 0, twos: 0 },
                    strikeRate: '0.00',
                    dismissal: '',
                    status: 'batting'
                };
            } else {
                updated[bKey].players[finalNonStrikerId].status = 'batting';
                if (reinstateOut) {
                    updated[bKey].players[finalNonStrikerId].dismissal = '';
                }
            }

            const newStriker = updated[bKey].players[finalStrikerId];
            const newNonStriker = updated[bKey].players[finalNonStrikerId];

            updated[bKey].ballFaceBatsman = newStriker;
            updated[bKey].otherSideBatsman = newNonStriker;

            // If fallOfWickets had either player and reinstateOut is true, clean them up and adjust wicket count
            if (reinstateOut && updated[bKey].fallOfWickets) {
                const fowEntries = Object.entries(updated[bKey].fallOfWickets);
                let removedCount = 0;
                fowEntries.forEach(([key, f]) => {
                    if (!f) return;
                    const fOutId = f.outBatsman?.id != null ? String(f.outBatsman.id) : null;
                    const fName = (f.batsman || f.outBatsman?.name || '').trim().toLowerCase();
                    const sMatch = (fOutId && String(finalStrikerId) === fOutId) || (fName && (newStriker.name || '').trim().toLowerCase() === fName);
                    const nsMatch = (fOutId && String(finalNonStrikerId) === fOutId) || (fName && (newNonStriker.name || '').trim().toLowerCase() === fName);
                    if (sMatch || nsMatch) {
                        delete updated[bKey].fallOfWickets[key];
                        removedCount += 1;
                    }
                });
                if (removedCount > 0) {
                    updated[bKey].totalWickets = Math.max(0, Number(updated[bKey].totalWickets || 0) - removedCount);
                }
            }

            // Sync currentPartnership
            updated[bKey].currentPartnership = {
                batsman1: newStriker,
                batsman2: newNonStriker,
                batsman1Runs: newStriker.runs || 0,
                batsman1Balls: newStriker.balls || 0,
                batsman2Runs: newNonStriker.runs || 0,
                batsman2Balls: newNonStriker.balls || 0,
                startScore: updated[bKey].totalRuns || 0,
                startBalls: updated[bKey].totalBalls || 0
            };

            setStrikerId(finalStrikerId);
            setNonStrikerId(finalNonStrikerId);
            setMatchData(updated);

            await updateMatchData(activeMatchTitle, updated, selectedTournamentId);

            await updateLiveData({
                isLive: 1,
                currentMatchPath: activeMatchTitle,
                liveScore: {
                    matchTitle: activeMatchTitle,
                    firstBat: common.firstBat,
                    status: `${newStriker.name} on strike | ${bowler.name} bowling`,
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

            setShowForceChangeModal(false);
            toastRef.current?.showToast('success', `Forcefully changed crease batters to ${newStriker.name} (*) & ${newNonStriker.name}!`);
        }, 'Force Changing Batters...', 'Assigning Striker and Non-Striker at the crease...');
    };

    // Manual Crease Selection Changes with Partnership Sync & Batter Status Reset
    const handleManualBatterChange = async (newPlayerId, role) => {
        if (!matchData || !activeMatchTitle) return;
        const bKey = isTeam1Batting ? 'team1' : 'team2';
        const updated = JSON.parse(JSON.stringify(matchData));
        updated[bKey] = updated[bKey] || {};
        updated[bKey].players = updated[bKey].players || {};

        const bSquad = Object.values(updated[bKey].players || {});
        const teamRoster = playersList.length > 0 ? playersList : bSquad;
        const newPlayerObj = bSquad.find(p => String(p.id) === String(newPlayerId)) || teamRoster.find(p => String(p.id) === String(newPlayerId));
        if (!newPlayerObj) return;

        // Disallow choosing the other batter at the crease
        if (role === 'striker' && nonStrikerId != null && String(newPlayerId) === String(nonStrikerId)) return;
        if (role === 'nonStriker' && strikerId != null && String(newPlayerId) === String(strikerId)) return;
        if (newPlayerObj.dismissal || newPlayerObj.status === 'out') return;

        await withProcessing(async () => {
            // Previous batter at this crease position
            const previousPlayerObj = role === 'striker' ? updated[bKey]?.ballFaceBatsman : updated[bKey]?.otherSideBatsman;
            const prevId = previousPlayerObj?.id;
            const prevP = (prevId && updated[bKey].players[prevId]) ? updated[bKey].players[prevId] : null;
            const prevHasBatted = prevP ? (Number(prevP.balls || 0) > 0 || Number(prevP.runs || 0) > 0) : false;
            const prevSlotOrder = prevP ? Number(prevP.groundArrivalOrder || prevP.battingOrder || (role === 'striker' ? 1 : 2)) : (role === 'striker' ? 1 : 2);

            const updates = {};

            // If changing away from previous batsman, check if they batted any balls
            if (prevId && String(prevId) !== String(newPlayerId) && prevP) {
                const wasDismissed = Boolean(
                    (prevP.dismissal && prevP.dismissal.trim() !== '' && prevP.dismissal.trim().toLowerCase() !== 'yet to bat') ||
                    prevP.status === 'out'
                );

                if (!wasDismissed) {
                    if (!prevHasBatted) {
                        // Batter was replaced before batting any ball -> reset completely to 'yet to bat'
                        prevP.status = 'yet to bat';
                        prevP.dismissal = '';
                        delete prevP.battingOrder;
                        delete prevP.groundArrivalOrder;
                        updates[`${bKey}/players/${prevId}/status`] = 'yet to bat';
                        updates[`${bKey}/players/${prevId}/dismissal`] = '';
                        updates[`${bKey}/players/${prevId}/battingOrder`] = null;
                        updates[`${bKey}/players/${prevId}/groundArrivalOrder`] = null;
                    } else {
                        // Batter already faced deliveries -> not out, but stepped off crease
                        prevP.status = 'not out';
                        updates[`${bKey}/players/${prevId}/status`] = 'not out';
                    }
                }
            }

            // Ensure new chosen batter is registered in players map
            if (!updated[bKey].players[newPlayerId]) {
                updated[bKey].players[newPlayerId] = {
                    ...newPlayerObj,
                    runs: 0,
                    balls: 0,
                    fours: 0,
                    sixes: 0,
                    boundaries: { fours: 0, sixes: 0, singles: 0, twos: 0 },
                    strikeRate: '0.00',
                    dismissal: '',
                    status: 'batting'
                };
            }

            // Determine ground arrival order for new batter
            let assignedArrivalOrder;
            if (updated[bKey].players[newPlayerId]?.groundArrivalOrder && Number(updated[bKey].players[newPlayerId].groundArrivalOrder) > 0) {
                assignedArrivalOrder = Number(updated[bKey].players[newPlayerId].groundArrivalOrder);
            } else if (!prevHasBatted && prevP) {
                assignedArrivalOrder = prevSlotOrder;
            } else {
                const existingArrivals = Object.values(updated[bKey].players || {})
                    .filter(p => {
                        const isCrease = (updated[bKey].ballFaceBatsman && String(updated[bKey].ballFaceBatsman.id) === String(p.id)) ||
                                         (updated[bKey].otherSideBatsman && String(updated[bKey].otherSideBatsman.id) === String(p.id)) ||
                                         p.status === 'batting';
                        const hasBattedCheck = Number(p.balls || 0) > 0 || Number(p.runs || 0) > 0 || (p.dismissal && p.dismissal.trim() !== '' && p.dismissal.trim().toLowerCase() !== 'yet to bat');
                        return isCrease || hasBattedCheck || (p.groundArrivalOrder && Number(p.groundArrivalOrder) > 0);
                    })
                    .map(p => Number(p.groundArrivalOrder || 0))
                    .filter(n => n > 0);
                const currentMaxArrival = Math.max(
                    2,
                    (updated[bKey].totalWickets || 0) + 1,
                    ...existingArrivals
                );
                assignedArrivalOrder = currentMaxArrival + 1;
            }

            updated[bKey].players[newPlayerId].groundArrivalOrder = assignedArrivalOrder;
            updated[bKey].players[newPlayerId].battingOrder = assignedArrivalOrder;
            updates[`${bKey}/players/${newPlayerId}/groundArrivalOrder`] = assignedArrivalOrder;
            updates[`${bKey}/players/${newPlayerId}/battingOrder`] = assignedArrivalOrder;

            // Mark new chosen batter as batting / not out
            updated[bKey].players[newPlayerId].status = 'batting';
            updated[bKey].players[newPlayerId].dismissal = '';
            updates[`${bKey}/players/${newPlayerId}/status`] = 'batting';
            updates[`${bKey}/players/${newPlayerId}/dismissal`] = '';

            const chosenBatterObj = updated[bKey].players[newPlayerId];

            if (role === 'striker') {
                updated[bKey].ballFaceBatsman = chosenBatterObj;
                setStrikerId(newPlayerId);
                if (updated[bKey].currentPartnership) {
                    updated[bKey].currentPartnership.batsman1 = chosenBatterObj;
                }
            } else {
                updated[bKey].otherSideBatsman = chosenBatterObj;
                setNonStrikerId(newPlayerId);
                if (updated[bKey].currentPartnership) {
                    updated[bKey].currentPartnership.batsman2 = chosenBatterObj;
                }
            }

            updates[`${bKey}/${role === 'striker' ? 'ballFaceBatsman' : 'otherSideBatsman'}`] = chosenBatterObj;
            if (updated[bKey].currentPartnership) {
                updates[`${bKey}/currentPartnership`] = updated[bKey].currentPartnership;
            }

            setMatchData(updated);
            await updateMatchData(activeMatchTitle, updates, selectedTournamentId);

            // Sync LiveData
            const activeBowlerName = bowler?.name || 'Bowler';
            await updateLiveData({
                isLive: 1,
                currentMatchPath: activeMatchTitle,
                liveScore: {
                    matchTitle: activeMatchTitle,
                    firstBat: common.firstBat,
                    status: `${role === 'striker' ? chosenBatterObj.name : (updated[bKey]?.ballFaceBatsman?.name || chosenBatterObj.name)} on strike | ${activeBowlerName} bowling`,
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

            toastRef.current?.showToast('success', `${chosenBatterObj.name} is now ${role === 'striker' ? 'Striker' : 'Non-Striker'} (Not out).`);
        }, 'Updating Crease Batter...', 'Assigning new batsman to the crease...');
    };

    const handleManualBowlerChange = async (newBowlerId) => {
        if (!matchData || !activeMatchTitle) return;
        const bowlKey = isTeam1Batting ? 'team2' : 'team1';
        const updated = JSON.parse(JSON.stringify(matchData));
        const bowlSquad = Object.values(updated[bowlKey]?.bowlers || updated[bowlKey]?.players || {});
        const newBowlerObj = bowlSquad.find(p => p.id === newBowlerId);
        if (!newBowlerObj) return;

        await withProcessing(async () => {
            updated[bowlKey] = updated[bowlKey] || {};
            updated[bowlKey].bowler = newBowlerObj;
            updated[bowlKey].bowlers = updated[bowlKey].bowlers || {};
            if (!updated[bowlKey].bowlers[newBowlerId]) {
                updated[bowlKey].bowlers[newBowlerId] = newBowlerObj;
            }

            setMatchData(updated);
            await updateMatchData(activeMatchTitle, {
                [`${bowlKey}/bowler`]: newBowlerObj,
                [`${bowlKey}/bowlers/${newBowlerId}`]: updated[bowlKey].bowlers[newBowlerId]
            }, selectedTournamentId);
        }, 'Changing Bowler...', 'Assigning new bowler to the crease...');
    };

    // Switch Innings: Conclude 1st Innings and Start 2nd Innings
    const handleSwitchInnings = async () => {
        if (!matchData || !activeMatchTitle) return;
        const currentActiveInnings = common.activeInnings || 1;
        if (currentActiveInnings >= 2) {
            toastRef.current?.showToast('info', 'Already in 2nd Innings. Use Finish Match to conclude the game.');
            setShowSwitchInningsModal(false);
            return;
        }

        if (!secondInningsStrikerId || !secondInningsNonStrikerId || !secondInningsBowlerId) {
            toastRef.current?.showToast('warning', 'Please select Striker, Non-Striker and Opening Bowler to start 2nd Innings.');
            return;
        }

        if (String(secondInningsStrikerId) === String(secondInningsNonStrikerId)) {
            toastRef.current?.showToast('warning', 'Striker and Non-Striker must be different players.');
            return;
        }

        await withProcessing(async () => {
            const updated = JSON.parse(JSON.stringify(matchData));
            const firstBatTeamKey = common.firstBat === 1 ? 'team1' : 'team2';
            const secondBatTeamKey = common.firstBat === 1 ? 'team2' : 'team1';

            // 1. Archive active unbroken partnership for 1st innings team
            const firstTeamObj = updated[firstBatTeamKey];
            if (firstTeamObj && firstTeamObj.currentPartnership) {
                const cp = firstTeamObj.currentPartnership;
                const partRuns = Math.max(0, (firstTeamObj.totalRuns || 0) - (cp.startScore || 0));
                const partBalls = Math.max(0, (firstTeamObj.totalBalls || 0) - (cp.startBalls || 0));
                firstTeamObj.partnerships = firstTeamObj.partnerships || {};
                const existingList = (Array.isArray(firstTeamObj.partnerships)
                    ? firstTeamObj.partnerships
                    : Object.values(firstTeamObj.partnerships)
                ).filter(Boolean);
                const alreadySaved = existingList.some(p => p?.isUnbroken && p?.startScore === cp?.startScore);
                if (!alreadySaved && (partRuns > 0 || partBalls > 0 || (cp.batsman1Runs || 0) > 0 || (cp.batsman2Runs || 0) > 0)) {
                    const nextWicketNum = (firstTeamObj.totalWickets || 0) + 1;
                    const pKey = `p_${Date.now()}_${nextWicketNum}`;
                    firstTeamObj.partnerships[pKey] = {
                        wicketNumber: nextWicketNum,
                        wicketLabel: `${nextWicketNum}th Wicket* (Unbroken)`,
                        batsman1: cp.batsman1 || null,
                        batsman2: cp.batsman2 || null,
                        batsman1Runs: cp.batsman1Runs || 0,
                        batsman1Balls: cp.batsman1Balls || 0,
                        batsman2Runs: cp.batsman2Runs || 0,
                        batsman2Balls: cp.batsman2Balls || 0,
                        extras: Math.max(0, partRuns - ((cp.batsman1Runs || 0) + (cp.batsman2Runs || 0))),
                        runs: partRuns,
                        balls: partBalls,
                        overs: `${Math.floor(partBalls / 6)}.${partBalls % 6}`,
                        isUnbroken: true,
                        outBatsman: null,
                        notOutBatsman: null,
                        endScore: `${firstTeamObj.totalRuns || 0}/${firstTeamObj.totalWickets || 0}*`,
                        timestamp: new Date().toISOString()
                    };
                }
            }

            // 2. Switch activeInnings to 2 and reset over balls
            updated.common = updated.common || {};
            updated.common.activeInnings = 2;
            updated.common.status = `2nd Innings: ${updated[secondBatTeamKey]?.name || 'Chasing Team'} batting`;
            updated.common.overBallsTypes = [];

            // 3. Resolve opening batsmen and bowler from admin selections
            const secondBatSquad = Object.values(updated[secondBatTeamKey]?.players || {});
            const firstBatSquad = Object.values(updated[firstBatTeamKey]?.players || {});

            let openingBatter1 = secondBatSquad.find(p => String(p.id) === String(secondInningsStrikerId));
            let openingBatter2 = secondBatSquad.find(p => String(p.id) === String(secondInningsNonStrikerId));
            let openingNewBowler = updated[firstBatTeamKey]?.bowlers?.[secondInningsBowlerId] ||
                firstBatSquad.find(p => String(p.id) === String(secondInningsBowlerId));

            if (!openingBatter1) {
                const fallback = secondBatOpeningSquad.find(p => String(p.id) === String(secondInningsStrikerId)) || { name: 'Striker', id: secondInningsStrikerId };
                openingBatter1 = { ...fallback, runs: 0, balls: 0, boundaries: { fours: 0, sixes: 0, singles: 0, twos: 0 }, strikeRate: '0.00', dismissal: '', status: 'batting' };
                updated[secondBatTeamKey].players = updated[secondBatTeamKey].players || {};
                updated[secondBatTeamKey].players[openingBatter1.id] = openingBatter1;
            }
            if (!openingBatter2) {
                const fallback = secondBatOpeningSquad.find(p => String(p.id) === String(secondInningsNonStrikerId)) || { name: 'Non-Striker', id: secondInningsNonStrikerId };
                openingBatter2 = { ...fallback, runs: 0, balls: 0, boundaries: { fours: 0, sixes: 0, singles: 0, twos: 0 }, strikeRate: '0.00', dismissal: '', status: 'batting' };
                updated[secondBatTeamKey].players = updated[secondBatTeamKey].players || {};
                updated[secondBatTeamKey].players[openingBatter2.id] = openingBatter2;
            }
            if (!openingNewBowler) {
                const fallback = firstBatOpeningSquad.find(p => String(p.id) === String(secondInningsBowlerId)) || { name: 'Bowler', id: secondInningsBowlerId };
                openingNewBowler = { id: fallback.id, name: fallback.name, overs: 0, runs: 0, wickets: 0, economy: '0.00' };
            }

            // Set status 'batting' and ground arrival order for openers
            openingBatter1.status = 'batting';
            openingBatter1.groundArrivalOrder = 1;
            openingBatter1.battingOrder = 1;
            openingBatter2.status = 'batting';
            openingBatter2.groundArrivalOrder = 2;
            openingBatter2.battingOrder = 2;
            if (updated[secondBatTeamKey]?.players?.[openingBatter1.id]) {
                updated[secondBatTeamKey].players[openingBatter1.id].status = 'batting';
                updated[secondBatTeamKey].players[openingBatter1.id].groundArrivalOrder = 1;
                updated[secondBatTeamKey].players[openingBatter1.id].battingOrder = 1;
            }
            if (updated[secondBatTeamKey]?.players?.[openingBatter2.id]) {
                updated[secondBatTeamKey].players[openingBatter2.id].status = 'batting';
                updated[secondBatTeamKey].players[openingBatter2.id].groundArrivalOrder = 2;
                updated[secondBatTeamKey].players[openingBatter2.id].battingOrder = 2;
            }

            // Register bowler in bowlers dictionary
            updated[firstBatTeamKey].bowlers = updated[firstBatTeamKey].bowlers || {};
            if (!updated[firstBatTeamKey].bowlers[openingNewBowler.id]) {
                updated[firstBatTeamKey].bowlers[openingNewBowler.id] = {
                    id: openingNewBowler.id,
                    name: openingNewBowler.name,
                    overs: 0,
                    runs: 0,
                    wickets: 0,
                    economy: '0.00'
                };
            }

            updated[secondBatTeamKey].ballFaceBatsman = openingBatter1;
            updated[secondBatTeamKey].otherSideBatsman = openingBatter2;
            updated[firstBatTeamKey].bowler = updated[firstBatTeamKey].bowlers[openingNewBowler.id];

            // 4. Initialize 2nd innings currentPartnership
            updated[secondBatTeamKey].currentPartnership = {
                batsman1: openingBatter1,
                batsman2: openingBatter2,
                batsman1Runs: 0,
                batsman1Balls: 0,
                batsman2Runs: 0,
                batsman2Balls: 0,
                startScore: 0,
                startBalls: 0
            };

            setStrikerId(openingBatter1.id);
            setNonStrikerId(openingBatter2.id);
            setBowlerId(openingNewBowler.id);
            setActiveInningsTab(secondBatTeamKey);

            setMatchData(updated);
            await updateMatchData(activeMatchTitle, updated, selectedTournamentId);

            await updateLiveData({
                isLive: 1,
                currentMatchPath: activeMatchTitle,
                liveScore: {
                    matchTitle: activeMatchTitle,
                    firstBat: common.firstBat,
                    status: `${openingBatter1.name} & ${openingBatter2.name} open chase for ${updated[secondBatTeamKey]?.name}`,
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

            setShowSwitchInningsModal(false);
            toastRef.current?.showToast('success', `1st Innings concluded! Switched to 2nd Innings (${updated[secondBatTeamKey]?.name} batting).`);
        }, 'Switching Innings...', 'Concluding 1st innings and setting up 2nd innings lineup...');
    };

    // =========================================================================
    // DLS / RAIN INTERRUPTION HANDLERS
    // =========================================================================

    const handleOpenDlsModal = () => {
        if (!matchData) return;
        const currentCommon = matchData.common || {};
        const originalOvers = Number(currentCommon.overLimit) || 15;
        const existingDls = currentCommon.dls;

        if (existingDls && existingDls.isApplied) {
            setDlsRevisedOvers(existingDls.revisedOvers || originalOvers);
            setDlsOfficialTarget(existingDls.revisedTarget || '');
            setDlsCalculationData(existingDls);
            setDlsIsManual(Boolean(existingDls.isManualOverride));
        } else {
            const firstBatTeamKey = currentCommon.firstBat === 1 ? 'team1' : 'team2';
            const firstInningsScore = matchData[firstBatTeamKey]?.totalRuns || 0;
            const defaultRevised = originalOvers;
            setDlsRevisedOvers(defaultRevised);
            setDlsIsManual(false);

            const initialCalc = calculateDlsTarget({
                totalOvers: originalOvers,
                firstInningsScore,
                secondInningsOvers: defaultRevised
            });
            setDlsCalculationData(initialCalc);
            setDlsOfficialTarget(initialCalc.revisedTarget);
        }
        setShowDlsModal(true);
    };

    const handleAutoCalculateDls = (revOversValue) => {
        const currentCommon = matchData?.common || {};
        const originalOvers = Number(currentCommon.overLimit) || 15;
        const firstBatTeamKey = currentCommon.firstBat === 1 ? 'team1' : 'team2';
        const firstInningsScore = matchData?.[firstBatTeamKey]?.totalRuns || 0;
        const revOvers = Number(revOversValue !== undefined ? revOversValue : dlsRevisedOvers) || originalOvers;

        const res = calculateDlsTarget({
            totalOvers: originalOvers,
            firstInningsScore,
            secondInningsOvers: revOvers
        });

        setDlsCalculationData(res);
        setDlsOfficialTarget(res.revisedTarget);
        setDlsIsManual(false);
    };

    const handleApplyDls = async () => {
        if (!matchData || !activeMatchTitle) return;
        const currentCommon = matchData.common || {};
        const originalOvers = Number(currentCommon.overLimit) || 15;
        const revOvers = Number(dlsRevisedOvers) || originalOvers;
        const targetNum = Number(dlsOfficialTarget);

        if (!targetNum || targetNum < 1) {
            toastRef.current?.showToast('error', 'Please provide a valid target score (minimum 1 run).');
            return;
        }

        await withProcessing(async () => {
            const isManualOverride = dlsIsManual || (dlsCalculationData && dlsCalculationData.revisedTarget !== targetNum);
            const dlsPayload = {
                isApplied: true,
                originalOvers,
                revisedOvers: revOvers,
                revisedTarget: targetNum,
                isManualOverride,
                calculatedTarget: dlsCalculationData?.revisedTarget || targetNum,
                requiredRunRate: revOvers > 0 ? Number((targetNum / revOvers).toFixed(2)) : 0,
                resource1: dlsCalculationData?.resource1 ?? 100,
                resource2: dlsCalculationData?.resource2 ?? 100,
                appliedAt: new Date().toISOString()
            };

            const updated = JSON.parse(JSON.stringify(matchData));
            updated.common = updated.common || {};
            updated.common.dls = dlsPayload;

            setMatchData(updated);
            await updateMatchData(activeMatchTitle, updated, selectedTournamentId);

            // Update liveData for viewers
            const secondBatTeamKey = updated.common.firstBat === 1 ? 'team2' : 'team1';
            const secondBatName = updated[secondBatTeamKey]?.name || 'Chasing team';
            await updateLiveData({
                isLive: 1,
                currentMatchPath: activeMatchTitle,
                liveScore: {
                    matchTitle: activeMatchTitle,
                    firstBat: updated.common.firstBat,
                    status: `${secondBatName} needs ${targetNum} runs in ${revOvers} ov (DLS Method)`,
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
                    },
                    dls: dlsPayload
                }
            });

            setShowDlsModal(false);
            toastRef.current?.showToast('success', `DLS target updated: ${targetNum} runs in ${revOvers} overs!`);
        }, 'Applying DLS Method...', 'Updating revised target and match parameters...');
    };

    const handleResetDls = async () => {
        if (!matchData || !activeMatchTitle) return;

        await withProcessing(async () => {
            const updated = JSON.parse(JSON.stringify(matchData));
            if (updated.common) {
                delete updated.common.dls;
            }

            setMatchData(updated);
            await updateMatchData(activeMatchTitle, updated, selectedTournamentId);

            await updateLiveData({
                isLive: 1,
                currentMatchPath: activeMatchTitle,
                liveScore: {
                    matchTitle: activeMatchTitle,
                    firstBat: updated.common?.firstBat,
                    status: updated.common?.status || 'Match in progress',
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

            setShowDlsModal(false);
            toastRef.current?.showToast('info', 'DLS method removed. Normal match target restored.');
        }, 'Resetting DLS Method...', 'Restoring standard match target and overs...');
    };

    // Finish Match
    const handleFinishMatch = async () => {
        await withProcessing(async () => {
            const t1Score = team1.totalRuns || 0;
            const t2Score = team2.totalRuns || 0;
            const resultString = calculateMatchResult(matchData);

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

            // Archive active unbroken partnership for batting sides so it is preserved for future records
            ['team1', 'team2'].forEach(tKey => {
                const teamObj = finishedMatchPayload[tKey];
                if (teamObj && teamObj.currentPartnership) {
                    const cp = teamObj.currentPartnership;
                    const partRuns = (teamObj.totalRuns || 0) - (cp.startScore || 0);
                    const partBalls = (teamObj.totalBalls || 0) - (cp.startBalls || 0);
                    if (partRuns > 0 || partBalls > 0 || (cp.batsman1Runs || 0) > 0 || (cp.batsman2Runs || 0) > 0) {
                        teamObj.partnerships = teamObj.partnerships || {};
                        const existingList = (Array.isArray(teamObj.partnerships)
                            ? teamObj.partnerships
                            : Object.values(teamObj.partnerships)
                        ).filter(Boolean);
                        const alreadySaved = existingList.some(p => p?.isUnbroken && p?.startScore === cp?.startScore);
                        if (!alreadySaved) {
                            const nextWkt = (teamObj.totalWickets || 0) + 1;
                            const pKey = `p_${Date.now()}_${nextWkt}`;
                            teamObj.partnerships[pKey] = {
                                wicketNumber: nextWkt,
                                batsman1: cp.batsman1 || null,
                                batsman2: cp.batsman2 || null,
                                batsman1Runs: cp.batsman1Runs || 0,
                                batsman1Balls: cp.batsman1Balls || 0,
                                batsman2Runs: cp.batsman2Runs || 0,
                                batsman2Balls: cp.batsman2Balls || 0,
                                runs: partRuns,
                                balls: partBalls,
                                overs: `${Math.floor(partBalls / 6)}.${partBalls % 6}`,
                                isUnbroken: true,
                                outBatsman: null,
                                notOutBatsman: null,
                                endScore: `${teamObj.totalRuns || 0}/${teamObj.totalWickets || 0}*`,
                                timestamp: new Date().toISOString()
                            };
                        }
                    }
                }
            });

            setMatchData(finishedMatchPayload);
            await updateMatchData(activeMatchTitle, finishedMatchPayload, selectedTournamentId);

            const existingFixture = publishedMatches.find(m =>
                String(m.title || '').trim().toLowerCase() === String(activeMatchTitle || '').trim().toLowerCase() ||
                String(m.id || '') === String(activeMatchTitle || '')
            );
            const fixtureId = existingFixture?.id || activeMatchTitle;
            await saveFinishedMatch(fixtureId, {
                id: fixtureId,
                title: activeMatchTitle,
                teams: `${team1.name} vs ${team2.name}`,
                score: `${team1.name} ${t1Score}/${team1.totalWickets || 0} (${team1.overs || 0}) • ${team2.name} ${t2Score}/${team2.totalWickets || 0} (${team2.overs || 0})`,
                result: resultString,
                mom: momSelection || '',
                time: existingFixture?.time || new Date().toISOString().split('T')[0],
                date: existingFixture?.date || '',
                venue: existingFixture?.venue || '',
                umpire1: existingFixture?.umpire1 || '',
                umpire2: existingFixture?.umpire2 || '',
                umpire3: existingFixture?.umpire3 || '',
                finished: 1,
                isFinished: true,
                isSpecial: Boolean(existingFixture?.isSpecial || matchData?.isSpecial || matchData?.common?.isSpecial || existingFixture?.matchType === 'special'),
                matchType: existingFixture?.matchType || matchData?.matchType || (existingFixture?.isSpecial ? 'special' : 'tournament')
            }, selectedTournamentId);

            const isSpecialMatch = Boolean(existingFixture?.isSpecial || matchData?.isSpecial || matchData?.common?.isSpecial || existingFixture?.matchType === 'special');

            // Submit and update tournament rankings (Points Table, Top Batters, Top Bowlers) ONLY for tournament matches
            if (!isSpecialMatch) {
                try {
                    await recordMatchRankings(finishedMatchPayload, selectedTournamentId);
                } catch (rankingErr) {
                    console.error('Failed to update tournament rankings on match finish:', rankingErr);
                }
            } else {
                console.log('Special match finalized - Tournament rankings preserved unchanged.');
            }

            await updateLiveData({
                isLive: 0,
                currentMatchPath: '',
                liveScore: null
            });

            setShowFinishModal(false);
            setIsScoringActive(false);
            setActiveMatchTitle('');
            setSelectedMatchTitle('');
            toastRef.current?.showToast('success', isSpecialMatch
                ? `Special match finalized! Result recorded (rankings preserved). ${resultString}`
                : `Match finalized and rankings updated! ${resultString}`);
        }, 'Finalizing Match...', 'Recording results, tournament points, and stats...');
    };

    // Execute atomic 1-to-1 swap between Playing XI and Reserves in Match
    const handleExecuteMatchSwap = async (teamKey) => {
        if (!squadSwapTarget || !squadSwapSelectedId || !activeMatchTitle) return;
        try {
            await withProcessing(async () => {
                const teamData = matchData[teamKey] || {};
                const teamName = teamData.name || (teamKey === 'team1' ? t1Name : t2Name);
                const teamObj = findTeamData(teamName) ||
                    findTeamData(teamKey === 'team1' ? t1Name : t2Name) ||
                    findTeamData(teamKey) ||
                    {};

                // Construct all available players map (including any extraPlayers and squad players on teamObj)
                const allPlayersMap = { ...(teamData.players || {}) };
                if (teamObj?.extraPlayers) {
                    Object.values(teamObj.extraPlayers).forEach(ep => {
                        const existingKey = Object.keys(allPlayersMap).find(k =>
                            String(allPlayersMap[k].id) === String(ep.id) ||
                            (allPlayersMap[k].name && ep.name && allPlayersMap[k].name.trim().toLowerCase() === ep.name.trim().toLowerCase())
                        );
                        if (!existingKey) {
                            const epId = ep.id || `res_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                            allPlayersMap[epId] = {
                                id: epId,
                                name: ep.name,
                                imageUrl: ep.imageUrl || ep.image || ep.photo || '',
                                role: ep.role || 'All Rounder',
                                runs: 0,
                                balls: 0,
                                boundaries: { fours: 0, sixes: 0, singles: 0, twos: 0 },
                                strikeRate: '0.00',
                                dismissal: '',
                                status: 'yet to bat',
                                hand: ep.hand || 'Right Hand',
                                type: 'Reserve',
                                shots: {}
                            };
                        }
                    });
                }

                if (teamObj?.players) {
                    Object.values(teamObj.players).forEach((sp, idx) => {
                        const existingKey = Object.keys(allPlayersMap).find(k =>
                            String(allPlayersMap[k].id) === String(sp.id) ||
                            (allPlayersMap[k].name && sp.name && allPlayersMap[k].name.trim().toLowerCase() === sp.name.trim().toLowerCase())
                        );
                        if (!existingKey) {
                            const spId = sp.id || `sq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                            allPlayersMap[spId] = {
                                id: spId,
                                name: sp.name,
                                imageUrl: sp.imageUrl || sp.image || sp.photo || '',
                                role: sp.role || 'All Rounder',
                                runs: 0,
                                balls: 0,
                                boundaries: { fours: 0, sixes: 0, singles: 0, twos: 0 },
                                strikeRate: '0.00',
                                dismissal: '',
                                status: 'yet to bat',
                                hand: sp.hand || 'Right Hand',
                                type: sp.type || (idx < 11 ? 'Playing XI' : 'Reserve'),
                                shots: {}
                            };
                        }
                    });
                }

                const getPlayerFromMap = (map, id) => {
                    if (!map || id === undefined || id === null) return null;
                    if (map[id]) return map[id];
                    return Object.values(map).find(p => String(p.id) === String(id));
                };

                let targetPlayer = getPlayerFromMap(allPlayersMap, squadSwapTarget.player.id) || { ...squadSwapTarget.player };
                let replacementPlayer = getPlayerFromMap(allPlayersMap, squadSwapSelectedId);

                let playerLeavingXI, playerEnteringXI;
                if (squadSwapTarget.from === 'xi') {
                    playerLeavingXI = { ...targetPlayer };
                    playerEnteringXI = { ...replacementPlayer };
                } else {
                    playerEnteringXI = { ...targetPlayer };
                    playerLeavingXI = { ...replacementPlayer };
                }

                if (!playerLeavingXI || !playerEnteringXI) {
                    toastRef.current?.showToast('error', 'Selected player data not found.');
                    return;
                }

                // Atomic 1-to-1 type swap
                playerLeavingXI.type = 'Reserve';
                playerEnteringXI.type = 'Playing XI';

                const updatedMatch = JSON.parse(JSON.stringify(matchData));
                if (!updatedMatch[teamKey]) updatedMatch[teamKey] = {};
                if (!updatedMatch[teamKey].players) updatedMatch[teamKey].players = {};

                updatedMatch[teamKey].players[playerLeavingXI.id] = playerLeavingXI;
                updatedMatch[teamKey].players[playerEnteringXI.id] = playerEnteringXI;

                setMatchData(updatedMatch);

                // Save to Firebase RTDB
                const updates = {};
                updates[`${teamKey}/players/${playerLeavingXI.id}`] = playerLeavingXI;
                updates[`${teamKey}/players/${playerEnteringXI.id}`] = playerEnteringXI;

                await updateMatchData(activeMatchTitle, updates, selectedTournamentId);

                toastRef.current?.showToast('success', `Swapped ${playerLeavingXI.name} with ${playerEnteringXI.name}!`);
                setSquadSwapTarget(null);
                setSquadSwapSelectedId('');
            }, 'Updating Playing XI...', 'Executing player swap in match lineup...');
        } catch (error) {
            console.error('Error executing match player swap:', error);
            toastRef.current?.showToast('error', 'Failed to swap match players.');
        }
    };

    // RENDER: Squad Manager (Playing XI & Reserves) Modal
    const renderSquadManagerModal = () => {
        if (!showSquadManagerModal || !matchData) return null;

        const currentTeamKey = squadManagerTeamKey || 'team1';
        const teamData = matchData[currentTeamKey] || {};
        const teamName = teamData.name || (currentTeamKey === 'team1' ? t1Name : t2Name);
        const teamObj = findTeamData(teamName) ||
            findTeamData(currentTeamKey === 'team1' ? t1Name : t2Name) ||
            findTeamData(currentTeamKey) ||
            {};

        // Include any bench reserves defined on teamObj that aren't yet in matchData.players
        const mergedPlayersMap = { ...(teamData.players || {}) };
        if (teamObj?.extraPlayers) {
            Object.values(teamObj.extraPlayers).forEach(ep => {
                const existingKey = Object.keys(mergedPlayersMap).find(k =>
                    String(mergedPlayersMap[k].id) === String(ep.id) ||
                    (mergedPlayersMap[k].name && ep.name && mergedPlayersMap[k].name.trim().toLowerCase() === ep.name.trim().toLowerCase())
                );
                if (!existingKey) {
                    const epId = ep.id || `res_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    mergedPlayersMap[epId] = {
                        id: epId,
                        name: ep.name,
                        imageUrl: ep.imageUrl || ep.image || ep.photo || '',
                        role: ep.role || 'All Rounder',
                        runs: 0,
                        balls: 0,
                        boundaries: { fours: 0, sixes: 0, singles: 0, twos: 0 },
                        strikeRate: '0.00',
                        dismissal: '',
                        status: 'yet to bat',
                        hand: ep.hand || 'Right Hand',
                        type: 'Reserve',
                        shots: {}
                    };
                }
            });
        }

        if (teamObj?.players) {
            Object.values(teamObj.players).forEach((sp, idx) => {
                const existingKey = Object.keys(mergedPlayersMap).find(k =>
                    String(mergedPlayersMap[k].id) === String(sp.id) ||
                    (mergedPlayersMap[k].name && sp.name && mergedPlayersMap[k].name.trim().toLowerCase() === sp.name.trim().toLowerCase())
                );
                if (!existingKey) {
                    const spId = sp.id || `sq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    mergedPlayersMap[spId] = {
                        id: spId,
                        name: sp.name,
                        imageUrl: sp.imageUrl || sp.image || sp.photo || '',
                        role: sp.role || 'All Rounder',
                        runs: 0,
                        balls: 0,
                        boundaries: { fours: 0, sixes: 0, singles: 0, twos: 0 },
                        strikeRate: '0.00',
                        dismissal: '',
                        status: 'yet to bat',
                        hand: sp.hand || 'Right Hand',
                        type: sp.type || (idx < 11 ? 'Playing XI' : 'Reserve'),
                        shots: {}
                    };
                }
            });
        }

        const isCurrentlyBattingTeam = (currentBattingTeamKey === currentTeamKey);
        const isCurrentlyBowlingTeam = (currentBowlingTeamKey === currentTeamKey);

        const checkIsLocked = (p) => {
            const isStriker = isCurrentlyBattingTeam && teamData.ballFaceBatsman && String(teamData.ballFaceBatsman.id) === String(p.id);
            const isNonStriker = isCurrentlyBattingTeam && teamData.otherSideBatsman && String(teamData.otherSideBatsman.id) === String(p.id);
            const isCurrentBowler = isCurrentlyBowlingTeam && teamData.bowler && String(teamData.bowler.id) === String(p.id);
            const hasBatted = (p.balls || 0) > 0 || (p.runs || 0) > 0 || !!p.dismissal;
            const hasBowled = teamData.bowlers?.[p.id] && ((teamData.bowlers[p.id].overs || 0) > 0 || (teamData.bowlers[p.id].balls || 0) > 0);
            return {
                isLocked: isStriker || isNonStriker || isCurrentBowler || hasBatted || hasBowled,
                reason: isStriker ? 'Striker' : isNonStriker ? 'Non-Striker' : isCurrentBowler ? 'Active Bowler' : hasBatted ? 'Already Batted' : hasBowled ? 'Already Bowled' : ''
            };
        };

        const playersWithResolvedType = Object.values(mergedPlayersMap).map((p, idx) => {
            const lockedInfo = checkIsLocked(p);
            const squadPlayer = teamObj?.players?.[p.id] ||
                Object.values(teamObj?.players || {}).find(sp =>
                    String(sp.id) === String(p.id) ||
                    (sp.nic && sp.nic === p.nic) ||
                    (sp.name && p.name && sp.name.trim().toLowerCase() === p.name.trim().toLowerCase())
                );
            return {
                ...p,
                type: resolvePlayerType(p, teamObj, lockedInfo.isLocked, idx),
                hand: p.hand || squadPlayer?.hand || 'Right Hand',
                imageUrl: p.imageUrl || squadPlayer?.imageUrl || squadPlayer?.image || p.photo || ''
            };
        });

        const currentXI = playersWithResolvedType.filter(p => p.type === 'Playing XI');
        const currentReserves = playersWithResolvedType.filter(p => p.type === 'Reserve');
        const eligibleXI = currentXI.filter(p => !checkIsLocked(p).isLocked);

        return (
            <div className="sc-modal-overlay" onClick={() => { setShowSquadManagerModal(false); setSquadSwapTarget(null); }}>
                <div className="sc-modal-card sc-squad-manager-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="sc-squad-modal-header">
                        <div className="sc-squad-modal-title">
                            <span className="sc-squad-modal-pill">MATCH ROSTER</span>
                            <h3>Manage Playing XI &amp; Reserves</h3>
                        </div>
                        <button
                            type="button"
                            className="sc-modal-close-btn"
                            onClick={() => { setShowSquadManagerModal(false); setSquadSwapTarget(null); }}
                        >
                            <MdClose />
                        </button>
                    </div>

                    {/* Team Selector Tabs */}
                    <div className="sc-squad-team-tabs">
                        <button
                            type="button"
                            className={`sc-squad-team-tab ${currentTeamKey === 'team1' ? 'active' : ''}`}
                            onClick={() => {
                                setSquadManagerTeamKey('team1');
                                setSquadSwapTarget(null);
                            }}
                        >
                            {t1Name} {isCurrentlyBattingTeam && currentTeamKey === 'team1' ? '(Batting)' : ''}
                        </button>
                        <button
                            type="button"
                            className={`sc-squad-team-tab ${currentTeamKey === 'team2' ? 'active' : ''}`}
                            onClick={() => {
                                setSquadManagerTeamKey('team2');
                                setSquadSwapTarget(null);
                            }}
                        >
                            {t2Name} {isCurrentlyBattingTeam && currentTeamKey === 'team2' ? '(Batting)' : ''}
                        </button>
                    </div>

                    <div className="sc-squad-modal-body">
                        {/* 1-to-1 Swap Sub-panel */}
                        {squadSwapTarget && (
                            <div className="sc-squad-swap-panel">
                                <div className="sc-squad-swap-header">
                                    <span className="sc-squad-swap-tag"><MdSwapHoriz /> 1-TO-1 PLAYER SWAP</span>
                                    <h4>
                                        {squadSwapTarget.from === 'xi'
                                            ? `Swap ${squadSwapTarget.player.name} with a Reserve Player`
                                            : `Promote ${squadSwapTarget.player.name} into Playing XI`}
                                    </h4>
                                    <p>
                                        {squadSwapTarget.from === 'xi'
                                            ? 'Select a reserve player below to replace this player in Playing XI (maintains exactly 11 players):'
                                            : 'Select an unplayed Playing XI player below to move to Reserves (maintains exactly 11 players):'}
                                    </p>
                                </div>

                                <div className="sc-squad-swap-visual">
                                    <div className="sc-swap-card leaving">
                                        <span className="sc-swap-label">{squadSwapTarget.from === 'xi' ? 'Leaving Playing XI' : 'Entering Playing XI'}</span>
                                        <span className="sc-swap-pname">{squadSwapTarget.player.name}</span>
                                        <span className="sc-swap-prole">{squadSwapTarget.player.role || 'Player'}</span>
                                    </div>

                                    <div className="sc-swap-arrow-icon">
                                        <MdSwapHoriz />
                                    </div>

                                    <div className="sc-swap-card entering">
                                        <span className="sc-swap-label">{squadSwapTarget.from === 'xi' ? 'Entering Playing XI (Reserve)' : 'Moving to Reserves (Playing XI)'}</span>
                                        {squadSwapTarget.from === 'xi' ? (
                                            currentReserves.length === 0 ? (
                                                <small style={{ color: '#f87171' }}>No reserves available to swap.</small>
                                            ) : (
                                                <select
                                                    className="sc-swap-select"
                                                    value={String(squadSwapSelectedId)}
                                                    onChange={(e) => setSquadSwapSelectedId(e.target.value)}
                                                >
                                                    {currentReserves.map(rp => (
                                                        <option key={rp.id} value={String(rp.id)}>
                                                            {rp.name} ({rp.role || 'Player'})
                                                        </option>
                                                    ))}
                                                </select>
                                            )
                                        ) : (
                                            eligibleXI.length === 0 ? (
                                                <small style={{ color: '#f87171' }}>No unplayed XI players available to move.</small>
                                            ) : (
                                                <select
                                                    className="sc-swap-select"
                                                    value={String(squadSwapSelectedId)}
                                                    onChange={(e) => setSquadSwapSelectedId(e.target.value)}
                                                >
                                                    {eligibleXI.map(xp => (
                                                        <option key={xp.id} value={String(xp.id)}>
                                                            {xp.name} ({xp.role || 'Player'})
                                                        </option>
                                                    ))}
                                                </select>
                                            )
                                        )}
                                    </div>
                                </div>

                                <div className="sc-squad-swap-actions">
                                    <button type="button" className="cx-btn-secondary" onClick={() => setSquadSwapTarget(null)}>
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="cx-btn-confirm primary"
                                        disabled={!squadSwapSelectedId}
                                        onClick={() => handleExecuteMatchSwap(currentTeamKey)}
                                    >
                                        <MdCheck /> Confirm 1-to-1 Swap
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Playing XI Section */}
                        <div className="sc-squad-section">
                            <div className="sc-squad-sec-header">
                                <h4>Playing XI Squad ({currentXI.length})</h4>
                                <span className="sc-squad-hint">Players eligible to bat, bowl, and field</span>
                            </div>
                            <div className="sc-squad-list">
                                {currentXI.length === 0 ? (
                                    <p className="sc-squad-empty">No Playing XI players assigned.</p>
                                ) : (
                                    currentXI.map((p, idx) => {
                                        const { isLocked, reason: lockedReason } = checkIsLocked(p);

                                        return (
                                            <div key={p.id} className="sc-squad-row xi">
                                                <div className="sc-squad-row-info">
                                                    <span className="sc-squad-num">#{idx + 1}</span>
                                                    <div className="sc-squad-pdetails">
                                                        <strong className="sc-squad-pname">{p.name}</strong>
                                                        <span className="sc-squad-prole">{p.role || 'Player'} {p.hand ? `• ${p.hand}` : ''}</span>
                                                    </div>
                                                </div>
                                                <div className="sc-squad-row-actions">
                                                    {isLocked ? (
                                                        <span className="sc-squad-locked-badge" title="Player has participated in match">
                                                            {lockedReason}
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="sc-squad-btn to-reserve"
                                                            onClick={() => {
                                                                if (currentReserves.length === 0) {
                                                                    toastRef.current?.showToast('warning', 'No reserves available to swap with for this team.');
                                                                    return;
                                                                }
                                                                setSquadSwapTarget({ player: p, from: 'xi' });
                                                                setSquadSwapSelectedId(currentReserves[0]?.id || '');
                                                            }}
                                                            title="Swap with a reserve player"
                                                        >
                                                            <MdSwapHoriz /> Swap with Reserve
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Bench & Reserves Section */}
                        <div className="sc-squad-section">
                            <div className="sc-squad-sec-header">
                                <h4>Bench &amp; Reserves ({currentReserves.length})</h4>
                                <span className="sc-squad-hint">Substitutes and backup players</span>
                            </div>
                            <div className="sc-squad-list">
                                {currentReserves.length === 0 ? (
                                    <p className="sc-squad-empty">No reserves available for this team.</p>
                                ) : (
                                    currentReserves.map((p, idx) => (
                                        <div key={p.id} className="sc-squad-row reserve">
                                            <div className="sc-squad-row-info">
                                                <span className="sc-squad-num reserve">#{idx + 1}</span>
                                                <div className="sc-squad-pdetails">
                                                    <strong className="sc-squad-pname">{p.name}</strong>
                                                    <span className="sc-squad-prole">{p.role || 'Player'}</span>
                                                </div>
                                            </div>
                                            <div className="sc-squad-row-actions">
                                                <button
                                                    type="button"
                                                    className="sc-squad-btn to-xi"
                                                    onClick={() => {
                                                        if (eligibleXI.length === 0) {
                                                            toastRef.current?.showToast('warning', 'No unplayed Playing XI players available to swap out.');
                                                            return;
                                                        }
                                                        setSquadSwapTarget({ player: p, from: 'reserve' });
                                                        setSquadSwapSelectedId(eligibleXI[0]?.id || '');
                                                    }}
                                                    title="Swap into Playing XI"
                                                >
                                                    <MdSwapHoriz /> Swap into XI
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="sc-squad-modal-footer">
                        <button
                            type="button"
                            className="cx-btn-confirm primary"
                            onClick={() => {
                                setShowSquadManagerModal(false);
                                setSquadSwapTarget(null);
                            }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        );
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

                            {(() => {
                                const firstBatKey = (common.firstBat === 2) ? 'team2' : 'team1';
                                const secondBatKey = (common.firstBat === 2) ? 'team1' : 'team2';
                                const firstBatData = firstBatKey === 'team1' ? team1 : team2;
                                const secondBatData = secondBatKey === 'team1' ? team1 : team2;
                                const firstBatName = firstBatData.name || (firstBatKey === 'team1' ? t1Name : t2Name);
                                const secondBatName = secondBatData.name || (secondBatKey === 'team1' ? t1Name : t2Name);

                                const isFirstBatCurrentlyBatting = (currentBattingTeamKey === firstBatKey);
                                const isSecondBatCurrentlyBatting = (currentBattingTeamKey === secondBatKey);

                                return (
                                    <div className="cx-score-display">
                                        {/* Left Slot: Always First Batting Facing Team */}
                                        <div className={`cx-team-score ${isFirstBatCurrentlyBatting ? 'active-bat' : ''}`}>
                                            <div className="cx-team-name-row">
                                                <h2>{firstBatName}</h2>
                                                {isFirstBatCurrentlyBatting ? (
                                                    <span className="cx-batting-badge">
                                                        <MdSportsCricket className="cx-badge-icon" /> BATTING
                                                    </span>
                                                ) : (
                                                    <span className="cx-bowling-badge">
                                                        <MdSportsBaseball className="cx-badge-icon" /> {common.activeInnings === 2 ? 'BOWLING' : '1st INN'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="cx-score-number">
                                                {(firstBatData.totalRuns ?? 0)}/{(firstBatData.totalWickets ?? 0)}
                                                <span>({getOversString(firstBatData)} ov)</span>
                                            </div>
                                        </div>

                                        <div className="cx-vs-divider">VS</div>

                                        {/* Right Slot: Second Batting Team */}
                                        <div className={`cx-team-score cx-align-right ${isSecondBatCurrentlyBatting ? 'active-bat' : ''}`}>
                                            <div className="cx-team-name-row cx-justify-end">
                                                {isSecondBatCurrentlyBatting ? (
                                                    <span className="cx-batting-badge">
                                                        <MdSportsCricket className="cx-badge-icon" /> BATTING
                                                    </span>
                                                ) : (
                                                    <span className="cx-bowling-badge">
                                                        <MdSportsBaseball className="cx-badge-icon" /> BOWLING
                                                    </span>
                                                )}
                                                <h2>{secondBatName}</h2>
                                            </div>
                                            <div className="cx-score-number">
                                                {(secondBatData.totalRuns ?? 0)}/{(secondBatData.totalWickets ?? 0)}
                                                <span>({getOversString(secondBatData)} ov)</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {common.dls?.isApplied && (
                                <div className="sc-dls-active-banner">
                                    <span className="sc-dls-tag">
                                        <MdCloudQueue /> DLS METHOD
                                    </span>
                                    <span className="sc-dls-target-text">
                                        Revised Target: <strong>{common.dls.revisedTarget}</strong> in <strong>{common.dls.revisedOvers}</strong> ov (Req. RR: {(common.dls.revisedTarget / (common.dls.revisedOvers || 1)).toFixed(2)})
                                    </span>
                                    {common.dls.isManualOverride && (
                                        <span className="sc-dls-manual-pill">Manual Target</span>
                                    )}
                                </div>
                            )}

                            <div className="cx-match-status-text">
                                {common.result ? common.result : (common.status || `${striker.name} on strike | ${bowler.name} bowling`)}
                            </div>
                        </div>

                        {/* 2. Striker, Non-Striker and Bowler Section (Space-Saving Row-by-Row) */}
                        <div className="sc-crease-grid compact-rows">
                            {/* Crease Toolbar with Force Unlock Toggle */}
                            <div className="sc-crease-toolbar">
                                <div className="sc-crease-toolbar-title">
                                    <span>Crease Batters & Bowler</span>
                                </div>
                                <div className="sc-crease-toolbar-actions">
                                    <button
                                        type="button"
                                        className={`sc-crease-unlock-btn ${isForceCreaseUnlocked ? 'unlocked' : ''}`}
                                        onClick={() => setIsForceCreaseUnlocked(prev => !prev)}
                                        title={isForceCreaseUnlocked ? "Click to lock crease selectors" : "Click to unlock crease selectors and change batters directly on board"}
                                    >
                                        {isForceCreaseUnlocked ? <MdLockOpen /> : <MdLock />}
                                        <span>{isForceCreaseUnlocked ? 'Crease Unlocked' : 'Unlock Crease'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Striker Row Card */}
                            <div className="sc-crease-box striker compact-row">
                                <div className="sc-cb-top-line">
                                    <div className="sc-cb-label-wrap">
                                        <span className="sc-crease-label">STRIKER (*)</span>
                                        <span className={`sc-hand-pill ${isStrikerLHB ? 'lhb' : 'rhb'}`} title={`Batting Stance: ${isStrikerLHB ? 'Left Hand Batter (LHB)' : 'Right Hand Batter (RHB)'}`}>
                                            {isStrikerLHB ? 'LHB' : 'RHB'}
                                        </span>
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
                                        value={striker.id || ''}
                                        disabled={!isForceCreaseUnlocked && isStrikerLocked}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val) return;
                                            const newId = Number(val);
                                            if (isForceCreaseUnlocked) {
                                                handleExecuteForceChange(newId, nonStrikerId, true);
                                            } else {
                                                setStrikerId(newId);
                                                handleManualBatterChange(newId, 'striker');
                                            }
                                        }}
                                        className={`sc-crease-select compact ${(!isForceCreaseUnlocked && isStrikerLocked) ? 'sc-select-locked' : ''} ${isForceCreaseUnlocked ? 'sc-select-force-unlocked' : ''}`}
                                        title={isForceCreaseUnlocked ? "Force Unlocked: Select any batter" : (isStrikerLocked ? "Batter has faced deliveries / batted. Unlock Crease to change." : "Select or change Striker")}
                                    >
                                        {!striker.id && (
                                            <option value="" disabled>-- Select Striker --</option>
                                        )}
                                        {activeBattingSquad.map(p => {
                                            if (!p) return null;
                                            const isOut = isPlayerDismissedInInnings(p, battingTeamData);
                                            const isOtherCrease = String(p.id) === String(nonStriker?.id);
                                            const isCurrent = String(p.id) === String(striker?.id);
                                            const isDisabled = isForceCreaseUnlocked
                                                ? (!isCurrent && isOtherCrease)
                                                : (!isCurrent && (isOut || isOtherCrease));

                                            return (
                                                <option key={p.id} value={p.id} disabled={isDisabled}>
                                                    {p.name} {isOut ? '(Out)' : ''}
                                                </option>
                                            );
                                        })}
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
                                        <span className={`sc-hand-pill ${isNonStrikerLHB ? 'lhb' : 'rhb'}`} title={`Batting Stance: ${isNonStrikerLHB ? 'Left Hand Batter (LHB)' : 'Right Hand Batter (RHB)'}`}>
                                            {isNonStrikerLHB ? 'LHB' : 'RHB'}
                                        </span>
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
                                        value={nonStriker.id || ''}
                                        disabled={!isForceCreaseUnlocked && isNonStrikerLocked}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val) return;
                                            const newId = Number(val);
                                            if (isForceCreaseUnlocked) {
                                                handleExecuteForceChange(strikerId, newId, true);
                                            } else {
                                                setNonStrikerId(newId);
                                                handleManualBatterChange(newId, 'nonStriker');
                                            }
                                        }}
                                        className={`sc-crease-select compact ${(!isForceCreaseUnlocked && isNonStrikerLocked) ? 'sc-select-locked' : ''} ${isForceCreaseUnlocked ? 'sc-select-force-unlocked' : ''}`}
                                        title={isForceCreaseUnlocked ? "Force Unlocked: Select any batter" : (isNonStrikerLocked ? "Batter has faced deliveries / batted. Unlock Crease to change." : "Select or change Non-Striker")}
                                    >
                                        {!nonStriker.id && (
                                            <option value="" disabled>-- Select Non-Striker --</option>
                                        )}
                                        {activeBattingSquad.map(p => {
                                            if (!p) return null;
                                            const isOut = isPlayerDismissedInInnings(p, battingTeamData);
                                            const isOtherCrease = String(p.id) === String(striker?.id);
                                            const isCurrent = String(p.id) === String(nonStriker?.id);
                                            const isDisabled = isForceCreaseUnlocked
                                                ? (!isCurrent && isOtherCrease)
                                                : (!isCurrent && (isOut || isOtherCrease));

                                            return (
                                                <option key={p.id} value={p.id} disabled={isDisabled}>
                                                    {p.name} {isOut ? '(Out)' : ''}
                                                </option>
                                            );
                                        })}
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
                                    <div className="sc-cb-label-wrap">
                                        <span className="sc-crease-label">BOWLER (🔴)</span>
                                        {bowler.bowlingStyle && (
                                            <span className="sc-bowler-style-badge" title={`Bowling Style: ${bowler.bowlingStyle}`}>
                                                {bowler.bowlingStyle}
                                            </span>
                                        )}
                                    </div>
                                    <select
                                        value={bowler.id}
                                        disabled={isBowlerLocked}
                                        onChange={(e) => {
                                            const newId = Number(e.target.value);
                                            setBowlerId(newId);
                                            handleManualBowlerChange(newId);
                                        }}
                                        className={`sc-crease-select compact ${isBowlerLocked ? 'sc-select-locked' : ''}`}
                                        title={isBowlerLocked ? "Bowler cannot be changed during an ongoing over." : "Select bowler for this over"}
                                    >
                                        {activeBowlingSquad.map(p => {
                                            if (!p) return null;
                                            return (
                                                <option key={p.id} value={p.id}>
                                                    {p.name}
                                                </option>
                                            );
                                        })}
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
                                    <button
                                        type="button"
                                        className="sc-action-btn force-batters"
                                        onClick={handleOpenForceChangeModal}
                                        title="Forcefully change Striker & Non-Striker at the crease"
                                    >
                                        <MdPersonPin /> Force Batters
                                    </button>
                                    <button
                                        className="sc-action-btn squad"
                                        onClick={() => {
                                            setSquadManagerTeamKey(currentBattingTeamKey);
                                            setShowSquadManagerModal(true);
                                        }}
                                        title="Manage Match Playing XI & Reserves"
                                    >
                                        <MdGroups /> Squad XI
                                    </button>
                                    <button
                                        className={`sc-action-btn dls ${common.dls?.isApplied ? 'active-dls' : ''}`}
                                        onClick={handleOpenDlsModal}
                                        title="DLS & Rain Delay Target Manager"
                                    >
                                        <MdCloudQueue /> DLS {common.dls?.isApplied ? `(${common.dls.revisedTarget})` : ''}
                                    </button>
                                    {common.activeInnings !== 2 && (
                                        <button
                                            className="sc-action-btn switch"
                                            onClick={() => {
                                                setSecondInningsStrikerId('');
                                                setSecondInningsNonStrikerId('');
                                                setSecondInningsBowlerId('');
                                                setShowSwitchInningsModal(true);
                                            }}
                                            title="Conclude 1st Innings & Start 2nd Innings Chase"
                                        >
                                            <MdSwapHoriz /> Switch Innings
                                        </button>
                                    )}
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
                                                <span className="sc-ew-title">
                                                    <MdTrackChanges className="sc-ew-icon" /> SHOT PLACEMENT WHEELER ({isStrikerLHB ? 'LHB • Left Hand' : 'RHB • Right Hand'})
                                                </span>
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
                                                    <circle cx="150" cy="150" r="146" fill="none" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="2" strokeDasharray="5 5" className="sc-ew-outer-circle" />
                                                    <circle cx="150" cy="150" r="78" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" strokeDasharray="3 3" className="sc-ew-inner-circle" />

                                                    {getActiveSectors(striker.hand || 'Right Hand').map((s) => {
                                                        const pathData = describeArc(150, 150, 142, s.startAngle, s.endAngle);
                                                        const textCoords = getLabelCoords(150, 150, 142, s.startAngle, s.endAngle);
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

                                                    <rect x="143" y="114" width="14" height="72" fill="#f59e0b" opacity="0.85" rx="3" />
                                                    <circle cx="150" cy="150" r="4" fill="#00f0ff" />
                                                </svg>
                                            </div>
                                        </>
                                    )}

                                    {inlinePanelMode === 'extras' && (
                                        <div className="sc-inline-config-box extras-mode">
                                            <div className="sc-icb-header">
                                                <span className={`sc-icb-title extra ${extraType === 'Penalty' ? 'penalty' : ''}`}>
                                                    ⚡ {extraType === 'Penalty' ? 'CUSTOM PENALTY MARKS' : `RECORD EXTRA (${extraType.toUpperCase()})`}
                                                </span>
                                                <button className="sc-btn-close-icb" onClick={() => setInlinePanelMode('wheeler')} title="Back to Wheeler">
                                                    <MdClose />
                                                </button>
                                            </div>
                                            <div className="sc-icb-body">
                                                <div className="sc-icb-field">
                                                    <label>Extra Type</label>
                                                    <select
                                                        value={extraType}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setExtraType(val);
                                                            if (val === 'Penalty') setExtraRuns(5);
                                                            else if (val === 'Bye' || val === 'Leg Bye') setExtraRuns(1);
                                                            else setExtraRuns(0);
                                                        }}
                                                        className="sc-icb-select"
                                                    >
                                                        <option value="Wide">Wide (WD)</option>
                                                        <option value="No Ball">No Ball (NB)</option>
                                                        <option value="Bye">Bye</option>
                                                        <option value="Leg Bye">Leg Bye</option>
                                                        <option value="Penalty">Penalty Marks (PEN)</option>
                                                    </select>
                                                </div>

                                                {extraType === 'No Ball' && (
                                                    <div className="sc-icb-field" style={{ marginBottom: '10px' }}>
                                                        <label>Extra Runs Credited To (Beyond +1 Penalty)</label>
                                                        <div className="sc-icb-source-tabs">
                                                            <button
                                                                type="button"
                                                                className={`sc-icb-source-btn ${noBallRunsSource === 'bat' ? 'active' : ''}`}
                                                                onClick={() => setNoBallRunsSource('bat')}
                                                            >
                                                                🏏 Runs off Bat (Striker)
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className={`sc-icb-source-btn ${noBallRunsSource === 'bye' ? 'active' : ''}`}
                                                                onClick={() => setNoBallRunsSource('bye')}
                                                            >
                                                                🏃 Byes off NB (Extras)
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className={`sc-icb-source-btn ${noBallRunsSource === 'legBye' ? 'active' : ''}`}
                                                                onClick={() => setNoBallRunsSource('legBye')}
                                                            >
                                                                🦵 Leg Byes off NB (Extras)
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="sc-icb-field">
                                                    <label>
                                                        {extraType === 'Penalty'
                                                            ? 'Penalty Marks / Runs'
                                                            : (extraType === 'Bye' || extraType === 'Leg Bye'
                                                                ? 'Extra Runs (Mandatory penalty: None)'
                                                                : 'Extra Runs (beyond +1 mandatory penalty)')}
                                                    </label>
                                                    {extraType === 'Penalty' ? (
                                                        <div className="sc-penalty-input-group">
                                                            <div className="sc-penalty-presets">
                                                                {[1, 2, 3, 4, 5, 6, 7, 10].map((r) => (
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
                                                            <div className="sc-custom-penalty-row">
                                                                <span className="sc-custom-label">Custom Score:</span>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="50"
                                                                    value={extraRuns}
                                                                    onChange={(e) => setExtraRuns(Math.max(1, parseInt(e.target.value, 10) || 0))}
                                                                    className="sc-custom-penalty-input"
                                                                    placeholder="Enter marks"
                                                                />
                                                                <span className="sc-penalty-unit-tag">Runs</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="sc-icb-runs-grid">
                                                            {(extraType === 'Bye' || extraType === 'Leg Bye' ? [1, 2, 3, 4, 6] : [0, 1, 2, 3, 4, 6]).map((r) => (
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
                                                    )}
                                                    <div className="sc-icb-rule-hint">
                                                        {extraType === 'Wide' && `⚡ Mandatory: +1 run penalty to Wides. Extra runs beyond penalty: +${extraRuns} (Total: ${1 + extraRuns} runs to Extras → Wides) • Bowler charged: ${1 + extraRuns} • Strike: ${extraRuns % 2 !== 0 ? 'Rotates (Swaps)' : 'Remains with Striker'}`}
                                                        {extraType === 'No Ball' && noBallRunsSource === 'bat' && `⚡ Mandatory: +1 run penalty to Extras → No Ball. +${extraRuns} run(s) off bat credited to Striker (${striker.name || 'Striker'}) • Bowler charged: ${1 + extraRuns} • Free Hit faced by: ${extraRuns % 2 !== 0 ? 'Non-Striker (Rotated)' : 'Striker (Remains)'}`}
                                                        {extraType === 'No Ball' && noBallRunsSource === 'bye' && `⚡ Mandatory: +1 run penalty to Extras → No Ball. +${extraRuns} bye(s) off NB credited to Extras → Byes • Bowler charged: 1 run penalty only • Striker: 0 runs, 1 ball • Strike: ${extraRuns % 2 !== 0 ? 'Rotates (Swaps)' : 'Remains with Striker'}`}
                                                        {extraType === 'No Ball' && noBallRunsSource === 'legBye' && `⚡ Mandatory: +1 run penalty to Extras → No Ball. +${extraRuns} leg bye(s) off NB credited to Extras → Leg Byes • Bowler charged: 1 run penalty only • Striker: 0 runs, 1 ball • Strike: ${extraRuns % 2 !== 0 ? 'Rotates (Swaps)' : 'Remains with Striker'}`}
                                                        {(extraType === 'Bye' || extraType === 'Leg Bye') && `⚡ Mandatory penalty: None. +${extraRuns} ${extraType}(s) credited to Extras → ${extraType}s • Bowler NOT charged (0 runs) • Striker: 0 runs, 1 ball faced • Strike: ${extraRuns % 2 !== 0 ? 'Rotates (Swaps)' : 'Remains with Striker'}`}
                                                        {extraType === 'Penalty' && `⚡ +${extraRuns || 5} Penalty marks awarded directly to ${currentBattingTeamKey === 'team1' ? (team1.name || 'Batting Team') : (team2.name || 'Batting Team')} extras. Bowler not charged; strike unchanged.`}
                                                    </div>
                                                </div>
                                                <div className="sc-icb-actions">
                                                    <button type="button" className="sc-icb-btn cancel" onClick={() => setInlinePanelMode('wheeler')}>
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`sc-icb-btn confirm extra ${extraType === 'Penalty' ? 'penalty' : ''}`}
                                                        onClick={() => {
                                                            const isNbWithBatRuns = extraType === 'No Ball' && noBallRunsSource === 'bat' && Number(extraRuns) > 0;
                                                            if (isNbWithBatRuns) {
                                                                setPendingBallEvent({
                                                                    runs: 0,
                                                                    isExtra: true,
                                                                    extraType: 'No Ball',
                                                                    extraRuns: Number(extraRuns),
                                                                    noBallRunsSource: 'bat'
                                                                });
                                                                setShowWagonPlacementModal(true);
                                                                setInlinePanelMode('wheeler');
                                                            } else {
                                                                executeBallDelivery({
                                                                    runs: 0,
                                                                    isExtra: true,
                                                                    extraType,
                                                                    extraRuns: extraType === 'Penalty' ? (extraRuns || 5) : Number(extraRuns),
                                                                    noBallRunsSource: extraType === 'No Ball' ? noBallRunsSource : undefined
                                                                });
                                                                setInlinePanelMode('wheeler');
                                                            }
                                                        }}
                                                    >
                                                        {extraType === 'Penalty'
                                                            ? `Award +${extraRuns || 5} Penalty Marks`
                                                            : (extraType === 'No Ball' && noBallRunsSource === 'bat' && Number(extraRuns) > 0
                                                                ? 'Pick Batted Area & Confirm'
                                                                : 'Confirm Extra')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {inlinePanelMode === 'wicket' && (
                                        <div className="sc-inline-config-box wicket-mode">
                                            <div className="sc-icb-header">
                                                <span className="sc-icb-title wicket">
                                                    <MdWarning className="sc-icb-icon" /> RECORD WICKET ({dismissalType.toUpperCase()})
                                                </span>
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
                                                            if (val !== 'Run Out') {
                                                                setRunOutRuns(0);
                                                            }
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

                                                {dismissalType === 'Run Out' && (
                                                    <div className="sc-icb-field">
                                                        <label>Runs Completed Before Run Out (Added to Striker)</label>
                                                        <div className="sc-icb-runs-grid">
                                                            {[0, 1, 2, 3, 4].map((r) => (
                                                                <button
                                                                    key={r}
                                                                    type="button"
                                                                    className={`sc-icb-run-btn ${runOutRuns === r ? 'active' : ''}`}
                                                                    onClick={() => setRunOutRuns(r)}
                                                                >
                                                                    {r === 0 ? '0 Runs' : `+${r} Run${r > 1 ? 's' : ''}`}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className="sc-icb-rule-hint">
                                                            {runOutRuns === 0
                                                                ? `⚡ 0 Runs: No runs added to striker (${striker?.name || 'Striker'}). Wicket recorded.`
                                                                : `⚡ +${runOutRuns} Run${runOutRuns > 1 ? 's' : ''}: Added to striker (${striker?.name || 'Striker'}) & team score. Bowler charged: ${runOutRuns}. Strike: ${runOutRuns % 2 !== 0 ? 'Crossed / Swapped' : 'Remains at same end'}.`}
                                                        </div>
                                                    </div>
                                                )}

                                                {(dismissalType === 'Caught' || dismissalType === 'Run Out' || dismissalType === 'Stumped') && (
                                                    <div className="sc-icb-field">
                                                        <label>Fielder ({bowlingTeamName} - Fielding Side)</label>
                                                        <select
                                                            value={dismissalFielder}
                                                            onChange={(e) => setDismissalFielder(e.target.value)}
                                                            className="sc-icb-select"
                                                        >
                                                            <option value="">Select Fielder ({bowlingTeamName})...</option>
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
                                                            const runsScoredOnRunOut = dismissalType === 'Run Out' ? Number(runOutRuns || 0) : 0;
                                                            executeBallDelivery({
                                                                runs: runsScoredOnRunOut,
                                                                isWicket: true,
                                                                dismissalType,
                                                                dismissalFielder,
                                                                dismissalBatterId: (dismissalType === 'Run Out' || dismissalType === 'Retired Out') ? (dismissalBatterId || strikerId) : strikerId,
                                                                wagonZone: selectedShotZone || 'Point'
                                                            });
                                                            setInlinePanelMode('wheeler');
                                                        }}
                                                    >
                                                        {dismissalType === 'Run Out' && runOutRuns > 0
                                                            ? `Confirm Run Out (+${runOutRuns} Runs to Striker)`
                                                            : 'Confirm Wicket'}
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
                                            <span className="sc-kg-title score-title">
                                                <MdSportsCricket className="sc-kg-icon" /> RUN SCORES
                                            </span>
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
                                            <span className="sc-kg-title extra-title">
                                                <MdBolt className="sc-kg-icon" /> EXTRAS
                                            </span>
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
                                            <button
                                                className="kp-btn extra penalty-btn"
                                                onClick={() => handleOpenInlineExtra('Penalty')}
                                                title="Add Custom Penalty Marks as Extra Runs"
                                            >
                                                PEN <small>+PENALTY</small>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 3. WICKET GROUP */}
                                    <div className="sc-keypad-group">
                                        <div className="sc-kg-header">
                                            <span className="sc-kg-title wicket-title">
                                                <MdWarning className="sc-kg-icon" /> WICKET DISMISSALS
                                            </span>
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
                    {/* Innings Selection Tabs: First Batting Team in 1st Tab, Second in 2nd Tab, Default active = Current Batting Team */}
                    {(() => {
                        const firstBatKey = (common.firstBat === 1) ? 'team1' : 'team2';
                        const secondBatKey = (common.firstBat === 1) ? 'team2' : 'team1';
                        const firstBatName = (common.firstBat === 1) ? t1Name : t2Name;
                        const secondBatName = (common.firstBat === 1) ? t2Name : t1Name;

                        return (
                            <div className="cx-innings-tabs">
                                <button
                                    className={`cx-innings-tab-btn ${tabBattingTeamKey === firstBatKey ? 'active' : ''}`}
                                    onClick={() => setActiveInningsTab(firstBatKey)}
                                >
                                    {firstBatName} Innings (1st Bat) {currentBattingTeamKey === firstBatKey ? '• LIVE' : ''}
                                </button>
                                <button
                                    className={`cx-innings-tab-btn ${tabBattingTeamKey === secondBatKey ? 'active' : ''}`}
                                    onClick={() => setActiveInningsTab(secondBatKey)}
                                >
                                    {secondBatName} Innings (2nd Bat) {currentBattingTeamKey === secondBatKey ? '• LIVE' : ''}
                                </button>
                            </div>
                        );
                    })()}

                    <div className="sc-scorecard-two-col">
                        {/* Left Sub-Column: Batting Scorecard */}
                        <div className="cx-glass-panel sc-scorecard-panel">
                            <div className="cx-panel-header-with-icon">
                                <h3>{tabBattingTeamName} Batting Scorecard</h3>
                            </div>

                            <div className="cx-table-subtitle-row">
                                <h4 className="cx-table-subtitle">Playing XI</h4>
                                <button
                                    type="button"
                                    className="sc-squad-inline-btn"
                                    onClick={() => {
                                        setSquadManagerTeamKey(tabBattingTeamKey);
                                        setShowSquadManagerModal(true);
                                    }}
                                    title="Change Playing XI & Reserve players"
                                >
                                    <MdGroups /> Edit XI / Reserves
                                </button>
                            </div>
                            <table className="cx-scorecard-table">
                                <thead>
                                    <tr>
                                        <th>Batter</th>
                                        <th className="text-center" style={{ textAlign: 'center' }}>R</th>
                                        <th className="text-center" style={{ textAlign: 'center' }}>B</th>
                                        <th className="text-center" style={{ textAlign: 'center' }}>4s</th>
                                        <th className="text-center" style={{ textAlign: 'center' }}>6s</th>
                                        <th className="text-center" style={{ textAlign: 'center' }}>SR</th>
                                        <th className="text-center" style={{ textAlign: 'center' }}>Wheel</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tabPlayingXI.length > 0 ? (
                                        tabPlayingXI.map(p => {
                                            const isOut = isPlayerDismissedInInnings(p, tabBattingTeamData);
                                            const isStriker = !isOut && (
                                                (tabBattingTeamData.ballFaceBatsman && String(tabBattingTeamData.ballFaceBatsman.id) === String(p.id)) ||
                                                (tabBattingTeamKey === currentBattingTeamKey && strikerId != null && String(strikerId) === String(p.id))
                                            );
                                            const isNonStriker = !isOut && (
                                                (tabBattingTeamData.otherSideBatsman && String(tabBattingTeamData.otherSideBatsman.id) === String(p.id)) ||
                                                (tabBattingTeamKey === currentBattingTeamKey && nonStrikerId != null && String(nonStrikerId) === String(p.id))
                                            );
                                            const isCurrentlyBatting = !isOut && (isStriker || isNonStriker || p.status === 'batting');

                                            let dismissalDisplay = 'Yet to bat';
                                            if (isOut) {
                                                dismissalDisplay = (p.dismissal && p.dismissal.trim() !== '' && p.dismissal.trim().toLowerCase() !== 'yet to bat' && p.dismissal.trim().toLowerCase() !== 'not out')
                                                    ? p.dismissal
                                                    : 'out';
                                            } else if (isCurrentlyBatting) {
                                                dismissalDisplay = 'Not out';
                                            } else if (Number(p.balls || 0) > 0 || Number(p.runs || 0) > 0) {
                                                dismissalDisplay = 'Not out';
                                            } else {
                                                dismissalDisplay = 'Yet to bat';
                                            }

                                            return (
                                                <tr
                                                    key={p.id}
                                                    className={`${isCurrentlyBatting ? 'cx-row-active-batting' : ''} ${isOut ? 'cx-row-out-batter' : ''}`}
                                                    style={isOut ? { color: '#94a3b8', fontStyle: 'italic', opacity: 0.8 } : {}}
                                                >
                                                    <td className="cx-player-name-cell" style={isOut ? { color: '#94a3b8', fontStyle: 'italic' } : {}}>
                                                        <div className="cx-pname-line">
                                                            <strong style={isOut ? { color: '#94a3b8', fontStyle: 'italic' } : {}}>{p.name}</strong>
                                                            <span className={`cx-scorecard-player-hand ${(p.hand === 'LHB' || p.hand === 'LHS' || p.hand === 'Left Hand' || String(p.hand || '').toLowerCase().includes('left')) ? 'lhb' : 'rhb'}`}>
                                                                {(p.hand === 'LHB' || p.hand === 'LHS' || p.hand === 'Left Hand' || String(p.hand || '').toLowerCase().includes('left')) ? 'LHB' : 'RHB'}
                                                            </span>
                                                            {isStriker && (
                                                                <span className="cx-striker-symbol" title="On Strike">
                                                                    <MdSportsCricket />
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="cx-dismissal-text" style={isOut ? { color: '#94a3b8', fontStyle: 'italic' } : {}}>
                                                            {dismissalDisplay}
                                                        </div>
                                                    </td>
                                                    <td className="cx-stat-highlight text-center" style={{ textAlign: 'center', ...(isOut ? { color: '#94a3b8', fontStyle: 'italic' } : {}) }}>{p.runs || 0}</td>
                                                    <td className="text-center" style={{ textAlign: 'center', ...(isOut ? { color: '#94a3b8', fontStyle: 'italic' } : {}) }}>{p.balls || 0}</td>
                                                    <td className="text-center" style={{ textAlign: 'center', ...(isOut ? { color: '#94a3b8', fontStyle: 'italic' } : {}) }}>{p.boundaries?.fours || 0}</td>
                                                    <td className="text-center" style={{ textAlign: 'center', ...(isOut ? { color: '#94a3b8', fontStyle: 'italic' } : {}) }}>{p.boundaries?.sixes || 0}</td>
                                                    <td className="text-center" style={{ textAlign: 'center', ...(isOut ? { color: '#94a3b8', fontStyle: 'italic' } : {}) }}>{p.strikeRate || '0.00'}</td>
                                                    <td className="text-center" style={{ textAlign: 'center' }}>
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

                            {/* Batting Team Extras & Total Summary */}
                            {(() => {
                                const extrasInfo = parseExtrasBreakdown(tabBattingTeamData.extraTypes, tabBattingTeamData.totalExtraAmount);
                                return (
                                    <div className="cx-extras-summary-bar">
                                        <div className="cx-extras-item">
                                            <span className="cx-es-label">Extras:</span>
                                            <strong className="cx-es-val">{extrasInfo.total}</strong>
                                            <span className="cx-es-breakdown">({extrasInfo.breakdownText})</span>
                                            {extrasInfo.pen > 0 && (
                                                <span className="cx-es-penalty-chip">
                                                    ⚡ +{extrasInfo.pen} Penalty
                                                </span>
                                            )}
                                        </div>
                                        <div className="cx-extras-item total">
                                            <span className="cx-es-label">Total:</span>
                                            <strong className="cx-es-val total">{tabBattingTeamData.totalRuns || 0}/{tabBattingTeamData.totalWickets || 0}</strong>
                                            <span className="cx-es-overs">({tabBattingTeamData.overs || 0} Ov)</span>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Reserve Players List */}
                            {tabReserves.length > 0 && (
                                <div className="cx-reserves-section-inline">
                                    <h4 className="cx-table-subtitle">Reserve Players</h4>
                                    <div className="cx-reserves-list-names">
                                        {tabReserves.map((p, idx) => (
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
                                <h3>{tabBowlingTeamName} Bowling Overview</h3>
                            </div>

                            <table className="cx-scorecard-table">
                                <thead>
                                    <tr>
                                        <th>Bowler</th>
                                        <th className="text-center" style={{ textAlign: 'center' }}>O</th>
                                        <th className="text-center" style={{ textAlign: 'center' }}>R</th>
                                        <th className="text-center" style={{ textAlign: 'center' }}>W</th>
                                        <th className="text-center" style={{ textAlign: 'center' }}>Econ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tabBowlersList.length > 0 ? (
                                        tabBowlersList.map(b => (
                                            <tr key={b.id} className={matchData[currentBowlingTeamKey]?.bowler?.id === b.id ? 'cx-row-active-bowling' : ''}>
                                                <td className="cx-player-name-cell">
                                                    <div className="cx-pname-line">
                                                        <strong>{b.name}</strong>
                                                        {matchData[currentBowlingTeamKey]?.bowler?.id === b.id && (
                                                            <span className="active-bowler-dot" title="Active Bowler">
                                                                <span className="bowler-pulse-dot" />
                                                            </span>
                                                        )}
                                                    </div>
                                                    {b.bowlingStyle && (
                                                        <span className="cx-bowler-style-sub">{b.bowlingStyle}</span>
                                                    )}
                                                </td>
                                                <td className="text-center" style={{ textAlign: 'center' }}>{b.overs || '0.0'}</td>
                                                <td className="text-center" style={{ textAlign: 'center' }}>{b.runs || 0}</td>
                                                <td className="cx-stat-highlight text-center" style={{ textAlign: 'center' }}>{b.wickets || 0}</td>
                                                <td className="text-center" style={{ textAlign: 'center' }}>{b.economy || '0.00'}</td>
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
                                                <span className="cx-psb-total-runs">{Math.max(0, (battingTeamData.totalRuns || 0) - (cp.startScore || 0))} runs</span>
                                                <span className="cx-psb-total-balls">({Math.max(0, (battingTeamData.totalBalls || 0) - (cp.startBalls || 0))} balls)</span>
                                                <span className="cx-psb-rr">CRR: {Math.max(0, (battingTeamData.totalBalls || 0) - (cp.startBalls || 0)) > 0 ? (((Math.max(0, (battingTeamData.totalRuns || 0) - (cp.startScore || 0))) / Math.max(1, (battingTeamData.totalBalls || 0) - (cp.startBalls || 0))) * 6).toFixed(2) : '0.00'}</span>
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
                                            {Math.max(0, ((battingTeamData.totalRuns || 0) - (cp.startScore || 0)) - ((cp.batsman1Runs || 0) + (cp.batsman2Runs || 0))) > 0 && (
                                                <div className="cx-psb-extras">
                                                    +{Math.max(0, ((battingTeamData.totalRuns || 0) - (cp.startScore || 0)) - ((cp.batsman1Runs || 0) + (cp.batsman2Runs || 0)))} extras during stand
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="cx-no-partnership">No active partnership.</div>
                                    )}

                                    {/* Innings Partnerships Breakdown */}
                                    {battingTeamData.partnerships && Object.keys(battingTeamData.partnerships).length > 0 && (
                                        <div className="cx-phb-container">
                                            <div className="cx-phb-header">
                                                <span>Innings Partnerships Breakdown</span>
                                            </div>
                                            <div className="cx-phb-list">
                                                {Object.values(battingTeamData.partnerships).filter(Boolean).map((p, pIdx) => (
                                                    <div key={p.id || pIdx} className={`cx-phb-item ${p?.isUnbroken ? 'unbroken' : ''}`}>
                                                        <span className="cx-phb-wkt">{p.wicketLabel || `${p.wicketNumber || pIdx + 1} Wkt`}</span>
                                                        <span className="cx-phb-runs"><strong>{p.runs}</strong> runs ({p.balls}b)</span>
                                                        <span className="cx-phb-batters">
                                                            {p.batsman1?.name?.split(' ')[0]}: {p.batsman1Runs || 0} • {p.batsman2?.name?.split(' ')[0]}: {p.batsman2Runs || 0}
                                                        </span>
                                                        {p.endScore && <span className="cx-phb-end-score">[{p.endScore}]</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
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
                            <div className="cx-comm-header-actions">
                                <div className="cx-comm-over-filter-bar">
                                    <button
                                        type="button"
                                        className={`cx-comm-over-pill ${(!adminCommOverFilter || adminCommOverFilter === 'all') ? 'active' : ''}`}
                                        onClick={() => setAdminCommOverFilter('all')}
                                    >
                                        All Overs
                                    </button>

                                    <div className="cx-comm-custom-over-box">
                                        <span className="cx-comm-custom-label">Custom Over:</span>
                                        <div className="cx-comm-custom-input-wrap">
                                            <input
                                                type="number"
                                                min="1"
                                                max="50"
                                                placeholder="Over #"
                                                className="cx-comm-custom-over-input"
                                                value={adminCommOverFilter === 'all' ? '' : adminCommOverFilter}
                                                onChange={(e) => {
                                                    const val = e.target.value.trim();
                                                    setAdminCommOverFilter(val === '' ? 'all' : val);
                                                }}
                                            />
                                            {adminCommOverFilter && adminCommOverFilter !== 'all' && (
                                                <button
                                                    type="button"
                                                    className="cx-comm-clear-btn"
                                                    onClick={() => setAdminCommOverFilter('all')}
                                                    title="Clear filter (Show All Overs)"
                                                >
                                                    <MdClose />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {availableCommOvers.length > 0 && (
                                        <div className="cx-comm-over-pills">
                                            {availableCommOvers.map((ov) => (
                                                <button
                                                    key={ov}
                                                    type="button"
                                                    className={`cx-comm-over-pill ${adminCommOverFilter === String(ov) ? 'active' : ''}`}
                                                    onClick={() => setAdminCommOverFilter(String(ov))}
                                                >
                                                    Over {ov}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <span className="comm-counter">
                                    {filteredCommentaryList.length} deliveries
                                    {adminCommOverFilter && adminCommOverFilter !== 'all' ? ` (Over ${adminCommOverFilter})` : ''}
                                </span>
                            </div>
                        </div>

                        <div className="cx-commentary-list-wrapper sc-full-comm-list">
                            {filteredCommentaryList.length > 0 ? (
                                filteredCommentaryList.map((comm) => (
                                    <div key={comm.id || comm.timestamp} className={`cx-comm-row ${comm.isWicket ? 'cx-comm-wicket' : ''} ${comm.runs >= 4 ? 'cx-comm-boundary' : ''}`}>
                                        <div className="cx-comm-over-badge">
                                            {comm.over}
                                        </div>
                                        <div className="cx-comm-text-side">
                                            <div className="cx-comm-indicators">
                                                {comm.isWicket && <span className="cx-badge-wicket">WICKET</span>}
                                                {(comm.extraType === 'Penalty' || (comm.text && comm.text.toLowerCase().includes('penalty'))) && (
                                                    <span className="cx-badge-penalty">PENALTY (+{comm.runs})</span>
                                                )}
                                                {comm.runs === 4 && !comm.isExtra && <span className="cx-badge-four">FOUR (4)</span>}
                                                {comm.runs === 6 && !comm.isExtra && <span className="cx-badge-six">SIX (6)</span>}
                                                {comm.isExtra && comm.extraType !== 'Penalty' && !comm.text?.toLowerCase().includes('penalty') && (
                                                    <span className="cx-badge-extra">{comm.extraType ? comm.extraType.toUpperCase() : 'EXTRA'}</span>
                                                )}
                                                {comm.wagonZone && <span className="cx-badge-zone">{comm.wagonZone}</span>}
                                            </div>
                                            <p className="cx-comm-desc">{comm.text || comm.commentary}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="cx-no-commentary">
                                    {adminCommOverFilter !== 'all'
                                        ? `No deliveries recorded in Over ${adminCommOverFilter}.`
                                        : 'Deliveries scored above will appear here in real-time.'}
                                </div>
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
                                            {(selectedBatsmanForWheel.hand === 'LHB' || selectedBatsmanForWheel.hand === 'LHS' || String(selectedBatsmanForWheel.hand || '').toLowerCase().includes('left')) ? 'LHB • Left Hand' : 'RHB • Right Hand'} Batsman • Visual Wagon Wheel
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
                                        batsmanHand={selectedBatsmanForWheel.hand || 'RHB'}
                                        size={380}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* SHOT PLACEMENT QUICK MODAL (Interactive Wagon Wheeler) */}
                {showWagonPlacementModal && pendingBallEvent && (() => {
                    const activeSectors = getActiveSectors(striker.hand || 'RHB');
                    return (
                        <div className="sc-modal-overlay" onClick={() => setShowWagonPlacementModal(false)}>
                            <div className="sc-modal-card sc-wagon-wheeler-card" onClick={(e) => e.stopPropagation()}>
                                <div className="sc-ww-card-header">
                                    <div>
                                        <div className="sc-ww-badge">
                                            <MdTrackChanges className="sc-ww-icon" /> SHOT PLACEMENT WHEELER
                                        </div>
                                        <h3>Select Batted Area</h3>
                                        <p className="sc-modal-sub">
                                            {striker.name} ({isStrikerLHB ? 'LHB • Left Hand' : 'RHB • Right Hand'} Batsman) • <strong>{pendingBallEvent.extraType === 'No Ball' ? `+${pendingBallEvent.extraRuns} Bat Run(s) off No Ball` : `${pendingBallEvent.runs} Run(s)`}</strong>
                                        </p>
                                    </div>
                                    <button className="cx-btn-close-ww" onClick={() => setShowWagonPlacementModal(false)} title="Close">
                                        <MdClose />
                                    </button>
                                </div>

                                <div className="sc-wheeler-visual-container">
                                    <svg viewBox="0 0 300 300" className="sc-wheeler-svg">
                                        {/* Outer boundary circle */}
                                        <circle cx="150" cy="150" r="146" fill="#07111e" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="2" strokeDasharray="5 5" />
                                        {/* 30-yard circle */}
                                        <circle cx="150" cy="150" r="78" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" strokeDasharray="3 3" />

                                        {/* 8 Clickable Wheeler Sectors */}
                                        {activeSectors.map((s) => {
                                            const pathData = describeArc(150, 150, 142, s.startAngle, s.endAngle);
                                            const textCoords = getLabelCoords(150, 150, 142, s.startAngle, s.endAngle);
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
                                        <rect x="143" y="114" width="14" height="72" fill="#f59e0b" opacity="0.85" rx="3" />
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
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setDismissalType(val);
                                        if (val !== 'Run Out') {
                                            setRunOutRuns(0);
                                        }
                                        if (val !== 'Run Out' && val !== 'Retired Out') {
                                            setDismissalBatterId(strikerId);
                                        }
                                    }}
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

                            {(dismissalType === 'Run Out') && (
                                <div className="sc-form-group">
                                    <label>Which Batter is Out?</label>
                                    <div className="sc-icb-batter-toggle" style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
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

                            {dismissalType === 'Run Out' && (
                                <div className="sc-form-group">
                                    <label>Runs Completed Before Run Out (Added to Striker)</label>
                                    <div className="sc-icb-runs-grid" style={{ marginTop: '6px' }}>
                                        {[0, 1, 2, 3, 4].map((r) => (
                                            <button
                                                key={r}
                                                type="button"
                                                className={`sc-icb-run-btn ${runOutRuns === r ? 'active' : ''}`}
                                                onClick={() => setRunOutRuns(r)}
                                            >
                                                {r === 0 ? '0 Runs' : `+${r} Run${r > 1 ? 's' : ''}`}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="sc-icb-rule-hint" style={{ marginTop: '6px' }}>
                                        {runOutRuns === 0
                                            ? `⚡ 0 Runs: No runs added to striker (${striker?.name || 'Striker'}).`
                                            : `⚡ +${runOutRuns} Run${runOutRuns > 1 ? 's' : ''}: Added to striker (${striker?.name || 'Striker'}) & team score.`}
                                    </div>
                                </div>
                            )}

                            {(dismissalType === 'Caught' || dismissalType === 'Run Out' || dismissalType === 'Stumped') && (
                                <div className="sc-form-group">
                                    <label>Fielder ({bowlingTeamName} - Fielding Side)</label>
                                    <select
                                        value={dismissalFielder}
                                        onChange={(e) => setDismissalFielder(e.target.value)}
                                        className="sc-modal-select"
                                    >
                                        <option value="">Select Fielder ({bowlingTeamName})...</option>
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
                                        const runsScoredOnRunOut = dismissalType === 'Run Out' ? Number(runOutRuns || 0) : 0;
                                        executeBallDelivery({
                                            runs: runsScoredOnRunOut,
                                            isWicket: true,
                                            dismissalType,
                                            dismissalFielder,
                                            dismissalBatterId: (dismissalType === 'Run Out' || dismissalType === 'Retired Out') ? (dismissalBatterId || strikerId) : strikerId,
                                            wagonZone: 'Point'
                                        });
                                    }}
                                >
                                    {dismissalType === 'Run Out' && runOutRuns > 0
                                        ? `Confirm Run Out (+${runOutRuns} Runs to Striker)`
                                        : 'Confirm Wicket'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* EXTRAS MODAL */}
                {showExtrasModal && (
                    <div className="sc-modal-overlay" onClick={() => setShowExtrasModal(false)}>
                        <div className="sc-modal-card" onClick={(e) => e.stopPropagation()}>
                            <div className="sc-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0, color: '#f8fafc' }}>
                                    ⚡ {extraType === 'Penalty' ? 'Custom Penalty Marks' : `Record Extra Delivery (${extraType.toUpperCase()})`}
                                </h3>
                                <button className="sc-btn-close-modal" onClick={() => setShowExtrasModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.4rem' }}>
                                    <MdClose />
                                </button>
                            </div>

                            <div className="sc-form-group">
                                <label>Extra Type</label>
                                <select
                                    value={extraType}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setExtraType(val);
                                        if (val === 'Penalty') setExtraRuns(5);
                                        else if (val === 'Bye' || val === 'Leg Bye') setExtraRuns(1);
                                        else setExtraRuns(0);
                                    }}
                                    className="sc-modal-select"
                                >
                                    <option value="Wide">Wide (WD)</option>
                                    <option value="No Ball">No Ball (NB)</option>
                                    <option value="Bye">Bye</option>
                                    <option value="Leg Bye">Leg Bye</option>
                                    <option value="Penalty">Penalty Marks (PEN)</option>
                                </select>
                            </div>

                            {extraType === 'No Ball' && (
                                <div className="sc-form-group">
                                    <label>Extra Runs Credited To (Beyond +1 Penalty)</label>
                                    <div className="sc-icb-source-tabs">
                                        <button
                                            type="button"
                                            className={`sc-icb-source-btn ${noBallRunsSource === 'bat' ? 'active' : ''}`}
                                            onClick={() => setNoBallRunsSource('bat')}
                                        >
                                            🏏 Runs off Bat (Striker)
                                        </button>
                                        <button
                                            type="button"
                                            className={`sc-icb-source-btn ${noBallRunsSource === 'bye' ? 'active' : ''}`}
                                            onClick={() => setNoBallRunsSource('bye')}
                                        >
                                            🏃 Byes off NB (Extras)
                                        </button>
                                        <button
                                            type="button"
                                            className={`sc-icb-source-btn ${noBallRunsSource === 'legBye' ? 'active' : ''}`}
                                            onClick={() => setNoBallRunsSource('legBye')}
                                        >
                                            🦵 Leg Byes off NB (Extras)
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="sc-form-group">
                                <label>
                                    {extraType === 'Penalty'
                                        ? 'Penalty Marks / Runs'
                                        : (extraType === 'Bye' || extraType === 'Leg Bye'
                                            ? 'Extra Runs (Mandatory penalty: None)'
                                            : 'Extra Runs (beyond +1 mandatory penalty)')}
                                </label>
                                {extraType === 'Penalty' ? (
                                    <div className="sc-penalty-input-group">
                                        <div className="sc-penalty-presets">
                                            {[1, 2, 3, 4, 5, 6, 7, 10].map((r) => (
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
                                        <div className="sc-custom-penalty-row">
                                            <span className="sc-custom-label">Custom Score:</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max="50"
                                                value={extraRuns}
                                                onChange={(e) => setExtraRuns(Math.max(1, parseInt(e.target.value, 10) || 0))}
                                                className="sc-custom-penalty-input"
                                                placeholder="Enter marks"
                                            />
                                            <span className="sc-penalty-unit-tag">Runs</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="sc-icb-runs-grid" style={{ marginTop: '6px', marginBottom: '8px' }}>
                                        {(extraType === 'Bye' || extraType === 'Leg Bye' ? [1, 2, 3, 4, 6] : [0, 1, 2, 3, 4, 6]).map((r) => (
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
                                )}
                            </div>

                            <div className="sc-icb-rule-hint" style={{ marginBottom: '16px' }}>
                                {extraType === 'Wide' && `⚡ Mandatory: +1 run penalty to Wides. Extra runs beyond penalty: +${extraRuns} (Total: ${1 + extraRuns} runs to Extras → Wides) • Bowler charged: ${1 + extraRuns} • Strike: ${extraRuns % 2 !== 0 ? 'Rotates (Swaps)' : 'Remains with Striker'}`}
                                {extraType === 'No Ball' && noBallRunsSource === 'bat' && `⚡ Mandatory: +1 run penalty to Extras → No Ball. +${extraRuns} run(s) off bat credited to Striker (${striker.name || 'Striker'}) • Bowler charged: ${1 + extraRuns} • Free Hit faced by: ${extraRuns % 2 !== 0 ? 'Non-Striker (Rotated)' : 'Striker (Remains)'}`}
                                {extraType === 'No Ball' && noBallRunsSource === 'bye' && `⚡ Mandatory: +1 run penalty to Extras → No Ball. +${extraRuns} bye(s) off NB credited to Extras → Byes • Bowler charged: 1 run penalty only • Striker: 0 runs, 1 ball • Strike: ${extraRuns % 2 !== 0 ? 'Rotates (Swaps)' : 'Remains with Striker'}`}
                                {extraType === 'No Ball' && noBallRunsSource === 'legBye' && `⚡ Mandatory: +1 run penalty to Extras → No Ball. +${extraRuns} leg bye(s) off NB credited to Extras → Leg Byes • Bowler charged: 1 run penalty only • Striker: 0 runs, 1 ball • Strike: ${extraRuns % 2 !== 0 ? 'Rotates (Swaps)' : 'Remains with Striker'}`}
                                {(extraType === 'Bye' || extraType === 'Leg Bye') && `⚡ Mandatory penalty: None. +${extraRuns} ${extraType}(s) credited to Extras → ${extraType}s • Bowler NOT charged (0 runs) • Striker: 0 runs, 1 ball faced • Strike: ${extraRuns % 2 !== 0 ? 'Rotates (Swaps)' : 'Remains with Striker'}`}
                                {extraType === 'Penalty' && `⚡ +${extraRuns || 5} Penalty marks awarded directly to ${currentBattingTeamKey === 'team1' ? (team1.name || 'Batting Team') : (team2.name || 'Batting Team')} extras. Bowler not charged; strike unchanged.`}
                            </div>

                            <div className="sc-modal-actions">
                                <button className="cx-btn-secondary" onClick={() => setShowExtrasModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    className="cx-btn-confirm primary"
                                    onClick={() => {
                                        setShowExtrasModal(false);
                                        const isNbWithBatRuns = extraType === 'No Ball' && noBallRunsSource === 'bat' && Number(extraRuns) > 0;
                                        if (isNbWithBatRuns) {
                                            setPendingBallEvent({
                                                runs: 0,
                                                isExtra: true,
                                                extraType: 'No Ball',
                                                extraRuns: Number(extraRuns),
                                                noBallRunsSource: 'bat'
                                            });
                                            setShowWagonPlacementModal(true);
                                        } else {
                                            executeBallDelivery({
                                                runs: 0,
                                                isExtra: true,
                                                extraType,
                                                extraRuns: extraType === 'Penalty' ? (extraRuns || 5) : Number(extraRuns),
                                                noBallRunsSource: extraType === 'No Ball' ? noBallRunsSource : undefined
                                            });
                                        }
                                    }}
                                >
                                    {extraType === 'Penalty'
                                        ? `Confirm Penalty (+${extraRuns || 5} Runs)`
                                        : (extraType === 'No Ball' && noBallRunsSource === 'bat' && Number(extraRuns) > 0
                                            ? 'Pick Batted Area & Confirm'
                                            : 'Confirm Extra')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* SWITCH INNINGS MODAL (MANDATORY - CANNOT BE CLOSED UNTIL SET) */}
                {showSwitchInningsModal && (
                    <div className="sc-modal-overlay mandatory-modal">
                        <div className="sc-modal-card sc-switch-innings-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="sc-nb-header" style={{ marginBottom: '16px' }}>
                                <div className="sc-nb-title-group">
                                    <span className="sc-nb-badge" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff' }}>
                                        INNINGS BREAK • 2ND INNINGS SETUP
                                    </span>
                                    <h3 style={{ margin: '6px 0 2px', display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa' }}>
                                        <MdSwapHoriz style={{ fontSize: '1.6rem' }} /> Start 2nd Innings: Select Opening Players
                                    </h3>
                                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.86rem' }}>
                                        1st innings for <strong>{firstBatTeamNameForSwitch}</strong> concluded. Please select the opening striker &amp; non-striker for <strong>{secondBatTeamNameForSwitch}</strong> and the opening bowler for <strong>{firstBatTeamNameForSwitch}</strong> to begin the chase.
                                    </p>
                                </div>
                            </div>

                            <div className="sc-form-group" style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px', fontSize: '0.88rem' }}>
                                    <MdSportsCricket style={{ color: '#00f0ff' }} /> Striker (Facing 1st Ball - {secondBatTeamNameForSwitch}) *
                                </label>
                                <select
                                    className="sc-modal-select"
                                    value={secondInningsStrikerId}
                                    onChange={(e) => setSecondInningsStrikerId(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px' }}
                                >
                                    <option value="" disabled>-- Select Striker --</option>
                                    {secondBatOpeningSquad.map((p) => (
                                        <option key={p.id} value={p.id} disabled={String(p.id) === String(secondInningsNonStrikerId)}>
                                            {p.name} {p.role ? `(${p.role})` : ''} {String(p.id) === String(secondInningsNonStrikerId) ? '— [Selected as Non-Striker]' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="sc-form-group" style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px', fontSize: '0.88rem' }}>
                                    <MdSportsCricket style={{ color: '#38bdf8' }} /> Non-Striker (Runner's End - {secondBatTeamNameForSwitch}) *
                                </label>
                                <select
                                    className="sc-modal-select"
                                    value={secondInningsNonStrikerId}
                                    onChange={(e) => setSecondInningsNonStrikerId(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px' }}
                                >
                                    <option value="" disabled>-- Select Non-Striker --</option>
                                    {secondBatOpeningSquad.map((p) => (
                                        <option key={p.id} value={p.id} disabled={String(p.id) === String(secondInningsStrikerId)}>
                                            {p.name} {p.role ? `(${p.role})` : ''} {String(p.id) === String(secondInningsStrikerId) ? '— [Selected as Striker]' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="sc-form-group" style={{ marginBottom: '18px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px', fontSize: '0.88rem' }}>
                                    <MdSportsBaseball style={{ color: '#f59e0b' }} /> Opening Bowler (1st Over - {firstBatTeamNameForSwitch}) *
                                </label>
                                <select
                                    className="sc-modal-select"
                                    value={secondInningsBowlerId}
                                    onChange={(e) => setSecondInningsBowlerId(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px' }}
                                >
                                    <option value="" disabled>-- Select Opening Bowler --</option>
                                    {firstBatOpeningSquad.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} {p.role ? `(${p.role})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {String(secondInningsStrikerId) === String(secondInningsNonStrikerId) && secondInningsStrikerId && (
                                <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <MdWarning /> Striker and Non-Striker cannot be the same player.
                                </div>
                            )}

                            <div className="sc-modal-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    className="cx-btn-confirm primary"
                                    disabled={!secondInningsStrikerId || !secondInningsNonStrikerId || !secondInningsBowlerId || String(secondInningsStrikerId) === String(secondInningsNonStrikerId)}
                                    onClick={handleSwitchInnings}
                                    style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700 }}
                                >
                                    {!secondInningsStrikerId || !secondInningsNonStrikerId || !secondInningsBowlerId
                                        ? 'Select Striker, Non-Striker & Bowler to Begin'
                                        : String(secondInningsStrikerId) === String(secondInningsNonStrikerId)
                                            ? 'Select Different Batters'
                                            : 'Confirm Players & Start 2nd Innings'}
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

                            <div style={{
                                background: 'rgba(59, 130, 246, 0.12)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '10px',
                                padding: '12px 16px',
                                margin: '14px 0',
                                textAlign: 'center'
                            }}>
                                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#93c5fd', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                    Official Match Outcome
                                </span>
                                <strong style={{ fontSize: '1.05rem', color: '#60a5fa' }}>
                                    {calculateMatchResult(matchData)}
                                </strong>
                            </div>

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

                {/* COMPULSORY NEXT BATSMAN SELECTION MODAL (WICKET FALLEN - CANNOT BE CLOSED UNTIL SET) */}
                {showNextBatterModal && nextBatterModalData && (
                    <div className="sc-modal-overlay mandatory-modal">
                        <div className="sc-modal-card sc-next-batter-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="sc-nb-header sc-next-batter-header">
                                <div className="sc-nb-title-group">
                                    <span className="sc-nb-badge sc-nb-wkt-badge">
                                        WICKET #{nextBatterModalData.wicketNumber} FALLEN
                                    </span>
                                    <h3>
                                        <MdSportsCricket className="sc-nb-swap-icon" /> Select Next Batsman
                                    </h3>
                                    <p>
                                        <strong>{nextBatterModalData.outBatter?.name}</strong> is out ({nextBatterModalData.outBatter?.dismissal || 'Wicket'}). Select the incoming batsman to take the crease.
                                    </p>
                                </div>
                            </div>

                            <div className="sc-nb-body">
                                <div className="sc-nb-field">
                                    <label>
                                        Available Batsmen from {matchData[nextBatterModalData.battingTeamKey]?.name || 'Batting Team'} (Yet to Bat)
                                    </label>
                                    <div className="sc-nb-batters-grid">
                                        {(() => {
                                            const bTeamData = matchData[nextBatterModalData.battingTeamKey] || {};
                                            const outBatterIdStr = nextBatterModalData.outBatter?.id != null ? String(nextBatterModalData.outBatter.id) : null;
                                            const remainingBatterIdStr = nextBatterModalData.remainingBatter?.id != null ? String(nextBatterModalData.remainingBatter.id) : null;

                                            // Pool all squad players: Playing XI first, then any unbatted squad/reserve players
                                            const allCandidatePlayers = (playingXI && playingXI.length > 0)
                                                ? [...playingXI, ...playersList.filter(p => !playingXI.some(xi => String(xi.id) === String(p.id)))]
                                                : (playersList.length > 0 ? playersList : Object.values(bTeamData.players || {}));

                                            // Filter strictly for ALL YET TO BAT batters:
                                            // 1. Exclude the out batter
                                            // 2. Exclude surviving batter at crease
                                            // 3. Exclude any player with recorded dismissal in fallOfWickets or partnerships
                                            const eligibleBatters = allCandidatePlayers.filter(p => {
                                                if (!p) return false;
                                                const pStats = bTeamData.players?.[p.id] || p;
                                                const pIdStr = p.id != null ? String(p.id) : null;
                                                const pNameClean = (p.name || '').trim().toLowerCase();

                                                // 1. Batter who just got out
                                                if (outBatterIdStr && pIdStr && pIdStr === outBatterIdStr) return false;

                                                // 2. Batter currently remaining at crease
                                                if (remainingBatterIdStr && pIdStr && pIdStr === remainingBatterIdStr) return false;

                                                // 3. Any batter already dismissed in this match
                                                const isDismissed = Boolean(
                                                    p.dismissal ||
                                                    p.status === 'out' ||
                                                    pStats?.dismissal ||
                                                    pStats?.status === 'out' ||
                                                    Object.values(bTeamData.fallOfWickets || {}).some(f => {
                                                        if (!f) return false;
                                                        const fOutId = f.outBatsman?.id != null ? String(f.outBatsman.id) : null;
                                                        const fBatsman = (f.batsman || f.outBatsman?.name || '').trim().toLowerCase();
                                                        return (fOutId && pIdStr && fOutId === pIdStr) || (fBatsman && pNameClean && fBatsman === pNameClean);
                                                    }) ||
                                                    Object.values(bTeamData.partnerships || {}).some(part => {
                                                        if (!part || !part.outBatsman) return false;
                                                        const partOutId = part.outBatsman.id != null ? String(part.outBatsman.id) : null;
                                                        const partOutName = (part.outBatsman.name || '').trim().toLowerCase();
                                                        return (partOutId && pIdStr && partOutId === pIdStr) || (partOutName && pNameClean && partOutName === pNameClean);
                                                    })
                                                );
                                                if (isDismissed) return false;

                                                return true;
                                            });

                                            if (eligibleBatters.length === 0) {
                                                return (
                                                    <div style={{ padding: '20px', textAlign: 'center', color: '#f87171', gridColumn: '1 / -1', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                                                        ⚠️ No eligible incoming batsmen remaining. All remaining players are already out or at the crease.
                                                    </div>
                                                );
                                            }

                                            return eligibleBatters.map((p, idx) => {
                                                const isSelected = String(p.id) === String(selectedNextBatterId);
                                                const role = p.role || p.playerRole || 'Batsman';
                                                const batStyle = p.battingStyle || p.batStyle || p.hand || '';
                                                const isReserve = p.type === 'Reserve';

                                                return (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        className={`sc-nb-batter-card ${isSelected ? 'active' : ''}`}
                                                        onClick={() => setSelectedNextBatterId(p.id)}
                                                    >
                                                        <div className="sc-nb-bname">
                                                            <span className="sc-nb-order-num">#{idx + 1}</span>
                                                            <strong>{p.name}</strong>
                                                            {batStyle && <span className="sc-nb-style-tag">{batStyle}</span>}
                                                            {isReserve && <span className="sc-nb-res-tag">RES</span>}
                                                        </div>
                                                        <div className="sc-nb-bstats">
                                                            <span>{role}</span>
                                                            <span className="sc-nb-yet-to-bat-pill">Yet to bat</span>
                                                        </div>
                                                    </button>
                                                );
                                            });
                                        })()}
                                    </div>

                                    {/* Crease Strike Assignment Selector */}
                                    <div className="sc-nb-strike-role-selection">
                                        <span className="sc-nb-role-label">INCOMING BATSMAN CREASE ROLE:</span>
                                        <div className="sc-nb-role-btn-group">
                                            <button
                                                type="button"
                                                className={`sc-nb-role-btn ${nextBatterStrikeRole === 'striker' ? 'active striker-role' : ''}`}
                                                onClick={() => setNextBatterStrikeRole('striker')}
                                            >
                                                🏏 On Strike (Faces Next Ball)
                                            </button>
                                            <button
                                                type="button"
                                                className={`sc-nb-role-btn ${nextBatterStrikeRole === 'nonStriker' ? 'active nonstriker-role' : ''}`}
                                                onClick={() => setNextBatterStrikeRole('nonStriker')}
                                            >
                                                🏃 Non-Striker (Other End)
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="sc-nb-footer">
                                    <button
                                        type="button"
                                        disabled={!selectedNextBatterId}
                                        className="sc-nb-confirm-btn sc-nb-batter-confirm-btn"
                                        onClick={async () => {
                                            if (!selectedNextBatterId) return;
                                            await withProcessing(async () => {
                                                const allCandidatePlayers = (playingXI && playingXI.length > 0)
                                                    ? [...playingXI, ...playersList.filter(p => !playingXI.some(xi => String(xi.id) === String(p.id)))]
                                                    : (playersList.length > 0 ? playersList : Object.values(matchData[nextBatterModalData.battingTeamKey]?.players || {}));

                                                const newBatterObj = allCandidatePlayers.find(p => String(p.id) === String(selectedNextBatterId)) ||
                                                    playingXI.find(p => String(p.id) === String(selectedNextBatterId)) ||
                                                    playersList.find(p => String(p.id) === String(selectedNextBatterId)) ||
                                                    { id: selectedNextBatterId, name: 'Incoming Batsman' };

                                                const bTeamKey = nextBatterModalData.battingTeamKey;
                                                const incomingBatterId = selectedNextBatterId;
                                                const remainingBatterId = nextBatterModalData.remainingBatter?.id;

                                                let finalStrikerId, finalNonStrikerId;
                                                if (nextBatterStrikeRole === 'striker') {
                                                    finalStrikerId = incomingBatterId;
                                                    finalNonStrikerId = remainingBatterId;
                                                } else {
                                                    finalStrikerId = remainingBatterId;
                                                    finalNonStrikerId = incomingBatterId;
                                                }

                                                const updated = JSON.parse(JSON.stringify(matchData));
                                                const bTeam = updated[bTeamKey];

                                                if (bTeam) {
                                                    bTeam.players = bTeam.players || {};
                                                    if (!bTeam.players[incomingBatterId]) {
                                                        bTeam.players[incomingBatterId] = {
                                                            ...newBatterObj,
                                                            runs: 0,
                                                            balls: 0,
                                                            fours: 0,
                                                            sixes: 0,
                                                            strikeRate: '0.00',
                                                            dismissal: ''
                                                        };
                                                    }
                                                    bTeam.players[incomingBatterId].status = 'batting';
                                                    
                                                    // Determine next ground arrival order
                                                    const existingArrivals = Object.values(bTeam.players || {})
                                                        .filter(p => {
                                                            const isCrease = (bTeam.ballFaceBatsman && String(bTeam.ballFaceBatsman.id) === String(p.id)) ||
                                                                             (bTeam.otherSideBatsman && String(bTeam.otherSideBatsman.id) === String(p.id)) ||
                                                                             p.status === 'batting';
                                                            const hasBattedCheck = Number(p.balls || 0) > 0 || Number(p.runs || 0) > 0 || (p.dismissal && p.dismissal.trim() !== '' && p.dismissal.trim().toLowerCase() !== 'yet to bat');
                                                            return isCrease || hasBattedCheck || (p.groundArrivalOrder && Number(p.groundArrivalOrder) > 0);
                                                        })
                                                        .map(p => Number(p.groundArrivalOrder || 0))
                                                        .filter(n => n > 0);

                                                    const nextArrivalOrder = Math.max(
                                                        2,
                                                        (bTeam.totalWickets || 0) + 1,
                                                        ...existingArrivals
                                                    ) + 1;

                                                    bTeam.players[incomingBatterId].groundArrivalOrder = nextArrivalOrder;
                                                    bTeam.players[incomingBatterId].battingOrder = nextArrivalOrder;

                                                    if (remainingBatterId && bTeam.players[remainingBatterId]) {
                                                        bTeam.players[remainingBatterId].status = 'batting';
                                                        if (!bTeam.players[remainingBatterId].groundArrivalOrder || Number(bTeam.players[remainingBatterId].groundArrivalOrder) <= 0) {
                                                            bTeam.players[remainingBatterId].groundArrivalOrder = Math.max(1, nextArrivalOrder - 1);
                                                            bTeam.players[remainingBatterId].battingOrder = Math.max(1, nextArrivalOrder - 1);
                                                        }
                                                    }
                                                    if (nextBatterModalData.outBatter?.id && bTeam.players[nextBatterModalData.outBatter.id]) {
                                                        bTeam.players[nextBatterModalData.outBatter.id].status = 'out';
                                                    }

                                                    setStrikerId(finalStrikerId);
                                                    setNonStrikerId(finalNonStrikerId);

                                                    bTeam.ballFaceBatsman = bTeam.players[finalStrikerId] || allCandidatePlayers.find(p => String(p.id) === String(finalStrikerId)) || { id: finalStrikerId, name: 'Striker' };
                                                    bTeam.otherSideBatsman = bTeam.players[finalNonStrikerId] || allCandidatePlayers.find(p => String(p.id) === String(finalNonStrikerId)) || { id: finalNonStrikerId, name: 'Non-Striker' };

                                                    bTeam.currentPartnership = {
                                                        batsman1: bTeam.ballFaceBatsman,
                                                        batsman2: bTeam.otherSideBatsman,
                                                        batsman1Runs: 0,
                                                        batsman1Balls: 0,
                                                        batsman2Runs: 0,
                                                        batsman2Balls: 0,
                                                        startScore: bTeam.totalRuns || 0,
                                                        startBalls: bTeam.totalBalls || 0
                                                    };
                                                }

                                                setMatchData(updated);
                                                await updateMatchData(activeMatchTitle, updated, selectedTournamentId);

                                                // Sync LiveData
                                                await updateLiveData({
                                                    isLive: 1,
                                                    currentMatchPath: activeMatchTitle,
                                                    liveScore: {
                                                        matchTitle: activeMatchTitle,
                                                        firstBat: common.firstBat,
                                                        status: `${(bTeam?.ballFaceBatsman?.name || 'Batsman')} | ${bowler.name} bowling`,
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

                                                toastRef.current?.showToast('success', `${newBatterObj.name} is the new batsman!`);
                                                setShowNextBatterModal(false);

                                                // If over completed on the same ball, trigger next bowler modal now
                                                if (nextBatterModalData.overCompletedOnThisBall) {
                                                    setLastBowlerId(nextBatterModalData.lastBowlerId);
                                                    setCompletedOverNumber(nextBatterModalData.completedOverNum);
                                                    setSelectedNextBowlerId('');
                                                    setShowNextBowlerModal(true);
                                                }
                                                setNextBatterModalData(null);
                                            }, 'Setting Incoming Batsman...', 'Registering new batsman at the crease...');
                                        }}
                                    >
                                        Confirm Next Batsman
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* FORCE CHANGE CREASE BATTERS MODAL */}
                {showForceChangeModal && (
                    <div className="sc-modal-overlay">
                        <div className="sc-modal-card force-change-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="sc-fc-header">
                                <div className="sc-fc-title-group">
                                    <span className="sc-fc-badge">CREASE OVERRIDE</span>
                                    <h3>
                                        <MdPersonPin className="sc-fc-icon" /> Force Change Batters
                                    </h3>
                                    <p>Forcefully assign or replace Striker and Non-Striker at the crease.</p>
                                </div>
                                <button
                                    type="button"
                                    className="sc-fc-close-btn"
                                    onClick={() => setShowForceChangeModal(false)}
                                    title="Close"
                                >
                                    <MdClose />
                                </button>
                            </div>

                            <div className="sc-fc-body">
                                <div className="sc-fc-selector-row">
                                    {/* Striker Selector Card */}
                                    <div className="sc-fc-card striker">
                                        <div className="sc-fc-card-top">
                                            <span className="sc-fc-label">STRIKER (*)</span>
                                            <span className="sc-fc-pill">On Strike</span>
                                        </div>
                                        <div className="sc-fc-field">
                                            <label>Select Striker</label>
                                            <select
                                                className="sc-fc-select"
                                                value={forceStrikerId}
                                                onChange={(e) => setForceStrikerId(Number(e.target.value))}
                                            >
                                                <option value="" disabled>-- Select Striker --</option>
                                                {activeBattingSquad.map(p => {
                                                    if (!p) return null;
                                                    const isOut = isPlayerDismissedInInnings(p, battingTeamData);
                                                    const isOther = String(p.id) === String(forceNonStrikerId);
                                                    return (
                                                        <option key={p.id} value={p.id} disabled={isOther}>
                                                            {p.name} {isOut ? '⚠️ [Out]' : ''} {p.status === 'batting' ? '🏏 [Batting]' : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                        {forceStrikerId && (
                                            <div className="sc-fc-stats-preview">
                                                {(() => {
                                                    const sP = activeBattingSquad.find(p => String(p.id) === String(forceStrikerId)) || battingTeamData.players?.[forceStrikerId];
                                                    const isOut = isPlayerDismissedInInnings(sP, battingTeamData);
                                                    return (
                                                        <>
                                                            <span>Runs: <strong>{sP?.runs || 0}</strong> ({sP?.balls || 0}b)</span>
                                                            <span>4s: <strong>{sP?.boundaries?.fours || 0}</strong> | 6s: <strong>{sP?.boundaries?.sixes || 0}</strong></span>
                                                            <span className={`sc-fc-status-badge ${isOut ? 'out' : 'active'}`}>
                                                                {isOut ? (sP?.dismissal || 'Out') : 'Active / Ready'}
                                                            </span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Swap Button */}
                                    <div className="sc-fc-swap-wrap">
                                        <button
                                            type="button"
                                            className="sc-fc-swap-btn"
                                            title="Swap Striker and Non-Striker selections"
                                            onClick={() => {
                                                const temp = forceStrikerId;
                                                setForceStrikerId(forceNonStrikerId);
                                                setForceNonStrikerId(temp);
                                            }}
                                        >
                                            <MdSwapHoriz />
                                            <span>Swap</span>
                                        </button>
                                    </div>

                                    {/* Non-Striker Selector Card */}
                                    <div className="sc-fc-card non-striker">
                                        <div className="sc-fc-card-top">
                                            <span className="sc-fc-label">NON-STRIKER</span>
                                            <span className="sc-fc-pill">Runner End</span>
                                        </div>
                                        <div className="sc-fc-field">
                                            <label>Select Non-Striker</label>
                                            <select
                                                className="sc-fc-select"
                                                value={forceNonStrikerId}
                                                onChange={(e) => setForceNonStrikerId(Number(e.target.value))}
                                            >
                                                <option value="" disabled>-- Select Non-Striker --</option>
                                                {activeBattingSquad.map(p => {
                                                    if (!p) return null;
                                                    const isOut = isPlayerDismissedInInnings(p, battingTeamData);
                                                    const isOther = String(p.id) === String(forceStrikerId);
                                                    return (
                                                        <option key={p.id} value={p.id} disabled={isOther}>
                                                            {p.name} {isOut ? '⚠️ [Out]' : ''} {p.status === 'batting' ? '🏏 [Batting]' : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                        {forceNonStrikerId && (
                                            <div className="sc-fc-stats-preview">
                                                {(() => {
                                                    const nsP = activeBattingSquad.find(p => String(p.id) === String(forceNonStrikerId)) || battingTeamData.players?.[forceNonStrikerId];
                                                    const isOut = isPlayerDismissedInInnings(nsP, battingTeamData);
                                                    return (
                                                        <>
                                                            <span>Runs: <strong>{nsP?.runs || 0}</strong> ({nsP?.balls || 0}b)</span>
                                                            <span>4s: <strong>{nsP?.boundaries?.fours || 0}</strong> | 6s: <strong>{nsP?.boundaries?.sixes || 0}</strong></span>
                                                            <span className={`sc-fc-status-badge ${isOut ? 'out' : 'active'}`}>
                                                                {isOut ? (nsP?.dismissal || 'Out') : 'Active / Ready'}
                                                            </span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="sc-fc-options-box">
                                    <label className="sc-fc-checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={forceReinstateOut}
                                            onChange={(e) => setForceReinstateOut(e.target.checked)}
                                        />
                                        <span>
                                            <strong>Reinstate if marked Out by mistake:</strong> Clears previous dismissal & marks player as 'batting' Not Out.
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="sc-fc-footer">
                                <button
                                    type="button"
                                    className="cx-btn-secondary"
                                    onClick={() => setShowForceChangeModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="cx-btn-confirm primary"
                                    onClick={() => handleExecuteForceChange()}
                                    disabled={!forceStrikerId || !forceNonStrikerId || String(forceStrikerId) === String(forceNonStrikerId)}
                                >
                                    <MdCheck /> Apply Force Change
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
                                    <h3>
                                        <MdAutorenew className="sc-nb-swap-icon" /> Select Next Bowler
                                    </h3>
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
                                                        {p.bowlingStyle && <span className="sc-nb-style-sub">{p.bowlingStyle}</span>}
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
                                            await withProcessing(async () => {
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
                                            }, 'Changing Bowler...', 'Registering new bowler for next over...');
                                        }}
                                    >
                                        Confirm Next Bowler
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* DLS / RAIN DELAY TARGET MANAGER MODAL */}
                {(() => {
                    if (!showDlsModal || !matchData) return null;

                    const currentCommon = matchData.common || {};
                    const originalOvers = Number(currentCommon.overLimit) || 15;
                    const firstBatTeamKey = currentCommon.firstBat === 1 ? 'team1' : 'team2';
                    const secondBatTeamKey = currentCommon.firstBat === 1 ? 'team2' : 'team1';
                    const t1TeamName = matchData[firstBatTeamKey]?.name || '1st Batting Team';
                    const t2TeamName = matchData[secondBatTeamKey]?.name || '2nd Batting Team';
                    const t1Runs = matchData[firstBatTeamKey]?.totalRuns || 0;
                    const t1Wickets = matchData[firstBatTeamKey]?.totalWickets || 0;
                    const t1Overs = matchData[firstBatTeamKey]?.overs || 0;
                    const quickOversList = [5, 6, 8, 10, 12, 14, 15, 20].filter(o => o <= originalOvers);

                    return (
                        <div className="sc-modal-overlay" onClick={() => setShowDlsModal(false)}>
                            <div className="sc-modal-card sc-dls-modal" onClick={(e) => e.stopPropagation()}>
                                <div className="sc-dls-modal-header">
                                    <div className="sc-dls-title-group">
                                        <span className="sc-dls-pill-tag">RAIN DELAY &amp; REVISED TARGET</span>
                                        <h3>
                                            <MdCloudQueue className="sc-dls-cloud-icon" /> DLS Target Manager
                                        </h3>
                                        <p>Calculate Duckworth-Lewis-Stern targets automatically or enter agreed official numbers from match umpires.</p>
                                    </div>
                                    <button
                                        type="button"
                                        className="sc-dls-close-btn"
                                        onClick={() => setShowDlsModal(false)}
                                        aria-label="Close DLS Modal"
                                    >
                                        <MdClose />
                                    </button>
                                </div>

                                <div className="sc-dls-modal-body">
                                    {/* Match Context Strip */}
                                    <div className="sc-dls-context-strip">
                                        <div className="sc-dls-ctx-item">
                                            <span className="ctx-label">Match Format</span>
                                            <strong className="ctx-val">{originalOvers} Overs / side</strong>
                                        </div>
                                        <div className="sc-dls-ctx-item">
                                            <span className="ctx-label">1st Innings Total</span>
                                            <strong className="ctx-val">{t1TeamName}: {t1Runs}/{t1Wickets} ({t1Overs} ov)</strong>
                                        </div>
                                        <div className="sc-dls-ctx-item">
                                            <span className="ctx-label">Chasing Team</span>
                                            <strong className="ctx-val">{t2TeamName}</strong>
                                        </div>
                                    </div>

                                    {/* Revised Overs Input */}
                                    <div className="sc-dls-field-group">
                                        <label className="sc-dls-field-label">
                                            Revised Overs for 2nd Innings:
                                            <span className="sc-dls-field-hint">How many overs will {t2TeamName} get?</span>
                                        </label>
                                        <div className="sc-dls-overs-row">
                                            <input
                                                type="number"
                                                min="1"
                                                max={originalOvers}
                                                value={dlsRevisedOvers}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setDlsRevisedOvers(val);
                                                    if (val && Number(val) > 0) {
                                                        handleAutoCalculateDls(val);
                                                    }
                                                }}
                                                className="sc-dls-input-number"
                                                placeholder={String(originalOvers)}
                                            />
                                            <span className="sc-dls-overs-unit">Overs</span>

                                            <button
                                                type="button"
                                                className="sc-dls-btn-recalc"
                                                onClick={() => handleAutoCalculateDls()}
                                                title="Compute mathematical DLS target"
                                            >
                                                <MdBolt /> Auto Calculate
                                            </button>
                                        </div>

                                        {/* Quick Overs Selection Chips */}
                                        <div className="sc-dls-quick-chips">
                                            <span className="sc-dls-chips-title">Quick presets:</span>
                                            {quickOversList.map(ov => (
                                                <button
                                                    key={ov}
                                                    type="button"
                                                    className={`sc-dls-chip ${Number(dlsRevisedOvers) === ov ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setDlsRevisedOvers(ov);
                                                        handleAutoCalculateDls(ov);
                                                    }}
                                                >
                                                    {ov} Ov
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Calculation Insight Card */}
                                    {dlsCalculationData && (
                                        <div className="sc-dls-calc-card">
                                            <div className="sc-dls-calc-header">
                                                <span>ICC Standard DLS Resource Calculation</span>
                                                {dlsCalculationData.isDls ? (
                                                    <span className="sc-dls-scaled-tag">Target Scaled Down</span>
                                                ) : (
                                                    <span className="sc-dls-standard-tag">Full Resources</span>
                                                )}
                                            </div>
                                            <div className="sc-dls-calc-grid">
                                                <div className="sc-dls-stat-col">
                                                    <span className="stat-label">Calculated Target</span>
                                                    <strong className="stat-val highlight">{dlsCalculationData.revisedTarget} Runs</strong>
                                                </div>
                                                <div className="sc-dls-stat-col">
                                                    <span className="stat-label">Required Run Rate</span>
                                                    <strong className="stat-val">{dlsCalculationData.requiredRunRate} RPO</strong>
                                                </div>
                                                <div className="sc-dls-stat-col">
                                                    <span className="stat-label">Team 1 Resource</span>
                                                    <strong className="stat-val">{dlsCalculationData.resource1}%</strong>
                                                </div>
                                                <div className="sc-dls-stat-col">
                                                    <span className="stat-label">Team 2 Resource</span>
                                                    <strong className="stat-val">{dlsCalculationData.resource2}%</strong>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Official Target Override Input */}
                                    <div className="sc-dls-field-group target-override">
                                        <div className="sc-dls-field-header-row">
                                            <label className="sc-dls-field-label">
                                                Official Target to Apply:
                                                <span className="sc-dls-field-hint">Auto-filled from calculation. Edit manually if umpires specify an agreed target.</span>
                                            </label>
                                            {dlsIsManual && (
                                                <span className="sc-dls-manual-badge">Custom Override</span>
                                            )}
                                        </div>
                                        <div className="sc-dls-target-input-row">
                                            <input
                                                type="number"
                                                min="1"
                                                value={dlsOfficialTarget}
                                                onChange={(e) => {
                                                    setDlsOfficialTarget(e.target.value);
                                                    setDlsIsManual(true);
                                                }}
                                                className="sc-dls-input-target"
                                                placeholder="Enter target"
                                            />
                                            <span className="sc-dls-target-subtext">
                                                {t2TeamName} needs <strong>{dlsOfficialTarget || 0}</strong> runs to win in {dlsRevisedOvers || originalOvers} overs.
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="sc-dls-modal-footer">
                                    {currentCommon.dls?.isApplied ? (
                                        <button
                                            type="button"
                                            className="sc-dls-btn-reset"
                                            onClick={handleResetDls}
                                        >
                                            Remove DLS
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="cx-btn-secondary"
                                            onClick={() => setShowDlsModal(false)}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="cx-btn-confirm primary"
                                        onClick={handleApplyDls}
                                    >
                                        Apply DLS Target ({dlsOfficialTarget || 0})
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {renderSquadManagerModal()}
                {renderTossModal()}
            </div>
            <Footer />
        </div>
    );
};

export default ScoringConsole;
