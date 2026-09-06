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
import './Rankings3D.css';

const Rankings3D = () => {
    const [rankingData, setRankingData] = useState(null);
    const [activeTournament, setActiveTournament] = useState(null);
    const [activeTab, setActiveTab] = useState('points'); // 'points', 'batters', 'bowlers'
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const unsubTourney = subscribeActiveTournament((tourney) => setActiveTournament(tourney));
        const unsubRank = subscribeRankings((data) => setRankingData(data));
        return () => {
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

    // 2. Batters Sorting
    const battersList = Object.values(rankingData?.batters || {})
        .filter(Boolean)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .map((p, idx) => ({ ...p, rank: idx + 1 }));

    const hasBattersData = battersList.length > 0 && battersList.some(
        b => Number(b.rating || 0) > 0 || Number(b.runs || 0) > 0
    );

    // 3. Bowlers Sorting
    const bowlersList = Object.values(rankingData?.bowlers || {})
        .filter(Boolean)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .map((p, idx) => ({ ...p, rank: idx + 1 }));

    const hasBowlersData = bowlersList.length > 0 && bowlersList.some(
        b => Number(b.rating || 0) > 0 || Number(b.wickets || 0) > 0
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

    return (
        <div className={`rankings-3d-page ${!hasCurrentData ? 'rankings-no-data-page' : ''}`}>
            <div className="rankings-hero">
                <div className="rankings-container">
                    <div className="rankings-tag-badge">
                        <span className="rankings-tag-dot" />
                        <span className="rankings-tag">{labels.fullName.toUpperCase()}</span>
                    </div>
                    <h1 className="rankings-title">Tournament Standings &amp; Stats</h1>
                    <p className="rankings-subtitle">
                        Celebrating the champions, highest run machines, and lethal wicket-takers of {labels.fullName}.
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
            </div>

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
                                    <div className="podium-score-pill silver-pill">
                                        {activeTab === 'points'
                                            ? `${top2.pts} PTS (NRR ${top2.nrr})`
                                            : `${top2.rating} Rating`}
                                    </div>
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
                                    <div className="podium-score-pill gold-pill">
                                        {activeTab === 'points'
                                            ? `${top1.pts} PTS (NRR ${top1.nrr})`
                                            : `${top1.rating} Rating`}
                                    </div>
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
                                    <div className="podium-score-pill bronze-pill">
                                        {activeTab === 'points'
                                            ? `${top3.pts} PTS (NRR ${top3.nrr})`
                                            : `${top3.rating} Rating`}
                                    </div>
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
                                                <th>Rank</th>
                                                <th>Team</th>
                                                <th>Played</th>
                                                <th>Won</th>
                                                <th>Lost</th>
                                                <th>NR</th>
                                                <th>NRR</th>
                                                <th>PTS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredList.map((t) => (
                                                <tr key={t.id || t.team} className={t.rank === 1 ? 'gold-row' : ''}>
                                                    <td className="rank-cell">#{t.rank}</td>
                                                    <td className="team-cell">
                                                        <strong>{t.team}</strong>
                                                    </td>
                                                    <td>{t.played}</td>
                                                    <td>{t.won}</td>
                                                    <td>{t.lost}</td>
                                                    <td>{t.nr || 0}</td>
                                                    <td className={t.nrr >= 0 ? 'nrr-pos' : 'nrr-neg'}>{t.nrr}</td>
                                                    <td className="pts-cell">{t.pts}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    /* Batters or Bowlers Table */
                                    <table className="rankings-table">
                                        <thead>
                                            <tr>
                                                <th>Rank</th>
                                                <th>Player Name</th>
                                                <th>Team</th>
                                                <th>Rating / Impact</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredList.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" style={{ textAlign: 'center', padding: '36px 18px', color: '#94a3b8' }}>
                                                        No matching players found for &quot;{searchQuery}&quot;.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredList.map((p) => (
                                                    <tr key={p.id || p.name} className={p.rank <= 3 ? `top-${p.rank}-row` : ''}>
                                                        <td className="rank-cell">#{p.rank}</td>
                                                        <td className="player-cell">
                                                            <strong>{p.name}</strong>
                                                        </td>
                                                        <td>
                                                            <span className="team-badge-pill">{p.team}</span>
                                                        </td>
                                                        <td className="rating-cell">{p.rating}</td>
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
