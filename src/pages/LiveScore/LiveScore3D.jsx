import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import TiltCard from '../../components/3D/TiltCard';
import WagonWheel from '../../components/3D/WagonWheel';
import ThreeStadiumRadarScene from '../../components/3D/ThreeStadiumRadarScene';
import Footer from '../../components/common/Footer/Footer';
import {
    subscribeLiveData,
    subscribeMatch,
    subscribeActiveTournament,
    resolveTournamentLabels
} from '../../services/rtdbService';
import {
    MdPieChart,
    MdTimeline,
    MdClose,
    MdEmojiEvents,
    MdArrowBack,
    MdCalendarToday,
    MdSportsCricket
} from 'react-icons/md';
import './LiveScore3D.css';

const LiveScore3D = () => {
    const { matchTitle: routeMatchTitle } = useParams();
    const [liveData, setLiveData] = useState(null);
    const [activeMatchTitle, setActiveMatchTitle] = useState(routeMatchTitle || '');
    const [matchData, setMatchData] = useState(null);
    const [activeTournament, setActiveTournament] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeInningsTab, setActiveInningsTab] = useState('team1');
    const [showWagonWheel, setShowWagonWheel] = useState(false);
    const [selectedBatsmanForWagon, setSelectedBatsmanForWagon] = useState(null);

    // 1. Subscribe to Active Tournament
    useEffect(() => {
        const unsubTourney = subscribeActiveTournament((tourney) => {
            setActiveTournament(tourney);
        });
        return () => unsubTourney();
    }, []);

    // 2. Subscribe to LiveData to resolve default active match if not passed via URL
    useEffect(() => {
        const unsubLive = subscribeLiveData((data) => {
            setLiveData(data);
            setIsLoading(false);
            if (!routeMatchTitle) {
                const target = data?.isLive ? (data?.currentMatchPath || data?.liveScore?.matchTitle) : '';
                setActiveMatchTitle(target || '');
            }
        });
        return () => unsubLive();
    }, [routeMatchTitle]);

    // 3. Subscribe to the specific match if a route title or active live match exists
    useEffect(() => {
        const targetTitle = routeMatchTitle || activeMatchTitle;
        if (!targetTitle) {
            setMatchData(null);
            return;
        }

        const unsubMatch = subscribeMatch(targetTitle, (data) => {
            setMatchData(data);
            setIsLoading(false);
            if (data?.common?.firstBat !== undefined) {
                setActiveInningsTab(data.common.firstBat === 1 ? 'team1' : 'team2');
            }
        });

        return () => unsubMatch();
    }, [routeMatchTitle, activeMatchTitle]);

    const labels = resolveTournamentLabels(activeTournament);
    const isLive = Boolean(liveData?.isLive && activeMatchTitle && (activeMatchTitle === liveData?.currentMatchPath || activeMatchTitle === liveData?.liveScore?.matchTitle));

    // Loading State
    if (isLoading) {
        return (
            <div className="live-score-loading">
                <div className="loading-spinner" />
                <p>Connecting to Match Telemetry...</p>
            </div>
        );
    }

    // 3D STANDBY VIEW: When viewing /live and no match is currently in progress
    if (!routeMatchTitle && !isLive) {
        return (
            <div className="livescore-3d-page livescore-standby-screen">
                <div className="livescore-top-bar standby-top-bar">
                    <div className="ls-container">
                        <Link to="/fixtures" className="ls-back-link">
                            <MdArrowBack /> Back to Fixtures
                        </Link>
                    </div>
                </div>

                {/* 3D Animated Stadium Radar Standby Card - Two Column Layout */}
                <main className="ls-standby-hero-section">
                    <div className="ls-container">
                        <div className="no-live-standby-card-3d">
                            {/* Left Column: 3D Animated Stadium Radar */}
                            <div className="standby-col-animation">
                                <div className="standby-animation-header">
                                    <span className="standby-radar-ping" />
                                    <span>RADAR TELEMETRY</span>
                                </div>
                                <div className="standby-3d-canvas-wrap">
                                    <ThreeStadiumRadarScene height="100%" />
                                </div>
                            </div>

                            {/* Right Column: Content & Quick Navigation */}
                            <div className="standby-col-content">
                                <div className="standby-badge">
                                    <span className="standby-radar-ping" />
                                    <span>{labels.fullName.toUpperCase()} • TELEMETRY ACTIVE</span>
                                </div>

                                <h1 className="standby-title">No Live Match Currently in Progress</h1>

                                <p className="standby-desc">
                                    The match day floodlights and stadium telemetry are in standby mode for {labels.fullName}.
                                    Live ball by ball scoring, interactive wagon wheels, and radar metrics will automatically stream here the moment match officials signal play.
                                </p>

                                <div className="standby-telemetry-chips">
                                    <div className="telemetry-chip">
                                        <span className="tc-dot pulse" />
                                        <span>Radar: <strong>Online &amp; Listening</strong></span>
                                    </div>
                                    <div className="telemetry-chip">
                                        <span className="tc-dot" />
                                        <span>Active Tournament: <strong>{labels.editionCode}</strong></span>
                                    </div>
                                    <div className="telemetry-chip">
                                        <span className="tc-dot" />
                                        <span>Venue: <strong>Faculty Grounds, Kilinochchi</strong></span>
                                    </div>
                                </div>

                                <div className="standby-actions-grid">
                                    <Link to="/fixtures" className="cx-btn-primary">
                                        <MdCalendarToday /> View Match Fixtures
                                    </Link>
                                    <Link to="/rankings" className="cx-btn-glass">
                                        <MdTimeline /> View Standings
                                    </Link>
                                    <Link to="/history" className="cx-btn-glass">
                                        <MdEmojiEvents /> Tournament Archive
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Sleek single-line bottom bar to keep viewport strictly one page without scrolling */}
                <footer className="standby-bottom-bar">
                    <div className="ls-container standby-bottom-inner">
                        <span>© {labels.year} {labels.fullName}. All rights reserved.</span>
                        <div className="standby-bottom-links">
                            <Link to="/home">Home</Link>
                            <Link to="/fixtures">Fixtures</Link>
                            <Link to="/rankings">Rankings</Link>
                            <Link to="/history">History</Link>
                        </div>
                    </div>
                </footer>
            </div>
        );
    }

    // Match Not Found State (if user opened a specific /match/:matchTitle that has no data)
    if (routeMatchTitle && !matchData) {
        return (
            <div className="livescore-3d-page">
                <div className="livescore-top-bar">
                    <div className="ls-container">
                        <Link to="/fixtures" className="ls-back-link">
                            <MdArrowBack /> Back to Fixtures
                        </Link>
                    </div>
                </div>
                <div className="ls-container">
                    <div className="match-not-found-card">
                        <MdSportsCricket className="mnf-icon" />
                        <h2>Scorecard Not Found</h2>
                        <p>No recorded scorecard was found for match "{routeMatchTitle}" in {labels.fullName}.</p>
                        <div className="mnf-actions">
                            <Link to="/fixtures" className="cx-btn-primary">
                                Browse Tournament Fixtures
                            </Link>
                            <Link to="/history" className="cx-btn-glass">
                                Explore Past Results
                            </Link>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    const { common = {}, team1 = {}, team2 = {} } = matchData || {};

    // Active Batting / Bowling Team Data
    const isTeam1Batting = activeInningsTab === 'team1';
    const battingTeam = isTeam1Batting ? team1 : team2;
    const bowlingTeam = isTeam1Batting ? team2 : team1;

    // Parse Batters & Bowlers
    const battersList = Object.values(battingTeam.players || {});
    const bowlersList = Object.values(bowlingTeam.bowlers || {});
    const fallOfWickets = Object.values(battingTeam.fallOfWickets || {});

    // Active Batsmen at the crease
    const activeStriker = battersList.find(p => p.status === 'batting' || p.status === 'striker') || battersList[0];
    const activeNonStriker = battersList.find(p => p.status === 'non-striker') || battersList[1];
    const activeBowler = bowlersList[0] || { name: 'Active Bowler', overs: 0, runs: 0, wickets: 0 };

    // Commentary Stream
    const commentaryList = matchData?.commentary ? Object.values(matchData.commentary).sort((a, b) => b.timestamp - a.timestamp) : [];

    // Synthesize Wagon Wheel shots from batter boundaries & singles
    const wagonShots = selectedBatsmanForWagon ? (
        (() => {
            const b = selectedBatsmanForWagon;
            const shots = [];
            const sixes = b.boundaries?.sixes || 0;
            const fours = b.boundaries?.fours || 0;
            const singles = b.boundaries?.singles || Math.max(0, b.runs - (sixes * 6 + fours * 4));

            for (let i = 0; i < sixes; i++) shots.push({ runs: 6, zone: ['Cover', 'Mid-wicket', 'Square Leg', 'Third Man'][i % 4] });
            for (let i = 0; i < fours; i++) shots.push({ runs: 4, zone: ['Point', 'Cover', 'Fine Leg', 'Mid-off'][i % 4] });
            for (let i = 0; i < singles; i++) shots.push({ runs: 1, zone: ['Mid-on', 'Mid-wicket', 'Point', 'Square Leg'][i % 4] });
            return shots;
        })()
    ) : [];

    return (
        <div className="livescore-3d-page">
            {/* Top Navigation Breadcrumb */}
            <div className="livescore-top-bar">
                <div className="ls-container">
                    <Link to="/fixtures" className="ls-back-link">
                        <MdArrowBack /> Back to Fixtures
                    </Link>
                    {isLive ? (
                        <span className="ls-live-pill">
                            <span className="ls-ping" /> LIVE MATCH IN PROGRESS
                        </span>
                    ) : (
                        <span className="ls-standby-pill">
                            <span className="ls-standby-dot" /> COMPLETED MATCH SCORECARD
                        </span>
                    )}
                </div>
            </div>

            {/* 3D Holographic Scoreboard */}
            <section className="ls-hero-scoreboard">
                <div className="ls-container">
                    <div className="scoreboard-glass-card">
                        {/* Match Title & Info Header */}
                        <div className="sb-header">
                            <div className="sb-match-label">
                                <span className="sb-title-badge">{common.title || 'Match'}</span>
                                <span className="sb-date">{common.date} • {common.time}</span>
                            </div>
                            <span className="sb-overs-limit">{common.overLimit || 15} OVERS T20</span>
                        </div>

                        {/* Dual Team Score Columns */}
                        <div className="sb-teams-grid">
                            {/* Team 1 */}
                            <div className={`sb-team-col ${activeInningsTab === 'team1' ? 'active-batting' : ''}`}>
                                <h2 className="sb-team-name">{team1.name || 'Team 1'}</h2>
                                <div className="sb-score-big">
                                    <span className="score-runs">{team1.totalRuns ?? 0}</span>
                                    <span className="score-sep">/</span>
                                    <span className="score-wickets">{team1.totalWickets ?? 0}</span>
                                </div>
                                <div className="sb-overs-pill">
                                    Overs: <strong>{team1.overs ?? 0}</strong> / {common.overLimit || 15}
                                </div>
                            </div>

                            {/* Center Status Column */}
                            <div className="sb-center-col">
                                <div className="sb-vs-ring">VS</div>
                                <div className="sb-result-badge">
                                    {common.finished ? (
                                        <span className="status-finished">{common.result || 'Match Completed'}</span>
                                    ) : (
                                        <span className="status-live">{common.status || 'Match In Progress'}</span>
                                    )}
                                </div>
                                {common.mom && (
                                    <div className="sb-mom">
                                        <MdEmojiEvents /> PoTM: <strong>{common.mom}</strong>
                                    </div>
                                )}
                            </div>

                            {/* Team 2 */}
                            <div className={`sb-team-col ${activeInningsTab === 'team2' ? 'active-batting' : ''}`}>
                                <h2 className="sb-team-name">{team2.name || 'Team 2'}</h2>
                                <div className="sb-score-big">
                                    <span className="score-runs">{team2.totalRuns ?? 0}</span>
                                    <span className="score-sep">/</span>
                                    <span className="score-wickets">{team2.totalWickets ?? 0}</span>
                                </div>
                                <div className="sb-overs-pill">
                                    Overs: <strong>{team2.overs ?? 0}</strong> / {common.overLimit || 15}
                                </div>
                            </div>
                        </div>

                        {/* Innings Toggles */}
                        <div className="sb-innings-tabs">
                            <button
                                className={`sb-tab-btn ${activeInningsTab === 'team1' ? 'active' : ''}`}
                                onClick={() => setActiveInningsTab('team1')}
                            >
                                1st Innings ({team1.name})
                            </button>
                            <button
                                className={`sb-tab-btn ${activeInningsTab === 'team2' ? 'active' : ''}`}
                                onClick={() => setActiveInningsTab('team2')}
                            >
                                2nd Innings ({team2.name})
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Active Crease Spotlights (Striker, Non-Striker, Bowler) */}
            <section className="ls-crease-section">
                <div className="ls-container">
                    <div className="crease-grid">
                        {/* Striker */}
                        {activeStriker && (
                            <TiltCard className="crease-card striker" maxTilt={8}>
                                <div className="cc-tag">BATSMAN (STRIKER) *</div>
                                <h3 className="cc-name">{activeStriker.name}</h3>
                                <div className="cc-score-row">
                                    <span className="cc-runs">{activeStriker.runs}</span>
                                    <span className="cc-balls">({activeStriker.balls} balls)</span>
                                </div>
                                <div className="cc-stats">
                                    <span>4s: <strong>{activeStriker.boundaries?.fours || 0}</strong></span>
                                    <span>6s: <strong>{activeStriker.boundaries?.sixes || 0}</strong></span>
                                    <span>SR: <strong>{activeStriker.strikeRate || ((activeStriker.runs / Math.max(1, activeStriker.balls)) * 100).toFixed(1)}</strong></span>
                                </div>
                                <button
                                    className="wagon-open-btn"
                                    onClick={() => {
                                        setSelectedBatsmanForWagon(activeStriker);
                                        setShowWagonWheel(true);
                                    }}
                                >
                                    <MdPieChart /> View Wagon Wheel
                                </button>
                            </TiltCard>
                        )}

                        {/* Non-Striker */}
                        {activeNonStriker && (
                            <TiltCard className="crease-card non-striker" maxTilt={8}>
                                <div className="cc-tag">NON-STRIKER</div>
                                <h3 className="cc-name">{activeNonStriker.name}</h3>
                                <div className="cc-score-row">
                                    <span className="cc-runs">{activeNonStriker.runs}</span>
                                    <span className="cc-balls">({activeNonStriker.balls} balls)</span>
                                </div>
                                <div className="cc-stats">
                                    <span>4s: <strong>{activeNonStriker.boundaries?.fours || 0}</strong></span>
                                    <span>6s: <strong>{activeNonStriker.boundaries?.sixes || 0}</strong></span>
                                    <span>SR: <strong>{activeNonStriker.strikeRate || ((activeNonStriker.runs / Math.max(1, activeNonStriker.balls)) * 100).toFixed(1)}</strong></span>
                                </div>
                                <button
                                    className="wagon-open-btn"
                                    onClick={() => {
                                        setSelectedBatsmanForWagon(activeNonStriker);
                                        setShowWagonWheel(true);
                                    }}
                                >
                                    <MdPieChart /> View Wagon Wheel
                                </button>
                            </TiltCard>
                        )}

                        {/* Bowler */}
                        {activeBowler && (
                            <TiltCard className="crease-card bowler" maxTilt={8}>
                                <div className="cc-tag bowler-tag">CURRENT BOWLER</div>
                                <h3 className="cc-name">{activeBowler.name}</h3>
                                <div className="cc-score-row">
                                    <span className="cc-runs">{activeBowler.wickets ?? 0}</span>
                                    <span className="cc-balls">/ {activeBowler.runs ?? 0}</span>
                                </div>
                                <div className="cc-stats">
                                    <span>Overs: <strong>{activeBowler.overs ?? 0}</strong></span>
                                    <span>Maidens: <strong>{activeBowler.maidens ?? 0}</strong></span>
                                    <span>Econ: <strong>{activeBowler.economy ?? 0}</strong></span>
                                </div>
                            </TiltCard>
                        )}
                    </div>
                </div>
            </section>

            {/* Scorecard Tables & Commentary Layout */}
            <section className="ls-tables-section">
                <div className="ls-container">
                    <div className="ls-content-columns">
                        {/* Main Scorecard Column */}
                        <div className="ls-scorecard-wrap">
                            {/* Batting Scorecard */}
                            <div className="scorecard-block">
                                <h3 className="block-title">Batting • {battingTeam.name}</h3>
                                <div className="table-responsive">
                                    <table className="score-table">
                                        <thead>
                                            <tr>
                                                <th>Batter</th>
                                                <th>Dismissal</th>
                                                <th>R</th>
                                                <th>B</th>
                                                <th>4s</th>
                                                <th>6s</th>
                                                <th>SR</th>
                                                <th>Wagon</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {battersList.map((p, idx) => (
                                                <tr key={p.id || idx}>
                                                    <td className="player-name-cell">
                                                        <strong>{p.name}</strong>
                                                        {p.role && <small className="player-role-sub">{p.role}</small>}
                                                    </td>
                                                    <td className="dismissal-cell">{p.dismissal || (p.runs > 0 ? 'not out' : 'yet to bat')}</td>
                                                    <td className="runs-cell">{p.runs}</td>
                                                    <td>{p.balls}</td>
                                                    <td>{p.boundaries?.fours || 0}</td>
                                                    <td>{p.boundaries?.sixes || 0}</td>
                                                    <td>{p.strikeRate || ((p.runs / Math.max(1, p.balls)) * 100).toFixed(1)}</td>
                                                    <td>
                                                        <button
                                                            className="table-wagon-btn"
                                                            onClick={() => {
                                                                setSelectedBatsmanForWagon(p);
                                                                setShowWagonWheel(true);
                                                            }}
                                                            data-tooltip="View Wagon Wheel"
                                                        >
                                                            <MdPieChart />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="extras-row">
                                    <span>Extras: <strong>{battingTeam.totalExtraAmount || 0}</strong> (wides, no balls, byes)</span>
                                    <span>Total Score: <strong>{battingTeam.totalRuns}/{battingTeam.totalWickets} ({battingTeam.overs} ov)</strong></span>
                                </div>
                            </div>

                            {/* Bowling Analysis */}
                            <div className="scorecard-block">
                                <h3 className="block-title">Bowling • {bowlingTeam.name}</h3>
                                <div className="table-responsive">
                                    <table className="score-table">
                                        <thead>
                                            <tr>
                                                <th>Bowler</th>
                                                <th>O</th>
                                                <th>M</th>
                                                <th>R</th>
                                                <th>W</th>
                                                <th>Econ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bowlersList.map((b, idx) => (
                                                <tr key={b.id || idx}>
                                                    <td className="player-name-cell">
                                                        <strong>{b.name}</strong>
                                                    </td>
                                                    <td>{b.overs}</td>
                                                    <td>{b.maidens || 0}</td>
                                                    <td className="runs-cell">{b.runs}</td>
                                                    <td className="wickets-cell">{b.wickets}</td>
                                                    <td>{b.economy || ((b.runs / Math.max(1, b.overs)).toFixed(2))}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Fall of Wickets */}
                            {fallOfWickets.length > 0 && (
                                <div className="scorecard-block">
                                    <h3 className="block-title">Fall of Wickets</h3>
                                    <div className="fow-pills-list">
                                        {fallOfWickets.map((w, idx) => (
                                            <div key={idx} className="fow-pill">
                                                <span className="fow-score">{w.score}/{idx + 1}</span>
                                                <span className="fow-batsman">{w.batsman}</span>
                                                <span className="fow-ov">({w.overs} ov)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Commentary Stream Column */}
                        <div className="ls-commentary-wrap">
                            <div className="commentary-card">
                                <h3 className="comm-header-title">
                                    <MdTimeline /> Live Commentary
                                </h3>
                                <div className="comm-scroll-list">
                                    {commentaryList.length > 0 ? (
                                        commentaryList.map((c, idx) => (
                                            <div key={idx} className="comm-item">
                                                <div className="comm-ball-badge">
                                                    {c.ball || `${idx + 1}`}
                                                </div>
                                                <div className="comm-text-wrap">
                                                    <p className="comm-text">{c.commentary}</p>
                                                    {c.wagonZone && (
                                                        <span className="comm-zone-tag">
                                                            Zone: {c.wagonZone}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="no-comm-text">Ball-by-ball stream will appear here as deliveries are bowled.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Wagon Wheel Modal */}
            {showWagonWheel && (
                <div className="wagon-modal-overlay" onClick={() => setShowWagonWheel(false)}>
                    <div className="wagon-modal-card" onClick={(e) => e.stopPropagation()}>
                        <button className="wagon-modal-close" onClick={() => setShowWagonWheel(false)}>
                            <MdClose />
                        </button>
                        <h2 className="wagon-modal-title">Wagon Wheel Shot Chart</h2>
                        <WagonWheel
                            shots={wagonShots}
                            batsmanName={selectedBatsmanForWagon?.name}
                            size={400}
                        />
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default LiveScore3D;
