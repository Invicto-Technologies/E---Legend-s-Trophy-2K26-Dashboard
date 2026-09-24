import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import TiltCard from '../../components/3D/TiltCard';
import Footer from '../../components/common/Footer/Footer';
import {
    subscribeRankings,
    subscribeTeams,
    subscribeActiveTournament,
    resolveTournamentLabels
} from '../../services/rtdbService';
import {
    MdSportsCricket,
    MdFormatListNumbered,
    MdSearch,
    MdArrowForward,
    MdGroups,
    MdShield
} from 'react-icons/md';
import { FaTrophy, FaMedal } from 'react-icons/fa';
import { FaCrown, FaChevronDown, FaCheck } from 'react-icons/fa6';
import { GiStarMedal, GiBaseballGlove } from 'react-icons/gi';
import { PiCricketFill, PiTennisBall } from 'react-icons/pi';
import PageLoader from '../../components/common/PageLoader/PageLoader';
import './Rankings3D.css';

const Rankings3D = () => {
    const [rankingData, setRankingData] = useState(null);
    const [teamsData, setTeamsData] = useState({});
    const [selectedSquadTeamKey, setSelectedSquadTeamKey] = useState('');
    const [squadRoleFilter, setSquadRoleFilter] = useState('All');
    const [activeTournament, setActiveTournament] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('points'); // 'points', 'batters', 'bowlers', 'squads'
    const [searchQuery, setSearchQuery] = useState('');
    const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close custom mobile dropdown on outside click or tap
    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsTeamDropdownOpen(false);
            }
        };
        if (isTeamDropdownOpen) {
            document.addEventListener('mousedown', handleOutsideClick);
            document.addEventListener('touchstart', handleOutsideClick);
        }
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('touchstart', handleOutsideClick);
        };
    }, [isTeamDropdownOpen]);

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
        const unsubTeams = subscribeTeams((teams) => {
            setTeamsData(teams || {});
            if (teams && Object.keys(teams).length > 0) {
                setSelectedSquadTeamKey(prev => prev && teams[prev] ? prev : Object.keys(teams)[0]);
            }
        });

        // Safety fallback timer so loading never blocks indefinitely
        const timer = setTimeout(() => setIsLoading(false), 1200);

        return () => {
            clearTimeout(timer);
            unsubTourney();
            unsubRank();
            unsubTeams();
        };
    }, []);

    const labels = resolveTournamentLabels(activeTournament);

    // 1. Points Table Sorting (Show available database data even if all zero)
    let rawPoints = (rankingData?.pointsTable || []).filter(Boolean);
    if (rawPoints.length === 0 && teamsData && Object.keys(teamsData).length > 0) {
        rawPoints = Object.keys(teamsData).map((key) => ({
            id: key,
            team: teamsData[key]?.name || key,
            played: 0,
            won: 0,
            lost: 0,
            nr: 0,
            nrr: 0,
            pts: 0,
        }));
    }
    const pointsList = rawPoints
        .sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            return b.nrr - a.nrr;
        })
        .map((t, idx) => ({ ...t, rank: idx + 1 }));

    // Check if points table has any teams (show table even if all zeros)
    const hasPointsData = pointsList.length > 0;

    // Whether tournament has actually started (at least one match played)
    const tournamentStarted = pointsList.some(
        t => Number(t.played || 0) > 0
    );

    // Enrich pointsList with logo from teamsData for display
    const enrichedPointsList = pointsList.map(t => {
        // Try to find a matching team in teamsData by name or key
        const matchedTeamKey = Object.keys(teamsData || {}).find(
            key => {
                const td = teamsData[key];
                return (
                    (td?.name || '').toLowerCase() === (t.team || '').toLowerCase() ||
                    key.toLowerCase() === (t.team || '').toLowerCase()
                );
            }
        );
        const matchedTeam = matchedTeamKey ? teamsData[matchedTeamKey] : null;
        return {
            ...t,
            logo: matchedTeam?.logo || t.logo || null,
            fullName: matchedTeam?.name || t.team,
        };
    });

    // 2. Batters Sorting (Higher score first; if equal, higher strike rate first) - Top 20 Performers
    const battersList = Object.values(rankingData?.batters || {})
        .filter(b => {
            if (!b) return false;
            const runs = Number(b.scores ?? b.runs ?? b.rating ?? 0);
            const balls = Number(b.balls ?? 0);
            const overs = Number(b.overs ?? 0);
            return runs > 0 || balls > 0 || overs > 0;
        })
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
        .slice(0, 20)
        .map((p, idx) => ({ ...p, rank: idx + 1 }));

    const hasBattersData = battersList.length > 0 && battersList.some(
        b => Number(b.scores ?? b.runs ?? b.rating ?? 0) > 0 || Number(b.balls ?? 0) > 0
    );

    // 3. Bowlers Sorting (Higher wickets first; if equal, lower economy first) - Top 20 Performers
    const bowlersList = Object.values(rankingData?.bowlers || {})
        .filter(b => {
            if (!b) return false;
            const wickets = Number(b.wickets ?? b.takenWickets ?? b.rating ?? 0);
            const overs = Number(b.overs ?? 0);
            const balls = Number(b.balls ?? 0);
            return wickets > 0 || overs > 0 || balls > 0;
        })
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
        .slice(0, 20)
        .map((p, idx) => ({ ...p, rank: idx + 1 }));

    const hasBowlersData = bowlersList.length > 0 && bowlersList.some(
        b => Number(b.wickets ?? b.takenWickets ?? b.rating ?? 0) > 0 || Number(b.overs ?? 0) > 0
    );

    // Team Squads Computation
    const teamKeys = Object.keys(teamsData || {});
    const activeSquadTeam = (selectedSquadTeamKey && teamsData[selectedSquadTeamKey])
        ? teamsData[selectedSquadTeamKey]
        : (teamKeys.length > 0 ? teamsData[teamKeys[0]] : null);

    const rawSquadPlayers = activeSquadTeam?.players
        ? Object.values(activeSquadTeam.players).sort((a, b) => {
            const orderA = (a.order !== undefined && a.order !== null) ? Number(a.order) : ((a.battingOrder !== undefined && a.battingOrder !== null) ? Number(a.battingOrder) : 9999);
            const orderB = (b.order !== undefined && b.order !== null) ? Number(b.order) : ((b.battingOrder !== undefined && b.battingOrder !== null) ? Number(b.battingOrder) : 9999);
            if (orderA !== orderB) return orderA - orderB;
            return (Number(a.id) || 0) - (Number(b.id) || 0);
        })
        : [];
    const rawReservePlayers = activeSquadTeam?.extraPlayers
        ? Object.values(activeSquadTeam.extraPlayers)
        : [];

    const filterSquadPlayer = (p) => {
        if (!p) return false;
        const matchSearch = !searchQuery || (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchRole = squadRoleFilter === 'All' || p.role === squadRoleFilter;
        return matchSearch && matchRole;
    };

    const displayedSquadPlayers = rawSquadPlayers.filter(filterSquadPlayer);
    const displayedReservePlayers = rawReservePlayers.filter(filterSquadPlayer);

    const getRoleIcon = (role) => {
        switch (role) {
            case 'Bowler':
                // Clean ball icon — unmistakably a bowler
                return <PiTennisBall className="squad-role-ico bowler" />;
            case 'All Rounder':
                // Star medal — versatile, multi-skilled player
                return <GiStarMedal className="squad-role-ico all-rounder" />;
            case 'Wicket Keeper':
                // Fielding/catching glove
                return <GiBaseballGlove className="squad-role-ico wicket-keeper" />;
            case 'Batter':
            default:
                // Cricket bat + ball — clear batter icon
                return <PiCricketFill className="squad-role-ico batter" />;
        }
    };

    // Returns up to 2 initials from a player's name, e.g. "Kamal Perera" → "KP"
    const getPlayerInitials = (name = '') => {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    };

    // Check whether the currently selected tab has data to display
    const hasCurrentData =
        (activeTab === 'points' && hasPointsData) ||
        (activeTab === 'batters' && hasBattersData) ||
        (activeTab === 'bowlers' && hasBowlersData) ||
        (activeTab === 'squads' && teamKeys.length > 0);

    // Active dataset for podium & table
    const getActiveData = () => {
        if (activeTab === 'points') return enrichedPointsList;
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
            const balls = p.balls !== undefined && p.balls !== null
                ? p.balls
                : (p.overs ? (Math.floor(Number(p.overs)) * 6 + Math.round((Number(p.overs) - Math.floor(Number(p.overs))) * 10)) : 0);
            return <span className="podium-sub-stat">Balls Faced: {balls} Balls</span>;
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
                        <button
                            className={`r-tab-btn ${activeTab === 'squads' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('squads'); setSearchQuery(''); setSquadRoleFilter('All'); }}
                        >
                            <MdGroups /> Team Squads
                        </button>
                    </div>
                </div>
            </section>

            {/* Unified Background Wrapper for Podium Stage & Table Sections or Squads Showcase */}
            <div className="rankings-stage-table-wrapper">
                {activeTab === 'squads' ? (
                    <section className="rankings-squads-section">
                        <div className="rankings-container">
                            {teamKeys.length > 0 ? (
                                <>
                                    {/* Combined Competing Teams Selector & Active Squad Spotlight Header */}
                                    <div className={`squad-combined-header ${isTeamDropdownOpen ? 'dropdown-active' : ''}`}>
                                        {/* Top Strip: Competing Team Tabs Switcher */}
                                        <div className={`squad-combined-tabs-row ${isTeamDropdownOpen ? 'dropdown-active' : ''}`}>
                                            <div className="squad-combined-tabs-label">
                                                <MdShield className="selector-icon" />
                                                <span>Competing Teams:</span>
                                            </div>
                                            <div className="squad-combined-tabs-scroll">
                                                {teamKeys.map((key) => {
                                                    const team = teamsData[key] || {};
                                                    const isSelected = (selectedSquadTeamKey || teamKeys[0]) === key;
                                                    const xiCount = team.players ? Object.keys(team.players).length : 0;
                                                    return (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            className={`squad-combined-tab-btn ${isSelected ? 'active' : ''}`}
                                                            onClick={() => {
                                                                setSelectedSquadTeamKey(key);
                                                                setSquadRoleFilter('All');
                                                                setSearchQuery('');
                                                            }}
                                                        >
                                                            <div className="squad-combined-tab-crest">
                                                                {team.logo ? (
                                                                    <img src={team.logo} alt={team.name || key} />
                                                                ) : (
                                                                    <span>{key.slice(0, 3)}</span>
                                                                )}
                                                            </div>
                                                            <span className="squad-combined-tab-name">{key}</span>
                                                            <span className="squad-combined-tab-count">({xiCount})</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Mobile Competing Teams Custom Dropdown */}
                                            <div className="squad-combined-mobile-dropdown" ref={dropdownRef}>
                                                <button
                                                    type="button"
                                                    className={`squad-custom-dropdown-trigger ${isTeamDropdownOpen ? 'open' : ''}`}
                                                    onClick={() => setIsTeamDropdownOpen((prev) => !prev)}
                                                    aria-expanded={isTeamDropdownOpen}
                                                    aria-label="Select Competing Team"
                                                >
                                                    <div className="custom-dropdown-trigger-left">
                                                        <div className="custom-dropdown-crest">
                                                            {activeSquadTeam?.logo ? (
                                                                <img src={activeSquadTeam.logo} alt={activeSquadTeam.name || selectedSquadTeamKey} />
                                                            ) : (
                                                                <span>{(selectedSquadTeamKey || 'TM').slice(0, 3)}</span>
                                                            )}
                                                        </div>
                                                        <div className="custom-dropdown-trigger-text">
                                                            <span className="custom-dropdown-team-name">{activeSquadTeam?.name || selectedSquadTeamKey}</span>
                                                            <span className="custom-dropdown-team-code">{selectedSquadTeamKey}</span>
                                                        </div>
                                                    </div>
                                                    <div className="custom-dropdown-trigger-right">
                                                        <span className="custom-dropdown-count-pill">{rawSquadPlayers.length} XI</span>
                                                        <FaChevronDown className={`custom-dropdown-arrow ${isTeamDropdownOpen ? 'rotate' : ''}`} />
                                                    </div>
                                                </button>

                                                {isTeamDropdownOpen && (
                                                    <div className="squad-custom-dropdown-menu">
                                                        <div className="custom-dropdown-header-tip">
                                                            <span>Select Competing Team</span>
                                                        </div>
                                                        <div className="custom-dropdown-list">
                                                            {teamKeys.map((key) => {
                                                                const team = teamsData[key] || {};
                                                                const isSelected = (selectedSquadTeamKey || teamKeys[0]) === key;
                                                                const xiCount = team.players ? Object.keys(team.players).length : 0;
                                                                return (
                                                                    <button
                                                                        key={key}
                                                                        type="button"
                                                                        className={`squad-custom-dropdown-item ${isSelected ? 'active' : ''}`}
                                                                        onClick={() => {
                                                                            setSelectedSquadTeamKey(key);
                                                                            setSquadRoleFilter('All');
                                                                            setSearchQuery('');
                                                                            setIsTeamDropdownOpen(false);
                                                                        }}
                                                                    >
                                                                        <div className="dropdown-item-left">
                                                                            <div className="dropdown-item-crest">
                                                                                {team.logo ? (
                                                                                    <img src={team.logo} alt={team.name || key} />
                                                                                ) : (
                                                                                    <span>{key.slice(0, 3)}</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="dropdown-item-info">
                                                                                <span className="dropdown-item-name">{team.name || key}</span>
                                                                                <span className="dropdown-item-sub">{key} &bull; {xiCount} Players</span>
                                                                            </div>
                                                                        </div>
                                                                        {isSelected && (
                                                                            <div className="dropdown-item-check">
                                                                                <FaCheck />
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Main Spotlight: Active Team Profile & Squad Stat Counts */}
                                        {activeSquadTeam && (
                                            <div className="squad-combined-spotlight">
                                                <div className="squad-combined-profile">
                                                    <div className="squad-combined-crest-frame">
                                                        {activeSquadTeam.logo ? (
                                                            <img src={activeSquadTeam.logo} alt={activeSquadTeam.name} className="squad-combined-crest" />
                                                        ) : (
                                                            <div className="squad-combined-crest-fallback">
                                                                <MdShield />
                                                                <span>{(selectedSquadTeamKey || 'TM').slice(0, 3)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="squad-combined-info">
                                                        <div className="squad-combined-meta-badges">
                                                            <span className="squad-badge-code">{selectedSquadTeamKey}</span>
                                                            <span className="squad-badge-edition">{labels.fullName || 'E-Legends 2K26'}</span>
                                                        </div>
                                                        <h2 className="squad-combined-title">{activeSquadTeam.name || selectedSquadTeamKey}</h2>
                                                        {activeSquadTeam.captain && (
                                                            <div className="squad-combined-captain">
                                                                <FaCrown className="captain-crown-icon" />
                                                                <span>Captain: <strong>{activeSquadTeam.captain}</strong></span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="squad-combined-stats">
                                                    <div className="squad-stat-item">
                                                        <span className="squad-stat-val xi-val">{rawSquadPlayers.length}</span>
                                                        <span className="squad-stat-lbl">Playing XI</span>
                                                    </div>
                                                    <div className="squad-stat-divider" />
                                                    <div className="squad-stat-item">
                                                        <span className="squad-stat-val res-val">{rawReservePlayers.length}</span>
                                                        <span className="squad-stat-lbl">Reserves</span>
                                                    </div>
                                                    <div className="squad-stat-divider" />
                                                    <div className="squad-stat-item highlight">
                                                        <span className="squad-stat-val tot-val">{rawSquadPlayers.length + rawReservePlayers.length}</span>
                                                        <span className="squad-stat-lbl">Total Roster</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Search & Role Filter Bar */}
                                    <div className="squad-filter-bar">
                                        <div className="search-box squad-search">
                                            <MdSearch className="search-icon" />
                                            <input
                                                type="text"
                                                placeholder={`Search player in ${activeSquadTeam?.name || 'squad'}...`}
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                            {searchQuery && (
                                                <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>×</button>
                                            )}
                                        </div>

                                        <div className="squad-role-chips" role="tablist">
                                            {['All', 'Batter', 'Bowler', 'All Rounder', 'Wicket Keeper'].map((role) => {
                                                const totalMatchingRole = [...rawSquadPlayers, ...rawReservePlayers].filter(
                                                    p => role === 'All' || p.role === role
                                                ).length;
                                                return (
                                                    <button
                                                        key={role}
                                                        type="button"
                                                        className={`squad-role-chip ${squadRoleFilter === role ? 'active' : ''}`}
                                                        onClick={() => setSquadRoleFilter(role)}
                                                    >
                                                        <span>{role === 'All' ? 'All Roles' : role}</span>
                                                        <span className="role-count">{totalMatchingRole}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* SECTION 1: Playing XI Squad */}
                                    <div className="squad-roster-group">
                                        <div className="squad-group-header">
                                            <div className="squad-group-title">
                                                <span className="squad-indicator-dot playing-xi" />
                                                <h3>Playing XI Squad</h3>
                                                <span className="squad-count-pill">{displayedSquadPlayers.length} Players</span>
                                            </div>
                                            <span className="squad-group-note">Official Starting XI Lineup</span>
                                        </div>

                                        {displayedSquadPlayers.length === 0 ? (
                                            <div className="squad-empty-group">
                                                <p>No Playing XI players match the current filters.</p>
                                            </div>
                                        ) : (
                                            <div className="squad-players-grid">
                                                {displayedSquadPlayers.map((player, idx) => {
                                                    const isCaptain = player.name === activeSquadTeam?.captain || player.isCaptain;
                                                    const roleClass = (player.role || 'batter').toLowerCase().replace(/\s+/g, '-');
                                                    const handCode = (player.hand === 'LHB' || player.hand === 'LHS' || player.hand === 'Left Hand') ? 'LHB' : 'RHB';
                                                    return (
                                                        <TiltCard key={player.id || `${player.name}-${idx}`} className={`squad-player-card ${isCaptain ? 'captain-card' : ''}`} maxTilt={8}>
                                                            <div className="player-card-top">
                                                                <div className="player-card-top-left">
                                                                    <span className="player-number">#{String(idx + 1).padStart(2, '0')}</span>
                                                                    <span className={`player-hand-tag ${handCode.toLowerCase()}`} title={`Batting Stance: ${handCode === 'LHB' ? 'Left Hand Batter (LHB)' : 'Right Hand Batter (RHB)'}`}>
                                                                        {handCode}
                                                                    </span>
                                                                </div>
                                                                <div className="player-card-top-right">
                                                                    {isCaptain && (
                                                                        <span className="player-captain-badge" title="Team Captain">
                                                                            <FaCrown />
                                                                        </span>
                                                                    )}
                                                                    <span className={`player-role-badge ${roleClass}`} title={player.role || 'Player'}>
                                                                        {getRoleIcon(player.role)}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="player-avatar-section">
                                                                <div className="player-avatar-ring">
                                                                    {player.imageUrl || player.image ? (
                                                                        <img
                                                                            src={player.imageUrl || player.image}
                                                                            alt={player.name}
                                                                            className="player-avatar-img"
                                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                                        />
                                                                    ) : (
                                                                        <div className="player-avatar-fallback player-avatar-initials">
                                                                            {getPlayerInitials(player.name)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="player-info-section">
                                                                <h4 className="player-name">{player.name}</h4>
                                                                <span className="player-team-label">{activeSquadTeam?.name || selectedSquadTeamKey}</span>
                                                                {player.bowlingStyle && (
                                                                    <span className="player-bowling-style-badge" title={`Bowling Type: ${player.bowlingStyle}`}>
                                                                        <MdSportsCricket /> {player.bowlingStyle}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TiltCard>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* SECTION 2: Bench & Reserves */}
                                    {rawReservePlayers.length > 0 && (
                                        <div className="squad-roster-group reserves-group">
                                            <div className="squad-group-header">
                                                <div className="squad-group-title">
                                                    <span className="squad-indicator-dot reserves" />
                                                    <h3>Bench & Reserves</h3>
                                                    <span className="squad-count-pill amber">{displayedReservePlayers.length} Reserves</span>
                                                </div>
                                                <span className="squad-group-note">Available for Tactical Rotations & Substitutions</span>
                                            </div>

                                            {displayedReservePlayers.length === 0 ? (
                                                <div className="squad-empty-group">
                                                    <p>No reserve players match the current filters.</p>
                                                </div>
                                            ) : (
                                                <div className="squad-players-grid">
                                                    {displayedReservePlayers.map((player, idx) => {
                                                        const roleClass = (player.role || 'batter').toLowerCase().replace(/\s+/g, '-');
                                                        const handCode = (player.hand === 'LHB' || player.hand === 'LHS' || player.hand === 'Left Hand') ? 'LHB' : 'RHB';
                                                        return (
                                                            <TiltCard key={player.id || `res-${player.name}-${idx}`} className="squad-player-card reserve-card" maxTilt={8}>
                                                                <div className="player-card-top">
                                                                    <div className="player-card-top-left">
                                                                        <span className="player-reserve-tag" title="Reserve Player">
                                                                            <span className="res-full">RESERVE</span>
                                                                            <span className="res-short">RES</span>
                                                                        </span>
                                                                        <span className={`player-hand-tag ${handCode.toLowerCase()}`} title={`Batting Stance: ${handCode === 'LHB' ? 'Left Hand Batter (LHB)' : 'Right Hand Batter (RHB)'}`}>
                                                                            {handCode}
                                                                        </span>
                                                                    </div>
                                                                    <div className="player-card-top-right">
                                                                        <span className={`player-role-badge ${roleClass}`} title={player.role || 'Player'}>
                                                                            {getRoleIcon(player.role)}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="player-avatar-section">
                                                                    <div className="player-avatar-ring reserve-ring">
                                                                        {player.imageUrl || player.image ? (
                                                                            <img
                                                                                src={player.imageUrl || player.image}
                                                                                alt={player.name}
                                                                                className="player-avatar-img"
                                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                                            />
                                                                        ) : (
                                                                            <div className="player-avatar-fallback player-avatar-initials">
                                                                                {getPlayerInitials(player.name)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="player-info-section">
                                                                    <h4 className="player-name">{player.name}</h4>
                                                                    <span className="player-team-label">{activeSquadTeam?.name || selectedSquadTeamKey}</span>
                                                                    {player.bowlingStyle && (
                                                                        <span className="player-bowling-style-badge" title={`Bowling Type: ${player.bowlingStyle}`}>
                                                                            <MdSportsCricket /> {player.bowlingStyle}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </TiltCard>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}


                                </>
                            ) : (
                                <div className="rankings-empty-state">
                                    <div className="r-empty-icon-wrap squads">
                                        <MdGroups />
                                    </div>
                                    <div className="r-empty-info">
                                        <h3>Team Rosters Pending</h3>
                                        <p>Official Playing XI squads and bench reserves are currently being registered by tournament administrators.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                ) : (
                    <>
                        {/* 3D Holographic Podium Stage (Top 3) - Only shown if tournament has started with actual matches */}
                        {hasCurrentData && tournamentStarted && (
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
                                        {/* Search box & Limit Badge are ONLY shown for Batters and Bowlers (No search in Points Table) */}
                                        {activeTab !== 'points' && (
                                            <div className="table-controls-bar">
                                                <span className="table-limit-badge">
                                                    Top {currentList.length} {activeTab === 'batters' ? 'Batters' : 'Bowlers'}
                                                </span>
                                                <div className="search-box">
                                                    <MdSearch className="search-icon" />
                                                    <input
                                                        type="text"
                                                        placeholder={`Search in top ${currentList.length} ${activeTab === 'batters' ? 'batters' : 'bowlers'}...`}
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
                                                        {filteredList.length === 0 ? (
                                                            <tr>
                                                                <td colSpan="8" style={{ textAlign: 'center', padding: '36px 18px', color: '#94a3b8' }}>
                                                                    No matching teams found.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            filteredList.map((t) => (
                                                                <tr key={t.id || t.team} className={t.rank === 1 && tournamentStarted ? 'gold-row' : ''}>
                                                                    <td className="rank-cell">#{t.rank}</td>
                                                                    <td className="team-cell" style={{ textAlign: 'left' }}>
                                                                        {t.logo && (
                                                                            <img
                                                                                src={t.logo}
                                                                                alt={t.fullName || t.team}
                                                                                className="points-team-logo"
                                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                                            />
                                                                        )}
                                                                        <strong>{t.fullName || t.team}</strong>
                                                                    </td>
                                                                    <td style={{ textAlign: 'center' }}>{t.played ?? 0}</td>
                                                                    <td style={{ textAlign: 'center' }}>{t.won ?? 0}</td>
                                                                    <td style={{ textAlign: 'center' }}>{t.lost ?? 0}</td>
                                                                    <td style={{ textAlign: 'center' }}>{t.nr ?? 0}</td>
                                                                    <td className={Number(t.nrr) > 0 ? 'nrr-pos' : Number(t.nrr) < 0 ? 'nrr-neg' : ''} style={{ textAlign: 'center' }}>{t.nrr ?? 0}</td>
                                                                    <td className="pts-cell" style={{ textAlign: 'center' }}>{t.pts ?? 0}</td>
                                                                </tr>
                                                            ))
                                                        )}
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
                                                            <th style={{ textAlign: 'center' }}><span className="col-full">Balls Faced</span><span className="col-short">B</span></th>
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
                                                                    <td className="balls-cell" style={{ textAlign: 'center' }}>
                                                                        {p.balls !== undefined && p.balls !== null
                                                                            ? p.balls
                                                                            : (p.overs ? (Math.floor(Number(p.overs)) * 6 + Math.round((Number(p.overs) - Math.floor(Number(p.overs))) * 10)) : 0)}
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
                    </>
                )}
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
