import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TiltCard from '../../../components/3D/TiltCard';
import Footer from '../../../components/common/Footer/Footer';
import { useAdminTournament } from '../../../contexts/AdminTournamentContext';
import {
    subscribeTeams,
    subscribeFixtures,
    subscribeStories,
    subscribeLiveData,
    resolveTournamentKey
} from '../../../services/rtdbService';
import {
    MdSportsCricket,
    MdFormatListNumbered,
    MdNewspaper,
    MdPeople,
    MdLiveTv,
    MdArrowForward,
    MdEmojiEvents,
    MdCalendarToday,
    MdLocationOn,
    MdCheckCircle,
    MdSettings
} from 'react-icons/md';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const {
        tournaments,
        activeTournamentId,
        selectTournament,
        selectedTournamentId
    } = useAdminTournament();

    const [teams, setTeams] = useState({});
    const [fixtures, setFixtures] = useState({});
    const [activeFixtures, setActiveFixtures] = useState(null);
    const [stories, setStories] = useState({});
    const [liveData, setLiveData] = useState(null);

    useEffect(() => {
        // Subscribe to current selected tournament's sub-data
        const unsubTeams = subscribeTeams((d) => setTeams(d || {}), selectedTournamentId);
        const unsubFix = subscribeFixtures((d) => setFixtures(d || {}), selectedTournamentId);
        const unsubStories = subscribeStories((d) => setStories(d || {}), selectedTournamentId);
        const unsubLive = subscribeLiveData((d) => setLiveData(d || {}));

        return () => {
            unsubTeams();
            unsubFix();
            unsubStories();
            unsubLive();
        };
    }, [selectedTournamentId]);

    // Subscribe to active/live tournament fixtures to detect when all matches conclude
    useEffect(() => {
        if (!activeTournamentId) return;
        const unsubActiveFix = subscribeFixtures((d) => setActiveFixtures(d || null), activeTournamentId);
        return () => {
            unsubActiveFix && unsubActiveFix();
        };
    }, [activeTournamentId]);

    const isAllActiveMatchesFinished = useMemo(() => {
        if (!activeFixtures) return false;
        const finishedMap = activeFixtures?.finishedMatches || activeFixtures?.matches || {};
        const matches = Object.values(finishedMap);
        if (matches.length === 0) return false;
        return matches.every(m => {
            if (m.finished === 1) return true;
            const res = (m.result || '').trim().toLowerCase();
            return res !== '' && !res.startsWith('scheduled');
        });
    }, [activeFixtures]);

    const isMatchLive = Boolean(liveData?.isLive);
    const finishedCount = Object.keys(fixtures?.finishedMatches || {}).length;
    const storiesCount = Object.keys(stories || {}).length;
    const teamsCount = Object.keys(teams || {}).length;

    // Multi-tournament summaries
    const totalTournaments = tournaments.length;
    const completedCount = tournaments.filter(t => (t.status || '').toLowerCase() === 'completed').length;
    const upcomingCount = tournaments.filter(t => (t.status || '').toLowerCase() === 'upcoming' || (t.status || '').toLowerCase() === 'pending').length;

    const handleManageEdition = (tournamentId) => {
        selectTournament(tournamentId);
        navigate('/admin/tournaments');
    };

    return (
        <div className="admin-dashboard-page">
            <div className="ad-container">
                {/* Header Section */}
                <div className="ad-header">
                    <div>
                        <span className="ad-tag">ADMINISTRATION MASTER HUB</span>
                        <h1 className="ad-title">Tournament Management Dashboard</h1>
                        <p className="ad-subtitle">
                            Master summary of all active, upcoming, and completed tournament editions with multi-console management.
                        </p>
                    </div>

                    {isMatchLive && (
                        <div className="ad-live-alert">
                            <span className="ad-live-pulse" />
                            <div>
                                <strong>LIVE MATCH IN PROGRESS</strong>
                                <p>{liveData?.liveScore?.teams || liveData?.liveScore?.matchTitle || 'Match in progress'}</p>
                            </div>
                            <Link to="/admin/scoring" className="ad-quick-score-btn">
                                Scoring Console
                            </Link>
                        </div>
                    )}
                </div>

                {/* Overall Tournament Summary Metrics */}
                <div className="ad-metrics-grid">
                    <div className="ad-metric-card">
                        <span className="metric-label">Tracked Editions</span>
                        <span className="metric-val">{totalTournaments || 2}</span>
                        <span className="metric-sub">Across all years</span>
                    </div>
                    <div className="ad-metric-card highlight-card">
                        <span className="metric-label">Public Active Edition</span>
                        <span className="metric-val active-val">{activeTournamentId}</span>
                        <span className="metric-sub">Live on web client</span>
                    </div>
                    <div className="ad-metric-card">
                        <span className="metric-label">Completed Archives</span>
                        <span className="metric-val">{completedCount || 1}</span>
                        <span className="metric-sub">With scorecards & champions</span>
                    </div>
                    <div className="ad-metric-card">
                        <span className="metric-label">Pending / Upcoming</span>
                        <span className="metric-val">{upcomingCount || 1}</span>
                        <span className="metric-sub">Registration & schedule phase</span>
                    </div>
                </div>

                {/* Multi-Tournament Registry & Overview */}
                <div className="ad-editions-section">
                    <div className="section-header-row">
                        <div>
                            <h2 className="ad-section-heading">Tournament Editions Master Registry</h2>
                            <p className="section-sub-text">
                                Select an edition to manage its teams, fixtures, live scoring pad, and stories.
                            </p>
                        </div>
                        <Link to="/admin/tournaments" className="new-tourney-btn">
                            <MdSettings /> Manage All Editions
                        </Link>
                    </div>

                    <div className="ad-editions-grid">
                        {tournaments.map((t) => {
                            const isLiveActive = resolveTournamentKey(t.id) === resolveTournamentKey(activeTournamentId);
                            const isCurrentlySelected = selectedTournamentId ? resolveTournamentKey(t.id) === resolveTournamentKey(selectedTournamentId) : false;
                            const status = (t.status || 'upcoming').toLowerCase();

                            return (
                                <div
                                    key={t.id}
                                    className={`ad-edition-card ${isLiveActive ? 'is-active-tourney' : ''} ${isCurrentlySelected ? 'is-selected-tourney' : ''}`}
                                >
                                    <div className="edition-card-header">
                                        <div className="edition-trophy-badge">
                                            <MdEmojiEvents />
                                        </div>
                                        <div className="edition-status-badges">
                                            {isLiveActive && (
                                                <span className="badge-active-live">
                                                    <MdCheckCircle /> Active Edition
                                                </span>
                                            )}
                                            {isLiveActive && status !== 'completed' && isAllActiveMatchesFinished && (
                                                <span className="badge-matches-finished" title="All tournament matches have concluded">
                                                    <MdEmojiEvents /> Matches Finished
                                                </span>
                                            )}
                                            <span className={`badge-status status-${status}`}>
                                                {status === 'completed' ? 'Completed' : status === 'upcoming' ? 'Upcoming' : 'In Progress'}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="edition-name">{t.name || t.id}</h3>
                                    <p className="edition-title">{t.title || t.info?.title || 'Faculty of Engineering Memorial Trophy'}</p>

                                    <div className="edition-meta-list">
                                        <div className="edition-meta-item">
                                            <MdCalendarToday className="meta-icon" />
                                            <span>{t.year ? `Year ${t.year}` : 'Annual Edition'}</span>
                                        </div>
                                        <div className="edition-meta-item">
                                            <MdLocationOn className="meta-icon" />
                                            <span className="truncate-meta">{t.venue || t.info?.venue || 'Kilinochchi Grounds'}</span>
                                        </div>
                                    </div>

                                    <div className="edition-stats-strip">
                                        {t.champion && (
                                            <div className="strip-item champion-strip">
                                                <span className="strip-label">CHAMPION</span>
                                                <span className="strip-val">{t.champion}</span>
                                            </div>
                                        )}
                                        <div className="strip-item">
                                            <span className="strip-label">TEAMS</span>
                                            <span className="strip-val">{t.teamCount || 4} Batches</span>
                                        </div>
                                        <div className="strip-item">
                                            <span className="strip-label">MATCHES</span>
                                            <span className="strip-val">{t.matchesCount !== undefined ? t.matchesCount : (status === 'completed' ? 7 : 0)}</span>
                                        </div>
                                    </div>

                                    <div className="edition-card-actions">
                                        {isLiveActive && status !== 'completed' && isAllActiveMatchesFinished && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    selectTournament(t.id);
                                                    navigate('/admin/tournaments?action=complete');
                                                }}
                                                className="edition-make-completed-btn"
                                                title="All matches have finished. Click to mark tournament as completed"
                                            >
                                                <MdEmojiEvents /> Make as Completed
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleManageEdition(t.id)}
                                            className={`edition-select-btn ${isCurrentlySelected ? 'btn-selected' : ''}`}
                                        >
                                            {isCurrentlySelected ? 'Selected in Console' : 'Switch Console to This Edition'}
                                        </button>
                                        <Link
                                            to={status === 'completed' ? `/history/${t.editionId || '2K25'}` : '/'}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="edition-public-link"
                                            title="Preview public view in new tab"
                                        >
                                            User View
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Tournament Quick Modules */}
                <div className="ad-selected-context-banner">
                    <div className="context-banner-text">
                        <span className="context-banner-label">
                            {selectedTournamentId ? 'Currently Managing in Console' : 'Console Target Status'}
                        </span>
                        <h3 className="context-banner-name">
                            {selectedTournamentId || 'Select a Tournament to Manage'}
                        </h3>
                        {!selectedTournamentId && (
                            <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                                Choose an edition from the top dropdown or click "Switch Console to This Edition" above to load its teams, fixtures, and scoring pad.
                            </p>
                        )}
                    </div>
                    {selectedTournamentId && (
                        <div className="context-stats-group">
                            <div className="context-stat">
                                <span>{teamsCount || 0}</span> Teams
                            </div>
                            <div className="context-stat">
                                <span>{finishedCount || 0}</span> Finished Matches
                            </div>
                            <div className="context-stat">
                                <span>{storiesCount || 0}</span> Stories
                            </div>
                        </div>
                    )}
                </div>

                {/* Control Modules for the Selected Tournament */}
                <h2 className="ad-section-heading">
                    {selectedTournamentId ? `Management Modules for ${selectedTournamentId}` : 'Management Modules Overview'}
                </h2>
                <div className="ad-actions-grid">
                    {/* Live Scoring */}
                    <TiltCard className="ad-action-card highlight" maxTilt={8}>
                        <div className="ad-card-top">
                            <div className="ad-icon-box live-icon-bg">
                                <MdSportsCricket />
                            </div>
                            <span className="ad-module-badge primary">REAL-TIME ENGINE</span>
                        </div>
                        <h3>Live Match Scoring</h3>
                        <p>
                            Control ball-by-ball deliveries, extras, dismissals with fielders, wagon wheel shot zones, and auto-commentary.
                        </p>
                        <Link to="/admin/scoring" className="ad-card-cta">
                            Launch Scoring Pad <MdArrowForward />
                        </Link>
                    </TiltCard>

                    {/* Tournament Editions & Archives */}
                    <TiltCard className="ad-action-card" maxTilt={8}>
                        <div className="ad-card-top">
                            <div className="ad-icon-box sky-icon-bg">
                                <MdEmojiEvents />
                            </div>
                            <span className="ad-module-badge">EDITIONS & ARCHIVES</span>
                        </div>
                        <h3>Tournament Editions</h3>
                        <p>
                            Create new tournaments with start dates for the home countdown, edit editions, switch active tournament, and review historical archives.
                        </p>
                        <Link to="/admin/tournaments" className="ad-card-cta">
                            Manage Tournaments <MdArrowForward />
                        </Link>
                    </TiltCard>

                    {/* Draw Management */}
                    <TiltCard className="ad-action-card" maxTilt={8}>
                        <div className="ad-card-top">
                            <div className="ad-icon-box cyan-icon-bg">
                                <MdFormatListNumbered />
                            </div>
                            <span className="ad-module-badge">SCHEDULING</span>
                        </div>
                        <h3>Draw & Fixtures Management</h3>
                        <p>
                            Generate elimination brackets or round-robin league schedules, set match dates, times, and assign umpires.
                        </p>
                        <Link to="/admin/draw" className="ad-card-cta">
                            Manage Fixtures <MdArrowForward />
                        </Link>
                    </TiltCard>

                    {/* Team Management */}
                    <TiltCard className="ad-action-card" maxTilt={8}>
                        <div className="ad-card-top">
                            <div className="ad-icon-box emerald-icon-bg">
                                <MdPeople />
                            </div>
                            <span className="ad-module-badge">ROSTERS</span>
                        </div>
                        <h3>Faculty Team Management</h3>
                        <p>
                            Review registered batch squads (E21, E22, E23, E24), captains, player roles, and bench player substitutions.
                        </p>
                        <Link to="/admin/teams" className="ad-card-cta">
                            Manage Teams <MdArrowForward />
                        </Link>
                    </TiltCard>

                    {/* Stories Management */}
                    <TiltCard className="ad-action-card" maxTilt={8}>
                        <div className="ad-card-top">
                            <div className="ad-icon-box purple-icon-bg">
                                <MdNewspaper />
                            </div>
                            <span className="ad-module-badge">BROADCAST</span>
                        </div>
                        <h3>Stories & Match Highlights</h3>
                        <p>
                            Create, update, and publish breaking news, tournament alert banners, and Man of the Match summaries.
                        </p>
                        <Link to="/admin/stories" className="ad-card-cta">
                            Manage Stories <MdArrowForward />
                        </Link>
                    </TiltCard>

                    {/* Live Match Center Audience View */}
                    <TiltCard className="ad-action-card" maxTilt={8}>
                        <div className="ad-card-top">
                            <div className="ad-icon-box indigo-icon-bg">
                                <MdLiveTv />
                            </div>
                            <span className="ad-module-badge">AUDIENCE VIEW</span>
                        </div>
                        <h3>Live Match Center</h3>
                        <p>
                            Preview the 3D scoreboard, Wagon Wheel viewer, and audience experience exactly as spectators see it.
                        </p>
                        <Link to="/live" className="ad-card-cta" target="_blank">
                            Open Match Center <MdArrowForward />
                        </Link>
                    </TiltCard>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default AdminDashboard;
