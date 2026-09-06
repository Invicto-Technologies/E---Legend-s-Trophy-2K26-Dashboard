import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TiltCard from '../../components/3D/TiltCard';
import Footer from '../../components/common/Footer/Footer';
import MatchCard, { isMatchFinished, parseMatchDateTime } from '../../components/common/MatchCard/MatchCard';
import {
    subscribeFixtures,
    subscribeLiveData,
    subscribeUpcoming,
    subscribeTeams,
    subscribeActiveTournament,
    resolveTournamentLabels
} from '../../services/rtdbService';
import {
    MdCalendarToday,
    MdLocationOn,
    MdEmojiEvents,
    MdPlayArrow,
    MdAccessTime,
    MdSportsCricket,
    MdArrowForward,
    MdEventAvailable
} from 'react-icons/md';
import './Fixtures3D.css';

const Fixtures3D = () => {
    const [activeTournament, setActiveTournament] = useState(null);
    const [activeTab, setActiveTab] = useState('upcoming'); // 'live', 'upcoming', 'history'
    const [userSelectedTab, setUserSelectedTab] = useState(false);
    const [fixturesData, setFixturesData] = useState(null);
    const [liveData, setLiveData] = useState(null);
    const [upcomingData, setUpcomingData] = useState(null);
    const [teams, setTeams] = useState({});

    useEffect(() => {
        const unsubActive = subscribeActiveTournament((tourney) => setActiveTournament(tourney));
        const unsubFix = subscribeFixtures((data) => setFixturesData(data));
        const unsubLive = subscribeLiveData((data) => setLiveData(data));
        const unsubUp = subscribeUpcoming((data) => setUpcomingData(data));
        const unsubTeams = subscribeTeams((data) => setTeams(data || {}));

        return () => {
            unsubActive();
            unsubFix();
            unsubLive();
            unsubUp();
            unsubTeams();
        };
    }, []);

    const labels = resolveTournamentLabels(activeTournament);
    const isMatchLive = Boolean(liveData?.isLive);

    // Combine matches from finishedMatches (where published draw lives) and upcomingData
    const allMatchesRaw = [
        ...Object.values(fixturesData?.finishedMatches || {}),
        ...Object.values(upcomingData?.matches || {})
    ];

    // Deduplicate matches
    const seen = new Set();
    const allMatches = [];
    for (const m of allMatchesRaw) {
        if (!m) continue;
        const key = m.id || `${m.title || ''}-${m.teams || ''}-${m.date || ''}-${m.time || ''}`;
        if (!seen.has(key)) {
            seen.add(key);
            allMatches.push(m);
        }
    }

    // Sort in ascending order of date and time
    allMatches.sort((a, b) => parseMatchDateTime(a) - parseMatchDateTime(b));

    // Scheduled matches means upcoming matches; finished matches shows in results tab
    const upcomingMatches = allMatches.filter((m) => !isMatchFinished(m));
    const finishedMatches = allMatches.filter(isMatchFinished);

    // Automatically set logical initial tab unless user manually selected one
    useEffect(() => {
        if (!userSelectedTab) {
            if (isMatchLive) {
                setActiveTab('live');
            } else if (upcomingMatches.length > 0) {
                setActiveTab('upcoming');
            } else if (finishedMatches.length > 0) {
                setActiveTab('history');
            } else {
                setActiveTab('upcoming');
            }
        }
    }, [isMatchLive, upcomingMatches.length, finishedMatches.length, userSelectedTab]);

    return (
        <div className="fixtures-3d-page">
            <div className="fixtures-hero">
                <div className="fixtures-container">
                    <div className="fixtures-tag-badge">
                        <span className="fixtures-tag-dot" />
                        <span className="fixtures-tag">{labels.fullName.toUpperCase()}</span>
                    </div>
                    <h1 className="fixtures-title">Tournament Fixtures & Results</h1>
                    <p className="fixtures-subtitle">
                        Track live action, schedule fixtures, and verified scorecards for {labels.fullName}.
                    </p>

                    {/* Filter Tabs */}
                    <div className="fixtures-tab-nav">
                        <button
                            className={`f-tab-btn ${activeTab === 'live' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('live'); setUserSelectedTab(true); }}
                        >
                            <span className="tab-indicator" />
                            Live Matches {isMatchLive && <span className="tab-live-pulse" />}
                        </button>
                        <button
                            className={`f-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('upcoming'); setUserSelectedTab(true); }}
                        >
                            Upcoming ({upcomingMatches.length})
                        </button>
                        <button
                            className={`f-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('history'); setUserSelectedTab(true); }}
                        >
                            Results ({finishedMatches.length})
                        </button>
                    </div>
                </div>
            </div>

            <div className="fixtures-content-section">
                <div className="fixtures-container">
                    {/* LIVE MATCHES TAB */}
                    {activeTab === 'live' && (
                        <div className="fixtures-tab-content">
                            {isMatchLive && liveData?.liveScore ? (
                                <div className="fixtures-live-wrap">
                                    <TiltCard className="fixture-live-card" maxTilt={8}>
                                        <div className="flc-header">
                                            <span className="live-badge-glow">
                                                <span className="ping-dot" /> LIVE IN PROGRESS
                                            </span>
                                            <span className="flc-match-title">{liveData.liveScore.matchTitle} Match</span>
                                        </div>

                                        <div className="flc-matchup">
                                            <div className="flc-team">
                                                <h2>{liveData.liveScore.team1?.name}</h2>
                                                <span className="flc-score">
                                                    {liveData.liveScore.team1?.score ?? 0}/{liveData.liveScore.team1?.wicket ?? 0}
                                                    <small> ({liveData.liveScore.team1?.overs ?? 0} ov)</small>
                                                </span>
                                            </div>
                                            <div className="flc-vs-pill">VS</div>
                                            <div className="flc-team">
                                                <h2>{liveData.liveScore.team2?.name}</h2>
                                                <span className="flc-score">
                                                    {liveData.liveScore.team2?.score ?? 0}/{liveData.liveScore.team2?.wicket ?? 0}
                                                    <small> ({liveData.liveScore.team2?.overs ?? 0} ov)</small>
                                                </span>
                                            </div>
                                        </div>

                                        <p className="flc-status-note">{liveData.liveScore.status}</p>

                                        <div className="flc-actions">
                                            <Link to="/live" className="flc-enter-btn">
                                                <MdPlayArrow /> Enter Match Center
                                            </Link>
                                        </div>
                                    </TiltCard>
                                </div>
                            ) : (
                                <div className="fixtures-compact-empty">
                                    <div className="f-empty-icon-wrap live">
                                        <MdSportsCricket />
                                    </div>
                                    <div className="f-empty-info">
                                        <h4>No Live Action in Progress</h4>
                                        <p>Real-time ball-by-ball updates and live radar will activate as soon as the next clash begins for {labels.fullName}.</p>
                                    </div>
                                    <div className="f-empty-action">
                                        {finishedMatches.length > 0 ? (
                                            <button className="f-empty-btn" onClick={() => { setActiveTab('history'); setUserSelectedTab(true); }}>
                                                View Results ({finishedMatches.length})
                                            </button>
                                        ) : (
                                            <span className="f-empty-status-pill">Match Center Standby</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* UPCOMING MATCHES TAB */}
                    {activeTab === 'upcoming' && (
                        <div className="fixtures-tab-content">
                            {upcomingMatches.length > 0 ? (
                                <div className="fixtures-grid">
                                    {upcomingMatches.map((m, idx) => (
                                        <MatchCard key={m.id || idx} match={m} teamsMap={teams} />
                                    ))}
                                </div>
                            ) : (
                                <div className="fixtures-compact-empty">
                                    <div className="f-empty-icon-wrap upcoming">
                                        <MdEventAvailable />
                                    </div>
                                    <div className="f-empty-info">
                                        <h4>Upcoming Fixtures Announcement Soon</h4>
                                        <p>The official match schedule, team draws, and clash timings for {labels.fullName} are currently being finalized.</p>
                                    </div>
                                    <div className="f-empty-action">
                                        <span className="f-empty-status-pill upcoming">Draw Pending</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* HISTORY (RESULTS) TAB */}
                    {activeTab === 'history' && (
                        <div className="fixtures-tab-content">
                            {finishedMatches.length > 0 ? (
                                <div className="fixtures-grid">
                                    {finishedMatches.map((match, idx) => (
                                        <MatchCard key={match.id || idx} match={match} teamsMap={teams} />
                                    ))}
                                </div>
                            ) : (
                                <div className="fixtures-compact-empty">
                                    <div className="f-empty-icon-wrap results">
                                        <MdEmojiEvents />
                                    </div>
                                    <div className="f-empty-info">
                                        <h4>No Match Results Recorded Yet</h4>
                                        <p>Verified scores, match summaries, and Player of the Match awards for {labels.fullName} will appear here once clashes conclude.</p>
                                    </div>
                                    <div className="f-empty-action">
                                        <Link to="/history" className="f-empty-btn accent">
                                            Explore Past Tournaments <MdArrowForward />
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default Fixtures3D;
