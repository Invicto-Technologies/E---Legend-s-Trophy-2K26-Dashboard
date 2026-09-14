import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TiltCard from '../../components/3D/TiltCard';
import Footer from '../../components/common/Footer/Footer';
import {
    subscribeRankings,
    subscribeActiveTournament,
    resolveTournamentLabels
} from '../../services/rtdbService';
import {
    MdSportsCricket,
    MdFormatListNumbered,
    MdSearch,
    MdArrowForward
} from 'react-icons/md';
import { FaTrophy, FaMedal } from 'react-icons/fa';
import PageLoader from '../../components/common/PageLoader/PageLoader';
import './Rankings3D.css';

const Rankings3D = () => {
    const [rankingData, setRankingData] = useState(null);
    const [activeTournament, setActiveTournament] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('points'); // 'points', 'batters', 'bowlers'
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        let hasTourney = false;
        let hasRank = false;
        const checkDone = () => {
            if (hasTourney && hasRank) {
                setIsLoading(false);
            }
        };

        const unsubTourney = subscribeActiveTournament((tourney) => {
            setActiveTournament(tourney);
            hasTourney = true;
            checkDone();
        });
        const unsubRank = subscribeRankings((data) => {
            setRankingData(data);
            hasRank = true;
            checkDone();
        });

        // Safety fallback timer so loading never blocks indefinitely
        const timer = setTimeout(() => setIsLoading(false), 1200);

        return () => {
            clearTimeout(timer);
            unsubTourney();
            unsubRank();
        };
    }, []);

    const labels = resolveTournamentLabels(activeTournament);

    // 1. Points Table Sorting
    const pointsList = (rankingData?.pointsTable || [])
        .filter(Boolean)
        .sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            return b.nrr - a.nrr;
        })
        .map((t, idx) => ({ ...t, rank: idx + 1 }));

    // Check if points table has actual played data
    const hasPointsData = pointsList.some(
        t => Number(t.played || 0) > 0 || Number(t.pts || 0) > 0 || Number(t.won || 0) > 0
    );

    // 2. Batters Sorting (Higher score first; if equal, higher strike rate first)
    const battersList = Object.values(rankingData?.batters || {})
        .filter(Boolean)
        .sort((a, b) => {
            const scoreA = Number(a.scores ?? a.runs ?? a.rating ?? 0);
            const scoreB = Number(b.scores ?? b.runs ?? b.rating ?? 0);
            if (scoreB !== scoreA) {
                return scoreB - scoreA;
            }
            const srA = Number(a.strikeRate ?? 0);
            const srB = Number(b.strikeRate ?? 0);
            return srB - srA;
        })
        .map((p, idx) => ({ ...p, rank: idx + 1 }));

    const hasBattersData = battersList.length > 0 && battersList.some(
        b => Number(b.scores ?? b.runs ?? b.rating ?? 0) > 0
    );

    // 3. Bowlers Sorting (Higher wickets first; if equal, lower economy first)
    const bowlersList = Object.values(rankingData?.bowlers || {})
        .filter(Boolean)
        .sort((a, b) => {
            const wA = Number(a.wickets ?? a.takenWickets ?? a.rating ?? 0);
            const wB = Number(b.wickets ?? b.takenWickets ?? b.rating ?? 0);
            if (wB !== wA) {
                return wB - wA;
            }
            const getEco = (item) => {
                if (item.economy !== undefined && item.economy !== null && !isNaN(Number(item.economy))) {
                    return Number(item.economy);
                }
                return 999;
            };
            return getEco(a) - getEco(b);
        })
        .map((p, idx) => ({ ...p, rank: idx + 1 }));

    const hasBowlersData = bowlersList.length > 0 && bowlersList.some(
        b => Number(b.wickets ?? b.takenWickets ?? b.rating ?? 0) > 0
    );

    // Check whether the currently selected tab has data to display
    const hasCurrentData =
        (activeTab === 'points' && hasPointsData) ||
        (activeTab === 'batters' && hasBattersData) ||
        (activeTab === 'bowlers' && hasBowlersData);

    // Active dataset for podium & table
    const getActiveData = () => {
        if (activeTab === 'points') return pointsList;
        if (activeTab === 'batters') return battersList;
        return bowlersList;
    };

    const currentList = getActiveData();
    const filteredList = currentList.filter(item => {
        if (!searchQuery) return true;
        const name = item.name || item.team || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const top1 = currentList[0];
    const top2 = currentList[1];
    const top3 = currentList[2];

    const renderPodiumScorePill = (p, pillClass) => {
        if (!p) return null;
        if (activeTab === 'points') {
            return (
                <div className={`podium-score-pill ${pillClass}`}>
                    {p.pts} PTS (NRR {p.nrr})
                </div>
            );
        }
        if (activeTab === 'batters') {
            const sc = p.scores ?? p.runs ?? 0;
            const sr = Number(p.strikeRate || 0).toFixed(2);
            return (
                <div className={`podium-score-pill ${pillClass}`}>
                    {sc} Runs • SR {sr}
                </div>
            );
        }
        // bowlers
        const wk = p.wickets ?? p.takenWickets ?? 0;
        const eco = Number(p.economy || 0).toFixed(2);
        return (
            <div className={`podium-score-pill ${pillClass}`}>
                {wk} Wkts • Econ {eco}
            </div>
        );
    };

    const renderPodiumSubStat = (p) => {
        if (!p) return null;
        if (activeTab === 'batters') {
            const ov = p.overs || p.oversPlayed || (p.balls ? `${Math.floor(p.balls / 6)}.${p.balls % 6}` : '0.0');
            return <span className="podium-sub-stat">Overs Played: {ov}</span>;
        }
        if (activeTab === 'bowlers') {
            const ov = p.overs || p.oversBowled || (p.balls ? `${Math.floor(p.balls / 6)}.${p.balls % 6}` : '0.0');
            return <span className="podium-sub-stat">Overs Bowled: {ov}</span>;
        }
        return null;
    };

    if (isLoading) {
        return (
            <PageLoader
                message="Loading Tournament Standings..."
                subtitle="Calculating team net run rates, points table & player leaderboards"
                tournamentName={labels.fullName || "E-Legends Trophy 2K26"}
            />
        );
    }

    return (
        <div className={`rankings-3d-page ${!hasCurrentData ? 'rankings-no-data-page' : ''}`}>
            {/* Header Hero Section */}
            <section className="rankings-hero">
                <div className="rankings-container">
                    <div className="rankings-badge">
                        OFFICIAL TOURNAMENT STANDINGS
                    </div>
                    <h1 className="rankings-title">Tournament Leaderboards</h1>
                    <p className="rankings-subtitle">
                        Live dynamic points table and individual performances for{' '}
                        <strong>{labels.fullName}</strong>.
                    </p>

                    {/* Navigation Tabs */}
                    <div className="rankings-nav-tabs">
                        <button
                            className={`r-tab-btn ${activeTab === 'points' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('points'); setSearchQuery(''); }}
                        >
                            <FaTrophy /> Points Table
                        </button>
                        <button
                            className={`r-tab-btn ${activeTab === 'batters' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('batters'); setSearchQuery(''); }}
                        >
                            <MdSportsCricket /> Top Batters
                        </button>
                        <button
                            className={`r-tab-btn ${activeTab === 'bowlers' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('bowlers'); setSearchQuery(''); }}
                        >
                            <MdFormatListNumbered /> Leading Bowlers
                        </button>
                    </div>
                </div>
            </section>

            {/* Unified Background Wrapper for Podium Stage & Table Sections */}
            <div className="rankings-stage-table-wrapper">
                {/* 3D Holographic Podium Stage (Top 3) - Only shown if table is filled with data */}
                {hasCurrentData && (
                    <section className="podium-stage-section">
                        <div className="rankings-container">
                            <div className="podium-stage-grid">
                                {/* 2nd Place Podium (Silver) */}
                                {top2 && (
                                    <TiltCard className="podium-card silver" maxTilt={10}>
                                        <div className="podium-pedestal-rank silver-tag">
                                            <FaMedal /> 2nd Place
                                        </div>
                                        <div className="podium-avatar-wrap silver-border">
                                            <span className="podium-rank-num">2</span>
                                        </div>
                                        <h3 className="podium-name">{top2.name || top2.team}</h3>
                                        <span className="podium-team-sub">{top2.name ? top2.team : 'Faculty Batch'}</span>
                                        {renderPodiumScorePill(top2, 'silver-pill')}
                                        {renderPodiumSubStat(top2)}
                                        <div className="podium-base-block silver-base">
                                            <span>2ND</span>
                                        </div>
                                    </TiltCard>
                                )}

                                {/* 1st Place Podium (Gold - Web Style Cyan / Platinum Accent) */}
                                {top1 && (
                                    <TiltCard className="podium-card gold" maxTilt={10}>
                                        <div className="podium-crown-icon">
                                            <FaTrophy />
                                        </div>
                                        <div className="podium-pedestal-rank gold-tag">
                                            <FaMedal /> Champion
                                        </div>
                                        <div className="podium-avatar-wrap gold-border">
                                            <span className="podium-rank-num gold-text">1</span>
                                        </div>
                                        <h3 className="podium-name gold-name">{top1.name || top1.team}</h3>
                                        <span className="podium-team-sub">{top1.name ? top1.team : 'Faculty Batch'}</span>
                                        {renderPodiumScorePill(top1, 'gold-pill')}
                                        {renderPodiumSubStat(top1)}
                                        <div className="podium-base-block gold-base">
                                            <span>1ST</span>
                                        </div>
                                    </TiltCard>
                                )}

                                {/* 3rd Place Podium (Bronze - Web Style Emerald Accent) */}
                                {top3 && (
                                    <TiltCard className="podium-card bronze" maxTilt={10}>
                                        <div className="podium-pedestal-rank bronze-tag">
                                            <FaMedal /> 3rd Place
                                        </div>
                                        <div className="podium-avatar-wrap bronze-border">
                                            <span className="podium-rank-num">3</span>
                                        </div>
                                        <h3 className="podium-name">{top3.name || top3.team}</h3>
                                        <span className="podium-team-sub">{top3.name ? top3.team : 'Faculty Batch'}</span>
                                        {renderPodiumScorePill(top3, 'bronze-pill')}
                                        {renderPodiumSubStat(top3)}
                                        <div className="podium-base-block bronze-base">
                                            <span>3RD</span>
                                        </div>
                                    </TiltCard>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* Detailed Table Section or Attractive Professional Empty State */}
                <section className="rankings-table-section">
                    <div className="rankings-container">
                        {hasCurrentData ? (
                            <>
                                {/* Search box is ONLY shown for Batters and Bowlers (No search in Points Table) */}
                                {activeTab !== 'points' && (
                                    <div className="table-controls-bar">
                                        <div className="search-box">
                                            <MdSearch className="search-icon" />
                                            <input
                                                type="text"
                                                placeholder={`Search in ${activeTab === 'batters' ? 'batters' : 'bowlers'}...`}
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="rankings-table-wrap">
                                    {activeTab === 'points' ? (
                                        /* Points Table */
                                        <table className="rankings-table">
                                            <thead>
                                                <tr>
                                                    <th><span className="col-full">Rank</span><span className="col-short">#</span></th>
                                                    <th style={{ textAlign: 'left' }}><span className="col-full">Team</span><span className="col-short">Team</span></th>
                                                    <th style={{ textAlign: 'center' }}><span className="col-full">Played</span><span className="col-short">P</span></th>
                                                    <th style={{ textAlign: 'center' }}><span className="col-full">Won</span><span className="col-short">W</span></th>
                                                    <th style={{ textAlign: 'center' }}><span className="col-full">Lost</span><span className="col-short">L</span></th>
                                                    <th style={{ textAlign: 'center' }}><span className="col-full">NR</span><span className="col-short">D</span></th>
                                                    <th style={{ textAlign: 'center' }}><span className="col-full">NRR</span><span className="col-short">N</span></th>
                                                    <th style={{ textAlign: 'center' }}><span className="col-full">PTS</span><span className="col-short">PTS</span></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredList.map((t) => (
                                                    <tr key={t.id || t.team} className={t.rank === 1 ? 'gold-row' : ''}>
                                                        <td className="rank-cell">#{t.rank}</td>
                                                        <td className="team-cell" style={{ textAlign: 'left' }}>
                                                            <strong>{t.team}</strong>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>{t.played}</td>
                                                        <td style={{ textAlign: 'center' }}>{t.won}</td>
                                                        <td style={{ textAlign: 'center' }}>{t.lost}</td>
                                                        <td style={{ textAlign: 'center' }}>{t.nr || 0}</td>
                                                        <td className={t.nrr >= 0 ? 'nrr-pos' : 'nrr-neg'} style={{ textAlign: 'center' }}>{t.nrr}</td>
                                                        <td className="pts-cell" style={{ textAlign: 'center' }}>{t.pts}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : activeTab === 'batters' ? (
                                        /* Batters Leaderboard Table */
                                        <table className="rankings-table">
                                            <thead>
                                                <tr>
                                                    <th><span className="col-full">Rank</span><span className="col-short">#</span></th>
                                                    <th><span className="col-full">Batter's Name</span><span className="col-short">Batter's Name</span></th>
                                                    <th style={{ textAlign: 'center' }}><span className="col-full">Team</span><span className="col-short">Team</span></th>
                                                    <th style={{ textAlign: 'center' }}><span className="col-full">Score (Runs)</span><span className="col-short">R</span></th>
                                                    <th style={{ textAlign: 'center' }}><span className="col-full">Overs Played</span><span className="col-short">O</span></th>
                                                    <th style={{ textAlign: 'center' }}><span className="col-full">Strike Rate</span><span className="col-short">SR</span></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredList.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" style={{ textAlign: 'center', padding: '36px 18px', color: '#94a3b8' }}>
                                                            No matching batters found for &quot;{searchQuery}&quot;.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredList.map((p) => (
                                                        <tr key={p.id || p.name} className={p.rank <= 3 ? `top-${p.rank}-row` : ''}>
                                                            <td className="rank-cell">#{p.rank}</td>
                                                            <td className="player-cell">
                                                                <strong>{p.name}</strong>
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <span className="team-badge-pill">{p.team}</span>
                                                            </td>
                                                            <td className="score-cell" style={{ textAlign: 'center' }}>
                                                                <span className="score-bold">{p.scores ?? p.runs ?? 0}</span>
                                                            </td>
                                                            <td className="overs-cell" style={{ textAlign: 'center' }}>
                                                                {p.overs || p.oversPlayed || (p.balls ? `${Math.floor(p.balls / 6)}.${p.balls % 6}` : '0.0')}
                                                            </td>
                                                            <td className="sr-cell" style={{ textAlign: 'center' }}>
                                                                <span className="rate-pill sr-pill">
                                                                    {Number(p.strikeRate || 0).toFixed(2)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    ) : (
                                        /* Bowlers Leaderboard Table */
                                        <table className="rankings-table">
                                            <thead>
                                                <tr>
                                                    <th><span className="col-full">Rank</span><span className="col-short">#</span></th>
                                                    <th><span className="col-full">Bowler's Name</span><span className="col-short">Bowler's Name</span></th>
                                                    <th style={{ textAlign: 'center' }}><span className="col-full">Team</span><span className="col-short">Team</span></th>
                                                    <th style={{ textAlign: 'center' }}><span className="col-full">Wickets Taken</span><span className="col-short">W</span></th>
                                                    <th style={{ textAlign: 'center' }}><span className="col-full">Overs Bowled</span><span className="col-short">O</span></th>
                                                    <th style={{ textAlign: 'center' }}><span className="col-full">Economy</span><span className="col-short">ECO</span></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredList.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" style={{ textAlign: 'center', padding: '36px 18px', color: '#94a3b8' }}>
                                                            No matching bowlers found for &quot;{searchQuery}&quot;.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredList.map((p) => (
                                                        <tr key={p.id || p.name} className={p.rank <= 3 ? `top-${p.rank}-row` : ''}>
                                                            <td className="rank-cell">#{p.rank}</td>
                                                            <td className="player-cell">
                                                                <strong>{p.name}</strong>
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <span className="team-badge-pill">{p.team}</span>
                                                            </td>
                                                            <td className="score-cell" style={{ textAlign: 'center' }}>
                                                                <span className="score-bold">{p.wickets ?? p.takenWickets ?? 0}</span>
                                                            </td>
                                                            <td className="overs-cell" style={{ textAlign: 'center' }}>
                                                                {p.overs || p.oversBowled || (p.balls ? `${Math.floor(p.balls / 6)}.${p.balls % 6}` : '0.0')}
                                                            </td>
                                                            <td className="eco-cell" style={{ textAlign: 'center' }}>
                                                                <span className="rate-pill eco-pill">
                                                                    {Number(p.economy || 0).toFixed(2)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Attractive & Professional Empty State Cards */
                            <div className="rankings-empty-state">
                                <div className={`r-empty-icon-wrap ${activeTab}`}>
                                    {activeTab === 'points' && <FaTrophy />}
                                    {activeTab === 'batters' && <MdSportsCricket />}
                                    {activeTab === 'bowlers' && <MdFormatListNumbered />}
                                </div>
                                <div className="r-empty-info">
                                    <h3>
                                        {activeTab === 'points' && 'Points Table Standings Pending'}
                                        {activeTab === 'batters' && 'Top Batters Leaderboard Pending'}
                                        {activeTab === 'bowlers' && 'Leading Bowlers Leaderboard Pending'}
                                    </h3>
                                    <p>
                                        {activeTab === 'points' &&
                                            `Official standings, team points, and net run rates for ${labels.fullName} will calculate and appear here once tournament fixtures commence.`}
                                        {activeTab === 'batters' &&
                                            `Individual batting strike rates, boundary records, and aggregate tournament runs for ${labels.fullName} will update live as innings unfold.`}
                                        {activeTab === 'bowlers' &&
                                            `Tournament bowling figures, leading wicket-takers, and economy impact ratings for ${labels.fullName} will be tracked from the opening over.`}
                                    </p>
                                </div>
                                <div className="r-empty-action">
                                    <Link to="/fixtures" className="r-empty-btn">
                                        View Match Schedule <MdArrowForward />
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Bottom Bar for One-Page No-Data View vs Full Footer for Data View */}
            {hasCurrentData ? (
                <Footer />
            ) : (
                <footer className="rankings-bottom-bar">
                    <div className="rankings-container rankings-bottom-inner">
                        <span>© {labels.year} {labels.fullName}. All rights reserved.</span>
                        <div className="rankings-bottom-links">
                            <Link to="/home">Home</Link>
                            <Link to="/fixtures">Fixtures</Link>
                            <Link to="/live">Live Score</Link>
                            <Link to="/history">History</Link>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
};

export default Rankings3D;
