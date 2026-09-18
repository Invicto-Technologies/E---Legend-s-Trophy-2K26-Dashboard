import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Footer from '../../../components/common/Footer/Footer';
import {
    subscribeTournamentIndex,
    subscribeActiveTournament,
    subscribeFixtures,
    setActiveTournamentId,
    createTournament,
    updateTournamentInfo,
    deleteTournament,
    getTournamentEdition,
    updateLiveData
} from '../../../services/rtdbService';
import {
    MdEmojiEvents,
    MdEdit,
    MdDelete,
    MdCalendarToday,
    MdLocationOn,
    MdVisibility,
    MdCheckCircle,
    MdClose,
    MdTimer,
    MdOpenInNew,
    MdBolt,
    MdSave,
    MdLock,
    MdInfo,
    MdWorkspacePremium,
    MdMilitaryTech
} from 'react-icons/md';
import AdminSubNav from '../../../components/Navigation/AdminSubNav';
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import PageLoader from '../../../components/common/PageLoader/PageLoader';
import { useAdminTournament } from '../../../contexts/AdminTournamentContext';
import { useAdminProcessing } from '../../../contexts/AdminProcessingContext';
import './TournamentManagement.css';

const TournamentManagement = () => {
    const location = useLocation();
    const { selectTournament } = useAdminTournament();
    const { withProcessing } = useAdminProcessing();
    const [isLoading, setIsLoading] = useState(true);
    const [tournamentList, setTournamentList] = useState([]);
    const [activeTournament, setActiveTournament] = useState(null);
    const [activeFixturesData, setActiveFixturesData] = useState(null);

    // Complete tournament modal state
    const [completeModalTarget, setCompleteModalTarget] = useState(null);
    const [completeChampion, setCompleteChampion] = useState('');
    const [completeRunnerUp, setCompleteRunnerUp] = useState('');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
    const [inspectData, setInspectData] = useState(null);
    const [inspectLoading, setInspectLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        title: '',
        year: new Date().getFullYear() + 1,
        startDate: '',
        endDate: '',
        venue: 'Faculty of Engineering Grounds, Kilinochchi',
        organizers: 'Faculty of Engineering, University of Jaffna',
        status: 'upcoming',
        champion: '',
        runnerUp: '',
        description: '',
        setAsActive: true
    });

    const [editingEditionId, setEditingEditionId] = useState(null);
    const [feedbackMessage, setFeedbackMessage] = useState(null);

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
    const [protectedAlertOpen, setProtectedAlertOpen] = useState(false);

    // Set Active confirmation state
    const [setActiveTarget, setSetActiveTarget] = useState(null); // { id, name }

    useEffect(() => {
        const unsubIndex = subscribeTournamentIndex((list) => {
            setTournamentList(list || []);
            setIsLoading(false);
        });

        const unsubActive = subscribeActiveTournament((tourney) => {
            setActiveTournament(tourney);
        });

        const timer = setTimeout(() => setIsLoading(false), 1200);

        return () => {
            clearTimeout(timer);
            unsubIndex();
            unsubActive();
        };
    }, []);

    // Subscribe to fixtures for the active/live tournament to track match completion
    useEffect(() => {
        if (!activeTournament?.activeId) return;
        const unsubFix = subscribeFixtures((data) => {
            setActiveFixturesData(data || null);
        }, activeTournament.activeId);

        return () => {
            unsubFix && unsubFix();
        };
    }, [activeTournament?.activeId]);

    // Check if all matches in the active tournament are finished
    const isAllMatchesFinished = useMemo(() => {
        if (!activeFixturesData) return false;
        const finishedMap = activeFixturesData.finishedMatches || activeFixturesData.matches || {};
        const matchesList = Object.values(finishedMap);
        if (matchesList.length === 0) return false;

        return matchesList.every(m => {
            if (m.finished === 1) return true;
            const res = (m.result || '').trim().toLowerCase();
            return res !== '' && !res.startsWith('scheduled');
        });
    }, [activeFixturesData]);

    const showToast = (msg, type = 'success') => {
        setFeedbackMessage({ text: msg, type });
        setTimeout(() => setFeedbackMessage(null), 4000);
    };

    // Format ISO string for <input type="datetime-local">
    const formatDateTimeForInput = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const pad = (num) => String(num).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const handleOpenCreateModal = () => {
        const nextYear = new Date().getFullYear() + 1;
        const nextId = `2K${String(nextYear).slice(-2)}`;
        setFormData({
            id: nextId,
            name: `E-Legend's Trophy ${nextId}`,
            title: `Prof. A. Thurairajah Memorial Cricket Tournament ${nextYear}`,
            year: nextYear,
            startDate: `${nextYear}-10-10T08:00`,
            endDate: `${nextYear}-10-12T18:00`,
            venue: 'Faculty of Engineering Grounds, Kilinochchi',
            organizers: `E22 Batch, Faculty of Engineering`,
            status: 'upcoming',
            champion: '',
            runnerUp: '',
            description: `The ${nextYear} edition of the prestigious Prof. A. Thurairajah Memorial Cricket Tournament.`,
            setAsActive: false
        });
        setIsCreateModalOpen(true);
    };

    const handleYearChange = (newYear) => {
        const y = parseInt(newYear, 10);
        if (isNaN(y)) {
            setFormData(prev => ({ ...prev, year: newYear }));
            return;
        }
        const shortId = `2K${String(y).slice(-2)}`;
        setFormData(prev => ({
            ...prev,
            year: y,
            id: shortId,
            name: `E-Legend's Trophy ${shortId}`,
            title: `Prof. A. Thurairajah Memorial Cricket Tournament ${y}`,
            startDate: `${y}-10-10T08:00`,
            endDate: `${y}-10-12T18:00`
        }));
    };

    const handleOpenEditModal = (tournament) => {
        setEditingEditionId(tournament.id);
        setFormData({
            id: tournament.id,
            name: tournament.name || `E-Legend's Trophy ${tournament.id}`,
            title: tournament.title || `Prof. A. Thurairajah Memorial Cricket Tournament ${tournament.year || ''}`,
            year: tournament.year || new Date().getFullYear(),
            startDate: formatDateTimeForInput(tournament.startDate),
            endDate: formatDateTimeForInput(tournament.endDate),
            venue: tournament.venue || 'Faculty of Engineering Grounds, Kilinochchi',
            organizers: tournament.organizers || 'Faculty of Engineering, University of Jaffna',
            status: tournament.status || 'upcoming',
            champion: tournament.champion || '',
            runnerUp: tournament.runnerUp || '',
            description: tournament.description || '',
            setAsActive: activeTournament?.activeId === tournament.id
        });
        setIsEditModalOpen(true);
    };

    const handleInspectEdition = async (editionId) => {
        setInspectLoading(true);
        setIsInspectModalOpen(true);
        try {
            const data = await getTournamentEdition(editionId);
            setInspectData(data);
        } catch (error) {
            console.error('Failed to load edition inspection:', error);
        } finally {
            setInspectLoading(false);
        }
    };

    const handleFormSubmitCreate = async (e) => {
        e.preventDefault();
        await withProcessing(async () => {
            try {
                const createdId = await createTournament(formData);
                if (formData.setAsActive) {
                    await setActiveTournamentId(createdId);
                }
                showToast(`Tournament ${createdId} created successfully!`);
                setIsCreateModalOpen(false);
            } catch (error) {
                console.error('Create tournament error:', error);
                showToast('Failed to create tournament. Check console.', 'error');
            }
        }, 'Creating Tournament Edition...', 'Initializing tournament configuration and countdown telemetry...');
    };

    const handleFormSubmitEdit = async (e) => {
        e.preventDefault();
        await withProcessing(async () => {
            try {
                await updateTournamentInfo(editingEditionId, {
                    name: formData.name,
                    title: formData.title,
                    year: formData.year,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    venue: formData.venue,
                    organizers: formData.organizers,
                    status: formData.status,
                    champion: formData.champion,
                    runnerUp: formData.runnerUp,
                    description: formData.description
                });

                if (formData.setAsActive) {
                    await setActiveTournamentId(editingEditionId);
                }

                if (formData.status === 'completed' && activeTournament?.activeId === editingEditionId) {
                    await updateLiveData({
                        isLive: 0,
                        currentMatchPath: '',
                        liveScore: null
                    });
                }

                showToast(`Tournament ${editingEditionId} updated successfully!`);
                setIsEditModalOpen(false);
            } catch (error) {
                console.error('Edit tournament error:', error);
                showToast('Failed to update tournament.', 'error');
            }
        }, 'Updating Tournament Details...', 'Saving configuration changes to database...');
    };

    const handleRequestSetActive = (tournament) => {
        setSetActiveTarget({
            id: tournament.id,
            name: tournament.name || tournament.id
        });
    };

    const handleConfirmSetActive = async () => {
        if (!setActiveTarget) return;
        await withProcessing(async () => {
            try {
                await setActiveTournamentId(setActiveTarget.id);
                selectTournament(setActiveTarget.id);
                showToast(`Active tournament switched to "${setActiveTarget.name}"!`);
            } catch (error) {
                console.error('Set active error:', error);
                showToast('Failed to switch active tournament.', 'error');
            } finally {
                setSetActiveTarget(null);
            }
        }, 'Activating Live Tournament...', `Setting "${setActiveTarget.name}" as featured event on website...`);
    };

    // Open Complete Tournament Modal (Auto-detecting champion if available from final match or edition data)
    const handleOpenCompleteModal = async (tournament) => {
        let detectedChampion = tournament.champion || '';
        let detectedRunnerUp = tournament.runnerUp || '';
        let matchesList = [];

        if (activeTournament?.activeId === tournament.id && activeFixturesData) {
            const finishedMap = activeFixturesData?.finishedMatches || activeFixturesData?.matches || {};
            matchesList = Object.values(finishedMap);
        } else {
            try {
                const editionData = await getTournamentEdition(tournament.id);
                const fixtures = editionData?.FixturesData?.finishedMatches || editionData?.fixtures || {};
                matchesList = Object.values(fixtures);
            } catch (err) {
                console.warn('Could not fetch edition fixtures for completion detection:', err);
            }
        }

        // Find final match or last match
        const finalMatch = matchesList.find(m => (m.title || '').toLowerCase().includes('final') && !(m.title || '').toLowerCase().includes('semi')) || matchesList[matchesList.length - 1];

        if (finalMatch && finalMatch.result) {
            const wonMatch = finalMatch.result.match(/^([^\s]+)\s+won/i);
            if (wonMatch && wonMatch[1]) {
                detectedChampion = detectedChampion || wonMatch[1];
                const [t1, t2] = (finalMatch.teams || '').split(/\s+vs\s+/i);
                if (t1 && t2) {
                    detectedRunnerUp = detectedRunnerUp || (t1.trim() === detectedChampion ? t2.trim() : t1.trim());
                }
            }
        }

        const concludedCount = matchesList.filter(m => m.finished === 1 || (m.result && !m.result.toLowerCase().startsWith('scheduled'))).length;

        setCompleteChampion(detectedChampion);
        setCompleteRunnerUp(detectedRunnerUp);
        setCompleteModalTarget({
            ...tournament,
            concludedCount
        });
    };

    // Confirm marking tournament as Completed
    const handleConfirmComplete = async (e) => {
        if (e) e.preventDefault();
        if (!completeModalTarget) return;

        await withProcessing(async () => {
            try {
                await updateTournamentInfo(completeModalTarget.id, {
                    status: 'completed',
                    champion: completeChampion.trim() || completeModalTarget.champion || '',
                    runnerUp: completeRunnerUp.trim() || completeModalTarget.runnerUp || ''
                });

                // If this was the active live tournament, also clear live scoring state in LiveData
                if (activeTournament?.activeId === completeModalTarget.id) {
                    await updateLiveData({
                        isLive: 0,
                        currentMatchPath: '',
                        liveScore: null
                    });
                }

                showToast(`🏆 Tournament "${completeModalTarget.name || completeModalTarget.id}" marked as Completed!`);
                setCompleteModalTarget(null);
            } catch (error) {
                console.error('Complete tournament error:', error);
                showToast('Failed to mark tournament as completed.', 'error');
            }
        }, 'Completing Tournament...', 'Archiving results and crowning champion in Hall of Fame...');
    };

    // Handle deep link / navigation query param ?action=complete
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'complete' && activeTournament?.activeId && isAllMatchesFinished) {
            const currentLiveTourney = tournamentList.find(t => t.id === activeTournament.activeId);
            if (currentLiveTourney && (currentLiveTourney.status || '').toLowerCase() !== 'completed') {
                handleOpenCompleteModal(currentLiveTourney);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search, activeTournament?.activeId, isAllMatchesFinished, tournamentList]);

    const handleDelete = (editionId, displayName) => {
        if (editionId === '2K25' || editionId === "E-Legend's Trophy 2K25") {
            setProtectedAlertOpen(true);
            return;
        }
        setDeleteTarget({ id: editionId, name: displayName || editionId });
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        await withProcessing(async () => {
            try {
                await deleteTournament(deleteTarget.id);
                showToast(`Tournament "${deleteTarget.name}" deleted.`);
            } catch (error) {
                console.error('Delete tournament error:', error);
                showToast('Failed to delete tournament.', 'error');
            } finally {
                setDeleteTarget(null);
            }
        }, 'Deleting Tournament Edition...', `Removing "${deleteTarget.name}" from database...`);
    };

    if (isLoading && tournamentList.length === 0) {
        return (
            <PageLoader
                message="Loading Tournament Editions..."
                subtitle="Retrieving tournament database nodes and active configurations"
                tournamentName="Tournament Manager"
            />
        );
    }

    return (
        <div className="admin-tournaments-page">
            <AdminSubNav />
            <div className="at-container">
                {/* Header */}
                <div className="at-header-row">
                    <div>
                        <span className="at-tag">EDITIONS & ARCHIVES</span>
                        <h1 className="at-title">Tournament Management Console</h1>
                    </div>

                    <div className="at-actions">
                        <button className="at-create-btn" onClick={handleOpenCreateModal}>
                            <span>Create Tournament</span>
                        </button>
                    </div>
                </div>

                {/* Toast Notification */}
                {feedbackMessage && (
                    <div className={`at-toast ${feedbackMessage.type}`}>
                        <MdCheckCircle />
                        <span>{feedbackMessage.text}</span>
                    </div>
                )}

                {/* Tournaments Grid */}
                <div className="at-grid-header">
                    <h2>All Tournament Editions ({tournamentList.length})</h2>
                    <span className="at-grid-sub">Click "Set as Active" to direct the public website and scoring engine to that edition</span>
                </div>

                <div className="at-editions-grid">
                    {tournamentList.map((tournament) => {
                        const isActive = activeTournament?.activeId === tournament.id;
                        const status = (tournament.status || 'completed').toLowerCase();
                        const isLiveAndReadyToComplete = isActive && status !== 'completed' && isAllMatchesFinished;
                        const is2K25 = tournament.id === '2K25';

                        return (
                            <div
                                key={tournament.id}
                                className={`at-edition-card ad-edition-card ${isActive ? 'is-active-tourney is-active-border' : ''} ${isLiveAndReadyToComplete ? 'is-ready-complete-card' : ''}`}
                            >
                                {/* Top bar: ID badge + status badges */}
                                <div className="edition-card-header">
                                    <div className="edition-badge-wrap">
                                        <span className="edition-id-badge">{tournament.id}</span>
                                    </div>
                                    <div className="edition-status-badges">
                                        {isActive && (
                                            <span className="badge-active-live">
                                                <MdCheckCircle /> Active Edition
                                            </span>
                                        )}
                                        {isLiveAndReadyToComplete && (
                                            <span className="badge-matches-finished" title="All tournament matches have concluded">
                                                <MdEmojiEvents /> Matches Finished
                                            </span>
                                        )}
                                        <span className={`badge-status status-${status}`}>
                                            {status === 'completed' ? 'Completed' : status === 'upcoming' ? 'Upcoming' : 'In Progress'}
                                        </span>
                                    </div>
                                </div>

                                {/* Card Main Body */}
                                <div className="edition-card-body">
                                    <h3 className="edition-name">{tournament.name || `E-Legend's Trophy ${tournament.id}`}</h3>
                                    <p className="edition-title">{tournament.title || tournament.info?.title || 'Faculty of Engineering Memorial Trophy'}</p>

                                    {/* Meta list */}
                                    <div className="edition-meta-list">
                                        <div className="edition-meta-item">
                                            <MdCalendarToday className="meta-icon" />
                                            <span>
                                                {tournament.startDate
                                                    ? `${new Date(tournament.startDate).toLocaleDateString()}${tournament.endDate ? ` – ${new Date(tournament.endDate).toLocaleDateString()}` : ''}`
                                                    : (tournament.year ? `Year ${tournament.year}` : 'Dates TBA')}
                                            </span>
                                        </div>
                                        <div className="edition-meta-item">
                                            <MdLocationOn className="meta-icon" />
                                            <span className="truncate-meta">{tournament.venue || tournament.info?.venue || 'Kilinochchi Grounds'}</span>
                                        </div>
                                    </div>

                                    {/* Dashboard Signature Stats Strip */}
                                    <div className="edition-stats-strip">
                                        {tournament.champion && (
                                            <div className="strip-item champion-strip">
                                                <span className="strip-label">CHAMPION</span>
                                                <span className="strip-val">{tournament.champion}</span>
                                            </div>
                                        )}
                                        <div className="strip-item">
                                            <span className="strip-label">TEAMS</span>
                                            <span className="strip-val">{tournament.teamCount || (tournament.teams ? Object.keys(tournament.teams).length : 4)} Batches</span>
                                        </div>
                                        <div className="strip-item">
                                            <span className="strip-label">MATCHES</span>
                                            <span className="strip-val">
                                                {tournament.matchesCount !== undefined
                                                    ? tournament.matchesCount
                                                    : (status === 'completed' ? 7 : (tournament.fixtures ? Object.keys(tournament.fixtures).length : 0))}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action bar */}
                                <div className="edition-card-actions">
                                    {/* PRIMARY actions */}
                                    <div className="actions-primary">
                                        {!isActive ? (
                                            <button
                                                type="button"
                                                className="action-btn-primary set-active-btn"
                                                onClick={() => handleRequestSetActive(tournament)}
                                                title="Make this the active tournament on the live site"
                                            >
                                                <MdCheckCircle />
                                                <span>Set Active</span>
                                            </button>
                                        ) : (
                                            <div className="active-marker">
                                                <MdCheckCircle />
                                                <span>Live Edition</span>
                                            </div>
                                        )}

                                        {status !== 'completed' && (
                                            <button
                                                type="button"
                                                className={`action-btn-primary make-completed-btn ${isLiveAndReadyToComplete ? 'all-finished-glow edition-make-completed-btn' : 'standard-complete-btn'}`}
                                                onClick={() => handleOpenCompleteModal(tournament)}
                                                title={isLiveAndReadyToComplete ? "All matches have concluded! Mark this tournament as Completed" : "Mark this tournament as Completed and archive in Hall of Fame"}
                                            >
                                                <MdEmojiEvents />
                                                <span>{isLiveAndReadyToComplete ? 'Make as Completed' : 'Mark Completed'}</span>
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            className="action-btn-primary edit-btn"
                                            onClick={() => handleOpenEditModal(tournament)}
                                            title="Edit tournament details"
                                        >
                                            <MdEdit />
                                            <span>Edit</span>
                                        </button>
                                    </div>

                                    {/* SECONDARY actions */}
                                    <div className="actions-secondary">
                                        <button
                                            type="button"
                                            className="action-icon-btn inspect-btn"
                                            onClick={() => handleInspectEdition(tournament.id)}
                                            title="Inspect match data & stories"
                                        >
                                            <MdVisibility />
                                        </button>

                                        <Link
                                            to={`/history/${tournament.id}`}
                                            className="action-icon-btn archive-btn"
                                            target="_blank"
                                            rel="noreferrer"
                                            title="Open public Hall of Fame page"
                                        >
                                            <MdOpenInNew />
                                        </Link>

                                        {!is2K25 && !isActive && (
                                            <button
                                                type="button"
                                                className="action-icon-btn delete-btn"
                                                onClick={() => handleDelete(tournament.id, tournament.name)}
                                                title="Delete this tournament edition"
                                            >
                                                <MdDelete />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Create Tournament Modal */}
            {isCreateModalOpen && (
                <div className="at-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="at-modal-card pro-tournament-modal wide-tournament-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-icon-wrap">
                                <div className="modal-header-bubble">
                                    <MdEmojiEvents />
                                </div>
                                <div className="modal-header-text-group">
                                    <h3>Create New Tournament Edition</h3>
                                    <p className="modal-header-desc">
                                        Configure a new tournament edition, set the live countdown clock, and manage initial status.
                                    </p>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setIsCreateModalOpen(false)} aria-label="Close">
                                <MdClose />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmitCreate} className="at-modal-form pro-modal-form">
                            {/* SECTION 1: IDENTITY */}
                            <div className="modal-section-box">
                                <div className="section-box-header">
                                    <span className="section-box-step">1</span>
                                    <div className="section-box-title-wrap">
                                        <h4>Tournament Identity & Database Key</h4>
                                        <p className="section-box-subtitle">Define the edition year, brand title, and database node key.</p>
                                    </div>
                                </div>

                                <div className="form-row two-col">
                                    <div className="form-field">
                                        <label>Tournament Year *</label>
                                        <input
                                            type="number"
                                            value={formData.year}
                                            onChange={(e) => handleYearChange(e.target.value)}
                                            placeholder="2026"
                                            required
                                        />
                                        <small>Updating year automatically syncs recommended IDs, names, and default dates</small>
                                    </div>
                                    <div className="form-field">
                                        <label>Edition ID (Database Key) *</label>
                                        <input
                                            type="text"
                                            value={formData.id}
                                            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                                            placeholder="e.g. 2K26"
                                            required
                                        />
                                        <small>Used for URLs and RTDB node key (e.g. 2K26, 2027)</small>
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label>Tournament Display Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. E-Legend's Trophy 2K26"
                                        required
                                    />
                                    <small>Public brand title displayed on headers, scoreboards, and badges</small>
                                </div>

                                <div className="form-field">
                                    <label>Official Memorial Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Prof. A. Thurairajah Memorial Cricket Tournament 2026"
                                        required
                                    />
                                    <small>Official ceremonial title used for awards, certificates, and tributes</small>
                                </div>
                            </div>

                            {/* SECTION 2: DATES, COUNTDOWN & VENUE */}
                            <div className="modal-section-box highlight-countdown-box">
                                <div className="section-box-header">
                                    <span className="section-box-step">2</span>
                                    <div className="section-box-title-wrap">
                                        <h4>Schedule, Live Countdown Driver & Venue</h4>
                                        <p className="section-box-subtitle">Specify match dates, location, and the timestamp driving the live countdown.</p>
                                    </div>
                                    <span className="countdown-target-badge"><MdTimer /> Countdown Driver</span>
                                </div>

                                <div className="form-row two-col">
                                    <div className="form-field clock-field-highlight">
                                        <label>Start Date & Time (Countdown Target) *</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            required
                                        />
                                        <small className="clock-highlight-text">
                                            <MdBolt className="clock-highlight-icon" /> Home page live countdown timer ticks down to this exact minute
                                        </small>
                                    </div>
                                    <div className="form-field">
                                        <label>End Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        />
                                        <small>Tournament final match and closing ceremony date</small>
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label>Ground Venue</label>
                                    <input
                                        type="text"
                                        value={formData.venue}
                                        onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                                        placeholder="Faculty of Engineering Grounds, Kilinochchi"
                                    />
                                    <small>Ground or stadium hosting the tournament matches</small>
                                </div>
                            </div>

                            {/* SECTION 3: STATUS & COMMITTEE */}
                            <div className="modal-section-box">
                                <div className="section-box-header">
                                    <span className="section-box-step">3</span>
                                    <div className="section-box-title-wrap">
                                        <h4>Status & Organization</h4>
                                        <p className="section-box-subtitle">Select operational status and identify the organizing batch.</p>
                                    </div>
                                </div>

                                <div className="form-row two-col">
                                    <div className="form-field">
                                        <label>Tournament Status *</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="upcoming">Upcoming (Registration & Countdown Active)</option>
                                            <option value="active">Active (Matches Underway / Live Tournament)</option>
                                            <option value="completed">Completed (Archived / Hall of Fame)</option>
                                        </select>
                                        <small>Controls live badges and operational state across the website</small>
                                    </div>
                                    <div className="form-field">
                                        <label>Organizing Batch / Committee</label>
                                        <input
                                            type="text"
                                            value={formData.organizers}
                                            onChange={(e) => setFormData({ ...formData, organizers: e.target.value })}
                                            placeholder="e.g. E22 Batch, Faculty of Engineering"
                                        />
                                        <small>Student batch or committee hosting this edition</small>
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label>Tournament Description & Theme</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows="2"
                                        placeholder="Brief theme, tribute or historical description..."
                                    />
                                    <small>Optional background notes, historical backdrop, or dedication</small>
                                </div>
                            </div>

                            {/* SECTION 4: ACTIVATION CARD */}
                            <div className={`pro-active-toggle-card ${formData.setAsActive ? 'is-active-checked' : ''}`}>
                                <label className="active-toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.setAsActive}
                                        onChange={(e) => setFormData({ ...formData, setAsActive: e.target.checked })}
                                    />
                                    <div className="active-toggle-content">
                                        <div className="active-toggle-title">
                                            <span>Set as Active Live Tournament immediately</span>
                                            {formData.setAsActive && (
                                                <span className="active-will-live-badge"><MdCheckCircle /> Live on Save</span>
                                            )}
                                        </div>
                                        <p className="active-toggle-desc">
                                            When selected, this edition will immediately become the featured live tournament across the public website homepage, countdown clock, pedestal stats, and default navigation upon creation.
                                        </p>
                                    </div>
                                </label>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsCreateModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-submit pro-create-btn">
                                    Create Tournament Edition
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Tournament Modal */}
            {isEditModalOpen && (
                <div className="at-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
                    <div className="at-modal-card pro-tournament-modal wide-tournament-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-icon-wrap">
                                <div className="modal-header-bubble edit-bubble">
                                    <MdEdit />
                                </div>
                                <div className="modal-header-text-group">
                                    <h3>Edit Tournament Edition ({editingEditionId})</h3>
                                    <p className="modal-header-desc">
                                        Update brand names, adjust countdown driver schedule, podium champions, and live site activation.
                                    </p>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setIsEditModalOpen(false)} aria-label="Close">
                                <MdClose />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmitEdit} className="at-modal-form pro-modal-form">
                            {/* SECTION 1: IDENTITY */}
                            <div className="modal-section-box">
                                <div className="section-box-header">
                                    <span className="section-box-step">1</span>
                                    <div className="section-box-title-wrap">
                                        <h4>Tournament Identity & Database Key</h4>
                                        <p className="section-box-subtitle">Manage tournament titles and verify database key binding.</p>
                                    </div>
                                </div>

                                <div className="form-row two-col">
                                    <div className="form-field">
                                        <label>Tournament Year *</label>
                                        <input
                                            type="number"
                                            value={formData.year}
                                            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                            placeholder="2026"
                                            required
                                        />
                                        <small>Calendar year representing this tournament edition</small>
                                    </div>
                                    <div className="form-field">
                                        <label>Edition ID (Database Key)</label>
                                        <div className="readonly-key-display">
                                            <MdLock className="key-lock-icon" />
                                            <span className="key-text">{editingEditionId}</span>
                                            <span className="key-immutable-pill">Immutable DB Key</span>
                                        </div>
                                        <small>Database keys cannot be changed to prevent breaking related match references</small>
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label>Tournament Display Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. E-Legend's Trophy 2K26"
                                        required
                                    />
                                    <small>Short public brand title featured on headers, scorecards, and live match banners</small>
                                </div>

                                <div className="form-field">
                                    <label>Official Memorial Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Prof. A. Thurairajah Memorial Cricket Tournament 2026"
                                        required
                                    />
                                    <small>Formal ceremonial title used for awards, certificates, and tributes</small>
                                </div>
                            </div>

                            {/* SECTION 2: DATES, COUNTDOWN & VENUE */}
                            <div className="modal-section-box highlight-countdown-box">
                                <div className="section-box-header">
                                    <span className="section-box-step">2</span>
                                    <div className="section-box-title-wrap">
                                        <h4>Schedule, Live Countdown Driver & Venue</h4>
                                        <p className="section-box-subtitle">Adjust dates and update the target timestamp driving the website countdown clock.</p>
                                    </div>
                                    <span className="countdown-target-badge"><MdTimer /> Countdown Driver</span>
                                </div>

                                <div className="form-row two-col">
                                    <div className="form-field clock-field-highlight">
                                        <label>Start Date & Time (Countdown Target) *</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            required
                                        />
                                        <small className="clock-highlight-text">
                                            <MdBolt className="clock-highlight-icon" /> Home page live countdown timer ticks down to this exact minute
                                        </small>
                                    </div>
                                    <div className="form-field">
                                        <label>End Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        />
                                        <small>Tournament final match and closing ceremony date</small>
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label>Ground Venue</label>
                                    <input
                                        type="text"
                                        value={formData.venue}
                                        onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                                        placeholder="Faculty of Engineering Grounds, Kilinochchi"
                                    />
                                    <small>Ground or stadium hosting the tournament matches</small>
                                </div>
                            </div>

                            {/* SECTION 3: STATUS, PODIUMS & ORGANIZATION */}
                            <div className="modal-section-box">
                                <div className="section-box-header">
                                    <span className="section-box-step">3</span>
                                    <div className="section-box-title-wrap">
                                        <h4>Status, Podiums & Organization</h4>
                                        <p className="section-box-subtitle">Control tournament state, organizing body, and historical winners.</p>
                                    </div>
                                </div>

                                <div className="form-row two-col">
                                    <div className="form-field">
                                        <label>Tournament Status *</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="upcoming">Upcoming (Registration & Countdown Active)</option>
                                            <option value="active">Active (Matches Underway / Live Tournament)</option>
                                            <option value="completed">Completed (Archived / Hall of Fame)</option>
                                        </select>
                                        <small>Controls live badges and operational state across the website</small>
                                    </div>
                                    <div className="form-field">
                                        <label>Organizing Batch / Committee</label>
                                        <input
                                            type="text"
                                            value={formData.organizers}
                                            onChange={(e) => setFormData({ ...formData, organizers: e.target.value })}
                                            placeholder="e.g. E22 Batch, Faculty of Engineering"
                                        />
                                        <small>Student batch or committee credited with hosting</small>
                                    </div>
                                </div>

                                <div className="form-row two-col">
                                    <div className="form-field">
                                        <label>Champion Team (Concluded Winner)</label>
                                        <input
                                            type="text"
                                            value={formData.champion}
                                            onChange={(e) => setFormData({ ...formData, champion: e.target.value })}
                                            placeholder="e.g. E21 Batch"
                                        />
                                        <small>Winner batch crowned with trophy in Hall of Fame</small>
                                    </div>
                                    <div className="form-field">
                                        <label>Runner-Up Team</label>
                                        <input
                                            type="text"
                                            value={formData.runnerUp}
                                            onChange={(e) => setFormData({ ...formData, runnerUp: e.target.value })}
                                            placeholder="e.g. E22 Batch"
                                        />
                                        <small>Tournament runner-up team</small>
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label>Tournament Description & Theme</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows="2"
                                        placeholder="Brief theme, tribute or historical description..."
                                    />
                                    <small>Optional background notes, historical backdrop, or dedication</small>
                                </div>
                            </div>

                            {/* SECTION 4: ACTIVATION CARD */}
                            <div className={`pro-active-toggle-card ${formData.setAsActive ? 'is-active-checked' : ''}`}>
                                <label className="active-toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.setAsActive}
                                        onChange={(e) => setFormData({ ...formData, setAsActive: e.target.checked })}
                                    />
                                    <div className="active-toggle-content">
                                        <div className="active-toggle-title">
                                            <span>Set as Active Live Tournament on website</span>
                                            {formData.setAsActive && (
                                                <span className="active-will-live-badge"><MdCheckCircle /> Live on Save</span>
                                            )}
                                        </div>
                                        <p className="active-toggle-desc">
                                            When enabled, this tournament immediately becomes the featured live event across the public homepage countdown clock, stats podium, default navigation, and public fixtures.
                                        </p>
                                    </div>
                                </label>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsEditModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-submit pro-create-btn">
                                    <MdSave /> Save Tournament Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Inspect Edition Data Modal */}
            {isInspectModalOpen && (
                <div className="at-modal-overlay" onClick={() => setIsInspectModalOpen(false)}>
                    <div className="at-modal-card wide-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Tournament Dataset Inspection</h3>
                            <button className="modal-close-btn" onClick={() => setIsInspectModalOpen(false)}>
                                <MdClose />
                            </button>
                        </div>

                        <div className="modal-inspect-body">
                            {inspectLoading ? (
                                <div className="inspect-loading">Loading edition node...</div>
                            ) : inspectData ? (
                                <div className="inspect-content">
                                    <div className="inspect-meta-grid">
                                        <div className="inspect-box">
                                            <span className="box-title">Edition Info</span>
                                            <h4>{inspectData.info?.name || 'Tournament'}</h4>
                                            <p>{inspectData.info?.title}</p>
                                            <p><small>Status: {inspectData.info?.status || 'N/A'}</small></p>
                                        </div>

                                        <div className="inspect-box">
                                            <span className="box-title">Matches Count</span>
                                            <h4>{Object.keys(inspectData.matches || {}).length} Matches</h4>
                                            <p>Keys: {Object.keys(inspectData.matches || {}).join(', ') || 'None'}</p>
                                        </div>

                                        <div className="inspect-box">
                                            <span className="box-title">Awards & Honors</span>
                                            <h4>{(inspectData.awards || []).length} Awards</h4>
                                            <p>Champion: {inspectData.info?.champion || 'TBD'}</p>
                                        </div>

                                        <div className="inspect-box">
                                            <span className="box-title">Stories & News</span>
                                            <h4>{Object.keys(inspectData.stories || {}).length} Stories</h4>
                                        </div>
                                    </div>

                                    <div className="inspect-quick-links">
                                        <Link
                                            to={`/history/${inspectData.info?.id || '2K25'}`}
                                            className="btn-inspect-view"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <MdVisibility /> View In Public Hall of Fame
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div>No data found for this edition.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Set Active Confirmation Modal */}
            <ConfirmationModal
                isOpen={Boolean(setActiveTarget)}
                type="primary"
                title="Activate Tournament"
                message={`Are you sure you want to set "${setActiveTarget?.name}" as the active tournament?`}
                detail="This edition will immediately become the live showcase tournament on the public website (hero countdown timer, pedestal statistics, match schedules, and public views)."
                confirmText="Set as Active"
                cancelText="Cancel"
                onConfirm={handleConfirmSetActive}
                onCancel={() => setSetActiveTarget(null)}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={Boolean(deleteTarget)}
                type="danger"
                title="Delete Tournament Edition"
                message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? All associated matches, fixtures, teams, and records for this edition will be removed.`}
                detail="This action is irreversible and cannot be undone."
                confirmText="Delete Edition"
                cancelText="Keep It"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />

            {/* Protected Tournament Alert */}
            <ConfirmationModal
                isOpen={protectedAlertOpen}
                type="warning"
                title="Protected Edition"
                message="The E-Legend's Trophy 2K25 is the foundation historical tournament and is permanently protected from deletion."
                confirmText="Understood"
                cancelText=""
                onConfirm={() => setProtectedAlertOpen(false)}
                onCancel={() => setProtectedAlertOpen(false)}
            />

            {/* Mark Tournament as Completed Modal */}
            {completeModalTarget && (
                <div className="at-modal-overlay" onClick={() => setCompleteModalTarget(null)}>
                    <div className="at-modal-card pro-tournament-modal complete-tournament-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-icon-wrap">
                                <div className="modal-header-bubble gold-bubble">
                                    <MdEmojiEvents />
                                </div>
                                <div className="modal-header-text-group">
                                    <h3>Mark Tournament as Completed</h3>
                                    <p className="modal-header-desc">
                                        {isAllMatchesFinished && activeTournament?.activeId === completeModalTarget.id ? (
                                            <>All matches in <strong>{completeModalTarget.name || completeModalTarget.id}</strong> have concluded! Finalize results and record the champion for the Hall of Fame.</>
                                        ) : (
                                            <>Finalize and mark <strong>{completeModalTarget.name || completeModalTarget.id}</strong> ({completeModalTarget.status || 'Upcoming'}) as Completed. Record the champion and runner-up for the public Hall of Fame.</>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setCompleteModalTarget(null)} aria-label="Close">
                                <MdClose />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmComplete} className="at-modal-form pro-modal-form">
                            {/* Summary Match Banner */}
                            <div className="complete-summary-card">
                                <div className="summary-match-count">
                                    <MdCheckCircle className="check-icon-gold" />
                                    <div>
                                        <strong>
                                            {completeModalTarget.concludedCount > 0
                                                ? `${completeModalTarget.concludedCount} Matches Concluded`
                                                : `${(completeModalTarget.status || 'Upcoming').toUpperCase()} Phase`}
                                        </strong>
                                        <p>
                                            {completeModalTarget.concludedCount > 0
                                                ? 'Official results and match scorecards are ready to archive in the Hall of Fame.'
                                                : 'Transition this tournament edition to Completed status and archive in the Hall of Fame.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Champion & Runner-Up Selection */}
                            <div className="modal-section-box">
                                <div className="section-box-header">
                                    <span className="section-box-step"><MdEmojiEvents /></span>
                                    <div className="section-box-title-wrap">
                                        <h4>Tournament Podium & Honors</h4>
                                        <p className="section-box-subtitle">Specify the Champion and Runner-Up to be enshrined in the public Hall of Fame.</p>
                                    </div>
                                </div>

                                <div className="form-row two-col">
                                    <div className="form-field">
                                        <label>Champion Team <MdWorkspacePremium className="honor-medal champion" /></label>
                                        <input
                                            type="text"
                                            value={completeChampion}
                                            onChange={(e) => setCompleteChampion(e.target.value)}
                                            placeholder="e.g. E21"
                                            list="available-batches-list"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>Runner-Up Team <MdMilitaryTech className="honor-medal runner-up" /></label>
                                        <input
                                            type="text"
                                            value={completeRunnerUp}
                                            onChange={(e) => setCompleteRunnerUp(e.target.value)}
                                            placeholder="e.g. E22"
                                            list="available-batches-list"
                                        />
                                    </div>
                                </div>
                                <datalist id="available-batches-list">
                                    <option value="E21" />
                                    <option value="E22" />
                                    <option value="E23" />
                                    <option value="E24" />
                                    <option value="Staff XI" />
                                    <option value="Alumni XI" />
                                </datalist>
                            </div>

                            <div className="complete-archive-notice">
                                <MdInfo />
                                <span>
                                    Marking as <strong>Completed</strong> will transition this tournament's public stats, rankings, and match scorecards to the permanent Hall of Fame history archives.
                                </span>
                            </div>

                            <div className="modal-actions-footer">
                                <button type="button" className="btn-cancel" onClick={() => setCompleteModalTarget(null)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-save-primary complete-confirm-btn">
                                    <MdEmojiEvents /> Confirm & Mark as Completed
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default TournamentManagement;
