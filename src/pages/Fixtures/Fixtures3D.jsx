import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TiltCard from '../../components/3D/TiltCard';
import Footer from '../../components/common/Footer/Footer';
import MatchCard, { isMatchFinished, isMatchCurrentlyLive, parseMatchDateTime } from '../../components/common/MatchCard/MatchCard';
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
import PageLoader from '../../components/common/PageLoader/PageLoader';
import './Fixtures3D.css';

const Fixtures3D = () => {
    const [activeTournament, setActiveTournament] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming'); // 'live', 'upcoming', 'history'
    const [userSelectedTab, setUserSelectedTab] = useState(false);
    const [fixturesData, setFixturesData] = useState(null);
    const [liveData, setLiveData] = useState(null);
    const [upcomingData, setUpcomingData] = useState(null);
    const [teams, setTeams] = useState({});

    useEffect(() => {
        let loadedCount = 0;
        const markLoaded = () => {
            loadedCount++;
            if (loadedCount >= 2) setIsLoading(false);
        };

        const unsubActive = subscribeActiveTournament((tourney) => {
            setActiveTournament(tourney);
            markLoaded();
        });
        const unsubFix = subscribeFixtures((data) => {
            setFixturesData(data);
            markLoaded();
        });
        const unsubLive = subscribeLiveData((data) => {
            setLiveData(data);
            markLoaded();
        });
        const unsubUp = subscribeUpcoming((data) => {
            setUpcomingData(data);
            markLoaded();
        });
        const unsubTeams = subscribeTeams((data) => setTeams(data || {}));

        const timer = setTimeout(() => setIsLoading(false), 1200);

        return () => {
            clearTimeout(timer);
            unsubActive();
            unsubFix();
            unsubLive();
            unsubUp();
            unsubTeams();
        };
    }, []);

    const labels = resolveTournamentLabels(activeTournament);
    const isMatchLive = Boolean(liveData?.isLive);

    // Combine matches from published draw and upcomingData (supporting both upcomingMatches and matches)
    const isDrawPublished = Number(fixturesData?.isFixtures) === 1 && !fixturesData?.isDraft;
    const isUpcomingActive = upcomingData?.isUpcoming !== 0 && upcomingData?.isUpcoming !== false;

    // When draw is published, display all published fixtures.
    // When draw is unpublished (draft), newly changed scheduled fixtures MUST NOT display in fixtures screen!
    // Only completed matches and currently live matches remain visible.
    const rawMatchesObj = (fixturesData?.publishedMatches && Object.keys(fixturesData.publishedMatches).length > 0)
        ? fixturesData.publishedMatches
        : fixturesData?.finishedMatches;
    const fixturesMatchesList = isDrawPublished
        ? Object.values(rawMatchesObj || {})
        : Object.values(rawMatchesObj || {}).filter(m => isMatchFinished(m) || isMatchCurrentlyLive(m, liveData));

    const upcomingMatchesList = isUpcomingActive
        ? Object.values(upcomingData?.upcomingMatches || upcomingData?.matches || {})
        : [];

    const allMatchesRaw = [
        ...fixturesMatchesList,
        ...upcomingMatchesList
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

    // Scheduled matches means upcoming matches (excluding matches currently live); finished matches shows in results tab
    const upcomingMatches = allMatches.filter((m) => !isMatchFinished(m) && !isMatchCurrentlyLive(m, liveData));
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

    if (isLoading) {
        return (
            <PageLoader
                message="Loading Tournament Fixtures..."
                subtitle="Synchronizing draw schedules, live timings & match venues"
                tournamentName={labels.fullName || "E-Legends Trophy 2K26"}
            />
        );
    }

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

                                // First batting team must always be displayed on the left side
                                const isTeam1FirstBat = ls.firstBattingTeam ? (ls.firstBattingTeam === t1Name) : (firstBat !== 2 && firstBat !== 0);
                                const leftTeam = isTeam1FirstBat ? t1 : t2;
                                const rightTeam = isTeam1FirstBat ? t2 : t1;
                                const leftName = isTeam1FirstBat ? t1Name : t2Name;
                                const rightName = isTeam1FirstBat ? t2Name : t1Name;
                                const leftLogo = isTeam1FirstBat ? t1Logo : t2Logo;
                                const rightLogo = isTeam1FirstBat ? t2Logo : t1Logo;
                                const isLeftBatting = isTeam1FirstBat ? isT1Batting : isT2Batting;
                                const isRightBatting = !isLeftBatting;
                                const leftCrr = isTeam1FirstBat ? t1Crr : t2Crr;
                                const rightCrr = isTeam1FirstBat ? t2Crr : t1Crr;

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
                                                {/* First Batting Team Box (Left) */}
                                                <div className={`flc-team-box ${isLeftBatting ? 'is-batting' : ''}`}>
                                                    <div className="flc-team-crest-wrap">
                                                        {leftLogo ? (
                                                            <img src={leftLogo} alt={leftName} className="flc-team-crest" onError={(e) => { e.target.style.display = 'none'; }} />
                                                        ) : (
                                                            <div className="flc-team-crest-fallback">{leftName.substring(0, 3)}</div>
                                                        )}
                                                        {isLeftBatting && <span className="flc-batting-tag">🏏 BATTING</span>}
                                                    </div>
                                                    <h2 className="flc-team-name">{leftName}</h2>
                                                    <div className="flc-score-display">
                                                        <span className="flc-score-num">{leftTeam.score ?? 0}</span>
                                                        <span className="flc-score-sep">/</span>
                                                        <span className="flc-score-wkt">{leftTeam.wicket ?? 0}</span>
                                                    </div>
                                                    <div className="flc-team-meta">
                                                        <span className="flc-overs-pill">({leftTeam.overs ?? 0} ov)</span>
                                                        {leftCrr && <span className="flc-crr-pill">CRR {leftCrr}</span>}
                                                    </div>
                                                </div>

                                                {/* Center VS Indicator */}
                                                <div className="flc-center-indicator">
                                                    <div className="flc-vs-pill">VS</div>
                                                    <span className="flc-format-tag">15 Overs T20</span>
                                                </div>

                                                {/* Second Batting Team Box (Right) */}
                                                <div className={`flc-team-box ${isRightBatting ? 'is-batting' : ''}`}>
                                                    <div className="flc-team-crest-wrap">
                                                        {rightLogo ? (
                                                            <img src={rightLogo} alt={rightName} className="flc-team-crest" onError={(e) => { e.target.style.display = 'none'; }} />
                                                        ) : (
                                                            <div className="flc-team-crest-fallback">{rightName.substring(0, 3)}</div>
                                                        )}
                                                        {isRightBatting && <span className="flc-batting-tag">🏏 BATTING</span>}
                                                    </div>
                                                    <h2 className="flc-team-name">{rightName}</h2>
                                                    <div className="flc-score-display">
                                                        <span className="flc-score-num">{rightTeam.score ?? 0}</span>
                                                        <span className="flc-score-sep">/</span>
                                                        <span className="flc-score-wkt">{rightTeam.wicket ?? 0}</span>
                                                    </div>
                                                    <div className="flc-team-meta">
                                                        <span className="flc-overs-pill">({rightTeam.overs ?? 0} ov)</span>
                                                        {rightCrr && <span className="flc-crr-pill">CRR {rightCrr}</span>}
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
                                                    <MdPlayArrow /> Enter Live Match Center
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
                                <div className={`fixtures-grid count-${upcomingMatches.length}`}>
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
                                <div className={`fixtures-grid count-${finishedMatches.length}`}>
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
