// pages/LiveMatch.jsx
import React, { useEffect, useState } from 'react';
import { ref, onValue, set, update } from 'firebase/database';
import { database } from '../../components/firebase';
import './LiveMatch.css';
import { TeamDetails } from '../../components/TeamDetails';

const LiveMatch = () => {
    const [isLive, setIsLive] = useState(0);
    const [liveScore, setLiveScore] = useState(null);
    const [matchData, setMatchData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [upcomingMatches, setUpcomingMatches] = useState({});
    const [teamsData, setTeamsData] = useState({});
    const [showMatchSelector, setShowMatchSelector] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [statusInput, setStatusInput] = useState('');
    const [tossTeam, setTossTeam] = useState('');
    const [selectedTeam1, setSelectedTeam1] = useState('');
    const [battingTeam, setBattingTeam] = useState('');
    const [currentBatsmen, setCurrentBatsmen] = useState({
        striker: { id: null, name: null },
        nonStriker: { id: null, name: null }
    });
    const [currentBowler, setCurrentBowler] = useState({ id: null, name: null });
    const [previousBowler, setPreviousBowler] = useState(null);
    const [showBatsmanSelector, setShowBatsmanSelector] = useState(false);
    const [showBowlerSelector, setShowBowlerSelector] = useState(false);
    const [selectingFor, setSelectingFor] = useState(null);
    const [fielder, setFielder] = useState(null);
    const [showDismissalModal, setShowDismissalModal] = useState(false);
    const [showFielderModal, setShowFielderModal] = useState(false);
    const [currentDismissalType, setCurrentDismissalType] = useState(null);
    const [showExtraRunsModal, setShowExtraRunsModal] = useState(false);
    const [showExtraReasonModal, setShowExtraReasonModal] = useState(false);
    const [currentExtraType, setCurrentExtraType] = useState(null);
    const [extraRunsInput, setExtraRunsInput] = useState("0");
    const [extraReasonInput, setExtraReasonInput] = useState("1");
    const [showMOMSelector, setShowMOMSelector] = useState(false);
    const [showRunOutModal, setShowRunOutModal] = useState(false);
    const [runsBeforeOut, setRunsBeforeOut] = useState(0);
    const [outBatsman, setOutBatsman] = useState(null);
    const [outBatsmanType, setOutBatsmanType] = useState(null);
    const [showRunOutPlayerShistModal, setShowRunOutPlayerShistModal] = useState(false);
    const [afterOutStriker, setAfterOutStriker] = useState(null);

    //Load data from firebase
    useEffect(() => {
        const liveDataRef = ref(database, 'LiveData');
        const upcomingRef = ref(database, 'UpcomingMatchData');
        const teamsRef = ref(database, 'teamData');

        const unsubscribe = onValue(liveDataRef, (snapshot) => {
            const data = snapshot.val();
            setIsLive(data?.isLive || 0);
            setLiveScore(data?.liveScore || null);

            if (data?.isLive && data?.liveScore?.matchTitle) {
                const matchRef = ref(database, data.liveScore.matchTitle);

                onValue(matchRef, (matchSnapshot) => {
                    const matchData = matchSnapshot.val();
                    if (matchData) {
                        const formattedData = {
                            team1: matchData.team1 || {},
                            team2: matchData.team2 || {},
                            common: matchData.common || {
                                firstBat: 1,
                                title: '',
                                teams: '',
                                status: '',
                                date: '',
                                time: '',
                                firstBattingTeam: '',
                                result: '',
                                mom: '',
                                finished: 0,
                            }
                        };
                        setMatchData(formattedData);

                        // Handle both ID and name for batsmen
                        const team1Batsman = matchData.team1?.ballFaceBatsman || {};
                        const team2Batsman = matchData.team2?.ballFaceBatsman || {};
                        const team1NonStriker = matchData.team1?.otherSideBatsman || {};
                        const team2NonStriker = matchData.team2?.otherSideBatsman || {};
                        const team1Bowler = matchData.team1?.bowler || {};
                        const team2Bowler = matchData.team2?.bowler || {};

                        setCurrentBatsmen({
                            striker: matchData.common?.firstBat === 1
                                ? {
                                    id: team1Batsman.id || null,
                                    name: team1Batsman.name || null
                                }
                                : {
                                    id: team2Batsman.id || null,
                                    name: team2Batsman.name || null
                                },
                            nonStriker: matchData.common?.firstBat === 1
                                ? {
                                    id: team1NonStriker.id || null,
                                    name: team1NonStriker.name || null
                                }
                                : {
                                    id: team2NonStriker.id || null,
                                    name: team2NonStriker.name || null
                                }
                        });

                        setCurrentBowler(
                            matchData.common?.firstBat === 1
                                ? {
                                    id: team2Bowler.id || null,
                                    name: team2Bowler.name || null
                                }
                                : {
                                    id: team1Bowler.id || null,
                                    name: team1Bowler.name || null
                                },
                        );

                    } else {
                        setMatchData(null);
                        setCurrentBatsmen({
                            striker: { id: null, name: null },
                            nonStriker: { id: null, name: null }
                        });
                        setCurrentBowler({ id: null, name: null });
                    }
                    setLoading(false);
                });
            } else {
                setMatchData(null);
                setLoading(false);
            }
        });

        onValue(upcomingRef, (snapshot) => {
            setUpcomingMatches(snapshot.val()?.upcomingMatches || {});
        });

        onValue(teamsRef, (snapshot) => {
            setTeamsData(snapshot.val() || {});
        });

        return () => unsubscribe();
    }, []);

    //Starting new match by selecting upcoming matches
    const startNewMatch = async () => {
        if (!selectedMatch || !statusInput || !selectedTeam1) return;

        try {
            const match = upcomingMatches[selectedMatch];
            const [team1, team2] = match.teams.split(' vs ');
            const team1Name = selectedTeam1 === team1 ? team1 : team2;
            const team2Name = selectedTeam1 === team1 ? team2 : team1;

            // Get team data
            const team1Data = teamsData[team1Name] || {};
            const team2Data = teamsData[team2Name] || {};

            // Prepare players data
            const preparePlayers = (players) => {
                return Object.entries(players || {}).reduce((acc, [id, player]) => {
                    acc[id] = {
                        ...player,
                        runs: 0,
                        balls: 0,
                        status: 'yet to bat',
                        dismissal: '',
                        boundaries: player.boundaries || { sixes: 0, fours: 0, twos: 0, singles: 0 },
                        strikeRate: 0
                    };
                    return acc;
                }, {});
            };

            const prepareBowlers = (players) => {
                return Object.entries(players || {}).reduce((acc, [id, player]) => {
                    if (player.role?.toLowerCase().includes('bowler') ||
                        player.role?.toLowerCase().includes('all rounder')) {
                        acc[id] = {
                            ...player,
                            overs: 0,
                            runs: 0,
                            wickets: 0,
                            maidens: 0,
                            economy: 0
                        };
                    }
                    return acc;
                }, {});
            };

            const dbMatchTitle = match.title.replace(/[.#$/[\]]/g, '_');

            // Prepare live data structure
            const liveData = {
                isLive: 1,
                liveScore: {
                    matchTitle: match.title,
                    firstBat: battingTeam === team1Name ? 1 : 0,
                    status: statusInput,
                    team1: {
                        name: team1Name,
                        score: 0,
                        wicket: 0,
                        overs: 0,
                    },
                    team2: {
                        name: team2Name,
                        score: 0,
                        wicket: 0,
                        overs: 0,
                    },
                },
                common: {
                    firstBat: battingTeam === team1Name ? 1 : 0,
                    result: '',
                    mom: '',
                    finished: 0,
                    status: statusInput,
                },
                currentMatchPath: dbMatchTitle
            };

            // Prepare matchData for the match
            const matchData = {
                team1: {
                    name: team1Name,
                    ballFaceBatsman: {},
                    otherSideBatsman: {},
                    bowler: {},
                    players: preparePlayers(team1Data.players),
                    bowlers: prepareBowlers(team1Data.players),
                    totalRuns: 0,
                    totalWickets: 0,
                    totalBalls: 0,
                    overs: 0,
                    totalExtraAmount: 0,
                    extraTypes: [],
                    fallOfWickets: {}
                },
                team2: {
                    name: team2Name,
                    ballFaceBatsman: {},
                    otherSideBatsman: {},
                    bowler: {},
                    players: preparePlayers(team2Data.players),
                    bowlers: prepareBowlers(team2Data.players),
                    totalRuns: 0,
                    totalWickets: 0,
                    totalBalls: 0,
                    overs: 0,
                    totalExtraAmount: 0,
                    extraTypes: [],
                    fallOfWickets: {}
                },
                common: {
                    title: match.title,
                    teams: match.teams,
                    date: match.date,
                    time: match.time,
                    status: statusInput,
                    firstBattingTeam: battingTeam,
                    firstBat: 1,
                    result: '',
                    mom: '',
                    finished: 0,
                }
            };

            // Update Firebase - save to two paths
            await set(ref(database, 'LiveData'), liveData);
            await set(ref(database, match.title), matchData);

            // Remove the match from upcoming matches
            // const updates = {};
            // updates[`upcomingMatches/${selectedMatch}`] = null;
            // await update(ref(database, 'UpcomingMatchData'), updates);

            // Reset state
            setShowMatchSelector(false);
            setSelectedMatch(null);
            setStatusInput('');
            setSelectedTeam1('');
            setShowBatsmanSelector(true);
            setSelectingFor('striker');
        } catch (error) {
            console.error('Error starting new match:', error);
            alert('Failed to start new match');
        }
    };

    // Helping functions to calculations
    const ballsToOvers = (balls) => {
        const overs = Math.floor(balls / 6);
        const remainingBalls = balls % 6;
        return overs + parseFloat((remainingBalls * 0.1).toFixed(1));
    };

    const calculateEconomy = (runs, balls) => {
        return balls > 0 ? parseFloat(((runs / balls) * 6).toFixed(2)) : 0;
    };

    const calculateStrikeRate = (runs, balls) => {
        return balls > 0 ? parseFloat(((runs / balls) * 100).toFixed(2)) : 0;
    };

    // select batsman and bowler
    const handleSelectBatsman = (type) => {
        setSelectingFor(type);
        setShowBatsmanSelector(true);
    };

    const handleSelectBowler = () => {
        setSelectingFor('bowler');
        setShowBowlerSelector(true);
    };

    const handleBowlerSelection = async (bowlerId, bowlerName) => {
        const isTeam1Batting = matchData.common.firstBat === 1;
        const bowlingTeam = isTeam1Batting ? 'team2' : 'team1';

        const updates = {};
        updates[`${matchData.common.title}/${bowlingTeam}/bowler/id`] = bowlerId;
        updates[`${matchData.common.title}/${bowlingTeam}/bowler/name`] = bowlerName;

        // Update Firebase
        try {
            await update(ref(database), updates);

            // Update local state
            setCurrentBowler({ id: bowlerId, name: bowlerName });
            setPreviousBowler(null);
            setShowBowlerSelector(false);

            // Update matchData locally
            setMatchData(prev => ({
                ...prev,
                [bowlingTeam.bowler]: {
                    ...prev[bowlingTeam],
                    id: bowlerId,
                    name: bowlerName,
                }
            }));
        } catch (error) {
            console.error('Error updating bowler:', error);
            alert('Failed to update bowler');
        }
    };

    const runOutPlayerShift = async () => {
        try {
            const isTeam1Batting = matchData.common.firstBat === 1;
            const battingTeam = isTeam1Batting ? 'team1' : 'team2';
            const matchPath = matchData?.common?.title;
            const strikerId = currentBatsmen.striker.id;

            if (strikerId !== afterOutStriker) {
                const updates = {};
                // Swap striker and non-striker in Firebase
                updates[`${matchPath}/${battingTeam}/ballFaceBatsman`] = matchData[battingTeam].otherSideBatsman;
                updates[`${matchPath}/${battingTeam}/otherSideBatsman`] = matchData[battingTeam].ballFaceBatsman;

                // Update local state
                setCurrentBatsmen(prev => ({
                    striker: prev.nonStriker,
                    nonStriker: prev.striker
                }));
                await update(ref(database), updates);
            }

            const newBallsInOver = (matchData[battingTeam].totalBalls || 0);
            const isOverCompleted = newBallsInOver % 6 === 0;
            if (isOverCompleted) {
                await handleOverCompletion();
            }
        } catch (error) {
            console.error('Error in runOutPlayerShift:', error);
            alert('Failed to swap batsmen positions');
        }
    }

    const handleBatsmanSelection = async (playerId, playerName, type) => {
        const isTeam1Batting = matchData.common.firstBat === 1;
        const battingTeam = isTeam1Batting ? 'team1' : 'team2';
        const fieldToUpdate = type === 'striker' ? 'ballFaceBatsman' : 'otherSideBatsman';

        const updates = {};
        updates[`${matchData.common.title}/${battingTeam}/${fieldToUpdate}`] = {
            id: playerId,
            name: playerName
        };
        updates[`${matchData.common.title}/${battingTeam}/players/${playerId}/status`] = 'batting'

        try {
            // Update local state
            setCurrentBatsmen(prev => ({
                ...prev,
                [type]: { id: playerId, name: playerName }
            }));
            setShowBatsmanSelector(false);

            // Update matchData locally
            setMatchData(prev => ({
                ...prev,
                [battingTeam]: {
                    ...prev[battingTeam],
                    [fieldToUpdate]: {
                        id: playerId,
                        name: playerName
                    },
                    players: {
                        ...prev[battingTeam].players,
                        [playerId]: {
                            ...prev[battingTeam].players[playerId],
                            status: 'batting'
                        }
                    }
                }
            }));

            // Update all paths in a single transaction
            await update(ref(database), updates);

            if (currentDismissalType === "run out") {
                setShowRunOutPlayerShistModal(true);
            }
        } catch (error) {
            console.error('Error updating batsman:', error);
            alert('Failed to update batsman');
        }
    };

    // Handle scoring runs
    const handleScore = async (runs) => {
        if (!currentBatsmen?.striker?.id || !currentBatsmen?.nonStriker?.id || !currentBowler?.id || !matchData) {
            alert('Please select all players before scoring');
            return;
        }

        const isTeam1Batting = matchData.common.firstBat === 1;
        const battingTeam = isTeam1Batting ? 'team1' : 'team2';
        const bowlingTeam = isTeam1Batting ? 'team2' : 'team1';
        const strikerId = currentBatsmen.striker.id;
        const bowlerId = currentBowler.id;

        // Prepare updates object for Firebase
        const updates = {};
        const matchPath = matchData.common.title;

        // Update batsman stats
        updates[`${matchPath}/${battingTeam}/players/${strikerId}/runs`] =
            (matchData[battingTeam].players[strikerId]?.runs || 0) + runs;
        updates[`${matchPath}/${battingTeam}/players/${strikerId}/balls`] =
            (matchData[battingTeam].players[strikerId]?.balls || 0) + 1;
        updates[`${matchPath}/${battingTeam}/players/${strikerId}/strikeRate`] =
            calculateStrikeRate(
                (matchData[battingTeam].players[strikerId]?.runs || 0) + runs,
                (matchData[battingTeam].players[strikerId]?.balls || 0) + 1
            );

        // Update boundaries based on runs
        if (runs === 4) {
            updates[`${matchPath}/${battingTeam}/players/${strikerId}/boundaries/fours`] =
                (matchData[battingTeam].players[strikerId]?.boundaries?.fours || 0) + 1;
        } else if (runs === 6) {
            updates[`${matchPath}/${battingTeam}/players/${strikerId}/boundaries/sixes`] =
                (matchData[battingTeam].players[strikerId]?.boundaries?.sixes || 0) + 1;
        } else if (runs === 2) {
            updates[`${matchPath}/${battingTeam}/players/${strikerId}/boundaries/twos`] =
                (matchData[battingTeam].players[strikerId]?.boundaries?.twos || 0) + 1;
        } else if (runs === 1) {
            updates[`${matchPath}/${battingTeam}/players/${strikerId}/boundaries/singles`] =
                (matchData[battingTeam].players[strikerId]?.boundaries?.singles || 0) + 1;
        }

        // Update bowler stats
        updates[`${matchPath}/${bowlingTeam}/bowlers/${bowlerId}/runs`] =
            (matchData[bowlingTeam].bowlers[bowlerId]?.runs || 0) + runs;
        updates[`${matchPath}/${bowlingTeam}/bowlers/${bowlerId}/balls`] =
            (matchData[bowlingTeam].bowlers[bowlerId]?.balls || 0) + 1;
        updates[`${matchPath}/${bowlingTeam}/bowlers/${bowlerId}/overs`] =
            ballsToOvers((matchData[bowlingTeam].bowlers[bowlerId]?.balls || 0) + 1);
        updates[`${matchPath}/${bowlingTeam}/bowlers/${bowlerId}/economy`] =
            calculateEconomy(
                (matchData[bowlingTeam].bowlers[bowlerId]?.runs || 0) + runs,
                (matchData[bowlingTeam].bowlers[bowlerId]?.balls || 0) + 1
            );

        // Update team totals
        updates[`${matchPath}/${battingTeam}/totalBalls`] =
            (matchData[battingTeam].totalBalls || 0) + 1;
        updates[`${matchPath}/${battingTeam}/overs`] =
            ballsToOvers((matchData[battingTeam].totalBalls || 0) + 1);
        updates[`${matchPath}/${battingTeam}/totalRuns`] =
            (matchData[battingTeam].totalRuns || 0) + runs;

        // Update LiveScore data
        updates['LiveData/liveScore/team1/score'] =
            isTeam1Batting
                ? (matchData.team1.totalRuns || 0) + runs
                : matchData.team1.totalRuns || 0;
        updates['LiveData/liveScore/team2/score'] =
            !isTeam1Batting
                ? (matchData.team2.totalRuns || 0) + runs
                : matchData.team2.totalRuns || 0;
        updates['LiveData/liveScore/team1/overs'] =
            isTeam1Batting
                ? ballsToOvers((matchData.team1.totalBalls || 0) + 1)
                : matchData.team1.overs || 0;
        updates['LiveData/liveScore/team2/overs'] =
            !isTeam1Batting
                ? ballsToOvers((matchData.team2.totalBalls || 0) + 1)
                : matchData.team2.overs || 0;

        // Handle ball count and over completion
        const newBallsInOver = (matchData[battingTeam].totalBalls || 0) + 1;
        const isOverCompleted = newBallsInOver % 6 === 0;

        // Handle striker rotation for odd runs
        if (runs % 2 !== 0) {
            // Swap striker and non-striker in Firebase
            updates[`${matchPath}/${battingTeam}/ballFaceBatsman`] = matchData[battingTeam].otherSideBatsman;
            updates[`${matchPath}/${battingTeam}/otherSideBatsman`] = matchData[battingTeam].ballFaceBatsman;

            // Update local state
            setCurrentBatsmen(prev => ({
                striker: prev.nonStriker,
                nonStriker: prev.striker
            }));
        }

        try {
            // Update all paths in Firebase in a single transaction
            await update(ref(database), updates);

            // Handle over completion if needed
            if (((matchData[battingTeam].totalBalls || 0) + 1) >= 120) {
                await handleInningsCompletion();
            }
            else if (isOverCompleted) {
                await handleOverCompletion();
            }
        } catch (error) {
            console.error('Error updating score:', error);
            alert('Failed to update score');
        }
    };

    // Handle over completion
    const handleOverCompletion = async () => {
        const isTeam1Batting = matchData.common.firstBat === 1;
        const battingTeam = isTeam1Batting ? 'team1' : 'team2';

        const updates = {};
        const matchPath = matchData.common.title;

        setPreviousBowler(currentBowler.id);
        setCurrentBowler({ id: null, name: null });

        // Swap striker and non-striker
        setCurrentBatsmen(prev => ({
            striker: prev.nonStriker,
            nonStriker: prev.striker
        }));

        // Update in matchData
        updates[`${matchPath}/${battingTeam}/ballFaceBatsman`] = matchData[battingTeam].otherSideBatsman;
        updates[`${matchPath}/${battingTeam}/otherSideBatsman`] = matchData[battingTeam].ballFaceBatsman;

        try {
            // Update all paths in Firebase in a single transaction
            await update(ref(database), updates);

            //bowler selection model
            setSelectingFor('bowler');
            setShowBowlerSelector(true);
        } catch (error) {
            console.error('Error updating over completion:', error);
            alert('Failed to update score');
        }
    };

    // Handle extra runs
    const handleExtra = async (type) => {
        if (!currentBatsmen?.striker?.id || !currentBatsmen?.nonStriker?.id || !currentBowler?.id || !matchData) {
            alert('Please select all players before recording extras');
            return;
        }
        setCurrentExtraType(type);
        setShowExtraRunsModal(true);
    };

    const handleExtraRunsSubmit = async () => {
        const extraRuns = parseInt(extraRunsInput);

        if (extraRuns > 0 && currentExtraType !== 'LB') {
            setShowExtraRunsModal(false);
            setShowExtraReasonModal(true);
        } else {
            await processExtra(currentExtraType, extraRuns, null);
            setShowExtraRunsModal(false);
        }
    };

    // Function to handle extra reason submission
    const handleExtraReasonSubmit = async () => {
        const extraRuns = parseInt(extraRunsInput);
        const extraReason = extraReasonInput === "1";

        await processExtra(currentExtraType, extraRuns, extraReason);
        setShowExtraReasonModal(false);
    };

    const processExtra = async (type, extraRuns, extraReason) => {
        const isTeam1Batting = matchData.common.firstBat === 1;
        const battingTeam = isTeam1Batting ? 'team1' : 'team2';
        const bowlingTeam = isTeam1Batting ? 'team2' : 'team1';
        const matchPath = matchData.common.title;
        const strikerId = currentBatsmen.striker.id;

        const updates = {};

        // Update extraTypes array
        const currentExtraTypes = matchData[battingTeam].extraTypes || [];
        const newExtraTypes = [...currentExtraTypes, `${extraRuns}${type}`];
        updates[`${matchPath}/${battingTeam}/extraTypes`] = newExtraTypes;

        // Update team totals
        const newTotalRuns = type !== 'LB' ? (matchData[battingTeam]?.totalRuns || 0) + extraRuns + 1 : (matchData[battingTeam]?.totalRuns || 0) + extraRuns;
        const extraAmount = type !== 'LB' ? (matchData[battingTeam]?.totalExtraAmount || 0) + extraRuns + 1 : (matchData[battingTeam]?.totalExtraAmount || 0) + extraRuns;
        updates[`${matchPath}/${battingTeam}/totalRuns`] = newTotalRuns;

        if (extraReason) {
            updates[`${matchPath}/${battingTeam}/totalExtraAmount`] = extraAmount - extraRuns;
        }
        else {
            updates[`${matchPath}/${battingTeam}/totalExtraAmount`] = extraAmount;
        }

        updates[`LiveData/liveScore/${isTeam1Batting ? 'team1' : 'team2'}/score`] = newTotalRuns;
        updates[`${matchPath}/${bowlingTeam}/bowlers/${currentBowler.id}/runs`] =
            type !== 'LB' ? (matchData[bowlingTeam].bowlers[currentBowler.id]?.runs || 0) + extraRuns + 1 : (matchData[bowlingTeam].bowlers[currentBowler.id]?.runs || 0) + extraRuns;

        // Update batsman stats
        if (extraReason && type !== 'LB') {
            updates[`${matchPath}/${battingTeam}/players/${strikerId}/runs`] =
                (matchData[battingTeam].players[strikerId]?.runs || 0) + extraRuns;
            updates[`${matchPath}/${battingTeam}/players/${strikerId}/strikeRate`] =
                calculateStrikeRate(
                    (matchData[battingTeam].players[strikerId]?.runs || 0) + extraRuns,
                    (matchData[battingTeam].players[strikerId]?.balls || 0)
                );

            // Update boundaries based on runs
            if (extraRuns === 4) {
                updates[`${matchPath}/${battingTeam}/players/${strikerId}/boundaries/fours`] =
                    (matchData[battingTeam].players[strikerId]?.boundaries?.fours || 0) + 1;
            } else if (extraRuns === 6) {
                updates[`${matchPath}/${battingTeam}/players/${strikerId}/boundaries/sixes`] =
                    (matchData[battingTeam].players[strikerId]?.boundaries?.sixes || 0) + 1;
            } else if (extraRuns === 2) {
                updates[`${matchPath}/${battingTeam}/players/${strikerId}/boundaries/twos`] =
                    (matchData[battingTeam].players[strikerId]?.boundaries?.twos || 0) + 1;
            } else if (extraRuns === 1) {
                updates[`${matchPath}/${battingTeam}/players/${strikerId}/boundaries/singles`] =
                    (matchData[battingTeam].players[strikerId]?.boundaries?.singles || 0) + 1;
            }
        }

        // Handle NB, WB
        if (type !== 'LB') {
            updates[`${matchPath}/${bowlingTeam}/bowlers/${currentBowler.id}/economy`] =
                calculateEconomy(
                    (matchData[bowlingTeam].bowlers[currentBowler.id]?.runs || 0) + extraRuns + 1,
                    (matchData[bowlingTeam].bowlers[currentBowler.id]?.balls || 0)
                );
        }

        // Handle LB extras
        if (type === 'LB') {
            updates[`${matchPath}/${battingTeam}/totalBalls`] = (matchData[battingTeam].totalBalls || 0) + 1;
            updates[`${matchPath}/${battingTeam}/overs`] = ballsToOvers((matchData[battingTeam].totalBalls || 0) + 1)
            updates[`${matchPath}/${bowlingTeam}/bowlers/${currentBowler.id}/balls`] =
                (matchData[bowlingTeam].bowlers[currentBowler.id]?.balls || 0) + 1;
            updates[`${matchPath}/${bowlingTeam}/bowlers/${currentBowler.id}/overs`] =
                ballsToOvers((matchData[bowlingTeam].bowlers[currentBowler.id]?.balls || 0) + 1);
            updates[`${matchPath}/${bowlingTeam}/bowlers/${currentBowler.id}/economy`] =
                calculateEconomy(
                    (matchData[bowlingTeam].bowlers[currentBowler.id]?.runs || 0) + extraRuns,
                    (matchData[bowlingTeam].bowlers[currentBowler.id]?.balls || 0) + 1
                );
            updates[`LiveData/liveScore/${battingTeam}/overs`] =
                ballsToOvers((matchData[battingTeam].totalBalls || 0) + 1)

            const newBallsInOver = (matchData[battingTeam].totalBalls || 0) + 1;
            const isOverCompleted = newBallsInOver % 6 === 0;

            if (((matchData[battingTeam].totalBalls || 0) + 1) >= 120) {
                await handleInningsCompletion();
            }
            else if (isOverCompleted) {
                await handleOverCompletion();
            }
        }

        // Handle batsman rotation if runs are scored
        if (extraRuns % 2 !== 0) {
            // Swap striker and non-striker
            updates[`${matchPath}/${battingTeam}/ballFaceBatsman`] = matchData[battingTeam].otherSideBatsman;
            updates[`${matchPath}/${battingTeam}/otherSideBatsman`] = matchData[battingTeam].ballFaceBatsman;

            // Update local state
            setCurrentBatsmen(prev => ({
                striker: prev.nonStriker,
                nonStriker: prev.striker
            }));
        }

        try {
            // Update all paths in Firebase
            await update(ref(database), updates);
            setExtraRunsInput("0");
            setExtraReasonInput("1");
        } catch (error) {
            console.error('Error recording extra:', error);
            alert('Failed to record extra');
        }
    };

    // Wicket button handler
    const handleWicket = (type) => {
        if (!currentBatsmen?.striker?.id || !currentBatsmen?.nonStriker?.id || !currentBowler?.id || !matchData) {
            alert('Please select all players before recording dismissal');
            return;
        }

        setCurrentDismissalType(type);

        // For dismissals that require a fielder
        if (type === 'caught' || type === 'stumped') {
            setShowFielderModal(true);
        } else if (type === 'run out') {
            setShowRunOutModal(true);
            setFielder("");
        } else {
            setShowDismissalModal(true);
        }
    };

    // Fielder selection handler
    const handleFielderSelection = (fielderId, fielderName) => {
        setFielder(fielderId);
        setShowFielderModal(false);
        setShowDismissalModal(true);
    };

    const handleDismissalConfirmation = async () => {
        if (!currentBatsmen?.striker?.id || !currentDismissalType) return;

        const isTeam1Batting = matchData.common.firstBat === 1;
        const battingTeam = isTeam1Batting ? 'team1' : 'team2';
        const bowlingTeam = isTeam1Batting ? 'team2' : 'team1';
        const strikerId = currentBatsmen.striker.id;
        const bowlerId = currentBowler.id;

        const updates = {};
        const matchPath = matchData.common.title;

        // Update batsman status
        if (currentDismissalType !== 'run out') {
            updates[`${matchPath}/${battingTeam}/players/${strikerId}/status`] = 'out';
            updates[`${matchPath}/${battingTeam}/players/${strikerId}/balls`] =
                (matchData[battingTeam].players[strikerId]?.balls || 0) + 1;
            updates[`${matchPath}/${battingTeam}/players/${strikerId}/strikeRate`] =
                calculateStrikeRate(
                    (matchData[battingTeam].players[strikerId]?.runs || 0),
                    (matchData[battingTeam].players[strikerId]?.balls || 0) + 1
                );
        } else {
            updates[`${matchPath}/${battingTeam}/players/${outBatsman}/status`] = 'out';
            updates[`${matchPath}/${battingTeam}/players/${strikerId}/balls`] =
                (matchData[battingTeam].players[strikerId]?.balls || 0) + 1;
            updates[`${matchPath}/${battingTeam}/players/${strikerId}/runs`] =
                (matchData[battingTeam].players[strikerId]?.runs || 0) + runsBeforeOut;
            updates[`${matchPath}/${battingTeam}/players/${strikerId}/strikeRate`] =
                calculateStrikeRate(
                    (matchData[battingTeam].players[strikerId]?.runs || 0) + runsBeforeOut,
                    (matchData[battingTeam].players[strikerId]?.balls || 0) + 1
                );
        }

        // Set dismissal text based on type 
        let dismissalText = '';
        const bowlerName = matchData[bowlingTeam].bowlers[bowlerId]?.name || 'bowler';

        switch (currentDismissalType) {
            case 'bowled':
                dismissalText = `b ${bowlerName}`;
                break;
            case 'caught':
                const fielderName = matchData[bowlingTeam].players[fielder]?.name || 'fielder';
                dismissalText = `c ${fielderName} b ${bowlerName}`;
                break;
            case 'lbw':
                dismissalText = `lbw b ${bowlerName}`;
                break;
            case 'stumped':
                const keeperName = matchData[bowlingTeam].players[fielder]?.name || 'keeper';
                dismissalText = `st ${keeperName} b ${bowlerName}`;
                break;
            case 'run out':
                const runOutFielder = matchData[bowlingTeam].players[fielder]?.name || 'fielder';
                dismissalText = `run out (${runOutFielder})`;
                break;
            case 'hit wicket':
                dismissalText = `hit wicket b ${bowlerName}`;
                break;
            case 'retired hurt':
                dismissalText = 'retired hurt';
                break;
            default:
                dismissalText = currentDismissalType;
        }

        if (currentDismissalType !== 'run out') {
            updates[`${matchPath}/${battingTeam}/players/${strikerId}/dismissal`] = dismissalText;
        } else {
            updates[`${matchPath}/${battingTeam}/players/${outBatsman}/dismissal`] = dismissalText;
        }

        // Update bowler stats if applicable
        updates[`${matchPath}/${bowlingTeam}/bowlers/${bowlerId}/balls`] =
            (matchData[bowlingTeam].bowlers[bowlerId]?.balls || 0) + 1;
        updates[`${matchPath}/${bowlingTeam}/bowlers/${bowlerId}/overs`] =
            ballsToOvers((matchData[bowlingTeam].bowlers[bowlerId]?.balls || 0) + 1);
        updates[`${matchPath}/${bowlingTeam}/bowlers/${bowlerId}/economy`] =
            calculateEconomy(
                (matchData[bowlingTeam].bowlers[currentBowler.id]?.runs || 0),
                (matchData[bowlingTeam].bowlers[currentBowler.id]?.balls || 0) + 1
            );

        if (currentDismissalType !== 'run out' && currentDismissalType !== 'retired hurt') {
            updates[`${matchPath}/${bowlingTeam}/bowlers/${bowlerId}/wickets`] =
                (matchData[bowlingTeam].bowlers[bowlerId]?.wickets || 0) + 1;
        }

        // Update team data
        updates[`${matchPath}/${battingTeam}/totalWickets`] =
            (matchData[battingTeam].totalWickets || 0) + 1;
        updates[`LiveData/liveScore/${battingTeam}/wicket`] =
            (matchData[battingTeam].totalWickets || 0) + 1;
        updates[`${matchPath}/${battingTeam}/totalBalls`] =
            (matchData[battingTeam].totalBalls || 0) + 1;
        updates[`${matchPath}/${battingTeam}/overs`] =
            ballsToOvers((matchData[battingTeam].totalBalls || 0) + 1);
        updates[`LiveData/liveScore/${battingTeam}/overs`] =
            ballsToOvers((matchData[battingTeam].totalBalls || 0) + 1);

        if (currentDismissalType === 'run out') {
            updates[`${matchPath}/${battingTeam}/totalRuns`] =
                (matchData[battingTeam].totalRuns || 0) + runsBeforeOut;
            updates[`LiveData/liveScore/${battingTeam}/score`] =
                (matchData[battingTeam].totalRuns || 0) + runsBeforeOut;
        }

        // Add to fall of wickets
        const wicketNumber = (matchData[battingTeam].totalWickets || 0) + 1;
        const currentScore = matchData[battingTeam].totalRuns || 0;
        const currentOver = ballsToOvers((matchData[battingTeam].totalBalls || 0) + 1);

        updates[`${matchPath}/${battingTeam}/fallOfWickets/${wicketNumber}`] = {
            score: `${currentScore}/${wicketNumber}`,
            name: currentDismissalType !== "run out" ? matchData[battingTeam].players[strikerId].name : matchData[battingTeam].players[outBatsman].name,
            over: currentOver
        };

        // Check if innings should end (10 wickets or overs completed) and (matchData[battingTeam].totalBalls || 0) + 1


        if ((matchData[battingTeam].totalWickets || 0) + 1 >= 10) {
            await handleInningsCompletion();
        }
        else if (((matchData[battingTeam].totalBalls || 0) + 1) >= 120) {
            await handleInningsCompletion();
        }
        else if (currentDismissalType === 'run out') {
            setSelectingFor(outBatsmanType);
            setShowBatsmanSelector(true);
        } else {
            setSelectingFor("striker");
            setShowBatsmanSelector(true);
        }

        if (currentDismissalType !== "run out") {
            const newBallsInOver = (matchData[battingTeam].totalBalls || 0) + 1;
            const isOverCompleted = newBallsInOver % 6 === 0;
            if (isOverCompleted) {
                await handleOverCompletion();
            }
        }

        // Update match data in Firebase
        await update(ref(database), updates);

        setShowDismissalModal(false);
        setShowFielderModal(false);
        setOutBatsman(null);
        setOutBatsmanType(null);
        setFielder(null);
    };

    const handleInningsCompletion = async () => {
        const updatedMatchData = JSON.parse(JSON.stringify(matchData));

        // Determine which team was batting and which was bowling
        const wasTeam1Batting = updatedMatchData.common.firstBat === 1;
        const matchPath = updatedMatchData.common.title;
        const updates = {};

        // Update LiveData in Firebase
        updates[`LiveData/common/firstBat`] = 0;
        updates[`LiveData/liveScore/firstBat`] = 0;

        //firebase update
        updates[`${matchPath}/common/firstBat`] = 0;

        try {
            // Update both the match data and LiveData
            await update(ref(database), updates);

            // Update local state
            wasTeam1Batting && setCurrentBatsmen({
                striker: { id: null, name: null },
                nonStriker: { id: null, name: null }
            });
            wasTeam1Batting && setCurrentBowler({ id: null, name: null });

            // Show player selection modals for new innings
            wasTeam1Batting && setShowBatsmanSelector(true);
            wasTeam1Batting && setSelectingFor('striker');

            // Show innings change notification
            wasTeam1Batting && alert(`Innings break! ${updatedMatchData.team2.name} now batting.`);

            // After second innings over set man of the match
            !wasTeam1Batting && setShowMOMSelector(true);

        } catch (error) {
            console.error('Error completing innings:', error);
            alert('Failed to complete innings transition');
        }
    };

    // MOM selection handler
    const handleMOMSelection = async (playerId, playerName) => {
        const matchPath = matchData.common.title;
        const updates = {};

        updates[`${matchPath}/common/mom`] = playerName;

        // Calculate results
        const team1Runs = matchData.team1.totalRuns || 0;
        const team2Runs = matchData.team2.totalRuns || 0;
        const team2Wickets = matchData.team2.totalWickets || 0;

        let result = "";

        if (team1Runs > team2Runs) {
            const margin = team1Runs - team2Runs;
            result = `${matchData.team1.name} won by ${margin} ${margin === 1 ? 'run' : 'runs'}`;
        }
        else if (team2Runs > team1Runs) {
            const wicketsLeft = 10 - team2Wickets;
            result = `${matchData.team2.name} won by ${wicketsLeft} ${wicketsLeft === 1 ? 'wicket' : 'wickets'}`;
        }
        else {
            result = "Match tied";
        }

        updates[`${matchPath}/common/result`] = result;
        updates[`${matchPath}/common/finished`] = 1;
        // updates[`LiveData/isLive`] = 0;

        try {
            setLoading(true);
            setIsLive(0);
            await update(ref(database), updates);
            setShowMOMSelector(false);
            window.location.reload();
        } catch (error) {
            console.error('Error saving MOM:', error);
            alert('Failed to save Man of the Match');
        }
    };

    if (loading) {
        return <div className="loading-container">Loading match data...</div>;
    }

    return (
        <div className="live-match-container">
            <div>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    <label className='liveMatchH2'>Live Match</label>
                    <span className={`status-indicator ${isLive ? 'live' : 'not-live'}`}>
                        {isLive ? 'LIVE' : 'NOT LIVE'}
                    </span>
                </div>

                {isLive ? (
                    <div className="live-match-display">
                        <div className="match-header">
                            <h3>{liveScore.matchTitle || 'Match Title'}</h3>
                            <p className="match-status">{liveScore.status || 'Match status'}</p>
                        </div>

                        <div className="scorecard">
                            <div className={`team-score ${liveScore.firstBat === 1 ? 'batting' : ''}`}>
                                <h4>{liveScore.team1.name || 'Team 1'}</h4>
                                <p className="score">
                                    {liveScore.team1.score || 0}/{liveScore.team1.wicket || 0}
                                </p>
                                <p className="overs">({liveScore.team1.overs || 0} overs)</p>
                            </div>

                            <div className="vs-separator">vs</div>

                            <div className={`team-score ${liveScore.firstBat === 0 ? 'batting' : ''}`}>
                                <h4>{liveScore.team2.name || 'Team 2'}</h4>
                                <p className="score">
                                    {liveScore.team2.score || 0}/{liveScore.team2.wicket || 0}
                                </p>
                                <p className="overs">({liveScore.team2.overs || 0} overs)</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="no-live-match">
                        <p>No live match currently. Start a new match when ready.</p>
                        <button
                            onClick={() => setShowMatchSelector(true)}
                            className="start-match-btn"
                        >
                            Start New Match
                        </button>
                    </div>
                )}

                {matchData && (
                    <div className="scoring-controls">
                        <p className='liveScoreActionCard'>Scoring Controls</p>

                        <div className="runs-buttons">
                            <button onClick={() => handleScore(0)}>0</button>
                            <button onClick={() => handleScore(1)}>1</button>
                            <button onClick={() => handleScore(2)}>2</button>
                            <button onClick={() => handleScore(3)}>3</button>
                            <button onClick={() => handleScore(4)}>4</button>
                            <button onClick={() => handleScore(6)}>6</button>
                        </div>

                        <div className="extras-buttons">
                            <button onClick={() => handleExtra('WB')}>Wide (WB)</button>
                            <button onClick={() => handleExtra('NB')}>No Ball (NB)</button>
                            <button onClick={() => handleExtra('LB')}>Leg Bye (LB)</button>
                        </div>

                        <div className="wicket-buttons">
                            <button onClick={() => handleWicket('bowled')}>Bowled</button>
                            <button onClick={() => handleWicket('caught')}>Caught</button>
                            <button onClick={() => handleWicket('lbw')}>LBW</button>
                        </div>

                        <div className="wicket-buttons" style={{ marginBottom: '0px' }}>
                            <button onClick={() => handleWicket('stumped')}>Stumped</button>
                            <button onClick={() => handleWicket('run out')}>Run Out</button>
                            <button onClick={() => handleWicket('hit wicket')}>Hit Wicket</button>
                            <button onClick={() => handleWicket('retired hurt')}>Retired Hurt</button>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ maxWidth: '900px' }}>
                {matchData && (
                    <div>
                        <div className="match-info">
                            <p>
                                <label>Bowler: </label>
                                {currentBowler?.name || 'Not selected'}
                                {!currentBowler.id && (
                                    <button onClick={handleSelectBowler} className="select-player-btn">
                                        Select Bowler
                                    </button>
                                )}
                            </p>
                            <p>
                                <label>Striker: </label>
                                {currentBatsmen?.striker?.name || 'Not selected'}
                                {!currentBatsmen.striker.id && (
                                    <button onClick={() => handleSelectBatsman('striker')} className="select-player-btn">
                                        Select Striker
                                    </button>
                                )}
                            </p>
                            <p>
                                <label>Non-Striker: </label>
                                {currentBatsmen?.nonStriker?.name || 'Not selected'}
                                {!currentBatsmen.nonStriker.id && (
                                    <button onClick={() => handleSelectBatsman('nonStriker')} className="select-player-btn">
                                        Select Non-Striker
                                    </button>
                                )}
                            </p>
                        </div>

                        {/* Team 2 Details */}
                        {matchData.common.firstBat === 0 &&
                            <TeamDetails
                                team={matchData.team2 || {}}
                                isBatting={matchData.common.firstBat === 0}
                            />
                        }

                        {/* Team 1 Details */}
                        <TeamDetails
                            team={matchData.team1 || {}}
                            isBatting={matchData.common.firstBat === 1}
                        />

                        {/* Team 2 Details */}
                        {matchData.common.firstBat === 1 &&
                            <TeamDetails
                                team={matchData.team2 || {}}
                                isBatting={matchData.common.firstBat === 0}
                            />
                        }
                    </div>
                )}
            </div>

            {/* Batman selection model */}
            {showBatsmanSelector && (
                <div className="modal-overlay">
                    <div className="player-selector-modal">
                        <h3>Select {selectingFor === 'striker' ? 'Striker' : 'Non-Striker'}</h3>
                        <div className="player-list">
                            {Object.entries(
                                matchData.common.firstBat === 1 ?
                                    matchData.team1.players || {} :
                                    matchData.team2.players || {}
                            )
                                .filter(([_, player]) => player.status === 'yet to bat' ||
                                    (player.status === 'batting' && player.id === currentBatsmen.nonStriker.id))
                                .map(([id, player]) => (
                                    <button
                                        key={id}
                                        onClick={() => handleBatsmanSelection(id, player.name, selectingFor)}
                                    >
                                        {player.name}
                                    </button>
                                ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Bowler selection model */}
            {showBowlerSelector && (
                <div className="modal-overlay">
                    <div className="player-selector-modal">
                        <h3>Select Bowler</h3>
                        <div className="player-list">
                            {Object.entries(
                                matchData.common.firstBat === 1 ?
                                    matchData.team2.bowlers :
                                    matchData.team1.bowlers
                            )
                                .filter(([id, bowler]) =>
                                    bowler.overs < 4 && // Assuming max 4 overs per bowler
                                    id !== previousBowler
                                )
                                .map(([id, bowler]) => (
                                    <button
                                        key={id}
                                        onClick={() => handleBowlerSelection(id, bowler.name)}
                                    >
                                        {bowler.name}
                                    </button>
                                ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Match Selector Modal */}
            {showMatchSelector && (
                <div className="modal-overlay">
                    <div className="match-selector-modal">
                        <h3>Select Upcoming Match</h3>

                        <div className="match-list">
                            {Object.entries(upcomingMatches)
                                .filter(([_, match]) => match.active === 1)
                                .map(([id, match]) => (
                                    <div
                                        key={id}
                                        className={`match-item ${selectedMatch === id ? 'selected' : ''}`}
                                        onClick={() => setSelectedMatch(id)}
                                    >
                                        <div className="match-title">{match.title}</div>
                                        <div className="match-teams">{match.teams}</div>
                                        <div className="match-time">{match.time} - {match.date}</div>
                                    </div>
                                ))}
                        </div>

                        {selectedMatch && (
                            <div className="match-configuration">
                                <div className="form-group">
                                    <label>Toss wining Team:</label>
                                    <select
                                        value={tossTeam}
                                        onChange={(e) => {
                                            setTossTeam(e.target.value);
                                        }}
                                    >
                                        <option value="" disabled>Select Team</option>
                                        {upcomingMatches[selectedMatch]?.teams.split(' vs ').map(team => (
                                            <option key={team} value={team}>{team}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Choose Batting Team:</label>
                                    <select
                                        value={selectedTeam1}
                                        onChange={(e) => {
                                            setSelectedTeam1(e.target.value);
                                            setBattingTeam(e.target.value);
                                            tossTeam === e.target.value ? setStatusInput(tossTeam + " won the toss and elected to bat first") : setStatusInput(tossTeam + " won the toss and elected to ball first");
                                        }}
                                    >
                                        <option value="" disabled>Select Team</option>
                                        {upcomingMatches[selectedMatch]?.teams.split(' vs ').map(team => (
                                            <option key={team} value={team}>{team}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="modal-actions">
                            <button
                                onClick={startNewMatch}
                                disabled={!selectedMatch || !statusInput || !selectedTeam1}
                                className="confirm-btn"
                            >
                                Start Match
                            </button>
                            <button
                                onClick={() => {
                                    setShowMatchSelector(false);
                                    setSelectedMatch(null);
                                }}
                                className="cancel-btn"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Extra run model */}
            {showExtraRunsModal && (
                <div className="modal-overlay">
                    <div className="player-selector-modal">
                        <h3>Enter runs from {currentExtraType}</h3>
                        <input
                            type="number"
                            value={extraRunsInput}
                            onChange={(e) => setExtraRunsInput(e.target.value)}
                            placeholder="Enter runs (default 1)"
                            style={{ marginLeft: "10px" }}
                        />
                        <div className="modal-actions">
                            <button onClick={handleExtraRunsSubmit} className="confirm-btn">
                                Submit
                            </button>
                            <button
                                onClick={() => setShowExtraRunsModal(false)}
                                className="cancel-btn"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Extra Reason Modal */}
            {showExtraReasonModal && (
                <div className="modal-overlay">
                    <div className="player-selector-modal">
                        <h3>Reason for extra runs</h3>
                        <div className="reason-options">
                            <label>
                                <input
                                    type="radio"
                                    value="1"
                                    checked={extraReasonInput === "1"}
                                    onChange={() => setExtraReasonInput("1")}
                                />
                                Hit (batsman hit the ball)
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    value="2"
                                    checked={extraReasonInput === "2"}
                                    onChange={() => setExtraReasonInput("2")}
                                />
                                Misfield (fielder error)
                            </label>
                        </div>
                        <div className="modal-actions">
                            <button onClick={handleExtraReasonSubmit} className="confirm-btn">
                                Submit
                            </button>
                            <button
                                onClick={() => setShowExtraReasonModal(false)}
                                className="cancel-btn"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dismissal Confirmation Modal */}
            {showDismissalModal && (
                <div className="modal-overlay">
                    <div className="player-selector-modal">
                        <h3>Confirm Dismissal</h3>
                        <p>Type: {currentDismissalType}</p>
                        {fielder && (
                            <p>Fielder: {matchData[matchData.common.firstBat === 1 ? 'team2' : 'team1'].players[fielder]?.name}</p>
                        )}
                        <div className="modal-actions">
                            <button onClick={() => handleDismissalConfirmation()} className="confirm-btn">
                                Confirm
                            </button>
                            <button
                                onClick={() => setShowDismissalModal(false)}
                                className="cancel-btn"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Fielder Selection Modal */}
            {showFielderModal && (
                <div className="modal-overlay">
                    <div className="player-selector-modal">
                        <h3>Select Fielder who {currentDismissalType}</h3>
                        <div className="player-list">
                            {Object.entries(
                                matchData.common.firstBat === 1 ?
                                    matchData.team2.players :
                                    matchData.team1.players
                            ).map(([id, player]) => (
                                <button
                                    key={id}
                                    onClick={() => handleFielderSelection(id, player.name)}
                                >
                                    {player.name}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowFielderModal(false)}
                            className="cancel-btn"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Run Out Modal */}
            {showRunOutModal && (
                <div className="modal-overlay">
                    <div className="player-selector-modal">
                        <h3>Run Out Details</h3>

                        <div className="form-group">
                            <label>Select Fielder who {currentDismissalType} - {matchData?.common?.firstBat === 1 ? matchData?.team2?.players?.[fielder]?.name : matchData?.team1?.players?.[fielder]?.name}</label>
                            <div className="player-list">
                                {Object.entries(
                                    matchData.common.firstBat === 1 ?
                                        matchData.team2.players :
                                        matchData.team1.players
                                ).map(([id, player]) => (
                                    <button
                                        key={id}
                                        onClick={() => setFielder(id)}
                                    >
                                        {player.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Runs scored before dismissal:</label>
                            <input
                                type="number"
                                min="0"
                                value={runsBeforeOut}
                                onChange={(e) => setRunsBeforeOut(parseInt(e.target.value) || 0)}
                                style={{ width: '200px' }}
                            />
                        </div>

                        <div className="form-group">
                            <label>Which batsman is out?</label>
                            <div>
                                <div style={{ display: 'flex', flexDirection: 'row', marginBottom: '-15px' }}>
                                    <div style={{ width: '400px' }}>
                                        <p>Striker: {currentBatsmen?.striker?.name}</p>
                                    </div>
                                    <input
                                        type="radio"
                                        checked={outBatsman === currentBatsmen?.striker?.id}
                                        onChange={() => [setOutBatsman(currentBatsmen?.striker?.id), setOutBatsmanType('striker')]}
                                        style={{ width: '20px' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <div style={{ width: '400px' }}>
                                        <p>Non-Striker: {currentBatsmen?.nonStriker?.name}</p>
                                    </div>
                                    <input
                                        type="radio"
                                        checked={outBatsman === currentBatsmen?.nonStriker?.id}
                                        onChange={() => [setOutBatsman(currentBatsmen?.nonStriker?.id), setOutBatsmanType('nonStriker')]}
                                        style={{ width: '20px' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button onClick={() => [handleDismissalConfirmation(), setShowRunOutModal(false)]} className="confirm-btn">
                                Confirm Run Out
                            </button>
                            <button
                                onClick={() => setShowRunOutModal(false)}
                                className="cancel-btn"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Run Out Player Shifting Modal */}
            {showRunOutPlayerShistModal && (
                <div className="modal-overlay">
                    <div className="player-selector-modal">
                        <h3>After Run Out Striker Details</h3>

                        <div className="form-group">
                            <label>Which batsman is striker?</label>
                            <div>
                                <div style={{ display: 'flex', flexDirection: 'row', marginBottom: '-15px' }}>
                                    <div style={{ width: '400px' }}>
                                        <p>Striker: {currentBatsmen?.striker?.name}</p>
                                    </div>
                                    <input
                                        type="radio"
                                        checked={afterOutStriker === currentBatsmen?.striker?.id}
                                        onChange={() => setAfterOutStriker(currentBatsmen?.striker?.id)}
                                        style={{ width: '20px' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <div style={{ width: '400px' }}>
                                        <p>Non-Striker: {currentBatsmen?.nonStriker?.name}</p>
                                    </div>
                                    <input
                                        type="radio"
                                        checked={afterOutStriker === currentBatsmen?.nonStriker?.id}
                                        onChange={() => setAfterOutStriker(currentBatsmen?.nonStriker?.id)}
                                        style={{ width: '20px' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button onClick={() => [runOutPlayerShift(), setShowRunOutPlayerShistModal(false)]} className="confirm-btn">
                                Confirm striker
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MOM Selector Modal */}
            {showMOMSelector && (
                <div className="modal-overlay">
                    <div className="player-selector-modal">
                        <h3>Select Man of the Match</h3>
                        <div className="player-list">
                            {[
                                ...Object.entries(matchData.team1.players || {}),
                                ...Object.entries(matchData.team2.players || {})
                            ]
                                .map(([id, player]) => (
                                    <button
                                        key={id}
                                        onClick={() => handleMOMSelection(id, player.name)}
                                    >
                                        {player.name} ({player.runs}r, {player.wickets}w)
                                    </button>
                                ))}
                        </div>
                        <button
                            onClick={() => setShowMOMSelector(false)}
                            className="cancel-btn"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveMatch;