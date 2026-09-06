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
    setMatchData
} from '../../../services/rtdbService';
import {
    MdCalendarToday,
    MdLocationOn,
    MdPlayArrow,
    MdCheck,
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
    MdEdit
} from 'react-icons/md';
import AdminSubNav from '../../../components/Navigation/AdminSubNav';
import { useAdminTournament } from '../../../contexts/AdminTournamentContext';
import './DrawManagement.css';

const DEFAULT_TEAMS = ['E21', 'E22', 'E23', 'E24'];

const DrawManagement = () => {
    const navigate = useNavigate();
    const toastRef = useRef();
    const { selectedTournamentId } = useAdminTournament();

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
        const unsubFix = subscribeFixtures((data) => {
            if (data?.isFixtures !== undefined) {
                const status = Number(data.isFixtures);
                setFixturesStatus(status);
                // If draft (0), editing is naturally enabled; if published (1), lock until explicitly enabled
                if (status === 0) {
                    setIsEditingEnabled(true);
                }
            }
            if (data?.finishedMatches) {
                // Initialize matches list with team1 and team2
                const list = Object.values(data.finishedMatches).map(m => {
                    const [t1 = '', t2 = ''] = (m.teams || '').split(' vs ');
                    return {
                        ...m,
                        team1: m.team1 || t1,
                        team2: m.team2 || t2,
                        date: m.date || '',
                        time: m.time || ''
                    };
                });
                setGeneratedMatches(list);
            } else {
                setGeneratedMatches([]);
            }
        }, selectedTournamentId);

        return () => {
            unsubTeams();
            unsubFix();
        };
    }, [selectedTournamentId]);

    const availableTeamKeys = Object.keys(teamsData).length > 0 ? Object.keys(teamsData) : DEFAULT_TEAMS;
    const isPublishedAndLocked = fixturesStatus === 1 && !isEditingEnabled;

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
        if (isPublishedAndLocked) {
            toastRef.current.showToast('warning', "Draw is published. Click 'Enable Editing' to re-generate fixtures.");
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

    // Helper: Semi-finals and Finals cannot shift
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

    // Team Drag & Drop Handlers (Shifting individual teams across matches)
    const handleTeamDragStart = (e, match, slot) => {
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
        if (isMatchLocked(targetMatch)) {
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

        if (!draggedTeamInfo) {
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
        if (isPublishedAndLocked) {
            toastRef.current.showToast('warning', "Draw is published. Click 'Enable Editing' to delete matches.");
            return;
        }
        setMatchToDelete(match);
    };

    // Confirmed deletion of fixture box
    const handleConfirmDeleteMatch = () => {
        if (!matchToDelete) return;
        setGeneratedMatches(prev => prev.filter(m => m.id !== matchToDelete.id));
        setFixturesStatus(0);
        setIsEditingEnabled(true);
        toastRef.current.showToast('info', `Fixture "${matchToDelete.title}" removed from draw.`);
        setMatchToDelete(null);
    };

    // Confirmed clearing of entire draw
    const handleConfirmClearDraw = async () => {
        setGeneratedMatches([]);
        setFixturesStatus(0);
        setIsEditingEnabled(true);
        setClearDrawConfirmOpen(false);
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
    };

    const handleSaveMatchSchedule = () => {
        if (!editingMatch) return;
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
        setFixturesStatus(0);
        setEditingMatch(null);
        toastRef.current.showToast('success', `Updated schedule for ${editingMatch.title}`);
    };

    // Save Draft (Saved to Firebase for future admin edits, NOT published to public users)
    const handleSaveDraft = async () => {
        if (generatedMatches.length === 0) {
            toastRef.current.showToast('error', 'No fixtures to save. Generate or add matches first.');
            return;
        }
        try {
            const finishedMatchesMap = {};
            generatedMatches.forEach(m => {
                const [t1 = '', t2 = ''] = (m.teams || '').split(' vs ');
                finishedMatchesMap[m.id] = {
                    id: m.id,
                    title: m.title,
                    teams: m.teams,
                    team1: m.team1 || t1,
                    team2: m.team2 || t2,
                    date: m.date || '',
                    time: m.time || '',
                    venue: m.venue || 'Faculty Cricket Grounds',
                    umpire1: m.umpire1 || '',
                    umpire2: m.umpire2 || '',
                    active: 1,
                    score: m.score || 'Scheduled',
                    result: m.result || 'Scheduled'
                };
            });

            await updateFixturesData({
                isFixtures: 0, // DRAFT: invisible to public users
                isDraft: true,
                finishedMatches: finishedMatchesMap,
                updatedAt: new Date().toISOString()
            }, selectedTournamentId);

            setFixturesStatus(0);
            setIsEditingEnabled(true);
            toastRef.current.showToast('success', 'Fixtures saved as Draft! Saved for future admin edits (not published to public users).');
        } catch (error) {
            console.error('Save draft error:', error);
            toastRef.current.showToast('error', 'Failed to save draft.');
        }
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

    // Publish Draw (makes visible to live website users & initializes scoring nodes)
    const handlePublishDraw = async () => {
        try {
            const finishedMatchesMap = {};
            generatedMatches.forEach(m => {
                const [t1 = '', t2 = ''] = (m.teams || '').split(' vs ');
                finishedMatchesMap[m.id] = {
                    id: m.id,
                    title: m.title,
                    teams: m.teams,
                    team1: m.team1 || t1,
                    team2: m.team2 || t2,
                    date: m.date || '',
                    time: m.time || '',
                    venue: m.venue || 'Faculty Cricket Grounds',
                    umpire1: m.umpire1 || '',
                    umpire2: m.umpire2 || '',
                    active: 1,
                    score: m.score || 'Scheduled',
                    result: m.result || 'Scheduled'
                };
            });

            await updateFixturesData({
                isFixtures: 1, // Live to public users!
                isDraft: false,
                finishedMatches: finishedMatchesMap,
                publishedAt: new Date().toISOString()
            }, selectedTournamentId);

            // Ensure root match node initialized for each fixture in RTDB
            for (const m of generatedMatches) {
                const clean = m.title.replace(/^\//, '');
                const [t1 = 'Team 1', t2 = 'Team 2'] = m.teams.split(' vs ');
                await setMatchData(clean, {
                    common: {
                        date: m.date || '',
                        finished: 0,
                        firstBat: 1,
                        firstBattingTeam: t1,
                        mom: '',
                        overLimit: 15,
                        result: '',
                        status: 'Match Scheduled',
                        teams: m.teams,
                        time: m.time || '',
                        venue: m.venue || 'Faculty Cricket Grounds',
                        title: clean
                    },
                    team1: { name: t1, overs: 0, totalBalls: 0, totalRuns: 0, totalWickets: 0, totalExtraAmount: 0 },
                    team2: { name: t2, overs: 0, totalBalls: 0, totalRuns: 0, totalWickets: 0, totalExtraAmount: 0 }
                }, selectedTournamentId);
            }

            setFixturesStatus(1);
            setIsEditingEnabled(false);
            setConfirmPublishOpen(false);
            toastRef.current.showToast('success', 'Tournament draw published live! Now visible to all website users.');
        } catch (error) {
            console.error('Publish error:', error);
            toastRef.current.showToast('error', 'Failed to publish fixtures.');
        }
    };

    const unscheduledMatchesCount = generatedMatches.filter(m => !m.date || !m.time).length;

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

                        {fixturesStatus === 1 && !isEditingEnabled ? (
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
                            <button
                                type="button"
                                className="dm-save-draft-btn"
                                onClick={handleSaveDraft}
                                title="Save current matches and pairings for future admin edits (does not show to public users)"
                            >
                                <MdSave /> Save Draft
                            </button>
                        )}

                        <button
                            type="button"
                            className="cx-btn-primary dm-publish-btn"
                            onClick={handleRequestPublish}
                            title="Publish scheduled draw to make it visible to all users"
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
                            disabled={isPublishedAndLocked}
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
                            className={`dm-generate-btn ${isPublishedAndLocked ? 'disabled' : ''}`}
                            onClick={handleGenerateDraw}
                            disabled={isPublishedAndLocked}
                            title={isPublishedAndLocked ? "Draw is published. Click 'Enable Editing' to re-generate fixtures." : "Generate automated fixtures"}
                        >
                            <MdSettings /> Generate Draw
                        </button>
                        <button
                            className={`dm-add-custom-btn ${isPublishedAndLocked ? 'disabled' : ''}`}
                            onClick={() => setCustomModalOpen(true)}
                            disabled={isPublishedAndLocked}
                            title={isPublishedAndLocked ? "Draw is published. Click 'Enable Editing' to add custom matches." : "Manually add a match"}
                        >
                            <MdAdd /> Add Custom Match
                        </button>
                        {generatedMatches.length > 0 && (
                            <button
                                type="button"
                                className={`dm-clear-draw-btn ${isPublishedAndLocked ? 'disabled' : ''}`}
                                onClick={() => setClearDrawConfirmOpen(true)}
                                disabled={isPublishedAndLocked}
                                title={isPublishedAndLocked ? "Draw is published. Click 'Enable Editing' to clear the draw." : "Remove all generated matches and clear the draw"}
                            >
                                <MdDeleteSweep /> Clear Full Draw
                            </button>
                        )}
                    </div>
                </div>

                {/* Fixtures List */}
                <div className="dm-fixtures-list">
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
                            {generatedMatches.map((match, index) => {
                                const isLocked = isMatchLocked(match);
                                const [t1 = match.team1 || 'Team 1', t2 = match.team2 || 'Team 2'] = (match.teams || '').split(' vs ');
                                const isScheduled = Boolean(match.date && match.time);

                                return (
                                    <div key={match.id} className="dm-match-card-wrapper">
                                        <TiltCard className={`dm-match-card ${!isScheduled ? 'is-unscheduled' : ''}`} maxTilt={5}>
                                            <div className="dmm-header">
                                                <div className="dmm-header-left">
                                                    <span className="dmm-badge">{match.title}</span>
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
                                                        className={`dmm-delete-btn ${isPublishedAndLocked ? 'disabled' : ''}`}
                                                        onClick={() => handleDeleteMatch(match)}
                                                        disabled={isPublishedAndLocked}
                                                        title={isPublishedAndLocked ? "Draw is published. Click 'Enable Editing' to delete matches" : "Delete this match box"}
                                                    >
                                                        <MdDelete />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Interactive Matchup Arena with Draggable Team Badges */}
                                            <div className="dmm-matchup-arena">
                                                <div
                                                    className={`dmm-team-slot ${isLocked ? 'is-locked' : isPublishedAndLocked ? 'is-published-locked' : 'is-draggable'} ${dragOverTeamInfo?.matchId === match.id && dragOverTeamInfo?.slot === 'team1' ? 'is-team-drag-over' : ''} ${draggedTeamInfo?.matchId === match.id && draggedTeamInfo?.slot === 'team1' ? 'is-team-dragging' : ''}`}
                                                    draggable={!isLocked && !isPublishedAndLocked}
                                                    onDragStart={(e) => handleTeamDragStart(e, match, 'team1')}
                                                    onDragOver={(e) => handleTeamDragOver(e, match, 'team1')}
                                                    onDrop={(e) => handleTeamDrop(e, match, 'team1')}
                                                    onDragEnd={handleTeamDragEnd}
                                                    title={isPublishedAndLocked ? "Draw is published. Click 'Enable Editing' to shift teams" : isLocked ? "Semi-Finals & Finals team slots are fixed" : "Drag team to shift/swap with another match"}
                                                >
                                                    {!isLocked && !isPublishedAndLocked ? (
                                                        <span className="team-drag-grip"><MdDragIndicator /></span>
                                                    ) : (
                                                        <span className="team-lock-badge"><MdLock /></span>
                                                    )}
                                                    <span className="team-slot-name">{t1}</span>
                                                </div>

                                                <div className="dmm-vs-divider">
                                                    <span className="dmm-vs-text">VS</span>
                                                    {!isLocked && !isPublishedAndLocked && <MdSwapHoriz className="dmm-swap-hint-icon" />}
                                                </div>

                                                <div
                                                    className={`dmm-team-slot ${isLocked ? 'is-locked' : isPublishedAndLocked ? 'is-published-locked' : 'is-draggable'} ${dragOverTeamInfo?.matchId === match.id && dragOverTeamInfo?.slot === 'team2' ? 'is-team-drag-over' : ''} ${draggedTeamInfo?.matchId === match.id && draggedTeamInfo?.slot === 'team2' ? 'is-team-dragging' : ''}`}
                                                    draggable={!isLocked && !isPublishedAndLocked}
                                                    onDragStart={(e) => handleTeamDragStart(e, match, 'team2')}
                                                    onDragOver={(e) => handleTeamDragOver(e, match, 'team2')}
                                                    onDrop={(e) => handleTeamDrop(e, match, 'team2')}
                                                    onDragEnd={handleTeamDragEnd}
                                                    title={isPublishedAndLocked ? "Draw is published. Click 'Enable Editing' to shift teams" : isLocked ? "Semi-Finals & Finals team slots are fixed" : "Drag team to shift/swap with another match"}
                                                >
                                                    {!isLocked && !isPublishedAndLocked ? (
                                                        <span className="team-drag-grip"><MdDragIndicator /></span>
                                                    ) : (
                                                        <span className="team-lock-badge"><MdLock /></span>
                                                    )}
                                                    <span className="team-slot-name">{t2}</span>
                                                </div>
                                            </div>

                                            <div className="dmm-venue">
                                                <MdLocationOn /> {match.venue || 'Faculty Cricket Grounds'}
                                            </div>

                                            <div className="dmm-footer">
                                                <button
                                                    className={`dmm-edit-btn ${!isScheduled ? 'highlight-schedule-btn' : ''}`}
                                                    onClick={() => {
                                                        setEditingMatch(match);
                                                        setModalDate(normalizeDateForInput(match.date));
                                                        setModalTime(normalizeTimeForInput(match.time));
                                                        setModalVenue(match.venue || 'Faculty Cricket Grounds');
                                                        setModalUmpire1(match.umpire1 || 'Mr. S. Ketheeswaran');
                                                        setModalUmpire2(match.umpire2 || 'Mr. N. Ramanan');
                                                    }}
                                                >
                                                    <MdCalendarToday /> {isScheduled ? 'Reschedule' : 'Set Date & Time'}
                                                </button>
                                                <button
                                                    className="dmm-score-btn"
                                                    onClick={() => navigate(`/admin/scoring?match=${match.title}`)}
                                                >
                                                    <MdPlayArrow /> Score Match
                                                </button>
                                            </div>
                                        </TiltCard>
                                    </div>
                                );
                            })}
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

            <Footer />
        </div>
    );
};

export default DrawManagement;
