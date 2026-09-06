import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ref, onValue } from "firebase/database";
import { database } from "../../../../shared/services/firebase";
import Loading from '../../components/common/Loading/Loading';
import { MdOutlineSportsCricket, MdInfoOutline, MdTimeline, MdPieChart, MdClose } from 'react-icons/md';
import './LiveScore.css';

const LiveScore = () => {
    const { tournamentId, matchId } = useParams();
    const [match, setMatch] = useState(null);
    const [commentary, setCommentary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tournamentInfo, setTournamentInfo] = useState(null);
    const [tournamentTeams, setTournamentTeams] = useState({});

    // Active Innings Tab ('team1' or 'team2')
    const [activeInningsTab, setActiveInningsTab] = useState(null);

    // Wagon Wheel Modal State
    const [showWWheel, setShowWWheel] = useState(false);
    const [selectedBatsman, setSelectedBatsman] = useState(null);
    const [batsmanStats, setBatsmanStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        const matchRef = ref(database, `cricX/tournaments/${tournamentId}/matches/${matchId}`);
        const unsubscribeMatch = onValue(matchRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setMatch(data);
                // Default active innings tab to current batting team if not set
                if (!activeInningsTab) {
                    const firstBat = data.common?.firstBat || 1;
                    setActiveInningsTab(firstBat === 1 ? 'team1' : 'team2');
                }
            }
            setLoading(false);
        });

        const commRef = ref(database, `cricX/tournaments/${tournamentId}/matches/${matchId}/commentary`);
        const unsubscribeComm = onValue(commRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
                setCommentary(list);
            } else {
                setCommentary([]);
            }
        });

        const tournamentRef = ref(database, `cricX/tournaments/${tournamentId}`);
        const unsubscribeTournament = onValue(tournamentRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setTournamentInfo({
                    ballType: data.common?.ballType || 'Hard Ball',
                    umpires: (() => {
                        // Prefer common.umpire array/object (as user specified), fall back to data.umpires
                        const raw = data.common?.umpire || data.common?.umpires || data.umpires;
                        if (!raw) return [];
                        if (Array.isArray(raw)) return raw.filter(Boolean);
                        if (typeof raw === 'object') return Object.values(raw).filter(Boolean);
                        return [];
                    })()
                });
                setTournamentTeams(data.teamData || {});
            }
        });

        return () => {
            unsubscribeMatch();
            unsubscribeComm();
            unsubscribeTournament();
        };
    }, [tournamentId, matchId, activeInningsTab]);

    if (loading) return <Loading />;
    if (!match) return <div className="cx-error">Match not found.</div>;

    const { common, team1, team2 } = match;

    // Team Names
    const [t1Name, t2Name] = common.teams.split(' vs ');

    // Active batting / bowling data based on selected Innings Tab
    const isTeam1ActiveBatting = activeInningsTab === 'team1';
    const battingTeamData = isTeam1ActiveBatting ? team1 : team2;
    const bowlingTeamData = isTeam1ActiveBatting ? team2 : team1;
    const battingTeamName = isTeam1ActiveBatting ? t1Name : t2Name;
    const bowlingTeamName = isTeam1ActiveBatting ? t2Name : t1Name;

    // Parse Players
    const rawPlayersList = Object.values(battingTeamData.players || {});
    const playersList = rawPlayersList.map(p => {
        const teamObj = Object.values(tournamentTeams || {}).find(t => t.name === battingTeamData.name);
        const squadPlayer = teamObj?.players?.[p.id] || Object.values(teamObj?.players || {}).find(sp => sp.nic === p.nic);
        return {
            ...p,
            type: squadPlayer?.type || p.type || 'Playing XI',
            hand: squadPlayer?.hand || p.hand || 'Right Hand'
        };
    });
    const playingXI = playersList.filter(p => p.type === 'Playing XI' || !p.type);
    const reserves = playersList.filter(p => p.type === 'Reserve');

    const rawBowlingPlayersList = Object.values(bowlingTeamData.players || {});
    const bowlingPlayersList = rawBowlingPlayersList.map(p => {
        const teamObj = Object.values(tournamentTeams || {}).find(t => t.name === bowlingTeamData.name);
        const squadPlayer = teamObj?.players?.[p.id] || Object.values(teamObj?.players || {}).find(sp => sp.nic === p.nic);
        return {
            ...p,
            type: squadPlayer?.type || p.type || 'Playing XI',
            hand: squadPlayer?.hand || p.hand || 'Right Hand'
        };
    });
    const bowlingReserves = bowlingPlayersList.filter(p => p.type === 'Reserve');

    // Parse Bowlers
    const rawBowlersList = Object.values(bowlingTeamData.bowlers || {});
    const bowlersList = rawBowlersList.filter(b => {
        const teamObj = Object.values(tournamentTeams || {}).find(t => t.name === bowlingTeamData.name);
        const squadPlayer = teamObj?.players?.[b.id] || Object.values(teamObj?.players || {}).find(sp => sp.nic === b.nic);
        const type = b.type || squadPlayer?.type || 'Playing XI';
        return type === 'Playing XI';
    });

    // Partnerships
    const cp = battingTeamData.currentPartnership;
    const previousPartnerships = Object.values(battingTeamData.partnerships || {})
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Calculate over helper
    const getOversString = (teamObj) => {
        if (!teamObj) return "0.0";
        if (teamObj.overs !== undefined && teamObj.overs !== null) return teamObj.overs;
        const balls = teamObj.totalBalls || 0;
        return `${Math.floor(balls / 6)}.${balls % 6}`;
    };

    // Open Wagon Wheel Modal
    const handleOpenWWheel = (player) => {
        if (!player.nic) {
            alert("No profile NIC linked to this player.");
            return;
        }
        setSelectedBatsman(player);
        setShowWWheel(true);
        setLoadingStats(true);

        const playerRef = ref(database, `cricX/players/${player.nic}`);
        onValue(playerRef, (snapshot) => {
            if (snapshot.exists()) {
                setBatsmanStats(snapshot.val());
            } else {
                setBatsmanStats(null);
            }
            setLoadingStats(false);
        }, { onlyOnce: true });
    };

    // Close Wagon Wheel Modal
    const handleCloseWWheel = () => {
        setShowWWheel(false);
        setSelectedBatsman(null);
        setBatsmanStats(null);
    };

    // SVG Wagon Wheel sectors generator
    const describeArc = (x, y, radius, startAngle, endAngle) => {
        const startPercent = startAngle / 360;
        const endPercent = endAngle / 360;

        const startX = x + radius * Math.cos((startAngle - 90) * Math.PI / 180);
        const startY = y + radius * Math.sin((startAngle - 90) * Math.PI / 180);
        const endX = x + radius * Math.cos((endAngle - 90) * Math.PI / 180);
        const endY = y + radius * Math.sin((endAngle - 90) * Math.PI / 180);

        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

        return [
            "M", startX, startY,
            "A", radius, radius, 0, largeArcFlag, 1, endX, endY,
            "L", x, y,
            "Z"
        ].join(" ");
    };

    const getLabelCoords = (x, y, radius, startAngle, endAngle) => {
        const midAngle = (startAngle + endAngle) / 2;
        const lx = x + radius * 0.7 * Math.cos((midAngle - 90) * Math.PI / 180);
        const ly = y + radius * 0.7 * Math.sin((midAngle - 90) * Math.PI / 180);
        return { x: lx, y: ly };
    };

    const getActiveSectors = (batsmanHand) => {
        if (batsmanHand === 'Left Hand') {
            return [
                { name: "Fine Leg", key: "FineLeg", startAngle: 0, endAngle: 45 },
                { name: "Square Leg", key: "SquareLeg", startAngle: 45, endAngle: 90 },
                { name: "Mid-wicket", key: "Midwicket", startAngle: 90, endAngle: 135 },
                { name: "Mid-on", key: "Midon", startAngle: 135, endAngle: 180 },
                { name: "Mid-off", key: "Midoff", startAngle: 180, endAngle: 225 },
                { name: "Cover", key: "Cover", startAngle: 225, endAngle: 270 },
                { name: "Point", key: "Point", startAngle: 270, endAngle: 315 },
                { name: "Third Man", key: "ThirdMan", startAngle: 315, endAngle: 360 }
            ];
        }
        return [
            { name: "Third Man", key: "ThirdMan", startAngle: 0, endAngle: 45 },
            { name: "Point", key: "Point", startAngle: 45, endAngle: 90 },
            { name: "Cover", key: "Cover", startAngle: 90, endAngle: 135 },
            { name: "Mid-off", key: "Midoff", startAngle: 135, endAngle: 180 },
            { name: "Mid-on", key: "Midon", startAngle: 180, endAngle: 225 },
            { name: "Mid-wicket", key: "Midwicket", startAngle: 225, endAngle: 270 },
            { name: "Square Leg", key: "SquareLeg", startAngle: 270, endAngle: 315 },
            { name: "Fine Leg", key: "FineLeg", startAngle: 315, endAngle: 360 }
        ];
    };

    // Find runs for a zone
    const getZoneRuns = (zoneKey) => {
        if (selectedBatsman && selectedBatsman.shots && selectedBatsman.shots[zoneKey]) {
            return selectedBatsman.shots[zoneKey].runs || 0;
        }
        if (!batsmanStats || !batsmanStats.stats?.batting?.shots) return 0;
        const shotStats = batsmanStats.stats.batting.shots[zoneKey];
        return shotStats ? (shotStats.runs || 0) : 0;
    };

    // Find shots count for a zone
    const getZoneShots = (zoneKey) => {
        if (selectedBatsman && selectedBatsman.shots && selectedBatsman.shots[zoneKey]) {
            return selectedBatsman.shots[zoneKey].count || 0;
        }
        if (!batsmanStats || !batsmanStats.stats?.batting?.shots) return 0;
        const shotStats = batsmanStats.stats.batting.shots[zoneKey];
        return shotStats ? (shotStats.count || 0) : 0;
    };

    return (
        <div className="cx-live-page">
            <div className="cx-live-container">
                {/* 1. Score Header Card */}
                <div className="cx-score-header-card">
                    <div className="cx-sh-top">
                        <span>{common.title} • {common.date}</span>
                        <span className={`cx-status-pill ${common.finished === 0 ? 'cx-live' : ''}`}>
                            {common.finished === 0 ? '● LIVE' : 'FINISHED'}
                        </span>
                    </div>

                    <div className="cx-score-display">
                        <div className="cx-team-score">
                            <h2>{t1Name}</h2>
                            <div className="cx-score-number">
                                {team1.totalRuns}/{team1.totalWickets}
                                <span>({getOversString(team1)} ov)</span>
                            </div>
                        </div>

                        <div className="cx-vs-divider">VS</div>

                        <div className="cx-team-score cx-align-right">
                            <h2>{t2Name}</h2>
                            <div className="cx-score-number">
                                {team2.totalRuns}/{team2.totalWickets}
                                <span>({getOversString(team2)} ov)</span>
                            </div>
                        </div>
                    </div>

                    <div className="cx-match-status-text">
                        {common.result ? common.result : common.status}
                    </div>
                </div>

                {/* 4. Scrollable Ball to Ball Commentary (Directly under score showing card) */}
                <div className="cx-commentary-section" style={{ marginTop: '0px', marginBottom: '25px' }}>
                    <div className="cx-commentary-header">
                        <h3>Ball-by-Ball Commentary</h3>
                    </div>

                    <div className="cx-commentary-list-wrapper">
                        {commentary.length > 0 ? (
                            commentary.map((comm) => (
                                <div key={comm.id} className={`cx-comm-row ${comm.isWicket ? 'cx-comm-wicket' : ''} ${comm.runs >= 4 ? 'cx-comm-boundary' : ''}`}>
                                    <div className="cx-comm-over-badge">
                                        {comm.over}
                                    </div>
                                    <div className="cx-comm-text-side">
                                        <div className="cx-comm-indicators">
                                            {comm.isWicket && <span className="cx-badge-wicket">W</span>}
                                            {comm.runs === 4 && <span className="cx-badge-four">4</span>}
                                            {comm.runs === 6 && <span className="cx-badge-six">6</span>}
                                            {comm.isExtra && <span className="cx-badge-extra">EXT</span>}
                                        </div>
                                        <p className="cx-comm-desc">{comm.text}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="cx-no-commentary">Commentary will start when the match begins.</div>
                        )}
                    </div>
                </div>

                {/* 2. Innings Selection Tabs */}
                <div className="cx-innings-tabs">
                    <button
                        className={`cx-innings-tab-btn ${activeInningsTab === 'team1' ? 'active' : ''}`}
                        onClick={() => setActiveInningsTab('team1')}
                    >
                        {t1Name} Innings
                    </button>
                    <button
                        className={`cx-innings-tab-btn ${activeInningsTab === 'team2' ? 'active' : ''}`}
                        onClick={() => setActiveInningsTab('team2')}
                    >
                        {t2Name} Innings
                    </button>
                </div>

                {/* 3. Main Stats Content Grid */}
                <div className="cx-score-grid">

                    {/* LEFT COLUMN: Batting Scorecard and Bowling Scorecard */}
                    <div className="cx-main-stats">

                        {/* A. Batting Scorecard Panel */}
                        <div className="cx-glass-panel">
                            <div className="cx-panel-header-with-icon">
                                <h3>{battingTeamName} Batting Scorecard</h3>
                            </div>

                            {/* Playing XI Table */}
                            <h4 className="cx-table-subtitle">Playing XI</h4>
                            <table className="cx-scorecard-table">
                                <thead>
                                    <tr>
                                        <th>Batter</th>
                                        <th className="text-center">R</th>
                                        <th className="text-center">B</th>
                                        <th className="text-center">4s</th>
                                        <th className="text-center">6s</th>
                                        <th className="text-center">SR</th>
                                        <th className="text-center">Shots</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {playingXI.length > 0 ? (
                                        playingXI.map(p => {
                                            const isStriker = battingTeamData.ballFaceBatsman && battingTeamData.ballFaceBatsman.id === p.id;
                                            const isNonStriker = battingTeamData.otherSideBatsman && battingTeamData.otherSideBatsman.id === p.id;
                                            const isCurrentlyBatting = isStriker || isNonStriker;
                                            const isOut = !!(p.dismissal && p.dismissal.trim() !== '' && !isCurrentlyBatting);
                                            return (
                                                <tr key={p.id} className={isCurrentlyBatting ? 'cx-row-active-batting' : ''} style={isOut ? { opacity: 0.45 } : {}}>
                                                    <td className="cx-player-name-cell">
                                                        <div className="cx-pname-line">
                                                            {p.name} <span className={`cx-scorecard-player-hand ${p.hand === "Left Hand" ? "lhb" : "rhb"}`}>{p.hand === "Left Hand" ? "LHB" : "RHB"}</span>
                                                            {isStriker && "🏏"}
                                                        </div>
                                                        <div className="cx-dismissal-text">
                                                            {p.dismissal || (isCurrentlyBatting ? 'Not out' : (p.runs || p.balls ? 'Not out' : 'Yet to bat'))}
                                                        </div>
                                                    </td>
                                                    <td className="cx-stat-highlight text-center">{p.runs || 0}</td>
                                                    <td className="text-center">{p.balls || 0}</td>
                                                    <td className="text-center">{p.boundaries?.fours || 0}</td>
                                                    <td className="text-center">{p.boundaries?.sixes || 0}</td>
                                                    <td className="text-center">{p.strikeRate || '0.00'}</td>
                                                    <td className="text-center">
                                                        <button className="cx-btn-wagonwheel" onClick={() => handleOpenWWheel(p)}>
                                                            <MdPieChart /> Wheel
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="text-center text-muted">No playing XI players listed.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Reserve Players List */}
                            {reserves.length > 0 && (
                                <div className="cx-reserves-section-inline" style={{ marginTop: '20px', padding: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                    <h4 className="cx-table-subtitle" style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: 'var(--cx-accent)', fontWeight: '700' }}>Reserve Players</h4>
                                    <div className="cx-reserves-list-names" style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.6' }}>
                                        {reserves.map((p, idx) => (
                                            <span key={p.id} style={{ display: 'inline-block', marginRight: '15px' }}>
                                                {p.name}
                                                {idx < reserves.length - 1 ? ',' : ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* B. Bowling Scorecard Panel */}
                        <div className="cx-glass-panel" style={{ marginTop: '20px' }}>
                            <div className="cx-panel-header-with-icon">
                                <h3>{bowlingTeamName} Bowling Overview</h3>
                            </div>

                            <table className="cx-scorecard-table">
                                <thead>
                                    <tr>
                                        <th>Bowler</th>
                                        <th className="text-center">Overs</th>
                                        <th className="text-center">Runs</th>
                                        <th className="text-center">Wickets</th>
                                        <th className="text-center">Econ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bowlersList.length > 0 ? (
                                        bowlersList.map(b => (
                                            <tr key={b.id} className={match[activeInningsTab === 'team1' ? 'team2' : 'team1']?.bowler?.id === b.id ? 'cx-row-active-bowling' : ''}>
                                                <td className="cx-player-name-cell">
                                                    {b.name}
                                                    {match[activeInningsTab === 'team1' ? 'team2' : 'team1']?.bowler?.id === b.id && ' 🔴'}
                                                </td>
                                                <td className="text-center">{b.overs || '0.0'}</td>
                                                <td className="text-center">{b.runs || 0}</td>
                                                <td className="cx-stat-highlight text-center">{b.wickets || 0}</td>
                                                <td className="text-center">{b.economy || '0.00'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="text-center text-muted">No bowlers recorded yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Bowling Reserves List */}
                            {bowlingReserves.length > 0 && (
                                <div className="cx-reserves-section-inline" style={{ marginTop: '20px', padding: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                    <h4 className="cx-table-subtitle" style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: 'var(--cx-accent)', fontWeight: '700' }}>Reserve Players</h4>
                                    <div className="cx-reserves-list-names" style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.6' }}>
                                        {bowlingReserves.map((p, idx) => (
                                            <span key={p.id} style={{ display: 'inline-block', marginRight: '15px' }}>
                                                {p.name}
                                                {idx < bowlingReserves.length - 1 ? ',' : ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Partnerships & Match Info */}
                    <div className="cx-side-stats">

                        {/* A. Current Partnership Card */}
                        <div className="cx-glass-panel">
                            <div className="cx-panel-header-with-icon">
                                <h3 style={{ width: '100%', textAlign: 'center', alignContent: 'center' }}>Current Partnership</h3>
                            </div>
                            {cp && cp.batsman1 ? (
                                <div className="cx-partnership-stats-box">
                                    <div className="cx-psb-total">
                                        <span className="cx-psb-total-runs">{(battingTeamData.totalRuns || 0) - cp.startScore} runs</span>
                                        <span className="cx-psb-total-balls">({(battingTeamData.totalBalls || 0) - cp.startBalls} balls)</span>
                                    </div>
                                    <div className="cx-psb-batters">
                                        <div className="cx-psb-batter">
                                            <span className="cx-psb-name">{cp.batsman1.name}</span>
                                            <span className="cx-psb-run">{cp.batsman1Runs || 0} R ({cp.batsman1Balls || 0} B)</span>
                                        </div>
                                        <div className="cx-psb-divider">&</div>
                                        <div className="cx-psb-batter">
                                            <span className="cx-psb-name">{cp.batsman2.name}</span>
                                            <span className="cx-psb-run">{cp.batsman2Runs || 0} R ({cp.batsman2Balls || 0} B)</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="cx-no-partnership">No active partnership.</div>
                            )}
                        </div>

                        {/* B. Partnership History Card */}
                        <div className="cx-glass-panel">
                            <div className="cx-panel-header-with-icon" >
                                <h3 style={{ width: '100%', textAlign: 'center', alignContent: 'center' }}>Partnership History</h3>
                            </div>
                            <div className="cx-partnership-history-list">
                                {previousPartnerships.length > 0 ? (
                                    previousPartnerships.map((p, idx) => (
                                        <div key={idx} className="cx-history-item">
                                            <div className="cx-hi-wicket">Wkt {idx + 1}</div>
                                            <div className="cx-hi-details">
                                                <div className="cx-hi-names">{p.batsman1?.name} & {p.batsman2?.name}</div>
                                                <div className="cx-hi-stats">
                                                    <strong>{p.runs} runs</strong> ({p.balls} balls) • End Score: {p.endScore}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="cx-no-partnership-history">No wickets fallen in this innings.</div>
                                )}
                            </div>
                        </div>

                        {/* C. Match Info Card */}
                        <div className="cx-glass-panel">
                            <div className="cx-panel-header-with-icon">
                                <h3 style={{ width: '100%', textAlign: 'center', alignContent: 'center' }}>Match Info</h3>
                            </div>
                            <div className="cx-info-row">
                                <span>
                                    {common.tossWinner
                                        ? `${common.tossWinner} won & elected to ${common.tossDecision}`
                                        : (common.status || 'TBA')}
                                </span>
                            </div>
                            <div className="cx-info-row" style={{ border: 'none', marginBottom: 0, paddingBottom: 0 }}>
                                <span>Umpire(s)</span>
                            </div>
                            {tournamentInfo?.umpires && tournamentInfo.umpires.length > 0 && (
                                <div style={{ padding: '6px 0' }}>
                                    {tournamentInfo.umpires.map((u, idx) => (
                                        <div key={idx} className="cx-info-row" style={{ paddingLeft: '12px', opacity: 0.75, fontSize: '0.82rem' }}>
                                            <span>{u.position || `Umpire ${idx + 1}`}</span>
                                            <span>{u.name}{u.experience ? ` · ${u.experience} exp` : ''}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="cx-info-row">
                                <span>Ball Type</span>
                                <span>{common.ballType || tournamentInfo?.ballType || 'Hard Ball'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* WAGON WHEEL MODAL */}
                {showWWheel && selectedBatsman && (
                    <div className="cx-ww-modal-backdrop" onClick={handleCloseWWheel}>
                        <div className="cx-ww-modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="cx-ww-modal-header">
                                <div>
                                    <h3>{selectedBatsman.name}'s Batting Area Stats ({selectedBatsman?.hand || batsmanStats?.hand || 'Right Hand'})</h3>
                                    <p className="cx-ww-modal-sub">Career Shot Zone Analysis</p>
                                </div>
                                <button className="cx-btn-close-ww" onClick={handleCloseWWheel}><MdClose /></button>
                            </div>

                            {loadingStats ? (
                                <div className="cx-modal-loading">
                                    <Loading />
                                    <p>Loading batsman statistics...</p>
                                </div>
                            ) : (() => {
                                const activeSectors = getActiveSectors(selectedBatsman?.hand || batsmanStats?.hand || 'Right Hand');
                                const maxZoneRuns = Math.max(...activeSectors.map(s => getZoneRuns(s.key)), 1);

                                return (
                                    <div className="cx-ww-modal-body">
                                        {/* SVG Cricket Field Wagon Wheel */}
                                        <div className="cx-ww-field-container">
                                            <svg viewBox="0 0 300 300" className="cx-ww-svg">
                                                {/* Outer Boundary Circle */}
                                                <circle cx="150" cy="150" r="140" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 4" />
                                                {/* Pitch in Center */}
                                                <rect x="145" y="120" width="10" height="60" fill="#eab308" opacity="0.4" />

                                                {/* Render Sectors */}
                                                {activeSectors.map((s, idx) => {
                                                    const pathData = describeArc(150, 150, 130, s.startAngle, s.endAngle);
                                                    const textCoords = getLabelCoords(150, 150, 130, s.startAngle, s.endAngle);
                                                    const runs = getZoneRuns(s.key);
                                                    const intensity = runs > 0 ? 0.2 + (runs / maxZoneRuns) * 0.6 : 0.05;

                                                    return (
                                                        <g key={s.key} className="cx-ww-sector-group">
                                                            {/* Slice Path */}
                                                            <path
                                                                d={pathData}
                                                                fill={`rgba(124, 58, 237, ${intensity})`}
                                                                stroke="rgba(255, 255, 255, 0.08)"
                                                                strokeWidth="1.5"
                                                                className="cx-ww-sector-path"
                                                            />
                                                            {/* Text Labels */}
                                                            <text
                                                                x={textCoords.x}
                                                                y={textCoords.y}
                                                                textAnchor="middle"
                                                                alignmentBaseline="middle"
                                                                className="cx-ww-sector-label"
                                                                fill={runs > 0 ? '#fff' : 'rgba(255, 255, 255, 0.4)'}
                                                            >
                                                                {s.name}
                                                            </text>
                                                            <text
                                                                x={textCoords.x}
                                                                y={textCoords.y + 12}
                                                                textAnchor="middle"
                                                                alignmentBaseline="middle"
                                                                className="cx-ww-sector-runs"
                                                                fill="var(--cx-accent)"
                                                            >
                                                                {runs > 0 ? `${runs} runs` : ''}
                                                            </text>
                                                        </g>
                                                    );
                                                })}
                                            </svg>
                                        </div>

                                        {/* Shot Statistics Breakdown List */}
                                        <div className="cx-ww-stats-list">
                                            <h4>Zone Summary</h4>
                                            <div className="cx-ww-summary-rows">
                                                {activeSectors.map(s => {
                                                    const runs = getZoneRuns(s.key);
                                                    const count = getZoneShots(s.key);
                                                    return (
                                                        <div key={s.key} className="cx-ww-summary-row">
                                                            <span>{s.name}</span>
                                                            <span><strong>{runs} runs</strong> ({count} shots)</span>
                                                        </div>
                                                    );
                                                })}
                                                <div className="cx-ww-summary-row cx-row-unspecified">
                                                    <span>Straight / Unspecified</span>
                                                    <span><strong>{getZoneRuns("Unspecified") + getZoneRuns("Straight")} runs</strong> ({getZoneShots("Unspecified") + getZoneShots("Straight")} shots)</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveScore;