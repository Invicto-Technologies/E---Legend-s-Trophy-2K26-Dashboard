import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TiltCard from '../../components/3D/TiltCard';
import Footer from '../../components/common/Footer/Footer';
import {
    subscribeTournamentIndex,
    subscribeTournamentEdition,
    subscribeActiveTournament,
    resolveTournamentKey
} from '../../services/rtdbService';
import {
    MdEmojiEvents,
    MdMilitaryTech,
    MdSportsCricket,
    MdCalendarToday,
    MdLocationOn,
    MdClose,
    MdStars,
    MdFormatListNumbered,
    MdNewspaper,
    MdPerson,
    MdArrowForward
} from 'react-icons/md';
import './History3D.css';

const History3D = () => {
    const { editionId: routeEditionId } = useParams();
    const navigate = useNavigate();

    const [tournamentIndex, setTournamentIndex] = useState([]);
    const [activeTourney, setActiveTourney] = useState(null);
    const [selectedEditionId, setSelectedEditionId] = useState(routeEditionId || '2K25');
    const [editionData, setEditionData] = useState(null);
    const [activeTab, setActiveTab] = useState('matches'); // 'matches' | 'standings' | 'leaderboards' | 'stories'
    const [activeScorecardModal, setActiveScorecardModal] = useState(null);

    // 1. Subscribe to Active Tournament (to exclude it from history)
    useEffect(() => {
        const unsub = subscribeActiveTournament((tourney) => {
            setActiveTourney(tourney);
        });
        return () => unsub();
    }, []);

    // 2. Subscribe to Tournament Index
    useEffect(() => {
        const unsub = subscribeTournamentIndex((indexList) => {
            if (indexList && indexList.length > 0) {
                setTournamentIndex(indexList);
            }
        });
        return () => unsub();
    }, []);

    // Derive active tournament id
    const activeTournamentId = activeTourney?.activeId || "E-Legend's Trophy 2K26";

    // Filter out the active tournament (active tournament no need to show here)
    const historyTournaments = (tournamentIndex || []).filter((ed) => {
        const isMatchingActive = 
            ed.id === activeTournamentId || 
            resolveTournamentKey(ed.id) === resolveTournamentKey(activeTournamentId) ||
            ed.status === 'active';
        return !isMatchingActive;
    });

    // Ensure selectedEditionId defaults to a valid historical tournament
    useEffect(() => {
        if (historyTournaments.length > 0) {
            const currentIsValid = historyTournaments.some(
                (t) => t.id === selectedEditionId || 
                       t.editionId === selectedEditionId || 
                       resolveTournamentKey(t.id) === resolveTournamentKey(selectedEditionId)
            );
            if (!currentIsValid) {
                const defaultEd = historyTournaments.find(
                    (i) => i.id === "E-Legend's Trophy 2K25" || i.id === '2K25' || i.name?.includes('2K25')
                ) || historyTournaments[0];
                if (defaultEd) {
                    setSelectedEditionId(defaultEd.id);
                }
            }
        }
    }, [historyTournaments, selectedEditionId]);

    // 3. Subscribe to selected tournament edition data
    useEffect(() => {
        if (!selectedEditionId) return;
        const unsub = subscribeTournamentEdition(selectedEditionId, (data) => {
            setEditionData(data);
        });
        return () => unsub();
    }, [selectedEditionId]);

    const handleSelectEdition = (id) => {
        setSelectedEditionId(id);
        navigate(`/history/${id}`);
    };

    const info = editionData?.info || {};
    const awards = editionData?.awards || [];

    // Extract matches from either tournament root keys (1st..Final) or matches object
    const matchKeys = ['1st', '2nd', '3rd', '4th', '5th', '6th', 'Final'];
    const matchesList = (editionData?.matches && Object.keys(editionData.matches).length > 0)
        ? Object.keys(editionData.matches).map((key) => ({ id: key, ...editionData.matches[key] }))
        : matchKeys
            .filter((k) => editionData?.[k])
            .map((k) => ({ id: k, ...editionData[k] }));

    const rankings = editionData?.RankingData || editionData?.rankings || {};
    const pointsTable = (rankings.pointsTable || []).filter(Boolean);
    const batters = Object.values(rankings.batters || {});
    const bowlers = Object.values(rankings.bowlers || {});
    const stories = Object.values(editionData?.AllStories || editionData?.stories || {});

    return (
        <div className="history-3d-page">
            {/* Hero Section */}
            <section className="history-hero">
                <div className="history-hero-glow" />
                <div className="history-container">
                    <span className="history-tag">
                        <MdMilitaryTech /> TOURNAMENT ARCHIVE &amp; HALL OF FAME
                    </span>
                    <h1 className="history-title">
                        E-LEGENDS <span className="gradient-text">HISTORY</span>
                    </h1>
                    <p className="history-subtitle">
                        Celebrating the champions, iconic clashes, and historic records of the Prof. A. Thurairajah Memorial Cricket Tournament across past completed editions.
                    </p>

                    {/* Interactive Edition Timeline Switcher (Historical Tournaments Only) */}
                    <div className="history-timeline-bar">
                        {historyTournaments.map((ed) => (
                            <button
                                key={ed.id}
                                className={`timeline-tab-btn ${
                                    selectedEditionId === ed.id ||
                                    resolveTournamentKey(selectedEditionId) === resolveTournamentKey(ed.id)
                                        ? 'active'
                                        : ''
                                }`}
                                onClick={() => handleSelectEdition(ed.id)}
                            >
                                <span className="timeline-year">{ed.year || ed.editionId || ed.id}</span>
                                <span className="timeline-name">{ed.name || `E-Legends ${ed.id}`}</span>
                                <span className="timeline-badge-done">Completed</span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Main History Content */}
            <main className="history-content-section">
                <div className="history-container">
                    {/* Edition Metadata Strip */}
                    <div className="edition-header-strip">
                        <div className="eh-left">
                            <h2 className="eh-title">{info.title || `E-Legends Trophy ${selectedEditionId}`}</h2>
                            <div className="eh-meta">
                                {info.dates && (
                                    <span className="eh-meta-item">
                                        <MdCalendarToday /> {info.dates}
                                    </span>
                                )}
                                {info.venue && (
                                    <span className="eh-meta-item">
                                        <MdLocationOn /> {info.venue}
                                    </span>
                                )}
                            </div>
                        </div>

                        {info.champion && info.status === 'completed' && (
                            <div className="eh-champion-pill">
                                <MdEmojiEvents className="eh-trophy-icon" />
                                <div>
                                    <span className="eh-champ-sub">TOURNAMENT CHAMPION</span>
                                    <span className="eh-champ-name">{info.champion}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Champion & Awards Showcase for Completed Tournament */}
                    {info.status === 'completed' && (
                        <div className="hall-of-fame-grid">
                            {/* 3D Champion Pedestal */}
                            <TiltCard className="champion-card-hero" maxTilt={8}>
                                <div className="champ-crown-glow" />
                                <div className="champ-trophy-badge">
                                    <MdEmojiEvents />
                                </div>
                                <span className="champ-label">TITLE WINNERS • {selectedEditionId}</span>
                                <h3 className="champ-title">{info.champion}</h3>
                                <p className="champ-note">
                                    {info.championNote || 'Undefeated Champion Run dominating throughout the tournament series.'}
                                </p>
                                <div className="champ-stats-row">
                                    <div className="cs-item">
                                        <MdEmojiEvents className="cs-icon" />
                                        <strong>1st Place</strong>
                                        <span>Champion Trophy</span>
                                    </div>
                                    <div className="cs-item">
                                        <MdMilitaryTech className="cs-icon" />
                                        <strong>Finalist</strong>
                                        <span>{info.runnerUp || 'E22 Batch'}</span>
                                    </div>
                                    <div className="cs-item">
                                        <MdSportsCricket className="cs-icon" />
                                        <strong>{info.totalMatches || 7} Matches</strong>
                                        <span>Series Concluded</span>
                                    </div>
                                </div>
                            </TiltCard>

                            {/* Honors & Awards Cards */}
                            <div className="awards-column">
                                <h3 className="awards-col-title">
                                    <MdStars /> Series Honors & Awards
                                </h3>
                                <div className="awards-grid">
                                    {awards.map((award, idx) => (
                                        <div key={idx} className="award-item-card">
                                            <div className="award-icon-box">
                                                {award.icon === 'trophy' && <MdEmojiEvents className="gold" />}
                                                {award.icon === 'medal' && <MdMilitaryTech className="silver" />}
                                                {award.icon === 'star' && <MdStars className="cyan" />}
                                                {award.icon === 'bat' && <MdSportsCricket className="gold" />}
                                                {award.icon === 'ball' && <MdSportsCricket className="purple" />}
                                                {!['trophy', 'medal', 'star', 'bat', 'ball'].includes(award.icon) && <MdStars />}
                                            </div>
                                            <div className="award-item-details">
                                                <span className="award-name">{award.title}</span>
                                                <h4 className="award-winner">
                                                    {award.recipient} {award.team ? `(${award.team})` : ''}
                                                </h4>
                                                <span className="award-stat">{award.stat || award.note}</span>
                                            </div>
                                            {award.tag && <span className="award-pill-tag">{award.tag}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Sub-tabs */}
                    <div className="history-subtabs-nav">
                        <button
                            className={`h-subtab-btn ${activeTab === 'matches' ? 'active' : ''}`}
                            onClick={() => setActiveTab('matches')}
                        >
                            <MdSportsCricket /> Match Results ({matchesList.length})
                        </button>
                        <button
                            className={`h-subtab-btn ${activeTab === 'standings' ? 'active' : ''}`}
                            onClick={() => setActiveTab('standings')}
                        >
                            <MdFormatListNumbered /> Final Standings
                        </button>
                        <button
                            className={`h-subtab-btn ${activeTab === 'leaderboards' ? 'active' : ''}`}
                            onClick={() => setActiveTab('leaderboards')}
                        >
                            <MdPerson /> Player Leaderboards
                        </button>
                        {stories.length > 0 && (
                            <button
                                className={`h-subtab-btn ${activeTab === 'stories' ? 'active' : ''}`}
                                onClick={() => setActiveTab('stories')}
                            >
                                <MdNewspaper /> Tournament Stories ({stories.length})
                            </button>
                        )}
                    </div>

                    {/* Tab 1: Historic Matches */}
                    {activeTab === 'matches' && (
                        <div className="history-matches-deck">
                            {matchesList.length === 0 ? (
                                <div className="history-empty-card">
                                    <p>No matches recorded yet for this tournament edition.</p>
                                </div>
                            ) : (
                                <div className="history-matches-grid">
                                    {matchesList.map((match) => {
                                        const c = match.common || {};
                                        const t1 = match.team1 || {};
                                        const t2 = match.team2 || {};
                                        return (
                                            <TiltCard key={match.id} className="history-match-card" maxTilt={8}>
                                                <div className="hm-header">
                                                    <span className="hm-title-badge">{c.title || match.id} Match</span>
                                                    <span className="hm-date">{c.date} • {c.time}</span>
                                                </div>

                                                <h3 className="hm-teams">{c.teams || `${t1.name || 'Team 1'} vs ${t2.name || 'Team 2'}`}</h3>

                                                {/* Score summary */}
                                                <div className="hm-scores-box">
                                                    <div className="hm-team-score">
                                                        <span style={{ marginRight: '35px' }}>{t1.name || 'Team 1'}</span>
                                                        <strong>{t1.totalRuns ?? 0}/{t1.totalWickets ?? 0} <small>({t1.overs ?? 0} ov)</small></strong>
                                                    </div>
                                                    <div className="hm-team-score">
                                                        <span>{t2.name || 'Team 2'}</span>
                                                        <strong>{t2.totalRuns ?? 0}/{t2.totalWickets ?? 0} <small>({t2.overs ?? 0} ov)</small></strong>
                                                    </div>
                                                </div>

                                                <p className="hm-result-text">{c.result || 'Match Completed'}</p>

                                                {c.mom && (
                                                    <div className="hm-mom-pill">
                                                        <span>Player of the Match: <strong>{c.mom}</strong></span>
                                                    </div>
                                                )}

                                                <button
                                                    className="hm-view-scorecard-btn"
                                                    onClick={() => setActiveScorecardModal(match)}
                                                >
                                                    View Full Scorecard <MdArrowForward />
                                                </button>
                                            </TiltCard>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 2: Final Standings Table */}
                    {activeTab === 'standings' && (
                        <div className="history-standings-deck">
                            <div className="history-table-card">
                                <div className="table-responsive">
                                    <table className="history-data-table">
                                        <thead>
                                            <tr>
                                                <th>POS</th>
                                                <th>TEAM</th>
                                                <th>PLAYED</th>
                                                <th>WON</th>
                                                <th>LOST</th>
                                                <th>NRR</th>
                                                <th>PTS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pointsTable.map((row, idx) => (
                                                <tr key={idx} className={idx === 0 ? 'champion-table-row' : ''}>
                                                    <td className="pos-cell">
                                                        {idx === 0 ? (
                                                            <span className="champ-pos-tag"><MdEmojiEvents /> 1</span>
                                                        ) : (
                                                            idx + 1
                                                        )}
                                                    </td>
                                                    <td className="team-cell">
                                                        <strong>{row.team}</strong>
                                                        {idx === 0 && <span className="winner-badge">CHAMPION</span>}
                                                    </td>
                                                    <td>{row.played}</td>
                                                    <td>{row.won}</td>
                                                    <td>{row.lost}</td>
                                                    <td className={row.nrr >= 0 ? 'nrr-pos' : 'nrr-neg'}>
                                                        {row.nrr > 0 ? `+${row.nrr}` : row.nrr}
                                                    </td>
                                                    <td className="pts-cell">{row.pts}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Player Leaderboards */}
                    {activeTab === 'leaderboards' && (
                        <div className="history-leaderboards-deck">
                            <div className="leaderboards-split">
                                {/* Top Batters */}
                                <div className="history-table-card">
                                    <div className="board-header">
                                        <MdSportsCricket className="board-icon gold" />
                                        <h3>Top Run Scorers (Batters)</h3>
                                    </div>
                                    <table className="history-data-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>PLAYER</th>
                                                <th>TEAM</th>
                                                <th>RUNS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {batters.slice(0, 10).map((b, idx) => (
                                                <tr key={idx} className={idx === 0 ? 'leader-row' : ''}>
                                                    <td>{idx + 1}</td>
                                                    <td><strong>{b.name}</strong></td>
                                                    <td><span className="team-badge-sub">{b.team}</span></td>
                                                    <td className="stat-highlight">{b.rating}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Top Bowlers */}
                                <div className="history-table-card">
                                    <div className="board-header">
                                        <MdSportsCricket className="board-icon purple" />
                                        <h3>Top Wicket Takers (Bowlers)</h3>
                                    </div>
                                    <table className="history-data-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>PLAYER</th>
                                                <th>TEAM</th>
                                                <th>WICKETS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bowlers.slice(0, 10).map((b, idx) => (
                                                <tr key={idx} className={idx === 0 ? 'leader-row' : ''}>
                                                    <td>{idx + 1}</td>
                                                    <td><strong>{b.name}</strong></td>
                                                    <td><span className="team-badge-sub">{b.team}</span></td>
                                                    <td className="stat-highlight">{b.rating}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 4: Stories */}
                    {activeTab === 'stories' && (
                        <div className="history-stories-deck">
                            <div className="stories-archive-grid">
                                {stories.map((story) => (
                                    <div key={story.id} className="history-story-card">
                                        <span className="story-archive-time">{story.time}</span>
                                        <h4 className="story-archive-topic">{story.topic}</h4>
                                        <p className="story-archive-desc">{story.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Scorecard Modal */}
            {activeScorecardModal && (() => {
                const modal = activeScorecardModal;
                const team1 = modal.team1 || {};
                const team2 = modal.team2 || {};
                const common = modal.common || {};

                // Innings 1: Team 1 batting, Team 2 bowling
                const inn1Batters = Object.values(team1.players || {});
                let inn1Bowlers = Object.values(team2.bowlers || {});
                let inn1BowlingTeam = team2.name || 'Bowling Attack';
                if (inn1Bowlers.length === 0 && Object.values(team1.bowlers || {}).length > 0) {
                    inn1Bowlers = Object.values(team1.bowlers);
                    inn1BowlingTeam = team1.name || 'Bowlers';
                }

                // Innings 2: Team 2 batting, Team 1 bowling
                const inn2Batters = Object.values(team2.players || {});
                let inn2Bowlers = Object.values(team1.bowlers || {});
                let inn2BowlingTeam = team1.name || 'Bowling Attack';
                if (inn2Bowlers.length === 0 && Object.values(team2.bowlers || {}).length > 0) {
                    inn2Bowlers = Object.values(team2.bowlers);
                    inn2BowlingTeam = team2.name || 'Bowlers';
                }

                return (
                    <div className="scorecard-modal-overlay" onClick={() => setActiveScorecardModal(null)}>
                        <div className="scorecard-modal-card" onClick={(e) => e.stopPropagation()}>
                            <button className="scorecard-modal-close" onClick={() => setActiveScorecardModal(null)}>
                                <MdClose />
                            </button>

                            <div className="sm-header">
                                {/* Row 1: Match Title (Teams) */}
                                <h2 className="sm-teams">
                                    {common.teams || `${team1.name || 'Team 1'} vs ${team2.name || 'Team 2'}`}
                                </h2>

                                {/* Row 2: Match Label */}
                                <div className="sm-row sm-label-row">
                                    <span className="sm-title-tag">
                                        {common.title 
                                            ? (common.title.toLowerCase().includes('match') 
                                                ? common.title 
                                                : `${common.title} Match Scorecard`)
                                            : 'Match Scorecard'}
                                    </span>
                                </div>

                                {/* Row 3: Date & Time */}
                                {common.date && (
                                    <div className="sm-row sm-meta-row">
                                        <span className="sm-meta-badge">
                                            <MdCalendarToday /> {common.date} {common.time ? `• ${common.time}` : ''}
                                        </span>
                                    </div>
                                )}

                                {/* Row 4: Toss Status ("E21 won the toss and elected to bat first") */}
                                {common.status && (
                                    <div className="sm-row sm-toss-row">
                                        <p className="sm-status">{common.status}</p>
                                    </div>
                                )}

                                {/* Row 5: Match Result */}
                                {common.result && (
                                    <div className="sm-row sm-result-row">
                                        <div className="sm-result-pill">{common.result}</div>
                                    </div>
                                )}
                            </div>

                            {/* Innings 1 Breakdown */}
                            <div className="sm-innings-card">
                                <div className="sm-inn-banner">
                                    <div className="sm-inn-banner-left">
                                        <span className="sm-inn-pill">1ST INNINGS</span>
                                        <h3>{team1.name || 'Team 1'} Batting</h3>
                                    </div>
                                    <div className="sm-inn-score-badge">
                                        <span className="sm-inn-runs">{team1.totalRuns ?? 0}/{team1.totalWickets ?? 0}</span>
                                        <span className="sm-inn-ov">({team1.overs ?? 0} Ov)</span>
                                    </div>
                                </div>

                                {/* Batting Table */}
                                <div className="sm-table-subheading">Batting Performance</div>
                                <div className="table-responsive sm-table-wrap">
                                    <table className="sm-table">
                                        <thead>
                                            <tr>
                                                <th>Batter</th>
                                                <th>Dismissal</th>
                                                <th>R</th>
                                                <th>B</th>
                                                <th>4s</th>
                                                <th>6s</th>
                                                <th>SR</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {inn1Batters.map((p, i) => (
                                                <tr key={p.id || i}>
                                                    <td className="sm-player-name">
                                                        <strong>{p.name}</strong>
                                                        <small>{p.role || 'Batter'}</small>
                                                    </td>
                                                    <td className="sm-dismissal">{p.status || p.dismissal || 'not out'}</td>
                                                    <td className="sm-runs-cell">{p.runs ?? 0}</td>
                                                    <td>{p.balls ?? 0}</td>
                                                    <td>{p.boundaries?.fours ?? 0}</td>
                                                    <td>{p.boundaries?.sixes ?? 0}</td>
                                                    <td className="sm-sr-cell">
                                                        {p.strikeRate ?? (p.balls ? ((p.runs / p.balls) * 100).toFixed(1) : '0.0')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Bowling Table for Innings 1 */}
                                {inn1Bowlers.length > 0 && (
                                    <>
                                        <div className="sm-table-subheading bowling">
                                            {inn1BowlingTeam} Bowling Figures
                                        </div>
                                        <div className="table-responsive sm-table-wrap">
                                            <table className="sm-table bowling-table">
                                                <thead>
                                                    <tr>
                                                        <th>Bowler</th>
                                                        <th>O</th>
                                                        <th>M</th>
                                                        <th>R</th>
                                                        <th>W</th>
                                                        <th>Econ</th>
                                                        <th>Dots</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {inn1Bowlers.map((b, i) => (
                                                        <tr key={b.id || i}>
                                                            <td className="sm-player-name">
                                                                <strong>{b.name}</strong>
                                                                <small>{b.role || 'Bowler'}</small>
                                                            </td>
                                                            <td>{b.overs ?? 0}</td>
                                                            <td>{b.maidens ?? 0}</td>
                                                            <td className="sm-runs-cell">{b.runs ?? 0}</td>
                                                            <td className="sm-wickets-cell">{b.wickets ?? 0}</td>
                                                            <td className="sm-econ-cell">
                                                                {b.economy ?? (b.overs ? (b.runs / Math.max(0.1, b.overs)).toFixed(2) : '0.00')}
                                                            </td>
                                                            <td>{b.dots ?? b.dotBalls ?? '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Innings 2 Breakdown */}
                            <div className="sm-innings-card">
                                <div className="sm-inn-banner">
                                    <div className="sm-inn-banner-left">
                                        <span className="sm-inn-pill">2ND INNINGS</span>
                                        <h3>{team2.name || 'Team 2'} Batting</h3>
                                    </div>
                                    <div className="sm-inn-score-badge">
                                        <span className="sm-inn-runs">{team2.totalRuns ?? 0}/{team2.totalWickets ?? 0}</span>
                                        <span className="sm-inn-ov">({team2.overs ?? 0} Ov)</span>
                                    </div>
                                </div>

                                {/* Batting Table */}
                                <div className="sm-table-subheading">Batting Performance</div>
                                <div className="table-responsive sm-table-wrap">
                                    <table className="sm-table">
                                        <thead>
                                            <tr>
                                                <th>Batter</th>
                                                <th>Dismissal</th>
                                                <th>R</th>
                                                <th>B</th>
                                                <th>4s</th>
                                                <th>6s</th>
                                                <th>SR</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {inn2Batters.map((p, i) => (
                                                <tr key={p.id || i}>
                                                    <td className="sm-player-name">
                                                        <strong>{p.name}</strong>
                                                        <small>{p.role || 'Batter'}</small>
                                                    </td>
                                                    <td className="sm-dismissal">{p.status || p.dismissal || 'not out'}</td>
                                                    <td className="sm-runs-cell">{p.runs ?? 0}</td>
                                                    <td>{p.balls ?? 0}</td>
                                                    <td>{p.boundaries?.fours ?? 0}</td>
                                                    <td>{p.boundaries?.sixes ?? 0}</td>
                                                    <td className="sm-sr-cell">
                                                        {p.strikeRate ?? (p.balls ? ((p.runs / p.balls) * 100).toFixed(1) : '0.0')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Bowling Table for Innings 2 */}
                                {inn2Bowlers.length > 0 && (
                                    <>
                                        <div className="sm-table-subheading bowling">
                                            {inn2BowlingTeam} Bowling Figures
                                        </div>
                                        <div className="table-responsive sm-table-wrap">
                                            <table className="sm-table bowling-table">
                                                <thead>
                                                    <tr>
                                                        <th>Bowler</th>
                                                        <th>O</th>
                                                        <th>M</th>
                                                        <th>R</th>
                                                        <th>W</th>
                                                        <th>Econ</th>
                                                        <th>Dots</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {inn2Bowlers.map((b, i) => (
                                                        <tr key={b.id || i}>
                                                            <td className="sm-player-name">
                                                                <strong>{b.name}</strong>
                                                                <small>{b.role || 'Bowler'}</small>
                                                            </td>
                                                            <td>{b.overs ?? 0}</td>
                                                            <td>{b.maidens ?? 0}</td>
                                                            <td className="sm-runs-cell">{b.runs ?? 0}</td>
                                                            <td className="sm-wickets-cell">{b.wickets ?? 0}</td>
                                                            <td className="sm-econ-cell">
                                                                {b.economy ?? (b.overs ? (b.runs / Math.max(0.1, b.overs)).toFixed(2) : '0.00')}
                                                            </td>
                                                            <td>{b.dots ?? b.dotBalls ?? '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>

                            {common.mom && (
                                <div className="sm-mom-strip">
                                    <MdEmojiEvents className="sm-mom-trophy" />
                                    <span>Player of the Match: <strong>{common.mom}</strong></span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            <Footer />
        </div>
    );
};

export default History3D;
