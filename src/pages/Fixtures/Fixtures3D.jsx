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
    MdEmojiEvents,
    MdPlayArrow,
    MdSportsCricket,
    MdArrowForward,
    MdEventAvailable,
    MdLocationOn
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
                            {isMatchLive && liveData?.liveScore ? (() => {
                                const ls = liveData.liveScore;
                                const t1 = ls.team1 || {};
                                const t2 = ls.team2 || {};
                                const t1Name = t1.name || 'Team 1';
                                const t2Name = t2.name || 'Team 2';
                                const t1Obj = teams[t1Name] || {};
                                const t2Obj = teams[t2Name] || {};
                                const t1Logo = t1Obj.logo || t1Obj.logoUrl || t1Obj.crest;
                                const t2Logo = t2Obj.logo || t2Obj.logoUrl || t2Obj.crest;

                                const firstBat = ls.firstBat ?? 1;
                                const t2Started = (t2.overs && Number(t2.overs) > 0) || (t2.score && Number(t2.score) > 0);
                                const isT2Batting = firstBat === 1 ? t2Started : !((t1.overs && Number(t1.overs) > 0) || (t1.score && Number(t1.score) > 0));
                                const isT1Batting = !isT2Batting;

                                const t1Overs = Number(t1.overs) || 0;
                                const t2Overs = Number(t2.overs) || 0;
                                const t1Crr = t1Overs > 0 ? (Number(t1.score || 0) / t1Overs).toFixed(2) : null;
                                const t2Crr = t2Overs > 0 ? (Number(t2.score || 0) / t2Overs).toFixed(2) : null;

                                return (
                                    <div className="fixtures-live-wrap">
                                        <TiltCard className="fixture-live-card" maxTilt={6}>
                                            <div className="flc-header">
                                                <div className="flc-header-left">
                                                    <span className="live-badge-glow">
                                                        <span className="ping-dot" /> LIVE IN PROGRESS
                                                    </span>
                                                    <span className="flc-match-title">{ls.matchTitle || 'Active'} Match</span>
                                                </div>
                                                <span className="flc-venue-chip">
                                                    <MdLocationOn className="flc-chip-icon" /> Faculty Cricket Grounds
                                                </span>
                                            </div>

                                            <div className="flc-matchup">
                                                {/* Team 1 Box */}
                                                <div className={`flc-team-box ${isT1Batting ? 'is-batting' : ''}`}>
                                                    <div className="flc-team-crest-wrap">
                                                        {t1Logo ? (
                                                            <img src={t1Logo} alt={t1Name} className="flc-team-crest" onError={(e) => { e.target.style.display = 'none'; }} />
                                                        ) : (
                                                            <div className="flc-team-crest-fallback">{t1Name.substring(0, 3)}</div>
                                                        )}
                                                        {isT1Batting && <span className="flc-batting-tag">🏏 BATTING</span>}
                                                    </div>
                                                    <h2 className="flc-team-name">{t1Name}</h2>
                                                    <div className="flc-score-display">
                                                        <span className="flc-score-num">{t1.score ?? 0}</span>
                                                        <span className="flc-score-sep">/</span>
                                                        <span className="flc-score-wkt">{t1.wicket ?? 0}</span>
                                                    </div>
                                                    <div className="flc-team-meta">
                                                        <span className="flc-overs-pill">({t1.overs ?? 0} ov)</span>
                                                        {t1Crr && <span className="flc-crr-pill">CRR {t1Crr}</span>}
                                                    </div>
                                                </div>

                                                {/* Center VS Indicator */}
                                                <div className="flc-center-indicator">
                                                    <div className="flc-vs-pill">VS</div>
                                                    <span className="flc-format-tag">15 Overs T20</span>
                                                </div>

                                                {/* Team 2 Box */}
                                                <div className={`flc-team-box ${isT2Batting ? 'is-batting' : ''}`}>
                                                    <div className="flc-team-crest-wrap">
                                                        {t2Logo ? (
                                                            <img src={t2Logo} alt={t2Name} className="flc-team-crest" onError={(e) => { e.target.style.display = 'none'; }} />
                                                        ) : (
                                                            <div className="flc-team-crest-fallback">{t2Name.substring(0, 3)}</div>
                                                        )}
                                                        {isT2Batting && <span className="flc-batting-tag">🏏 BATTING</span>}
                                                    </div>
                                                    <h2 className="flc-team-name">{t2Name}</h2>
                                                    <div className="flc-score-display">
                                                        <span className="flc-score-num">{t2.score ?? 0}</span>
                                                        <span className="flc-score-sep">/</span>
                                                        <span className="flc-score-wkt">{t2.wicket ?? 0}</span>
                                                    </div>
                                                    <div className="flc-team-meta">
                                                        <span className="flc-overs-pill">({t2.overs ?? 0} ov)</span>
                                                        {t2Crr && <span className="flc-crr-pill">CRR {t2Crr}</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {ls.status && (
                                                <div className="flc-status-banner">
                                                    <p className="flc-status-note">{ls.status}</p>
                                                </div>
                                            )}

                                            <div className="flc-actions">
                                                <Link to="/live" className="flc-enter-btn">
                                                    <MdPlayArrow /> Enter Live Match Center <MdArrowForward className="flc-arrow" />
                                                </Link>
                                            </div>
                                        </TiltCard>
                                    </div>
                                );
                            })() : (
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
