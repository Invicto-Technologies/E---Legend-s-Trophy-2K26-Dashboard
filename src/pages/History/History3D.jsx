import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
    MdArrowForward,
    MdGroups,
    MdCheckCircle
} from 'react-icons/md';
import { parseMatchDateTime } from '../../components/common/MatchCard/MatchCard';
import PageLoader from '../../components/common/PageLoader/PageLoader';
import stadiumBgUrl from '../../Images/cricket_stadium_bg.jpg';
import './History3D.css';

const History3D = () => {
    const { editionId: routeEditionId } = useParams();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
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

    // Detect if running on localhost / development environment
    const isLocalhost = Boolean(
        typeof window !== 'undefined' && (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.startsWith('192.168.') ||
            window.location.hostname.endsWith('.local')
        )
    );

    // Filter out the active tournament (and on public production, filter out private test/dev editions)
    const historyTournaments = (tournamentIndex || []).filter((ed) => {
        const status = (ed.status || '').toLowerCase();
        const isTest = status === 'testing' || status === 'development' || status === 'draft' || Boolean(ed.isTest);

        // Hide test tournaments on production, but show on localhost
        if (!isLocalhost && isTest) {
            return false;
        }

        const isMatchingActive =
            ed.id === activeTournamentId ||
            resolveTournamentKey(ed.id) === resolveTournamentKey(activeTournamentId) ||
            ed.status === 'active';
        return !isMatchingActive;
    });

    // Ensure selectedEditionId defaults to a valid historical tournament (allows direct URL preview for any edition)
    useEffect(() => {
        if (routeEditionId) {
            setSelectedEditionId(routeEditionId);
            return;
        }

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
    }, [historyTournaments, selectedEditionId, routeEditionId]);

    // 3. Subscribe to selected tournament edition data
    useEffect(() => {
        if (!selectedEditionId) return;
        setIsLoading(true);
        const unsub = subscribeTournamentEdition(selectedEditionId, (data) => {
            setEditionData(data);
            setIsLoading(false);
        });
        const timer = setTimeout(() => setIsLoading(false), 1200);
        return () => {
            clearTimeout(timer);
            unsub();
        };
    }, [selectedEditionId]);

    const handleSelectEdition = (id) => {
        setSelectedEditionId(id);
        navigate(`/history/${id}`);
    };

    const info = editionData?.info || {};
    const awards = editionData?.awards || [];

    const currentEdFromIndex = (tournamentIndex || []).find(
        (t) => t.id === selectedEditionId || resolveTournamentKey(t.id) === resolveTournamentKey(selectedEditionId)
    );

    const isDevHost = isLocalhost;

    const isCurrentEditionTest = Boolean(
        (info.status || '').toLowerCase() === 'testing' ||
        (info.status || '').toLowerCase() === 'development' ||
        (info.status || '').toLowerCase() === 'draft' ||
        Boolean(editionData?.isTest) ||
        (currentEdFromIndex?.status || '').toLowerCase() === 'testing' ||
        (currentEdFromIndex?.status || '').toLowerCase() === 'development' ||
        (currentEdFromIndex?.status || '').toLowerCase() === 'draft' ||
        Boolean(currentEdFromIndex?.isTest) ||
        String(selectedEditionId || '').toLowerCase().includes('test') ||
        String(currentEdFromIndex?.name || '').toLowerCase().includes('test') ||
        String(info.name || '').toLowerCase().includes('test')
    );

    // Helper to parse run/wicket/over figures from a score segment like "E22 115/3 (15)" or "115/3 (15.0 ov)"
    const parseScoreSegment = (str) => {
        if (!str || typeof str !== 'string') return null;
        const match = str.match(/(\d+)\s*\/\s*(\d+)(?:\s*\(([\d.]+)(?:\s*ov)?\))?/i);
        if (match) {
            return {
                totalRuns: parseInt(match[1], 10),
                totalWickets: parseInt(match[2], 10),
                overs: match[3] || '0'
            };
        }
        return null;
    };

    // Extract matches with FixturesData as the authoritative source
    const systemKeys = new Set([
        'info', 'awards', 'FixturesData', 'fixturesData', 'LiveData', 'liveData',
        'UpcomingMatchData', 'RankingData', 'rankings', 'teamData', 'stories',
        'AllStories', 'rules', 'benchmarks', 'matches', 'isTest', 'status',
        'year', 'name', 'fixtures', 'Fixtures'
    ]);

    const collectedMatches = [];
    const seenMatchKeys = new Set();

    const getMatchDedupeKey = (m) => {
        if (!m || typeof m !== 'object') return null;
        const rawTitle = String(m.title || m.common?.title || m.name || '').trim().toLowerCase();
        const normTitle = rawTitle.replace(/\s+match$/, '').replace(/^match\s+/, 'm');
        if (normTitle) return `title:${normTitle}`;

        const rawTeams = String(m.teams || m.common?.teams || '').trim().toLowerCase();
        if (rawTeams && rawTeams.includes(' vs ')) return `teams:${rawTeams}`;

        const rawId = String(m.id || '').trim().toLowerCase();
        if (rawId) return `id:${rawId}`;

        return null;
    };

    const addMatchIfNew = (m, fallbackId) => {
        if (!m || typeof m !== 'object') return;
        const candidateId = String(m.id || fallbackId || m.title || m.common?.title || '').trim();
        const candidate = {
            ...m,
            id: candidateId
        };

        const dedupeKey = getMatchDedupeKey(candidate) || String(fallbackId || '').toLowerCase();
        if (!dedupeKey || seenMatchKeys.has(dedupeKey)) return;
        seenMatchKeys.add(dedupeKey);

        const rawTitle = String(m.title || m.common?.title || candidate.id || '').trim();
        const normTitle = rawTitle.replace(/\s+match$/i, '').toLowerCase();
        if (normTitle) seenMatchKeys.add(`title:${normTitle}`);

        const rawTeams = String(m.teams || m.common?.teams || '').trim();
        if (rawTeams && rawTeams.toLowerCase().includes(' vs ')) {
            seenMatchKeys.add(`teams:${rawTeams.toLowerCase()}`);
        }

        // Link with root match node if available to preserve deep player/scorecard data for the modal
        const rootMatch = (rawTitle && editionData?.[rawTitle]) ||
            (rawTitle && editionData?.matches?.[rawTitle]) ||
            (candidate.id && editionData?.[candidate.id]) ||
            (candidate.id && editionData?.matches?.[candidate.id]) ||
            {};

        // Parse team names from teams string e.g. "E22 vs E23"
        let t1Name = candidate.team1?.name || rootMatch.team1?.name || candidate.team1 || rootMatch.team1;
        let t2Name = candidate.team2?.name || rootMatch.team2?.name || candidate.team2 || rootMatch.team2;
        if (typeof t1Name !== 'string') t1Name = t1Name?.name || '';
        if (typeof t2Name !== 'string') t2Name = t2Name?.name || '';

        if ((!t1Name || !t2Name) && rawTeams.includes(' vs ')) {
            const parts = rawTeams.split(' vs ');
            t1Name = t1Name || parts[0]?.trim();
            t2Name = t2Name || parts[1]?.trim();
        }

        // Parse team score figures if score string e.g. "E22 115/3 (15) • E23 109/7 (15)"
        const rawScore = String(candidate.score || candidate.common?.score || rootMatch.score || rootMatch.common?.score || '').trim();
        let seg1 = null;
        let seg2 = null;
        if (rawScore && rawScore.includes(' • ')) {
            const scoreParts = rawScore.split(' • ');
            seg1 = parseScoreSegment(scoreParts[0]);
            seg2 = parseScoreSegment(scoreParts[1]);
        } else if (rawScore) {
            seg1 = parseScoreSegment(rawScore);
        }

        const enrichedMatch = {
            ...rootMatch,
            ...candidate,
            id: candidate.id || rootMatch.id || rawTitle,
            title: candidate.title || rootMatch.title || rootMatch.common?.title || rawTitle,
            teams: rawTeams || rootMatch.teams || rootMatch.common?.teams || (t1Name && t2Name ? `${t1Name} vs ${t2Name}` : ''),
            score: rawScore,
            result: candidate.result || rootMatch.result || candidate.common?.result || rootMatch.common?.result || '',
            mom: candidate.mom || rootMatch.mom || candidate.common?.mom || rootMatch.common?.mom || rootMatch.playerOfTheMatch || '',
            date: candidate.date || rootMatch.date || candidate.common?.date || rootMatch.common?.date || '',
            time: candidate.time || rootMatch.time || candidate.common?.time || rootMatch.common?.time || '',
            common: {
                ...(rootMatch.common || {}),
                ...(candidate.common || {}),
                title: candidate.title || rootMatch.title || rootMatch.common?.title || rawTitle,
                teams: rawTeams || rootMatch.teams || rootMatch.common?.teams || '',
                score: rawScore,
                result: candidate.result || rootMatch.result || candidate.common?.result || rootMatch.common?.result || '',
                mom: candidate.mom || rootMatch.mom || candidate.common?.mom || rootMatch.common?.mom || rootMatch.playerOfTheMatch || '',
                date: candidate.date || rootMatch.date || candidate.common?.date || rootMatch.common?.date || '',
                time: candidate.time || rootMatch.time || candidate.common?.time || rootMatch.common?.time || ''
            },
            team1: {
                ...(rootMatch.team1 && typeof rootMatch.team1 === 'object' ? rootMatch.team1 : {}),
                ...(candidate.team1 && typeof candidate.team1 === 'object' ? candidate.team1 : {}),
                name: t1Name || 'Team 1',
                totalRuns: (candidate.team1?.totalRuns ?? rootMatch.team1?.totalRuns ?? seg1?.totalRuns),
                totalWickets: (candidate.team1?.totalWickets ?? rootMatch.team1?.totalWickets ?? seg1?.totalWickets),
                overs: (candidate.team1?.overs ?? rootMatch.team1?.overs ?? seg1?.overs)
            },
            team2: {
                ...(rootMatch.team2 && typeof rootMatch.team2 === 'object' ? rootMatch.team2 : {}),
                ...(candidate.team2 && typeof candidate.team2 === 'object' ? candidate.team2 : {}),
                name: t2Name || 'Team 2',
                totalRuns: (candidate.team2?.totalRuns ?? rootMatch.team2?.totalRuns ?? seg2?.totalRuns),
                totalWickets: (candidate.team2?.totalWickets ?? rootMatch.team2?.totalWickets ?? seg2?.totalWickets),
                overs: (candidate.team2?.overs ?? rootMatch.team2?.overs ?? seg2?.overs)
            }
        };

        collectedMatches.push(enrichedMatch);
    };

    // FixturesData is the authoritative source for match fixtures and finished results
    const finishedMap = editionData?.FixturesData?.finishedMatches || {};
    const publishedMap = editionData?.FixturesData?.publishedMatches || editionData?.FixturesData?.fixtures || {};
    const hasFixturesData = Object.keys(finishedMap).length > 0 ||
        (Array.isArray(publishedMap) ? publishedMap.length > 0 : Object.keys(publishedMap).length > 0);

    if (hasFixturesData) {
        // Priority 1: FixturesData.finishedMatches (completed matches with official scores)
        Object.entries(finishedMap).forEach(([k, v]) => {
            if (v && typeof v === 'object') {
                addMatchIfNew(v, k);
            }
        });

        // Priority 2: FixturesData.publishedMatches / fixtures (for any scheduled or ongoing matches)
        const pubItems = Array.isArray(publishedMap) ? publishedMap : Object.entries(publishedMap);
        pubItems.forEach((item, idx) => {
            const matchObj = Array.isArray(publishedMap) ? item : item[1];
            const matchKey = Array.isArray(publishedMap) ? `pub-${idx}` : item[0];
            if (matchObj && typeof matchObj === 'object') {
                addMatchIfNew(matchObj, matchKey);
            }
        });
    } else {
        // Fallback ONLY when FixturesData is completely absent or empty (e.g. legacy historical records)
        if (editionData?.matches && typeof editionData.matches === 'object') {
            Object.entries(editionData.matches).forEach(([k, v]) => addMatchIfNew(v, k));
        }

        const matchKeys = ['1st', '2nd', '3rd', '4th', '5th', '6th', 'Final'];
        matchKeys.forEach((k) => {
            if (editionData?.[k]) addMatchIfNew(editionData[k], k);
        });

        if (editionData && typeof editionData === 'object') {
            Object.entries(editionData).forEach(([k, v]) => {
                if (systemKeys.has(k) || !v || typeof v !== 'object') return;
                if (v.team1 || v.team2 || v.common || v.title || v.score || v.result || v.overs) {
                    addMatchIfNew(v, k);
                }
            });
        }
    }

    const getMatchOrdinalRank = (m) => {
        const raw = String(m?.title || m?.common?.title || m?.id || '').trim().toLowerCase();
        if (raw === '1st' || raw.includes('match 1') || raw === 'm1') return 1;
        if (raw === '2nd' || raw.includes('match 2') || raw === 'm2') return 2;
        if (raw === '3rd' || raw.includes('match 3') || raw === 'm3') return 3;
        if (raw === '4th' || raw.includes('match 4') || raw === 'm4') return 4;
        if (raw === '5th' || raw.includes('match 5') || raw === 'm5') return 5;
        if (raw === '6th' || raw.includes('match 6') || raw === 'm6') return 6;
        if (raw.includes('semi-final 1') || raw.includes('sf 1') || raw.includes('sf1')) return 7;
        if (raw.includes('semi-final 2') || raw.includes('sf 2') || raw.includes('sf2')) return 8;
        if (raw.includes('final') && !raw.includes('semi')) return 99;
        return 50;
    };

    // Sort matches in ascending chronological order of match date and time
    const matchesList = [...collectedMatches].sort((a, b) => {
        const timeA = parseMatchDateTime(a);
        const timeB = parseMatchDateTime(b);
        if (timeA !== timeB) return timeA - timeB;
        return getMatchOrdinalRank(a) - getMatchOrdinalRank(b);
    });

    const rankings = editionData?.RankingData || editionData?.rankings || {};
    const pointsTable = (rankings.pointsTable || []).filter(Boolean);
    const batters = Object.values(rankings.batters || {})
        .filter(Boolean)
        .sort((a, b) => {
            const scoreA = Number(a.scores ?? a.runs ?? a.rating ?? 0);
            const scoreB = Number(b.scores ?? b.runs ?? b.rating ?? 0);
            if (scoreB !== scoreA) return scoreB - scoreA;
            const srA = Number(a.strikeRate ?? 0);
            const srB = Number(b.strikeRate ?? 0);
            return srB - srA;
        });
    const bowlers = Object.values(rankings.bowlers || {})
        .filter(Boolean)
        .sort((a, b) => {
            const wA = Number(a.wickets ?? a.takenWickets ?? a.rating ?? 0);
            const wB = Number(b.wickets ?? b.takenWickets ?? b.rating ?? 0);
            if (wB !== wA) return wB - wA;
            const ecoA = (a.balls > 0 || a.overs > 0 || a.economy !== undefined) ? Number(a.economy || 0) : 999;
            const ecoB = (b.balls > 0 || b.overs > 0 || b.economy !== undefined) ? Number(b.economy || 0) : 999;
            return ecoA - ecoB;
        });
    const stories = Object.values(editionData?.AllStories || editionData?.stories || {});

    if (isLoading && !editionData) {
        return (
            <PageLoader
                message={`Loading ${selectedEditionId} Tournament Archives...`}
                subtitle="Retrieving historical match scorecards, champion rosters & photo stories"
                tournamentName="E-Legends Hall of Fame"
            />
        );
    }

    return (
        <div className="history-3d-page">
            {/* Hero Section */}
            <section className="history-hero">
                <div className="history-hero-glow" />
                <div className="history-container">
                    <span className="history-tag">
                        TOURNAMENT ARCHIVE &amp; HALL OF FAME
                    </span>
                    <h1 className="history-title">
                        E-LEGENDS <span className="gradient-text">HISTORY</span>
                    </h1>
                    <p className="history-subtitle">
                        Celebrating the champions, iconic clashes, and historic records of the Prof. A. Thurairajah Memorial Cricket Tournament across past completed editions.
                    </p>

                    {/* Interactive Edition Timeline Switcher (Historical Tournaments Only) */}
                    <div className="history-timeline-bar">
                        {historyTournaments.map((ed) => {
                            const isTest = (ed.status || '').toLowerCase() === 'testing' ||
                                (ed.status || '').toLowerCase() === 'development' ||
                                (ed.status || '').toLowerCase() === 'draft' ||
                                Boolean(ed.isTest);
                            return (
                                <button
                                    key={ed.id}
                                    className={`timeline-tab-btn ${selectedEditionId === ed.id ||
                                        resolveTournamentKey(selectedEditionId) === resolveTournamentKey(ed.id)
                                        ? 'active'
                                        : ''
                                        } ${isTest ? 'timeline-tab-test' : ''}`}
                                    onClick={() => handleSelectEdition(ed.id)}
                                >
                                    <span className="timeline-year">{ed.year || ed.editionId || ed.id}</span>
                                    <span className="timeline-name">{ed.name || `E-Legends ${ed.id}`}</span>
                                    <span className={`timeline-badge-done ${isTest ? 'badge-test' : ''}`}>
                                        {isTest ? '🧪 Dev Test' : 'Completed'}
                                    </span>
                                </button>
                            );
                        })}
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
                                {(info.status === 'testing' || info.status === 'development' || editionData?.isTest) && (
                                    <span className="eh-meta-item test-pill" style={{ color: '#c084fc', fontWeight: 800 }}>
                                        🧪 Test Edition Preview (Hidden from Public Users)
                                    </span>
                                )}
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
                                {(info.organizers || editionData?.organizers || info.organizingBatch) && (
                                    <div className="champ-organizer-row">
                                        <MdGroups className="champ-organizer-icon" />
                                        <span className="champ-organizer-label">Organized by:</span>
                                        <strong className="champ-organizer-val">
                                            {info.organizers}
                                        </strong>
                                    </div>
                                )}
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
                                        const matchTargetId = String(c.title || match.title || match.id || '1st').trim();

                                        const isMatchLive = Boolean(
                                            !c.finished &&
                                            !match.finished &&
                                            (
                                                c.isLive ||
                                                match.isLive ||
                                                String(c.status || '').toLowerCase() === 'live' ||
                                                String(match.status || '').toLowerCase() === 'live' ||
                                                (editionData?.LiveData?.isLive && (
                                                    String(editionData.LiveData?.currentMatchPath || '').toLowerCase().includes(matchTargetId.toLowerCase()) ||
                                                    String(editionData.LiveData?.liveScore?.matchTitle || '').toLowerCase().includes(matchTargetId.toLowerCase())
                                                ))
                                            )
                                        );

                                        const isMatchFinished = Boolean(
                                            c.finished === 1 ||
                                            c.finished === true ||
                                            c.isFinished ||
                                            match.finished === 1 ||
                                            match.finished === true ||
                                            match.isFinished ||
                                            (c.result && !['scheduled', 'upcoming', 'live', 'tbd'].includes(String(c.result).trim().toLowerCase())) ||
                                            (match.result && !['scheduled', 'upcoming', 'live', 'tbd'].includes(String(match.result).trim().toLowerCase())) ||
                                            (match.score && String(match.score).includes('/'))
                                        );

                                        const shouldOpenInUserLive = isDevHost && isCurrentEditionTest;
                                        const userLiveUrl = `/match/${encodeURIComponent(matchTargetId)}?tourney=${encodeURIComponent(selectedEditionId)}`;

                                        // Extract team names
                                        let t1Name = t1.name;
                                        let t2Name = t2.name;
                                        const rawTeams = String(c.teams || match.teams || '').trim();
                                        if ((!t1Name || !t2Name) && rawTeams.includes(' vs ')) {
                                            const parts = rawTeams.split(' vs ');
                                            t1Name = t1Name || parts[0]?.trim();
                                            t2Name = t2Name || parts[1]?.trim();
                                        }
                                        t1Name = t1Name || 'Team 1';
                                        t2Name = t2Name || 'Team 2';

                                        // Extract team scores
                                        let t1ScoreDisplay = '';
                                        let t2ScoreDisplay = '';
                                        if (t1.totalRuns !== undefined && t1.totalRuns !== null) {
                                            t1ScoreDisplay = `${t1.totalRuns}/${t1.totalWickets ?? 0} (${t1.overs ?? 0} ov)`;
                                        }
                                        if (t2.totalRuns !== undefined && t2.totalRuns !== null) {
                                            t2ScoreDisplay = `${t2.totalRuns}/${t2.totalWickets ?? 0} (${t2.overs ?? 0} ov)`;
                                        }

                                        const rawScore = String(c.score || match.score || '').trim();
                                        if ((!t1ScoreDisplay || !t2ScoreDisplay) && rawScore && rawScore.toLowerCase() !== 'scheduled') {
                                            if (rawScore.includes(' • ')) {
                                                const parts = rawScore.split(' • ');
                                                t1ScoreDisplay = t1ScoreDisplay || parts[0]?.replace(t1Name, '').trim() || parts[0]?.trim();
                                                t2ScoreDisplay = t2ScoreDisplay || parts[1]?.replace(t2Name, '').trim() || parts[1]?.trim();
                                            } else {
                                                t1ScoreDisplay = t1ScoreDisplay || rawScore;
                                            }
                                        }

                                        const displayTitle = c.title || match.title || match.name || match.id;
                                        const displayResult = isMatchLive ? '🔴 Match is currently in progress' : (c.result || match.result || 'Match Completed');
                                        const displayMom = c.mom || match.mom || match.playerOfTheMatch;
                                        const displayDate = c.date || match.date || '';
                                        const displayTime = c.time || match.time || '';
                                        const dateLine = displayDate ? `${displayDate}${displayTime ? ` • ${displayTime}` : ''}` : displayTime;

                                        return (
                                            <TiltCard
                                                key={match.id}
                                                className={`history-match-card ${isMatchLive ? 'is-live-card' : ''} ${shouldOpenInUserLive ? 'cursor-pointer' : ''}`}
                                                maxTilt={8}
                                                onClick={() => {
                                                    if (shouldOpenInUserLive) {
                                                        navigate(userLiveUrl);
                                                    }
                                                }}
                                            >
                                                <div className="hm-header">
                                                    <span className="hm-title-badge">{displayTitle} Match</span>
                                                    {isMatchLive ? (
                                                        <span className="hm-status-pill-live">
                                                            <span className="hm-live-dot" /> LIVE NOW
                                                        </span>
                                                    ) : isMatchFinished ? (
                                                        <span className="hm-status-pill-completed">
                                                            <MdCheckCircle /> Completed
                                                        </span>
                                                    ) : (
                                                        <span className="hm-status-pill-upcoming">
                                                            Scheduled
                                                        </span>
                                                    )}
                                                    <span className="hm-date">{dateLine}</span>
                                                </div>

                                                <h3 className="hm-teams">{rawTeams || `${t1Name} vs ${t2Name}`}</h3>

                                                {/* Score summary */}
                                                <div className="hm-scores-box">
                                                    <div className="hm-team-score">
                                                        <span style={{ marginRight: '10px' }}>{t1Name}</span>
                                                        <strong>{t1ScoreDisplay || '—'}</strong>
                                                    </div>
                                                    <div className="hm-team-score">
                                                        <span style={{ marginRight: '10px' }}>{t2Name}</span>
                                                        <strong>{t2ScoreDisplay || '—'}</strong>
                                                    </div>
                                                </div>

                                                <p className="hm-result-text" style={{ color: isMatchLive ? '#f87171' : undefined }}>
                                                    {displayResult}
                                                </p>

                                                {displayMom && (
                                                    <div className="hm-mom-pill">
                                                        <span>Player of the Match: <strong>{displayMom}</strong></span>
                                                    </div>
                                                )}

                                                {shouldOpenInUserLive ? (
                                                    <Link
                                                        to={userLiveUrl}
                                                        className={`hm-view-scorecard-btn ${isMatchLive ? 'is-live-btn' : 'is-test-live-btn'}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {isMatchLive ? (
                                                            <>
                                                                <span className="live-pulse-dot" /> Open Live Scoreboard <MdArrowForward />
                                                            </>
                                                        ) : (
                                                            <>
                                                                Open in User Live Score Page <MdArrowForward />
                                                            </>
                                                        )}
                                                    </Link>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="hm-view-scorecard-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveScorecardModal(match);
                                                        }}
                                                    >
                                                        View Full Scorecard <MdArrowForward />
                                                    </button>
                                                )}
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
                                                <th><span className="col-full">POS</span><span className="col-short">#</span></th>
                                                <th><span className="col-full">TEAM</span><span className="col-short">TEAM</span></th>
                                                <th style={{ textAlign: 'center' }}><span className="col-full">PLAYED</span><span className="col-short">P</span></th>
                                                <th style={{ textAlign: 'center' }}><span className="col-full">WON</span><span className="col-short">W</span></th>
                                                <th style={{ textAlign: 'center' }}><span className="col-full">LOST</span><span className="col-short">L</span></th>
                                                <th style={{ textAlign: 'center' }}><span className="col-full">NRR</span><span className="col-short">NRR</span></th>
                                                <th style={{ textAlign: 'center' }}><span className="col-full">PTS</span><span className="col-short">PTS</span></th>
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
                                                    <td style={{ textAlign: 'center' }}>{row.played}</td>
                                                    <td style={{ textAlign: 'center' }}>{row.won}</td>
                                                    <td style={{ textAlign: 'center' }}>{row.lost}</td>
                                                    <td className={row.nrr >= 0 ? 'nrr-pos' : 'nrr-neg'} style={{ textAlign: 'center' }}>
                                                        {row.nrr > 0 ? `+${row.nrr}` : row.nrr}
                                                    </td>
                                                    <td className="pts-cell" style={{ textAlign: 'center' }}>{row.pts}</td>
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
                                                <th><span className="col-full">#</span><span className="col-short">#</span></th>
                                                <th><span className="col-full">PLAYER</span><span className="col-short">PLAYER</span></th>
                                                <th style={{ textAlign: 'center' }}><span className="col-full">TEAM</span><span className="col-short">TEAM</span></th>
                                                <th style={{ textAlign: 'center' }}><span className="col-full">RUNS</span><span className="col-short">R</span></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {batters.slice(0, 10).map((b, idx) => (
                                                <tr key={idx} className={idx === 0 ? 'leader-row' : ''}>
                                                    <td>{idx + 1}</td>
                                                    <td><strong>{b.name}</strong></td>
                                                    <td style={{ textAlign: 'center' }}><span className="team-badge-sub">{b.team}</span></td>
                                                    <td className="stat-highlight" style={{ textAlign: 'center' }}>{b.scores ?? b.runs ?? b.rating ?? 0}</td>
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
                                                <th><span className="col-full">#</span><span className="col-short">#</span></th>
                                                <th><span className="col-full">PLAYER</span><span className="col-short">PLAYER</span></th>
                                                <th style={{ textAlign: 'center' }}><span className="col-full">TEAM</span><span className="col-short">TEAM</span></th>
                                                <th style={{ textAlign: 'center' }}><span className="col-full">WICKETS</span><span className="col-short">W</span></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bowlers.slice(0, 10).map((b, idx) => (
                                                <tr key={idx} className={idx === 0 ? 'leader-row' : ''}>
                                                    <td>{idx + 1}</td>
                                                    <td><strong>{b.name}</strong></td>
                                                    <td style={{ textAlign: 'center' }}><span className="team-badge-sub">{b.team}</span></td>
                                                    <td className="stat-highlight" style={{ textAlign: 'center' }}>{b.wickets ?? b.takenWickets ?? b.rating ?? 0}</td>
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
                            {stories.length === 0 ? (
                                <div className="history-empty-deck transparent-art-bg cricket-watermark-art">
                                    <MdNewspaper style={{ fontSize: '2.5rem', color: 'var(--primary-blue-light)' }} />
                                    <h4>No Historical Stories Recorded</h4>
                                    <p>Tournament bulletins and match recaps will appear here once documented.</p>
                                </div>
                            ) : (
                                <div className="stories-archive-grid">
                                    {stories.map((story) => {
                                        const storyImg = story.ImageURL || story.imageUrl || story.image || story.coverImage || stadiumBgUrl;
                                        return (
                                            <div key={story.id} className="history-story-card transparent-art-bg cricket-watermark-art">
                                                <div className="history-story-cover-wrap">
                                                    <img
                                                        src={storyImg}
                                                        alt={story.topic || 'Tournament Story'}
                                                        className="history-story-cover-img"
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            e.currentTarget.onerror = null;
                                                            e.currentTarget.src = stadiumBgUrl;
                                                        }}
                                                    />
                                                    <div className="history-story-gradient" />
                                                </div>
                                                <div className="history-story-content">
                                                    <span className="story-archive-time">{story.time}</span>
                                                    <h4 className="story-archive-topic">{story.topic}</h4>
                                                    <p className="story-archive-desc">{story.description}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Scorecard Modal */}
            {activeScorecardModal && (() => {
                const modal = activeScorecardModal || {};
                const team1 = (modal.team1 && typeof modal.team1 === 'object') ? modal.team1
                    : (modal.teamA && typeof modal.teamA === 'object') ? modal.teamA
                        : (modal.innings1 && typeof modal.innings1 === 'object') ? modal.innings1
                            : {};
                const team2 = (modal.team2 && typeof modal.team2 === 'object') ? modal.team2
                    : (modal.teamB && typeof modal.teamB === 'object') ? modal.teamB
                        : (modal.innings2 && typeof modal.innings2 === 'object') ? modal.innings2
                            : {};
                const common = (modal.common && typeof modal.common === 'object') ? modal.common
                    : (modal.matchInfo && typeof modal.matchInfo === 'object') ? modal.matchInfo
                        : (modal.info && typeof modal.info === 'object') ? modal.info
                            : {};

                const sanitizeList = (raw) => {
                    if (!raw) return [];
                    const list = Array.isArray(raw) ? raw : Object.values(raw);
                    return list.filter((p) => p && typeof p === 'object');
                };

                // Innings 1: Team 1 batting, Team 2 bowling
                const inn1Batters = sanitizeList(team1.players);
                let inn1Bowlers = sanitizeList(team2.bowlers);
                let inn1BowlingTeam = team2.name || 'Bowling Attack';
                if (inn1Bowlers.length === 0 && sanitizeList(team1.bowlers).length > 0) {
                    inn1Bowlers = sanitizeList(team1.bowlers);
                    inn1BowlingTeam = team1.name || 'Bowlers';
                }

                // Innings 2: Team 2 batting, Team 1 bowling
                const inn2Batters = sanitizeList(team2.players);
                let inn2Bowlers = sanitizeList(team1.bowlers);
                let inn2BowlingTeam = team1.name || 'Bowling Attack';
                if (inn2Bowlers.length === 0 && sanitizeList(team2.bowlers).length > 0) {
                    inn2Bowlers = sanitizeList(team2.bowlers);
                    inn2BowlingTeam = team2.name || 'Bowlers';
                }

                return createPortal(
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
                                <div className="sm-table-wrap">
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
                                                <tr key={p?.id || i}>
                                                    <td className="sm-player-name">
                                                        <strong>{p?.name || `Player ${i + 1}`}</strong>
                                                        <small>{p?.role || 'Batter'}</small>
                                                    </td>
                                                    <td className="sm-dismissal">{p?.status || p?.dismissal || 'not out'}</td>
                                                    <td className="sm-runs-cell">{p?.runs ?? 0}</td>
                                                    <td>{p?.balls ?? 0}</td>
                                                    <td>{p?.boundaries?.fours ?? 0}</td>
                                                    <td>{p?.boundaries?.sixes ?? 0}</td>
                                                    <td className="sm-sr-cell">
                                                        {p?.strikeRate ?? (p?.balls ? ((p.runs / p.balls) * 100).toFixed(1) : '0.0')}
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
                                        <div className="sm-table-wrap">
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
                                                        <tr key={b?.id || i}>
                                                            <td className="sm-player-name">
                                                                <strong>{b?.name || `Bowler ${i + 1}`}</strong>
                                                                <small>{b?.role || 'Bowler'}</small>
                                                            </td>
                                                            <td>{b?.overs ?? 0}</td>
                                                            <td>{b?.maidens ?? 0}</td>
                                                            <td className="sm-runs-cell">{b?.runs ?? 0}</td>
                                                            <td className="sm-wickets-cell">{b?.wickets ?? 0}</td>
                                                            <td className="sm-econ-cell">
                                                                {b?.economy ?? (b?.overs ? (b.runs / Math.max(0.1, b.overs)).toFixed(2) : '0.00')}
                                                            </td>
                                                            <td>{b?.dots ?? b?.dotBalls ?? '-'}</td>
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
                                <div className="sm-table-wrap">
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
                                                <tr key={p?.id || i}>
                                                    <td className="sm-player-name">
                                                        <strong>{p?.name || `Player ${i + 1}`}</strong>
                                                        <small>{p?.role || 'Batter'}</small>
                                                    </td>
                                                    <td className="sm-dismissal">{p?.status || p?.dismissal || 'not out'}</td>
                                                    <td className="sm-runs-cell">{p?.runs ?? 0}</td>
                                                    <td>{p?.balls ?? 0}</td>
                                                    <td>{p?.boundaries?.fours ?? 0}</td>
                                                    <td>{p?.boundaries?.sixes ?? 0}</td>
                                                    <td className="sm-sr-cell">
                                                        {p?.strikeRate ?? (p?.balls ? ((p.runs / p.balls) * 100).toFixed(1) : '0.0')}
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
                                        <div className="sm-table-wrap">
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
                                                        <tr key={b?.id || i}>
                                                            <td className="sm-player-name">
                                                                <strong>{b?.name || `Bowler ${i + 1}`}</strong>
                                                                <small>{b?.role || 'Bowler'}</small>
                                                            </td>
                                                            <td>{b?.overs ?? 0}</td>
                                                            <td>{b?.maidens ?? 0}</td>
                                                            <td className="sm-runs-cell">{b?.runs ?? 0}</td>
                                                            <td className="sm-wickets-cell">{b?.wickets ?? 0}</td>
                                                            <td className="sm-econ-cell">
                                                                {b?.economy ?? (b?.overs ? (b.runs / Math.max(0.1, b.overs)).toFixed(2) : '0.00')}
                                                            </td>
                                                            <td>{b?.dots ?? b?.dotBalls ?? '-'}</td>
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
                    </div>,
                    document.body
                );
            })()}

            <Footer />
        </div>
    );
};

export default History3D;
