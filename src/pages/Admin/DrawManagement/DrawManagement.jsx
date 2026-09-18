import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TiltCard from '../../../components/3D/TiltCard';
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import ToastNotification from '../../../components/common/ToastNotification';
import Footer from '../../../components/common/Footer/Footer';
import {
    subscribeTeams,
    subscribeFixtures,
    updateFixturesData,
    setMatchData,
    updateMatchData,
    getMatchData,
    subscribeLiveData,
    buildPlayersRoster,
    buildInitialMatchPayload,
    deleteMatchData
} from '../../../services/rtdbService';
import {
    MdCalendarToday,
    MdLocationOn,
    MdPlayArrow,
    MdCheck,
    MdCheckCircle,
    MdSettings,
    MdPeople,
    MdDragIndicator,
    MdAdd,
    MdDelete,
    MdClose,
    MdTimer,
    MdSave,
    MdLock,
    MdSwapHoriz,
    MdWarningAmber,
    MdEventAvailable,
    MdDeleteSweep,
    MdEdit,
    MdEmojiEvents,
    MdAutoAwesome
} from 'react-icons/md';
import AdminSubNav from '../../../components/Navigation/AdminSubNav';
import PageLoader from '../../../components/common/PageLoader/PageLoader';
import { useAdminTournament } from '../../../contexts/AdminTournamentContext';
import { useAdminProcessing } from '../../../contexts/AdminProcessingContext';
import { isMatchFinished, isMatchCurrentlyLive } from '../../../components/common/MatchCard/MatchCard';
import './DrawManagement.css';

const DEFAULT_TEAMS = ['E21', 'E22', 'E23', 'E24'];

const DrawManagement = () => {
    const navigate = useNavigate();
    const toastRef = useRef();
    const { selectedTournamentId } = useAdminTournament();
    const { withProcessing } = useAdminProcessing();

    const [isLoading, setIsLoading] = useState(true);
    const [teamsData, setTeamsData] = useState({});
    const [drawType, setDrawType] = useState('league'); // 'league' or 'elimination'
    const [generatedMatches, setGeneratedMatches] = useState([]);
    const [editingMatch, setEditingMatch] = useState(null);
    const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
    const [unscheduledWarningOpen, setUnscheduledWarningOpen] = useState(false);
    const [matchToDelete, setMatchToDelete] = useState(null);
    const [clearDrawConfirmOpen, setClearDrawConfirmOpen] = useState(false);
    const [fixturesStatus, setFixturesStatus] = useState(0); // 0 = Draft, 1 = Published
    const [isEditingEnabled, setIsEditingEnabled] = useState(false); // Controls edit unlock when published
    const [liveData, setLiveData] = useState(null);
    const [liveMatchBlockedModal, setLiveMatchBlockedModal] = useState(null);

    // Team Drag and Drop state (Individual team slot swapping)
    const [draggedTeamInfo, setDraggedTeamInfo] = useState(null); // { matchId, slot: 'team1'|'team2', teamName }
    const [dragOverTeamInfo, setDragOverTeamInfo] = useState(null); // { matchId, slot: 'team1'|'team2' }

    // Custom Match Modal state
    const [customModalOpen, setCustomModalOpen] = useState(false);
    const [customTitle, setCustomTitle] = useState('Qualifier 1');
    const [customTeam1, setCustomTeam1] = useState('E21');
    const [customTeam2, setCustomTeam2] = useState('E22');
    const [customDate, setCustomDate] = useState('');
    const [customTime, setCustomTime] = useState('');
    const [customVenue, setCustomVenue] = useState('Faculty Cricket Grounds');

    // Modal fields
    const [modalDate, setModalDate] = useState('');
    const [modalTime, setModalTime] = useState('');
    const [modalVenue, setModalVenue] = useState('Faculty Cricket Grounds, Kilinochchi');
    const [modalUmpire1, setModalUmpire1] = useState('Mr. S. Ketheeswaran');
    const [modalUmpire2, setModalUmpire2] = useState('Mr. N. Ramanan');

    useEffect(() => {
        const unsubTeams = subscribeTeams((data) => setTeamsData(data || {}), selectedTournamentId);
        const unsubLive = subscribeLiveData((data) => setLiveData(data || null));
        const unsubFix = subscribeFixtures((data) => {
            if (data?.isFixtures !== undefined) {
                const status = Number(data.isFixtures);
                setFixturesStatus(status);
            }
            if (data?.finishedMatches) {
                // Initialize matches list with team1 and team2, filtering any duplicates
                const rawList = Array.isArray(data.finishedMatches)
                    ? data.finishedMatches.filter(Boolean)
                    : Object.values(data.finishedMatches).filter(Boolean);

                const seenKeys = new Set();
                const list = [];
                rawList.forEach(m => {
                    const normTitle = String(m.title || m.name || '').trim().toLowerCase();
                    const normId = String(m.id || '').trim().toLowerCase();
                    const key = normTitle || normId;
                    if (key && seenKeys.has(key)) {
                        return;
                    }
                    if (key) seenKeys.add(key);

                    const [t1 = '', t2 = ''] = (m.teams || '').split(' vs ');
                    list.push({
                        ...m,
                        team1: m.team1 || t1,
                        team2: m.team2 || t2,
                        date: m.date || '',
                        time: m.time || ''
                    });
                });
                setGeneratedMatches(list);
                // Keep editing disabled by default whenever fixtures exist in database
                setIsEditingEnabled(list.length === 0);
            } else {
                setGeneratedMatches([]);
                setIsEditingEnabled(true);
            }
            setIsLoading(false);
        }, selectedTournamentId);

        const timer = setTimeout(() => setIsLoading(false), 1200);

        return () => {
            clearTimeout(timer);
            unsubTeams();
            unsubFix();
            unsubLive();
        };
    }, [selectedTournamentId]);

    const availableTeamKeys = Object.keys(teamsData).length > 0 ? Object.keys(teamsData) : DEFAULT_TEAMS;

    const currentLiveTitle = (liveData?.currentMatchPath
        ? liveData.currentMatchPath.split('/').pop()
        : liveData?.liveScore?.matchTitle || '').trim();
    const isAnyMatchLive = Boolean(liveData?.isLive);

    const isMatchStartedOrConcluded = (m) => {
        if (!m) return false;
        if (isMatchFinished(m)) return true;
        if (isMatchCurrentlyLive(m, liveData)) return true;
        if (isAnyMatchLive && currentLiveTitle && (
            (m.title && m.title.trim().toLowerCase() === currentLiveTitle.toLowerCase()) ||
            (m.id && String(m.id).trim().toLowerCase() === currentLiveTitle.toLowerCase())
        )) {
            return true;
        }
        return false;
    };

    const hasAnyMatchStarted = generatedMatches.some(isMatchStartedOrConcluded);
    const startedMatchesCount = generatedMatches.filter(isMatchStartedOrConcluded).length;

    // Winner detection helper for Semi-Finals / Matches
    const detectMatchWinner = (match) => {
        if (!match) return '';
        if (match.winner && String(match.winner).trim()) return String(match.winner).trim();
        const res = String(match.result || '').trim();
        if (!res) return '';

        const t1 = String(match.team1 || '').trim();
        const t2 = String(match.team2 || '').trim();

        if (t1) {
            const esc1 = t1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (new RegExp(`^${esc1}\\s+won`, 'i').test(res) || new RegExp(`\\b${esc1}\\b.*won`, 'i').test(res)) {
                return t1;
            }
        }
        if (t2) {
            const esc2 = t2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (new RegExp(`^${esc2}\\s+won`, 'i').test(res) || new RegExp(`\\b${esc2}\\b.*won`, 'i').test(res)) {
                return t2;
            }
        }

        for (const teamKey of availableTeamKeys) {
            const esc = teamKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (new RegExp(`^${esc}\\s+won`, 'i').test(res)) {
                return teamKey;
            }
        }

        const wonMatch = res.match(/^(.+?)\s+won(\s+by|\s*$)/i);
        if (wonMatch && wonMatch[1]) {
            const candidate = wonMatch[1].trim();
            const foundKey = availableTeamKeys.find(k => k.toLowerCase() === candidate.toLowerCase());
            if (foundKey) return foundKey;
            return candidate;
        }

        return '';
    };

    // Semi-Final & Final Detection
    const finalMatch = generatedMatches.find(m => {
        if (!m) return false;
        const title = String(m.title || '').trim().toLowerCase();
        const teams = String(m.teams || '').toLowerCase();
        return (title.includes('final') && !title.includes('semi')) ||
            teams.includes('winner sf') ||
            String(m.team1 || '').toLowerCase().includes('winner sf') ||
            String(m.team2 || '').toLowerCase().includes('winner sf');
    });

    const sf1Match = generatedMatches.find(m => {
        if (!m) return false;
        const title = String(m.title || '').trim().toLowerCase();
        return title.includes('semi-final 1') || title.includes('semi final 1') || title === 'sf1' || title === 'sf 1';
    });

    const sf2Match = generatedMatches.find(m => {
        if (!m) return false;
        const title = String(m.title || '').trim().toLowerCase();
        return title.includes('semi-final 2') || title.includes('semi final 2') || title === 'sf2' || title === 'sf 2';
    });

    const detectedSF1Winner = sf1Match ? detectMatchWinner(sf1Match) : '';
    const detectedSF2Winner = sf2Match ? detectMatchWinner(sf2Match) : '';

    const nonFinalMatches = generatedMatches.filter(m => m.id !== finalMatch?.id);
    const completedNonFinalMatches = nonFinalMatches.filter(m => isMatchFinished(m));
    const allNonFinalMatchesFinished = nonFinalMatches.length > 0 && completedNonFinalMatches.length === nonFinalMatches.length;

    const isFinalStartedOrDone = finalMatch ? isMatchStartedOrConcluded(finalMatch) : false;
    const canSetupFinalists = Boolean(finalMatch && !isFinalStartedOrDone);

    const [selectedFinalist1, setSelectedFinalist1] = useState('');
    const [selectedFinalist2, setSelectedFinalist2] = useState('');
    const [isSavingFinalists, setIsSavingFinalists] = useState(false);

    // Auto-populate or preselect finalist dropdowns
    useEffect(() => {
        if (!finalMatch) return;
        const t1 = finalMatch.team1 || '';
        const t2 = finalMatch.team2 || '';
        const isT1Placeholder = !t1 || t1.toLowerCase().includes('winner') || t1.toLowerCase() === 'tbd' || t1.toLowerCase().includes('top');
        const isT2Placeholder = !t2 || t2.toLowerCase().includes('winner') || t2.toLowerCase() === 'tbd' || t2.toLowerCase().includes('top');

        setSelectedFinalist1(prev => {
            if (prev && availableTeamKeys.includes(prev)) return prev;
            if (isT1Placeholder && detectedSF1Winner) return detectedSF1Winner;
            if (!isT1Placeholder && t1) return t1;
            return '';
        });

        setSelectedFinalist2(prev => {
            if (prev && availableTeamKeys.includes(prev)) return prev;
            if (isT2Placeholder && detectedSF2Winner) return detectedSF2Winner;
            if (!isT2Placeholder && t2) return t2;
            return '';
        });
    }, [generatedMatches, detectedSF1Winner, detectedSF2Winner, availableTeamKeys, finalMatch]);

    const handleAutoFillDetectedWinners = () => {
        if (!allNonFinalMatchesFinished) {
            toastRef.current.showToast('warning', `Finalists auto-fill is locked: all tournament matches prior to the Final must be completed first (${completedNonFinalMatches.length} of ${nonFinalMatches.length} completed).`);
            return;
        }
        if (!isEditingEnabled) {
            toastRef.current.showToast('warning', "Click 'Enable Editing' in the header to modify finalists.");
            return;
        }
        let count = 0;
        if (detectedSF1Winner) {
            setSelectedFinalist1(detectedSF1Winner);
            count++;
        }
        if (detectedSF2Winner) {
            setSelectedFinalist2(detectedSF2Winner);
            count++;
        }
        if (count > 0) {
            toastRef.current.showToast('info', `Auto-filled ${count} detected Semi-Final winner(s)!`);
        } else {
            toastRef.current.showToast('warning', 'No semi-final winners detected yet from match results.');
        }
    };

    const handleSaveFinalists = async (team1Choice, team2Choice) => {
        if (!allNonFinalMatchesFinished) {
            toastRef.current.showToast('error', `Cannot configure finalists: all tournament matches prior to the Final must be completed first (${completedNonFinalMatches.length} of ${nonFinalMatches.length} completed).`);
            return;
        }
        if (!isEditingEnabled) {
            toastRef.current.showToast('warning', "Click 'Enable Editing' in the header to modify finalists.");
            return;
        }
        const t1 = (team1Choice || selectedFinalist1 || '').trim();
        const t2 = (team2Choice || selectedFinalist2 || '').trim();

        if (!finalMatch) {
            toastRef.current.showToast('error', 'Final match fixture not found.');
            return;
        }
        if (!t1 || !t2) {
            toastRef.current.showToast('warning', 'Please select both finalists before confirming.');
            return;
        }
        if (t1.toLowerCase() === t2.toLowerCase()) {
            toastRef.current.showToast('error', 'Both finalists cannot be the same team.');
            return;
        }

        setIsSavingFinalists(true);
        await withProcessing(async () => {
            try {
                const updatedMatches = generatedMatches.map(m => {
                    if (m.id === finalMatch.id) {
                        return {
                            ...m,
                            team1: t1,
                            team2: t2,
                            teams: `${t1} vs ${t2}`
                        };
                    }
                    return m;
                });

                setGeneratedMatches(updatedMatches);

                // Build finishedMatchesMap preserving existing completed/scheduled state
                const finishedMatchesMap = {};
                updatedMatches.forEach(m => {
                    const [split1 = '', split2 = ''] = (m.teams || '').split(' vs ');
                    finishedMatchesMap[m.id] = {
                        id: m.id,
                        title: m.title,
                        teams: m.teams,
                        team1: m.team1 || split1,
                        team2: m.team2 || split2,
                        date: m.date || '',
                        time: m.time || '',
                        venue: m.venue || 'Faculty Cricket Grounds',
                        umpire1: m.umpire1 || '',
                        umpire2: m.umpire2 || '',
                        active: 1,
                        score: m.score || 'Scheduled',
                        result: m.result || 'Scheduled',
                        finished: isMatchFinished(m) ? 1 : 0,
                        isFinished: Boolean(isMatchFinished(m)),
                        mom: m.mom || ''
                    };
                });

                // Update Firebase FixturesData
                await updateFixturesData({
                    finishedMatches: finishedMatchesMap,
                    updatedAt: new Date().toISOString()
                }, selectedTournamentId);

                // Also update match root node in RTDB with full rosters
                const cleanTitle = finalMatch.title.replace(/^\//, '');
                const t1Obj = teamsData[t1] || Object.values(teamsData).find(t => String(t.name || t.teamName || t.id).trim().toLowerCase() === t1.toLowerCase()) || {};
                const t2Obj = teamsData[t2] || Object.values(teamsData).find(t => String(t.name || t.teamName || t.id).trim().toLowerCase() === t2.toLowerCase()) || {};
                const t1Players = buildPlayersRoster(t1Obj, t1);
                const t2Players = buildPlayersRoster(t2Obj, t2);

                const matchUpdates = {
                    'common/title': cleanTitle,
                    'common/team1': t1,
                    'common/team2': t2,
                    'common/teams': `${t1} vs ${t2}`,
                    'common/status': 'Match Scheduled',
                    'common/score': 'Scheduled',
                    'common/result': '',
                    'common/finished': 0,
                    'team1/name': t1,
                    'team1/totalRuns': 0,
                    'team1/totalWickets': 0,
                    'team1/overs': 0,
                    'team1/totalBalls': 0,
                    'team1/players': t1Players,
                    'team2/name': t2,
                    'team2/totalRuns': 0,
                    'team2/totalWickets': 0,
                    'team2/overs': 0,
                    'team2/totalBalls': 0,
                    'team2/players': t2Players,
                    'commentary': {},
                    'overBallsTypes': {}
                };
                await updateMatchData(cleanTitle, matchUpdates, selectedTournamentId);
                if (finalMatch.id && String(finalMatch.id) !== cleanTitle) {
                    try {
                        await deleteMatchData(String(finalMatch.id), selectedTournamentId);
                    } catch (cleanupErr) {
                        console.warn('Could not clean up duplicate numeric finalist node:', cleanupErr);
                    }
                }

                toastRef.current.showToast('success', `🏆 Finalists successfully confirmed: ${t1} vs ${t2}! Draw updated.`);
            } catch (err) {
                console.error('Error confirming finalists:', err);
                toastRef.current.showToast('error', 'Failed to save finalists to Firebase.');
            } finally {
                setIsSavingFinalists(false);
            }
        }, 'Configuring Finalists...', 'Updating Championship match and squad rosters in Firebase...');
    };

    // Helpers to normalize date and time for native <input type="date"> and <input type="time">
    const normalizeDateForInput = (val) => {
        if (!val) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        }
        return '';
    };

    const normalizeTimeForInput = (val) => {
        if (!val) return '';
        if (/^([01]\d|2[0-3]):[0-5]\d$/.test(val)) return val;
        const match = val.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (match) {
            let hour = parseInt(match[1], 10);
            const min = match[2];
            const meridiem = match[3].toUpperCase();
            if (meridiem === 'PM' && hour < 12) hour += 12;
            if (meridiem === 'AM' && hour === 12) hour = 0;
            return `${String(hour).padStart(2, '0')}:${min}`;
        }
        return '';
    };

    const formatDisplayTime = (t) => {
        if (!t) return '';
        if (t.includes('AM') || t.includes('PM')) return t;
        const [hStr, mStr] = t.split(':');
        const h = parseInt(hStr, 10);
        if (isNaN(h)) return t;
        const meridiem = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${mStr || '00'} ${meridiem}`;
    };

    // Generate Draw Fixtures (Date and time initially NOT set, marked Unpublished until published)
    const handleGenerateDraw = () => {
        if (!isEditingEnabled) {
            toastRef.current.showToast('warning', "Click 'Enable Editing' in the header to generate fixtures.");
            return;
        }
        if (hasAnyMatchStarted) {
            toastRef.current.showToast('error', 'Cannot re-generate draw: tournament matches have already started or concluded.');
            return;
        }
        const tList = [...availableTeamKeys];
        const newMatches = [];

        if (drawType === 'league') {
            // Round-robin pairing
            let matchCount = 1;
            for (let i = 0; i < tList.length; i++) {
                for (let j = i + 1; j < tList.length; j++) {
                    const suffix = matchCount === 1 ? '1st' : matchCount === 2 ? '2nd' : matchCount === 3 ? '3rd' : `${matchCount}th`;
                    newMatches.push({
                        id: Date.now() + matchCount,
                        title: suffix,
                        teams: `${tList[i]} vs ${tList[j]}`,
                        date: '', // Date not set initially
                        time: '', // Time not set initially
                        venue: 'Faculty Cricket Grounds',
                        team1: tList[i],
                        team2: tList[j]
                    });
                    matchCount++;
                }
            }
            // Add Final match
            newMatches.push({
                id: Date.now() + 100,
                title: 'Final',
                teams: 'Top 1 vs Top 2',
                date: '', // Date not set initially
                time: '', // Time not set initially
                venue: 'Faculty Cricket Grounds',
                team1: 'Top 1',
                team2: 'Top 2'
            });
        } else {
            // Elimination Bracket
            newMatches.push({
                id: Date.now() + 1,
                title: 'Semi-Final 1',
                teams: `${tList[0]} vs ${tList[3] || tList[1]}`,
                date: '',
                time: '',
                venue: 'Faculty Cricket Grounds',
                team1: tList[0],
                team2: tList[3] || tList[1]
            });
            newMatches.push({
                id: Date.now() + 2,
                title: 'Semi-Final 2',
                teams: `${tList[1]} vs ${tList[2] || tList[0]}`,
                date: '',
                time: '',
                venue: 'Faculty Cricket Grounds',
                team1: tList[1],
                team2: tList[2] || tList[0]
            });
            newMatches.push({
                id: Date.now() + 3,
                title: 'Final',
                teams: 'Winner SF1 vs Winner SF2',
                date: '',
                time: '',
                venue: 'Faculty Cricket Grounds',
                team1: 'Winner SF1',
                team2: 'Winner SF2'
            });
        }

        setGeneratedMatches(newMatches);
        setFixturesStatus(0); // Newly generated draw is Unpublished until admin publishes
        toastRef.current.showToast('success', `Generated ${newMatches.length} fixtures (${drawType.toUpperCase()}). Match dates & times are unset. You can shift teams by dragging, schedule each match, then Save Draft or Publish.`);
    };

    // Helper: Semi-finals and Finals cannot be re-ordered by drag-drop, but teams CAN be selected when not started
    const isMatchLocked = (match) => {
        if (!match || !match.title) return false;
        const title = match.title.toLowerCase();
        const teams = (match.teams || '').toLowerCase();
        return (
            title.includes('final') ||
            title.includes('semi') ||
            title.includes('sf') ||
            teams.includes('top 1') ||
            teams.includes('top 2') ||
            teams.includes('winner sf') ||
            teams.includes('winner')
        );
    };

    // Handler: Allow admin to directly select team names for Final/Semi-Final slots
    const handleFinalTeamSelect = async (matchId, slot, selectedTeam) => {
        if (!isEditingEnabled) {
            toastRef.current.showToast('warning', "Editing is disabled. Click 'Enable Editing' in the header to modify fixtures.");
            return;
        }
        const isFinal = finalMatch && finalMatch.id === matchId;
        if (isFinal && !allNonFinalMatchesFinished) {
            toastRef.current.showToast('error', `Cannot configure finalists: all tournament matches prior to the Final must be completed first (${completedNonFinalMatches.length} of ${nonFinalMatches.length} completed).`);
            return;
        }

        let updatedMatches = [];
        setGeneratedMatches(prev => {
            updatedMatches = prev.map(m => {
                if (m.id !== matchId) return m;
                const newTeam1 = slot === 'team1' ? selectedTeam : m.team1;
                const newTeam2 = slot === 'team2' ? selectedTeam : m.team2;
                return { ...m, team1: newTeam1, team2: newTeam2, teams: `${newTeam1} vs ${newTeam2}` };
            });
            return updatedMatches;
        });

        if (finalMatch && finalMatch.id === matchId) {
            if (slot === 'team1') setSelectedFinalist1(selectedTeam);
            if (slot === 'team2') setSelectedFinalist2(selectedTeam);
        }

        if (fixturesStatus === 1) {
            try {
                const finishedMatchesMap = {};
                updatedMatches.forEach(m => {
                    const [t1 = '', t2 = ''] = (m.teams || '').split(' vs ');
                    finishedMatchesMap[m.id] = {
                        ...m,
                        team1: m.team1 || t1,
                        team2: m.team2 || t2,
                    };
                });
                await updateFixturesData({
                    finishedMatches: finishedMatchesMap,
                    updatedAt: new Date().toISOString()
                }, selectedTournamentId);

                const targetMatch = updatedMatches.find(m => m.id === matchId);
                if (targetMatch) {
                    const clean = targetMatch.title.replace(/^\//, '');
                    const t1Obj = teamsData[targetMatch.team1] || Object.values(teamsData).find(t => String(t.name || t.teamName || t.id).trim().toLowerCase() === String(targetMatch.team1).trim().toLowerCase()) || {};
                    const t2Obj = teamsData[targetMatch.team2] || Object.values(teamsData).find(t => String(t.name || t.teamName || t.id).trim().toLowerCase() === String(targetMatch.team2).trim().toLowerCase()) || {};

                    const updates = {
                        'common/team1': targetMatch.team1,
                        'common/team2': targetMatch.team2,
                        'common/teams': targetMatch.teams,
                        'team1/name': targetMatch.team1,
                        'team1/players': buildPlayersRoster(t1Obj, targetMatch.team1),
                        'team2/name': targetMatch.team2,
                        'team2/players': buildPlayersRoster(t2Obj, targetMatch.team2)
                    };
                    await updateMatchData(clean, updates, selectedTournamentId);
                    if (targetMatch.id && String(targetMatch.id) !== clean && /^\d+$/.test(String(targetMatch.id))) {
                        try {
                            await deleteMatchData(String(targetMatch.id), selectedTournamentId);
                        } catch (cleanupErr) {
                            console.warn(`Could not clean up legacy numeric node [${targetMatch.id}]:`, cleanupErr);
                        }
                    }
                }
                toastRef.current.showToast('success', `Updated ${slot === 'team1' ? 'Team 1' : 'Team 2'} for ${targetMatch?.title || 'match'}`);
            } catch (err) {
                console.error('Failed to sync team selection to Firebase:', err);
                toastRef.current.showToast('error', 'Failed to sync team selection to Firebase.');
            }
        } else {
            setFixturesStatus(0);
        }
    };

    // Team Drag & Drop Handlers (Shifting individual teams across matches)
    const handleTeamDragStart = (e, match, slot) => {
        if (!isEditingEnabled) {
            e.preventDefault();
            toastRef.current.showToast('warning', "Editing is disabled. Click 'Enable Editing' in the header to modify fixtures.");
            return;
        }
        if (isMatchStartedOrConcluded(match)) {
            e.preventDefault();
            toastRef.current.showToast('warning', isMatchFinished(match) ? 'Completed match team lineups are locked and cannot be shifted.' : 'Live match team lineups are locked and cannot be shifted.');
            return;
        }
        if (isMatchLocked(match)) {
            e.preventDefault();
            toastRef.current.showToast('info', 'Finals and semi-finals team slots are fixed and cannot be shifted.');
            return;
        }
        const teamName = slot === 'team1' ? match.team1 : match.team2;
        setDraggedTeamInfo({
            matchId: match.id,
            slot: slot,
            teamName: teamName
        });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({ matchId: match.id, slot, teamName }));
    };

    const handleTeamDragOver = (e, targetMatch, targetSlot) => {
        e.preventDefault();
        if (isMatchStartedOrConcluded(targetMatch) || isMatchLocked(targetMatch)) {
            e.dataTransfer.dropEffect = 'none';
            return;
        }
        e.dataTransfer.dropEffect = 'move';
        if (dragOverTeamInfo?.matchId !== targetMatch.id || dragOverTeamInfo?.slot !== targetSlot) {
            setDragOverTeamInfo({ matchId: targetMatch.id, slot: targetSlot });
        }
    };

    const handleTeamDrop = (e, targetMatch, targetSlot) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isEditingEnabled) {
            toastRef.current.showToast('warning', "Editing is disabled. Click 'Enable Editing' in the header to modify fixtures.");
            setDraggedTeamInfo(null);
            setDragOverTeamInfo(null);
            return;
        }

        if (!draggedTeamInfo) {
            setDraggedTeamInfo(null);
            setDragOverTeamInfo(null);
            return;
        }

        if (isMatchStartedOrConcluded(targetMatch)) {
            toastRef.current.showToast('warning', isMatchFinished(targetMatch) ? 'Cannot shift teams into a completed match.' : 'Cannot shift teams into an active live match.');
            setDraggedTeamInfo(null);
            setDragOverTeamInfo(null);
            return;
        }

        if (isMatchLocked(targetMatch)) {
            toastRef.current.showToast('warning', 'Semi-finals and Finals matchups cannot be shifted.');
            setDraggedTeamInfo(null);
            setDragOverTeamInfo(null);
            return;
        }

        const sourceMatchId = draggedTeamInfo.matchId;
        const sourceSlot = draggedTeamInfo.slot;
        const targetMatchId = targetMatch.id;

        // Dropped on the same slot of same match
        if (sourceMatchId === targetMatchId && sourceSlot === targetSlot) {
            setDraggedTeamInfo(null);
            setDragOverTeamInfo(null);
            return;
        }

        const updatedMatches = generatedMatches.map(m => ({ ...m }));
        const sourceMatch = updatedMatches.find(m => m.id === sourceMatchId);
        const destMatch = updatedMatches.find(m => m.id === targetMatchId);

        if (!sourceMatch || !destMatch) {
            setDraggedTeamInfo(null);
            setDragOverTeamInfo(null);
            return;
        }

        const sourceTeamName = sourceSlot === 'team1' ? sourceMatch.team1 : sourceMatch.team2;
        const targetTeamName = targetSlot === 'team1' ? destMatch.team1 : destMatch.team2;

        if (sourceMatchId === targetMatchId) {
            // Swapping within the same match
            sourceMatch.team1 = targetTeamName;
            sourceMatch.team2 = sourceTeamName;
            sourceMatch.teams = `${sourceMatch.team1} vs ${sourceMatch.team2}`;
        } else {
            // Check self-play clash
            const sourceOtherTeam = sourceSlot === 'team1' ? sourceMatch.team2 : sourceMatch.team1;
            const destOtherTeam = targetSlot === 'team1' ? destMatch.team2 : destMatch.team1;

            if (targetTeamName === sourceOtherTeam || sourceTeamName === destOtherTeam) {
                toastRef.current.showToast('error', `Cannot shift: Teams would clash in the same fixture (${sourceTeamName} vs ${targetTeamName})!`);
                setDraggedTeamInfo(null);
                setDragOverTeamInfo(null);
                return;
            }

            // Swap team names
            if (sourceSlot === 'team1') {
                sourceMatch.team1 = targetTeamName;
            } else {
                sourceMatch.team2 = targetTeamName;
            }
            sourceMatch.teams = `${sourceMatch.team1} vs ${sourceMatch.team2}`;

            if (targetSlot === 'team1') {
                destMatch.team1 = sourceTeamName;
            } else {
                destMatch.team2 = sourceTeamName;
            }
            destMatch.teams = `${destMatch.team1} vs ${destMatch.team2}`;
        }

        setGeneratedMatches(updatedMatches);
        setFixturesStatus(0); // Shifts modify the draw, marked Unpublished
        setDraggedTeamInfo(null);
        setDragOverTeamInfo(null);
        toastRef.current.showToast('success', `Shifted team: ${sourceTeamName} ⇄ ${targetTeamName}`);
    };

    const handleTeamDragEnd = () => {
        setDraggedTeamInfo(null);
        setDragOverTeamInfo(null);
    };

    // Custom match addition
    const handleAddCustomMatch = (e) => {
        e.preventDefault();
        if (!isEditingEnabled) {
            toastRef.current.showToast('warning', "Click 'Enable Editing' in the header to add custom matches.");
            return;
        }
        if (!customTeam1 || !customTeam2) {
            toastRef.current.showToast('error', 'Please select or enter both teams.');
            return;
        }

        const newMatch = {
            id: Date.now(),
            title: customTitle.trim() || `Match ${generatedMatches.length + 1}`,
            teams: `${customTeam1.trim()} vs ${customTeam2.trim()}`,
            team1: customTeam1.trim(),
            team2: customTeam2.trim(),
            date: customDate ? customDate.trim() : '',
            time: customTime ? customTime.trim() : '',
            venue: customVenue ? customVenue.trim() : 'Faculty Cricket Grounds'
        };

        setGeneratedMatches(prev => [...prev, newMatch]);
        setFixturesStatus(0);
        setCustomModalOpen(false);
        toastRef.current.showToast('success', `Added custom fixture: ${newMatch.title}`);
    };

    // Request deletion of a fixture from the list (triggers confirmation modal)
    const handleDeleteMatch = (match) => {
        if (!isEditingEnabled) {
            toastRef.current.showToast('warning', "Editing is locked. Click 'Enable Editing' in the header to delete matches.");
            return;
        }
        if (isMatchStartedOrConcluded(match)) {
            toastRef.current.showToast('warning', isMatchFinished(match) ? 'Completed matches cannot be deleted.' : 'Active live match cannot be deleted.');
            return;
        }
        setMatchToDelete(match);
    };

    // Confirmed deletion of fixture box
    const handleConfirmDeleteMatch = () => {
        if (!matchToDelete) return;
        if (!isEditingEnabled) {
            toastRef.current.showToast('warning', "Editing is locked. Click 'Enable Editing' in the header to delete matches.");
            setMatchToDelete(null);
            return;
        }
        setGeneratedMatches(prev => prev.filter(m => m.id !== matchToDelete.id));
        setFixturesStatus(0);
        toastRef.current.showToast('info', `Fixture "${matchToDelete.title}" removed from draw.`);
        setMatchToDelete(null);
    };

    // Confirmed clearing of entire draw
    const handleConfirmClearDraw = async () => {
        if (!isEditingEnabled) {
            toastRef.current.showToast('warning', "Editing is locked. Click 'Enable Editing' in the header to clear the draw.");
            setClearDrawConfirmOpen(false);
            return;
        }
        if (hasAnyMatchStarted) {
            toastRef.current.showToast('error', 'Cannot clear draw: tournament matches have already started or concluded.');
            setClearDrawConfirmOpen(false);
            return;
        }
        setGeneratedMatches([]);
        setFixturesStatus(0);
        setClearDrawConfirmOpen(false);
        await withProcessing(async () => {
            try {
                await updateFixturesData({
                    isFixtures: 0,
                    isDraft: true,
                    finishedMatches: {},
                    updatedAt: new Date().toISOString()
                }, selectedTournamentId);
                toastRef.current.showToast('info', 'Tournament draw cleared.');
            } catch (err) {
                console.error('Clear draw error:', err);
                toastRef.current.showToast('info', 'Draw cleared locally.');
            }
        }, 'Clearing Tournament Draw...', 'Removing generated matches and resetting fixtures...');
    };

    /**
     * Synchronize match nodes and fixturesMap in RTDB:
     * - Protects completed matches (never overwrites scores, wickets, overs, commentary, PoTM, or result)
     * - Protects live matches (never overwrites in-progress telemetry, partnerships, or balls)
     * - Initializes scheduled matches with full squad rosters for team1 and team2 from teamsData
     * - Storing paths: Tournaments/${tourneyId}/${cleanTitle}, Tournaments/${tourneyId}/${m.id}, and FixturesData/finishedMatches/${m.id}
     */
    const syncDrawFixturesToRtdb = async (matchesToSync, isPublished) => {
        const finishedMatchesMap = {};

        for (const m of matchesToSync) {
            const clean = decodeURIComponent(String(m.title || m.name || '')).replace(/^\//, '').split('/').pop().trim();
            const [t1Split = 'Team 1', t2Split = 'Team 2'] = String(m.teams || '').split(' vs ').map(s => s.trim());
            const t1 = m.team1 || t1Split || 'Team 1';
            const t2 = m.team2 || t2Split || 'Team 2';

            let existing = null;
            try {
                existing = await getMatchData(clean, selectedTournamentId);
            } catch (err) {
                console.warn(`Could not fetch existing match data for [${clean}]:`, err);
            }

            const isFinished = isMatchFinished(m) || isMatchFinished(existing) || existing?.common?.finished === 1 || existing?.finished === 1;
            const isLive = isMatchCurrentlyLive(m, liveData) || existing?.common?.status === 'Live' || (Boolean(liveData?.isLive) && currentLiveTitle && currentLiveTitle.toLowerCase() === clean.toLowerCase());

            const matchScore = isFinished
                ? (existing?.common?.score || existing?.score || m.score || 'Finished')
                : (isLive ? 'Live' : (m.score || 'Scheduled'));

            const matchResult = isFinished
                ? (existing?.common?.result || existing?.result || m.result || 'Match Finished')
                : (isLive ? 'Live' : (m.result || 'Scheduled'));

            const matchMom = isFinished ? (existing?.common?.mom || existing?.mom || m.mom || '') : '';

            // 1. Fixture map entry
            finishedMatchesMap[m.id] = {
                id: m.id,
                title: clean,
                teams: m.teams || `${t1} vs ${t2}`,
                team1: t1,
                team2: t2,
                date: m.date || existing?.common?.date || '',
                time: m.time || existing?.common?.time || '',
                venue: m.venue || existing?.common?.venue || 'Faculty Cricket Grounds',
                umpire1: m.umpire1 || existing?.common?.umpire1 || 'Mr. S. Ketheeswaran',
                umpire2: m.umpire2 || existing?.common?.umpire2 || 'Mr. N. Ramanan',
                active: 1,
                score: matchScore,
                result: matchResult,
                finished: isFinished ? 1 : 0,
                isFinished: Boolean(isFinished),
                mom: matchMom,
                matchPath: `Tournaments/${selectedTournamentId}/${clean}`
            };

            // 2. Synchronize Root Match Node
            if (isFinished) {
                // COMPLETED MATCH: Preserve all scores, stats, players, and commentary
                const updates = {
                    'common/date': m.date || existing?.common?.date || '',
                    'common/time': m.time || existing?.common?.time || '',
                    'common/venue': m.venue || existing?.common?.venue || 'Faculty Cricket Grounds',
                    'common/umpire1': m.umpire1 || existing?.common?.umpire1 || '',
                    'common/umpire2': m.umpire2 || existing?.common?.umpire2 || '',
                    'common/finished': 1,
                    'common/isFinished': true
                };
                if (existing?.common?.score) updates['common/score'] = existing.common.score;
                if (existing?.common?.result) updates['common/result'] = existing.common.result;
                if (existing?.common?.mom) updates['common/mom'] = existing.common.mom;

                await updateMatchData(clean, updates, selectedTournamentId);
            } else if (isLive) {
                // LIVE MATCH: Preserve live balls, telemetry, partnerships
                const updates = {
                    'common/date': m.date || existing?.common?.date || '',
                    'common/time': m.time || existing?.common?.time || '',
                    'common/venue': m.venue || existing?.common?.venue || 'Faculty Cricket Grounds',
                    'common/umpire1': m.umpire1 || existing?.common?.umpire1 || '',
                    'common/umpire2': m.umpire2 || existing?.common?.umpire2 || ''
                };
                await updateMatchData(clean, updates, selectedTournamentId);
            } else {
                // SCHEDULED MATCH:
                if (existing?.team1?.players && Object.keys(existing.team1.players).length > 0) {
                    // Update schedule without wiping configured players or state
                    const updates = {
                        'common/date': m.date || '',
                        'common/time': m.time || '',
                        'common/venue': m.venue || 'Faculty Cricket Grounds',
                        'common/umpire1': m.umpire1 || 'Mr. S. Ketheeswaran',
                        'common/umpire2': m.umpire2 || 'Mr. N. Ramanan',
                        'common/teams': `${t1} vs ${t2}`,
                        'common/title': clean,
                        'team1/name': t1,
                        'team2/name': t2
                    };
                    if (existing.team1?.name !== t1) {
                        const t1Obj = teamsData[t1] || Object.values(teamsData).find(t => String(t.name || t.teamName || t.id).trim().toLowerCase() === t1.toLowerCase()) || {};
                        updates['team1/players'] = buildPlayersRoster(t1Obj, t1);
                    }
                    if (existing.team2?.name !== t2) {
                        const t2Obj = teamsData[t2] || Object.values(teamsData).find(t => String(t.name || t.teamName || t.id).trim().toLowerCase() === t2.toLowerCase()) || {};
                        updates['team2/players'] = buildPlayersRoster(t2Obj, t2);
                    }
                    await updateMatchData(clean, updates, selectedTournamentId);
                } else {
                    // Fresh match node: populate with complete roster and metadata
                    const newPayload = buildInitialMatchPayload(m, teamsData);
                    await setMatchData(clean, newPayload, selectedTournamentId);
                }
            }

            // Clean up any legacy or duplicate numeric node created previously (e.g. 1789650092871)
            if (m.id && String(m.id) !== clean && /^\d+$/.test(String(m.id))) {
                try {
                    await deleteMatchData(String(m.id), selectedTournamentId);
                } catch (cleanupErr) {
                    console.warn(`Could not clean up legacy numeric node [${m.id}]:`, cleanupErr);
                }
            }
        }

        // 3. Update FixturesData
        await updateFixturesData({
            isFixtures: isPublished ? 1 : 0,
            isDraft: !isPublished,
            finishedMatches: finishedMatchesMap,
            [isPublished ? 'publishedAt' : 'updatedAt']: new Date().toISOString()
        }, selectedTournamentId);

        return finishedMatchesMap;
    };

    const handleSaveMatchSchedule = async () => {
        if (!editingMatch) return;
        if (!isEditingEnabled) {
            toastRef.current.showToast('warning', "Editing is locked. Click 'Enable Editing' in the header to reschedule matches.");
            setEditingMatch(null);
            return;
        }
        if (isMatchStartedOrConcluded(editingMatch)) {
            toastRef.current.showToast('warning', 'Completed or live matches cannot be rescheduled.');
            setEditingMatch(null);
            return;
        }
        const updated = generatedMatches.map(m => {
            if (m.id === editingMatch.id) {
                return {
                    ...m,
                    date: modalDate ? modalDate.trim() : '',
                    time: modalTime ? modalTime.trim() : '',
                    venue: modalVenue ? modalVenue.trim() : 'Faculty Cricket Grounds',
                    umpire1: modalUmpire1,
                    umpire2: modalUmpire2
                };
            }
            return m;
        });
        setGeneratedMatches(updated);
        setEditingMatch(null);

        // If fixtures are currently published, sync schedule update to RTDB immediately
        if (fixturesStatus === 1) {
            await withProcessing(async () => {
                try {
                    await syncDrawFixturesToRtdb(updated, true);
                } catch (err) {
                    console.warn('Could not sync updated schedule to RTDB immediately:', err);
                }
            }, 'Updating Match Schedule...', `Saving schedule for ${editingMatch.title}...`);
        } else {
            setFixturesStatus(0);
        }
        toastRef.current.showToast('success', `Updated schedule for ${editingMatch.title}`);
    };

    // Save Draft (Saved to Firebase for future admin edits, NOT published to public users)
    const handleSaveDraft = async () => {
        if (!isEditingEnabled) {
            toastRef.current.showToast('warning', "Click 'Enable Editing' in the header to make changes or save drafts.");
            return;
        }
        if (generatedMatches.length === 0) {
            toastRef.current.showToast('error', 'No fixtures to save. Generate or add matches first.');
            return;
        }
        await withProcessing(async () => {
            try {
                await syncDrawFixturesToRtdb(generatedMatches, false);
                setFixturesStatus(0);
                setIsEditingEnabled(false);
                toastRef.current.showToast('success', 'Fixtures saved as Draft! Complete match details and player squads stored for future admin edits.');
            } catch (error) {
                console.error('Save draft error:', error);
                toastRef.current.showToast('error', 'Failed to save draft.');
            }
        }, 'Saving Draft Draw...', 'Storing match schedules and player squads for future admin edits...');
    };

    // Request publish (requires all matches to be scheduled with date & time)
    const handleRequestPublish = () => {
        if (generatedMatches.length === 0) {
            toastRef.current.showToast('error', 'Please generate or add fixtures first.');
            return;
        }

        const unscheduled = generatedMatches.filter(m => !m.date || !m.time);
        if (unscheduled.length > 0) {
            setUnscheduledWarningOpen(true);
            return;
        }

        setConfirmPublishOpen(true);
    };

    // Publish Draw (makes visible to live website users & safely initializes scoring nodes)
    const handlePublishDraw = async () => {
        await withProcessing(async () => {
            try {
                await syncDrawFixturesToRtdb(generatedMatches, true);

                setFixturesStatus(1);
                setIsEditingEnabled(false);
                setConfirmPublishOpen(false);
                toastRef.current.showToast('success', 'Tournament draw published live! Completed matches, live games, and scheduled player rosters are all synchronized.');
            } catch (error) {
                console.error('Publish error:', error);
                toastRef.current.showToast('error', 'Failed to publish fixtures.');
            }
        }, 'Publishing Live Draw...', 'Broadcasting official fixtures, match schedules and live telemetry...');
    };

    const unscheduledMatchesCount = generatedMatches.filter(m => !m.date || !m.time).length;

    if (isLoading && generatedMatches.length === 0) {
        return (
            <PageLoader
                message="Loading Draw & Fixtures..."
                subtitle="Loading teams, schedules and fixture allocations"
                tournamentName="Draw Manager"
            />
        );
    }

    return (
        <div className="draw-mgmt-page">
            <AdminSubNav />
            <ToastNotification ref={toastRef} />

            <div className="dm-container">
                {/* Header */}
                <div className="dm-header">
                    <div>
                        <span className="dm-tag">FIXTURE GENERATOR & SCHEDULER</span>
                        <h1 className="dm-title">Draw Management</h1>
                        <p className="dm-subtitle">
                            Generate automated tournament fixtures, shift team pairings by dragging team badges, schedule dates and times, and save drafts or publish to users.
                        </p>
                    </div>

                    <div className="dm-header-actions">
                        {fixturesStatus === 1 ? (
                            <div className="dm-status-pill published" title="Fixtures are currently published and visible to users on the website">
                                <span className="live-dot-mini" />
                                <span>Published</span>
                            </div>
                        ) : (
                            <div className="dm-status-pill draft" title="Fixtures are in unpublished draft state and not visible to public users">
                                <MdSave />
                                <span>Unpublished</span>
                            </div>
                        )}

                        {!isEditingEnabled ? (
                            <button
                                type="button"
                                className="dm-enable-editing-btn"
                                onClick={() => {
                                    setIsEditingEnabled(true);
                                    toastRef.current.showToast('info', 'Editing enabled. You can now modify fixtures, pairings, and settings.');
                                }}
                                title="Enable editing to modify fixtures, pairings, or re-generate the draw"
                            >
                                <MdEdit /> Enable Editing
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="dm-lock-editing-btn"
                                    onClick={() => {
                                        setIsEditingEnabled(false);
                                        toastRef.current.showToast('info', 'Draw editing locked.');
                                    }}
                                    title="Lock draw editing to prevent accidental changes"
                                >
                                    <MdLock /> Lock Editing
                                </button>
                                <button
                                    type="button"
                                    className="dm-save-draft-btn"
                                    onClick={handleSaveDraft}
                                    title="Save current matches and pairings for future admin edits (does not show to public users)"
                                >
                                    <MdSave /> Save Draft
                                </button>
                            </>
                        )}

                        <button
                            type="button"
                            className="cx-btn-primary dm-publish-btn"
                            onClick={handleRequestPublish}
                            disabled={!isEditingEnabled || generatedMatches.length === 0}
                            title={
                                !isEditingEnabled
                                    ? "Click 'Enable Editing' to publish or update the draw"
                                    : generatedMatches.length === 0
                                        ? "No fixtures to publish"
                                        : "Publish scheduled draw to make it visible to all users"
                            }
                        >
                            <MdCheck /> {fixturesStatus === 1 && isEditingEnabled ? 'Update Published Draw' : 'Publish Draw'}
                        </button>
                    </div>
                </div>

                {/* Generator Controls */}
                <div className="dm-controls-card">
                    <div className="dm-control-item">
                        <label>Tournament Format</label>
                        <select
                            value={drawType}
                            onChange={(e) => setDrawType(e.target.value)}
                            className="dm-select"
                            disabled={!isEditingEnabled || hasAnyMatchStarted}
                            title={
                                !isEditingEnabled
                                    ? "Editing is locked. Click 'Enable Editing' in the header to change tournament format"
                                    : hasAnyMatchStarted
                                        ? "Tournament format is locked because matches have already started or concluded"
                                        : "Select tournament format"
                            }
                        >
                            <option value="league">Round Robin League + Final</option>
                            <option value="elimination">Knockout / Single Elimination</option>
                        </select>
                    </div>

                    <div className="dm-control-item">
                        <label>Batches ({availableTeamKeys.length})</label>
                        <div className="batch-chips-wrap">
                            {availableTeamKeys.map(k => (
                                <span key={k} className="batch-chip">
                                    <MdPeople /> {k}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="dm-control-actions">
                        <button
                            className={`dm-generate-btn ${!isEditingEnabled || hasAnyMatchStarted ? 'disabled' : ''}`}
                            onClick={handleGenerateDraw}
                            disabled={!isEditingEnabled || hasAnyMatchStarted}
                            title={
                                !isEditingEnabled
                                    ? "Editing is locked. Click 'Enable Editing' in the header to generate fixtures."
                                    : hasAnyMatchStarted
                                        ? "Cannot re-generate draw: tournament matches have already started or concluded."
                                        : "Generate automated fixtures"
                            }
                        >
                            <MdSettings /> Generate Draw
                        </button>
                        <button
                            className={`dm-add-custom-btn ${!isEditingEnabled ? 'disabled' : ''}`}
                            onClick={() => {
                                if (!isEditingEnabled) {
                                    toastRef.current.showToast('warning', "Click 'Enable Editing' in the header to add custom matches.");
                                    return;
                                }
                                setCustomModalOpen(true);
                            }}
                            disabled={!isEditingEnabled}
                            title={!isEditingEnabled ? "Editing is locked. Click 'Enable Editing' to add custom matches." : "Manually add a match"}
                        >
                            <MdAdd /> Add Custom Match
                        </button>
                        {generatedMatches.length > 0 && (
                            <button
                                type="button"
                                className={`dm-clear-draw-btn ${!isEditingEnabled || hasAnyMatchStarted ? 'disabled' : ''}`}
                                onClick={() => {
                                    if (!isEditingEnabled) {
                                        toastRef.current.showToast('warning', "Click 'Enable Editing' in the header to clear the draw.");
                                        return;
                                    }
                                    setClearDrawConfirmOpen(true);
                                }}
                                disabled={!isEditingEnabled || hasAnyMatchStarted}
                                title={
                                    !isEditingEnabled
                                        ? "Editing is locked. Click 'Enable Editing' to clear the draw."
                                        : hasAnyMatchStarted
                                            ? "Cannot clear draw: tournament matches have already started or concluded."
                                            : "Remove all generated matches and clear the draw"
                                }
                            >
                                <MdDeleteSweep /> Clear Full Draw
                            </button>
                        )}
                    </div>

                    {hasAnyMatchStarted && (
                        <div className="dm-tournament-started-notice">
                            <MdLock />
                            <span>
                                Tournament in progress ({startedMatchesCount} of {generatedMatches.length} matches started/completed). Format, draw regeneration, and clearing are locked to protect match records.
                            </span>
                        </div>
                    )}
                </div>

                {/* Fixtures List */}
                <div className="dm-fixtures-list">
                    {/* Tournament Finalists Setup Card */}
                    {canSetupFinalists && finalMatch && (
                        <div className={`dm-finalists-setup-card ${(!allNonFinalMatchesFinished || !isEditingEnabled) ? 'is-locked' : ''}`}>
                            <div className="dm-fsc-glow-layer" />

                            {!allNonFinalMatchesFinished ? (
                                <div className="dm-fsc-locked-banner">
                                    <MdLock />
                                    <span>
                                        <strong>Finalists Setup Locked:</strong> All matches prior to the Championship Final must finish first ({completedNonFinalMatches.length} of {nonFinalMatches.length} matches completed).
                                    </span>
                                </div>
                            ) : !isEditingEnabled ? (
                                <div className="dm-fsc-locked-banner">
                                    <MdLock />
                                    <span>
                                        <strong>Draw Editing Locked:</strong> Click &apos;Enable Editing&apos; in the header above to configure or confirm tournament finalists.
                                    </span>
                                </div>
                            ) : null}

                            <div className="dm-fsc-header">
                                <div className="dm-fsc-header-left">
                                    <div className="dm-fsc-trophy-badge">
                                        <MdEmojiEvents />
                                    </div>
                                    <div>
                                        <div className="dm-fsc-title-row">
                                            <h3 className="dm-fsc-title">Tournament Finalists Setup</h3>
                                            <span className={`dm-fsc-stage-pill ${allNonFinalMatchesFinished ? 'all-done' : 'sf-pending'}`}>
                                                {allNonFinalMatchesFinished
                                                    ? 'All Previous Matches Completed'
                                                    : `Waiting on Matches (${completedNonFinalMatches.length}/${nonFinalMatches.length})`}
                                            </span>
                                        </div>
                                        <p className="dm-fsc-subtitle">
                                            Confirm or assign <strong>Winner SF1</strong> and <strong>Winner SF2</strong> for the Grand Final ({finalMatch.title}).
                                        </p>
                                    </div>
                                </div>
                                {(detectedSF1Winner || detectedSF2Winner) && (
                                    <button
                                        type="button"
                                        className="dm-fsc-autofill-btn"
                                        disabled={!allNonFinalMatchesFinished || !isEditingEnabled || isFinalStartedOrDone}
                                        onClick={handleAutoFillDetectedWinners}
                                        title={
                                            !allNonFinalMatchesFinished
                                                ? `Finalists locked until all matches finish (${completedNonFinalMatches.length}/${nonFinalMatches.length})`
                                                : !isEditingEnabled
                                                    ? "Click 'Enable Editing' in the header to auto-fill finalists"
                                                    : "Fill dropdowns with detected Semi-Final winners"
                                        }
                                    >
                                        <MdAutoAwesome /> Auto-Fill SF Winners
                                    </button>
                                )}
                            </div>

                            <div className="dm-fsc-grid">
                                {/* Finalist 1 Box */}
                                <div className="dm-fsc-panel">
                                    <div className="dm-fsc-panel-header">
                                        <span className="dm-fsc-slot-badge">Finalist 1</span>
                                        <span className="dm-fsc-source-tag">Winner Semi-Final 1</span>
                                    </div>
                                    <div className="dm-fsc-sf-match-status">
                                        {sf1Match ? (
                                            <div className="dm-fsc-match-summary">
                                                <span className="dm-fsc-sf-name">{sf1Match.title}: {sf1Match.teams || `${sf1Match.team1} vs ${sf1Match.team2}`}</span>
                                                <span className={`dm-fsc-sf-result ${isMatchFinished(sf1Match) ? 'finished' : 'pending'}`}>
                                                    {isMatchFinished(sf1Match) ? (sf1Match.result || 'Finished') : 'Match in progress / scheduled'}
                                                </span>
                                                {detectedSF1Winner && (
                                                    <div className="dm-fsc-detected-chip">
                                                        <MdCheckCircle /> Detected Winner: <strong>{detectedSF1Winner}</strong>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="dm-fsc-match-summary">
                                                <span className="dm-fsc-sf-name">Semi-Final 1</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="dm-fsc-select-wrap">
                                        <label htmlFor="finalist-1-select" className="dm-fsc-label">Finalist 1:</label>
                                        <select
                                            id="finalist-1-select"
                                            className="dm-finalist-select"
                                            value={selectedFinalist1}
                                            disabled={!allNonFinalMatchesFinished || !isEditingEnabled || isFinalStartedOrDone}
                                            onChange={(e) => setSelectedFinalist1(e.target.value)}
                                            title={
                                                !allNonFinalMatchesFinished
                                                    ? `Finalists locked until all matches finish (${completedNonFinalMatches.length}/${nonFinalMatches.length})`
                                                    : !isEditingEnabled
                                                        ? "Click 'Enable Editing' in the header to select finalists"
                                                        : "Select Finalist 1"
                                            }
                                        >
                                            <option value="">— Finalist 1 —</option>
                                            {availableTeamKeys.map(k => (
                                                <option key={k} value={k} disabled={k === selectedFinalist2}>{k}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="dm-fsc-vs-divider">
                                    <div className="dm-fsc-vs-line" />
                                    <span className="dm-fsc-vs-text">VS</span>
                                    <div className="dm-fsc-vs-line" />
                                </div>

                                {/* Finalist 2 Box */}
                                <div className="dm-fsc-panel">
                                    <div className="dm-fsc-panel-header">
                                        <span className="dm-fsc-slot-badge">Finalist 2</span>
                                        <span className="dm-fsc-source-tag">Winner Semi-Final 2</span>
                                    </div>
                                    <div className="dm-fsc-sf-match-status">
                                        {sf2Match ? (
                                            <div className="dm-fsc-match-summary">
                                                <span className="dm-fsc-sf-name">{sf2Match.title}: {sf2Match.teams || `${sf2Match.team1} vs ${sf2Match.team2}`}</span>
                                                <span className={`dm-fsc-sf-result ${isMatchFinished(sf2Match) ? 'finished' : 'pending'}`}>
                                                    {isMatchFinished(sf2Match) ? (sf2Match.result || 'Finished') : 'Match in progress / scheduled'}
                                                </span>
                                                {detectedSF2Winner && (
                                                    <div className="dm-fsc-detected-chip">
                                                        <MdCheckCircle /> Detected Winner: <strong>{detectedSF2Winner}</strong>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="dm-fsc-match-summary">
                                                <span className="dm-fsc-sf-name">Semi-Final 2</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="dm-fsc-select-wrap">
                                        <label htmlFor="finalist-2-select" className="dm-fsc-label">Finalist 2:</label>
                                        <select
                                            id="finalist-2-select"
                                            className="dm-finalist-select"
                                            value={selectedFinalist2}
                                            disabled={!allNonFinalMatchesFinished || !isEditingEnabled || isFinalStartedOrDone}
                                            onChange={(e) => setSelectedFinalist2(e.target.value)}
                                            title={
                                                !allNonFinalMatchesFinished
                                                    ? `Finalists locked until all matches finish (${completedNonFinalMatches.length}/${nonFinalMatches.length})`
                                                    : !isEditingEnabled
                                                        ? "Click 'Enable Editing' in the header to select finalists"
                                                        : "Select Finalist 2"
                                            }
                                        >
                                            <option value="">— Finalist 2 —</option>
                                            {availableTeamKeys.map(k => (
                                                <option key={k} value={k} disabled={k === selectedFinalist1}>{k}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="dm-fsc-footer">
                                <div className="dm-fsc-preview">
                                    Grand Final Fixture: <strong>{selectedFinalist1 || 'Winner SF1'}</strong> vs <strong>{selectedFinalist2 || 'Winner SF2'}</strong>
                                </div>
                                <button
                                    type="button"
                                    className="dm-fsc-confirm-btn"
                                    disabled={!allNonFinalMatchesFinished || !isEditingEnabled || !selectedFinalist1 || !selectedFinalist2 || selectedFinalist1 === selectedFinalist2 || isSavingFinalists || isFinalStartedOrDone}
                                    onClick={() => handleSaveFinalists(selectedFinalist1, selectedFinalist2)}
                                    title={
                                        !allNonFinalMatchesFinished
                                            ? `Locked: all matches prior to the Final must be completed first (${completedNonFinalMatches.length}/${nonFinalMatches.length})`
                                            : !isEditingEnabled
                                                ? "Click 'Enable Editing' in the header to confirm finalists"
                                                : "Confirm and lock finalists"
                                    }
                                >
                                    {isSavingFinalists ? (
                                        <span>Saving Finalists...</span>
                                    ) : (
                                        <>
                                            <MdCheck /> Confirm &amp; Lock Finalists
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="dm-section-header">
                        <div>
                            <h2 className="dm-section-title">
                                Generated Fixtures ({generatedMatches.length})
                            </h2>
                        </div>
                        {generatedMatches.length > 0 && (
                            <span className="dm-drag-hint">
                                <MdSwapHoriz /> Drag and drop individual team badges to shift pairings
                            </span>
                        )}
                    </div>

                    {generatedMatches.length === 0 ? (
                        <div className="dm-empty-card">
                            <MdCalendarToday className="dm-empty-icon" />
                            <h3>No Fixtures Generated Yet</h3>
                            <p>Select your tournament format and click "Generate Draw", or manually add custom matches above.</p>
                        </div>
                    ) : (
                        <div className="dm-matches-grid">
                            {(() => {
                                const isAnyMatchLive = Boolean(liveData?.isLive);
                                const currentLiveTitle = (liveData?.currentMatchPath
                                    ? liveData.currentMatchPath.split('/').pop()
                                    : liveData?.liveScore?.matchTitle || '').trim();

                                return generatedMatches.map((match, index) => {
                                    const [t1 = match.team1 || 'Team 1', t2 = match.team2 || 'Team 2'] = (match.teams || '').split(' vs ');
                                    const isScheduled = Boolean(match.date && match.time);
                                    const isCompleted = isMatchFinished(match);
                                    const isThisMatchLive = !isCompleted && isAnyMatchLive && currentLiveTitle && (
                                        (match.title && match.title.trim().toLowerCase() === currentLiveTitle.toLowerCase()) ||
                                        (match.id && String(match.id).trim().toLowerCase() === currentLiveTitle.toLowerCase())
                                    );
                                    const isBlockedByOtherLive = !isCompleted && isAnyMatchLive && !isThisMatchLive;
                                    const isMatchStartedOrLive = isCompleted || isThisMatchLive;
                                    const isLocked = isMatchLocked(match) || isMatchStartedOrLive;
                                    const isSlotDraggable = isEditingEnabled && !isLocked && !isMatchStartedOrLive;

                                    return (
                                        <div key={match.id} className="dm-match-card-wrapper">
                                            <TiltCard className={`dm-match-card ${!isScheduled ? 'is-unscheduled' : ''} ${isThisMatchLive ? 'is-live-match-card' : ''} ${isCompleted ? 'is-completed-match-card' : ''}`} maxTilt={5}>
                                                <div className="dmm-header">
                                                    <div className="dmm-header-left">
                                                        <span className="dmm-badge">{match.title}</span>
                                                        {isCompleted ? (
                                                            <span className="dmm-completed-indicator" title={match.result || 'Match Completed'}>
                                                                <MdCheckCircle /> COMPLETED
                                                            </span>
                                                        ) : isThisMatchLive ? (
                                                            <span className="dmm-live-indicator">
                                                                <span className="dm-live-dot" /> LIVE NOW
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="dmm-header-right">
                                                        {isScheduled ? (
                                                            <span className="dmm-date scheduled" title="Scheduled match timing">
                                                                <MdEventAvailable /> {match.date} • {formatDisplayTime(match.time)}
                                                            </span>
                                                        ) : (
                                                            <span className="dmm-date unscheduled" title="Date and time not set">
                                                                <MdWarningAmber /> Date & Time Not Set
                                                            </span>
                                                        )}
                                                        <button
                                                            className={`dmm-delete-btn ${!isEditingEnabled || isMatchStartedOrLive ? 'disabled' : ''}`}
                                                            onClick={() => handleDeleteMatch(match)}
                                                            disabled={!isEditingEnabled || isMatchStartedOrLive}
                                                            title={
                                                                !isEditingEnabled
                                                                    ? "Click 'Enable Editing' in the header to delete matches"
                                                                    : isCompleted
                                                                        ? "Completed matches cannot be deleted"
                                                                        : isThisMatchLive
                                                                            ? "Live match cannot be deleted"
                                                                            : "Delete this match box"
                                                            }
                                                        >
                                                            <MdDelete />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Interactive Matchup Arena with Draggable Team Badges */}
                                                <div className="dmm-matchup-arena">
                                                    {/* Determine if this locked match allows team selection (not started/live) */}
                                                    {(() => {
                                                        const isFinalMatch = (match.title || '').toLowerCase().includes('final') && !(match.title || '').toLowerCase().includes('semi');
                                                        const isPlaceholderMatch = (match.teams || '').toLowerCase().includes('winner') || (match.team1 || '').toLowerCase().includes('winner sf');
                                                        const isTypeLockedButSelectable = (isFinalMatch || isPlaceholderMatch || isMatchLocked(match)) && !isMatchStartedOrLive;

                                                        if (isTypeLockedButSelectable) {
                                                            const isFinalsSetupDisabled = isFinalMatch ? (!allNonFinalMatchesFinished || !isEditingEnabled) : !isEditingEnabled;
                                                            // Show team selector dropdowns for Final/Semi-Final cards
                                                            return (
                                                                <>
                                                                    <div className={`dmm-team-slot is-final-select ${isFinalsSetupDisabled ? 'is-disabled' : ''}`}>
                                                                        <select
                                                                            className="dmm-final-team-select"
                                                                            value={match.team1 || ''}
                                                                            disabled={isFinalsSetupDisabled || isMatchStartedOrLive}
                                                                            onChange={e => handleFinalTeamSelect(match.id, 'team1', e.target.value)}
                                                                            title={
                                                                                isFinalMatch && !allNonFinalMatchesFinished
                                                                                    ? `All previous matches must finish first (${completedNonFinalMatches.length}/${nonFinalMatches.length})`
                                                                                    : !isEditingEnabled
                                                                                        ? "Click 'Enable Editing' to select team"
                                                                                        : "Select Team 1 for this match"
                                                                            }
                                                                        >
                                                                            <option value="">— Select Team 1 —</option>
                                                                            {availableTeamKeys.map(k => (
                                                                                <option key={k} value={k} disabled={k === match.team2}>{k}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>

                                                                    <div className="dmm-vs-divider">
                                                                        <span className="dmm-vs-text">VS</span>
                                                                    </div>

                                                                    <div className={`dmm-team-slot is-final-select ${isFinalsSetupDisabled ? 'is-disabled' : ''}`}>
                                                                        <select
                                                                            className="dmm-final-team-select"
                                                                            value={match.team2 || ''}
                                                                            disabled={isFinalsSetupDisabled || isMatchStartedOrLive}
                                                                            onChange={e => handleFinalTeamSelect(match.id, 'team2', e.target.value)}
                                                                            title={
                                                                                isFinalMatch && !allNonFinalMatchesFinished
                                                                                    ? `All previous matches must finish first (${completedNonFinalMatches.length}/${nonFinalMatches.length})`
                                                                                    : !isEditingEnabled
                                                                                        ? "Click 'Enable Editing' to select team"
                                                                                        : "Select Team 2 for this match"
                                                                            }
                                                                        >
                                                                            <option value="">— Select Team 2 —</option>
                                                                            {availableTeamKeys.map(k => (
                                                                                <option key={k} value={k} disabled={k === match.team1}>{k}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </>
                                                            );
                                                        }

                                                        // Default: draggable or locked slots (started/live/published-locked)
                                                        return (
                                                            <>
                                                                <div
                                                                    className={`dmm-team-slot ${!isSlotDraggable ? (isMatchStartedOrLive ? 'is-match-started-locked' : 'is-locked') : !isEditingEnabled ? 'is-published-locked' : 'is-draggable'} ${dragOverTeamInfo?.matchId === match.id && dragOverTeamInfo?.slot === 'team1' ? 'is-team-drag-over' : ''} ${draggedTeamInfo?.matchId === match.id && draggedTeamInfo?.slot === 'team1' ? 'is-team-dragging' : ''}`}
                                                                    draggable={isSlotDraggable}
                                                                    onDragStart={(e) => handleTeamDragStart(e, match, 'team1')}
                                                                    onDragOver={(e) => handleTeamDragOver(e, match, 'team1')}
                                                                    onDrop={(e) => handleTeamDrop(e, match, 'team1')}
                                                                    onDragEnd={handleTeamDragEnd}
                                                                    title={
                                                                        isCompleted
                                                                            ? "Match is completed. Teams are locked."
                                                                            : isThisMatchLive
                                                                                ? "Match is currently LIVE. Teams are locked."
                                                                                : !isEditingEnabled
                                                                                    ? "Editing is locked. Click 'Enable Editing' to shift teams"
                                                                                    : isMatchLocked(match)
                                                                                        ? "Semi-Finals & Finals team slots are fixed"
                                                                                        : "Drag team to shift/swap with another match"
                                                                    }
                                                                >
                                                                    {!isSlotDraggable ? (
                                                                        <span className="team-lock-badge"><MdLock /></span>
                                                                    ) : (
                                                                        <span className="team-drag-grip"><MdDragIndicator /></span>
                                                                    )}
                                                                    <span className="team-slot-name">{t1}</span>
                                                                </div>

                                                                <div className="dmm-vs-divider">
                                                                    <span className="dmm-vs-text">VS</span>
                                                                    {!isLocked && isEditingEnabled && <MdSwapHoriz className="dmm-swap-hint-icon" />}
                                                                </div>

                                                                <div
                                                                    className={`dmm-team-slot ${!isSlotDraggable ? (isMatchStartedOrLive ? 'is-match-started-locked' : 'is-locked') : !isEditingEnabled ? 'is-published-locked' : 'is-draggable'} ${dragOverTeamInfo?.matchId === match.id && dragOverTeamInfo?.slot === 'team2' ? 'is-team-drag-over' : ''} ${draggedTeamInfo?.matchId === match.id && draggedTeamInfo?.slot === 'team2' ? 'is-team-dragging' : ''}`}
                                                                    draggable={isSlotDraggable}
                                                                    onDragStart={(e) => handleTeamDragStart(e, match, 'team2')}
                                                                    onDragOver={(e) => handleTeamDragOver(e, match, 'team2')}
                                                                    onDrop={(e) => handleTeamDrop(e, match, 'team2')}
                                                                    onDragEnd={handleTeamDragEnd}
                                                                    title={
                                                                        isCompleted
                                                                            ? "Match is completed. Teams are locked."
                                                                            : isThisMatchLive
                                                                                ? "Match is currently LIVE. Teams are locked."
                                                                                : !isEditingEnabled
                                                                                    ? "Editing is locked. Click 'Enable Editing' to shift teams"
                                                                                    : isMatchLocked(match)
                                                                                        ? "Semi-Finals & Finals team slots are fixed"
                                                                                        : "Drag team to shift/swap with another match"
                                                                    }
                                                                >
                                                                    {!isSlotDraggable ? (
                                                                        <span className="team-lock-badge"><MdLock /></span>
                                                                    ) : (
                                                                        <span className="team-drag-grip"><MdDragIndicator /></span>
                                                                    )}
                                                                    <span className="team-slot-name">{t2}</span>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>

                                                {isCompleted && (match.result || match.score) && (
                                                    <div className="dmm-result-banner" title={match.score || ''}>
                                                        {match.result || match.score}
                                                    </div>
                                                )}

                                                <div className="dmm-venue">
                                                    <MdLocationOn /> {match.venue || 'Faculty Cricket Grounds'}
                                                </div>

                                                <div className="dmm-footer">
                                                    <button
                                                        className={`dmm-edit-btn ${!isEditingEnabled || isMatchStartedOrLive ? 'disabled' : ''} ${!isScheduled && !isMatchStartedOrLive && isEditingEnabled ? 'highlight-schedule-btn' : ''}`}
                                                        disabled={!isEditingEnabled || isMatchStartedOrLive}
                                                        onClick={() => {
                                                            if (!isEditingEnabled) {
                                                                toastRef.current.showToast('warning', "Click 'Enable Editing' in the header to edit match schedule.");
                                                                return;
                                                            }
                                                            if (isMatchStartedOrLive) return;
                                                            setEditingMatch(match);
                                                            setModalDate(normalizeDateForInput(match.date));
                                                            setModalTime(normalizeTimeForInput(match.time));
                                                            setModalVenue(match.venue || 'Faculty Cricket Grounds');
                                                            setModalUmpire1(match.umpire1 || 'Mr. S. Ketheeswaran');
                                                            setModalUmpire2(match.umpire2 || 'Mr. N. Ramanan');
                                                        }}
                                                        title={
                                                            !isEditingEnabled
                                                                ? "Click 'Enable Editing' in the header to set or change match schedule"
                                                                : isCompleted
                                                                    ? "Completed match schedule is locked and cannot be edited"
                                                                    : isThisMatchLive
                                                                        ? "Live match schedule is locked and cannot be edited"
                                                                        : isScheduled
                                                                            ? 'Reschedule'
                                                                            : 'Set Date & Time'
                                                        }
                                                    >
                                                        <MdCalendarToday /> {isCompleted ? 'Match Concluded' : isThisMatchLive ? 'Live In Progress' : isScheduled ? 'Reschedule' : 'Set Date & Time'}
                                                    </button>
                                                    {isCompleted ? (
                                                        <button
                                                            className="dmm-score-btn completed"
                                                            onClick={() => navigate(`/admin/scoring?match=${match.title}`)}
                                                            title={match.result ? `Completed: ${match.result}` : 'Match Completed'}
                                                        >
                                                            <MdCheckCircle /> Completed
                                                        </button>
                                                    ) : isBlockedByOtherLive ? (
                                                        <button
                                                            className="dmm-score-btn blocked"
                                                            onClick={() => setLiveMatchBlockedModal({
                                                                attemptingMatch: match.title,
                                                                currentLiveTitle: currentLiveTitle || 'Active Live Match'
                                                            })}
                                                            title={`Cannot start: Match "${currentLiveTitle}" is currently LIVE`}
                                                        >
                                                            <MdLock /> Locked (Match Live)
                                                        </button>
                                                    ) : isThisMatchLive ? (
                                                        <button
                                                            className="dmm-score-btn live"
                                                            onClick={() => navigate(`/admin/scoring?match=${match.title}`)}
                                                        >
                                                            <MdPlayArrow /> Resume Live Scoring
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="dmm-score-btn"
                                                            onClick={() => navigate(`/admin/scoring?match=${match.title}`)}
                                                        >
                                                            <MdPlayArrow /> Score Match
                                                        </button>
                                                    )}
                                                </div>
                                            </TiltCard>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {/* Schedule Edit Modal */}
            {editingMatch && (
                <div className="dm-modal-overlay" onClick={() => setEditingMatch(null)}>
                    <div className="dm-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="dm-modal-header">
                            <div>
                                <span className="dm-modal-badge">EDIT SCHEDULE</span>
                                <h3>Schedule {editingMatch.title}</h3>
                                <p className="dm-modal-sub">{editingMatch.teams}</p>
                            </div>
                            <button className="dm-modal-close" onClick={() => setEditingMatch(null)}>
                                <MdClose />
                            </button>
                        </div>

                        <div className="dm-modal-fields">
                            <div className="dm-form-row">
                                <div className="dm-form-group">
                                    <label><MdCalendarToday /> Match Date</label>
                                    <input
                                        type="date"
                                        className="dm-input"
                                        value={modalDate}
                                        onChange={(e) => setModalDate(e.target.value)}
                                    />
                                </div>
                                <div className="dm-form-group">
                                    <label><MdTimer /> Match Time</label>
                                    <input
                                        type="time"
                                        className="dm-input"
                                        value={modalTime}
                                        onChange={(e) => setModalTime(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="dm-form-group">
                                <label><MdLocationOn /> Venue Ground</label>
                                <input
                                    type="text"
                                    className="dm-input"
                                    value={modalVenue}
                                    onChange={(e) => setModalVenue(e.target.value)}
                                    placeholder="Ground name"
                                />
                            </div>
                            <div className="dm-form-row">
                                <div className="dm-form-group">
                                    <label>Umpire 1</label>
                                    <input
                                        type="text"
                                        className="dm-input"
                                        value={modalUmpire1}
                                        onChange={(e) => setModalUmpire1(e.target.value)}
                                    />
                                </div>
                                <div className="dm-form-group">
                                    <label>Umpire 2</label>
                                    <input
                                        type="text"
                                        className="dm-input"
                                        value={modalUmpire2}
                                        onChange={(e) => setModalUmpire2(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="dm-modal-actions">
                            <button className="cx-btn-secondary" onClick={() => setEditingMatch(null)}>
                                Cancel
                            </button>
                            <button className="cx-btn-confirm primary" onClick={handleSaveMatchSchedule}>
                                <MdCheck /> Save Schedule
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Match Modal */}
            {customModalOpen && (
                <div className="dm-modal-overlay" onClick={() => setCustomModalOpen(false)}>
                    <div className="dm-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="dm-modal-header">
                            <div>
                                <span className="dm-modal-badge">CUSTOM DRAW</span>
                                <h3>Add Custom Match</h3>
                                <p className="dm-modal-sub">Create an exhibition, playoff, or custom matchup</p>
                            </div>
                            <button className="dm-modal-close" onClick={() => setCustomModalOpen(false)}>
                                <MdClose />
                            </button>
                        </div>

                        <form onSubmit={handleAddCustomMatch}>
                            <div className="dm-modal-fields">
                                <div className="dm-form-group">
                                    <label>Match Stage / Title</label>
                                    <input
                                        type="text"
                                        className="dm-input"
                                        value={customTitle}
                                        onChange={(e) => setCustomTitle(e.target.value)}
                                        placeholder="e.g. Qualifier 1, Semi-Final 3, Exhibition"
                                        required
                                    />
                                </div>

                                <div className="dm-form-row">
                                    <div className="dm-form-group">
                                        <label>Team 1</label>
                                        <input
                                            type="text"
                                            className="dm-input"
                                            value={customTeam1}
                                            onChange={(e) => setCustomTeam1(e.target.value)}
                                            placeholder="e.g. E21 or Staff XI"
                                            list="custom-teams-list"
                                            required
                                        />
                                    </div>
                                    <div className="dm-form-group">
                                        <label>Team 2</label>
                                        <input
                                            type="text"
                                            className="dm-input"
                                            value={customTeam2}
                                            onChange={(e) => setCustomTeam2(e.target.value)}
                                            placeholder="e.g. E22 or Alumni XI"
                                            list="custom-teams-list"
                                            required
                                        />
                                    </div>
                                </div>
                                <datalist id="custom-teams-list">
                                    {availableTeamKeys.map(k => (
                                        <option key={k} value={k} />
                                    ))}
                                </datalist>

                                <div className="dm-form-row">
                                    <div className="dm-form-group">
                                        <label><MdCalendarToday /> Date</label>
                                        <input
                                            type="date"
                                            className="dm-input"
                                            value={customDate}
                                            onChange={(e) => setCustomDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="dm-form-group">
                                        <label><MdTimer /> Time</label>
                                        <input
                                            type="time"
                                            className="dm-input"
                                            value={customTime}
                                            onChange={(e) => setCustomTime(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="dm-form-group">
                                    <label><MdLocationOn /> Venue Ground</label>
                                    <input
                                        type="text"
                                        className="dm-input"
                                        value={customVenue}
                                        onChange={(e) => setCustomVenue(e.target.value)}
                                        placeholder="Faculty Cricket Grounds"
                                    />
                                </div>
                            </div>

                            <div className="dm-modal-actions">
                                <button type="button" className="cx-btn-secondary" onClick={() => setCustomModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="cx-btn-confirm primary">
                                    <MdAdd /> Add Fixture
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Unscheduled Fixtures Warning Modal */}
            <ConfirmationModal
                isOpen={unscheduledWarningOpen}
                title="Fixtures Not Scheduled Yet"
                message={`Cannot publish: ${unscheduledMatchesCount} of ${generatedMatches.length} match(es) do not have a date and time set. All matches must be scheduled before publishing the tournament draw to website users.`}
                detail="Tip: You can click 'Save Draft' to save your progress in the database for future edits without showing unfinished fixtures to public users."
                confirmText="Save Draft for Now"
                cancelText="Back to Scheduling"
                type="warning"
                onConfirm={() => {
                    setUnscheduledWarningOpen(false);
                    handleSaveDraft();
                }}
                onCancel={() => setUnscheduledWarningOpen(false)}
            />

            {/* Publish Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmPublishOpen}
                title="Publish Tournament Draw to Website"
                message={`All ${generatedMatches.length} matches are scheduled! Publishing will make this draw immediately visible to public users across the website and initialize live scoring engines.`}
                detail="Draw status will switch from Draft to Published Live."
                confirmText="Publish Live"
                type="primary"
                onConfirm={handlePublishDraw}
                onCancel={() => setConfirmPublishOpen(false)}
            />

            {/* Delete Fixture Box Confirmation Modal */}
            <ConfirmationModal
                isOpen={Boolean(matchToDelete)}
                title="Delete Fixture Box?"
                message={`Are you sure you want to delete "${matchToDelete?.title}" (${matchToDelete?.teams || `${matchToDelete?.team1} vs ${matchToDelete?.team2}`}) from the draw?`}
                detail="This fixture box will be removed from the current draw. You can add it back manually using '+ Add Custom Match' before saving or publishing."
                confirmText="Delete Fixture"
                cancelText="Cancel"
                type="danger"
                onConfirm={handleConfirmDeleteMatch}
                onCancel={() => setMatchToDelete(null)}
            />

            {/* Clear Full Draw Confirmation Modal */}
            <ConfirmationModal
                isOpen={clearDrawConfirmOpen}
                title="Clear Full Tournament Draw?"
                message={`Are you sure you want to clear the full tournament draw? All ${generatedMatches.length} generated matches and scheduled pairings will be removed.`}
                detail="This will reset the fixtures draw back to empty and mark the draw status as Unpublished. You can generate a new draw or add matches anytime."
                confirmText="Clear Full Draw"
                cancelText="Keep Draw"
                type="danger"
                onConfirm={handleConfirmClearDraw}
                onCancel={() => setClearDrawConfirmOpen(false)}
            />

            {/* Live Match Blocked Alert Modal */}
            <ConfirmationModal
                isOpen={Boolean(liveMatchBlockedModal)}
                title="Match Start Locked"
                message={`Match "${liveMatchBlockedModal?.currentLiveTitle}" is currently LIVE in this tournament! Only one match can be scored at a time. Please conclude or stop scoring the active live match before starting "${liveMatchBlockedModal?.attemptingMatch}".`}
                detail="Matches cannot start when another match is live. You can navigate to the active match to conclude it or update live scores."
                confirmText="Go to Active Live Match"
                cancelText="Dismiss"
                type="danger"
                onConfirm={() => {
                    const liveTarget = liveMatchBlockedModal?.currentLiveTitle;
                    setLiveMatchBlockedModal(null);
                    if (liveTarget) {
                        navigate(`/admin/scoring?match=${liveTarget}`);
                    }
                }}
                onCancel={() => setLiveMatchBlockedModal(null)}
            />

            <Footer />
        </div>
    );
};

export default DrawManagement;
