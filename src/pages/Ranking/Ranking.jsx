import React, { useEffect, useState } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../../components/firebase';
import './Ranking.css';

const Ranking = () => {
    const [batters, setBatters] = useState({});
    const [bowlers, setBowlers] = useState({});
    const [pointsTable, setPointsTable] = useState({});
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [editingTeam, setEditingTeam] = useState(null);
    const [activeTab, setActiveTab] = useState('batters');

    useEffect(() => {
        const rankingRef = ref(database, 'RankingData');
        onValue(rankingRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setBatters(data.batters || {});
                setBowlers(data.bowlers || {});
                setPointsTable(data.pointsTable || {});
            }
        });
    }, []);

    // Sort players according to official rules:
    // Batters: higher score first, if equal higher strike rate first
    // Bowlers: higher wickets first, if equal lower economy first
    const getSortedPlayers = (players, type) => {
        const isBatters = type === 'batters' || activeTab === 'batters';
        return Object.values(players)
            .filter(Boolean)
            .sort((a, b) => {
                if (isBatters) {
                    const scoreA = Number(a.scores ?? a.runs ?? a.rating ?? 0);
                    const scoreB = Number(b.scores ?? b.runs ?? b.rating ?? 0);
                    if (scoreB !== scoreA) return scoreB - scoreA;
                    const srA = Number(a.strikeRate ?? 0);
                    const srB = Number(b.strikeRate ?? 0);
                    return srB - srA;
                } else {
                    const wA = Number(a.wickets ?? a.takenWickets ?? a.rating ?? 0);
                    const wB = Number(b.wickets ?? b.takenWickets ?? b.rating ?? 0);
                    if (wB !== wA) return wB - wA;
                    const ecoA = (a.balls > 0 || a.overs > 0 || a.economy !== undefined) ? Number(a.economy || 0) : 999;
                    const ecoB = (b.balls > 0 || b.overs > 0 || b.economy !== undefined) ? Number(b.economy || 0) : 999;
                    return ecoA - ecoB;
                }
            })
            .map((player, index) => ({ ...player, rank: index + 1 }));
    };

    // Sort teams by points then NRR (highest to lowest)
    const getSortedTeams = (teams) => {
        return Object.values(teams)
            .sort((a, b) => {
                if (b.pts !== a.pts) return b.pts - a.pts;
                return b.nrr - a.nrr;
            })
            .map((team, index) => ({ ...team, rank: index + 1 }));
    };

    const handlePlayerInputChange = (e) => {
        const { name, value } = e.target;
        if (editingPlayer) {
            setEditingPlayer(prev => {
                const updated = {
                    ...prev,
                    [name]: name === 'name' || name === 'team' || name === 'overs' ? value : Number(value)
                };
                if (name === 'scores') {
                    updated.runs = Number(value);
                }
                if (name === 'wickets') {
                    updated.takenWickets = Number(value);
                }
                return updated;
            });
        }
    };

    const handleTeamInputChange = (e) => {
        const { name, value } = e.target;
        if (editingTeam) {
            setEditingTeam(prev => ({
                ...prev,
                [name]: name === 'id' || name === 'played' || name === 'won' ||
                    name === 'lost' || name === 'nr' || name === 'pts' ?
                    Number(value) : value
            }));
        }
    };

    const updatePlayer = async (type) => {
        try {
            const playerRef = ref(database, `RankingData/${type}/${editingPlayer.id}`);
            const dataToSave = { ...editingPlayer };
            delete dataToSave.rating; // Remove legacy rating
            await set(playerRef, dataToSave);
            setEditingPlayer(null);
            alert(`${type.slice(0, -1)} updated successfully!`);
        } catch (error) {
            console.error(`Error updating ${type.slice(0, -1)}:`, error);
            alert(`Failed to update ${type.slice(0, -1)}`);
        }
    };

    const updateTeam = async () => {
        try {
            const teamRef = ref(database, `RankingData/pointsTable/${editingTeam.id}`);
            await set(teamRef, editingTeam);
            setEditingTeam(null);
            alert('Team updated successfully!');
        } catch (error) {
            console.error('Error updating team:', error);
            alert('Failed to update team');
        }
    };

    const getPlayerType = () => {
        return activeTab === 'batters' ? 'batters' : 'bowlers';
    };

    return (
        <div className="ranking-container">
            <h2>Rankings</h2>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'batters' ? 'active' : ''}`}
                    onClick={() => setActiveTab('batters')}
                >
                    Top Batters
                </button>
                <button
                    className={`tab ${activeTab === 'bowlers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bowlers')}
                >
                    Top Bowlers
                </button>
                <button
                    className={`tab ${activeTab === 'pointsTable' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pointsTable')}
                >
                    Points Table
                </button>
            </div>

            {activeTab !== 'pointsTable' ? (
                editingPlayer ? (
                    <div className="edit-player-form">
                        <h3>Edit {activeTab.slice(0, -1)}</h3>
                        <div className="form-group">
                            <label>Name:</label>
                            <input
                                type="text"
                                name="name"
                                value={editingPlayer.name}
                                disabled
                            />
                        </div>
                        <div className="form-group">
                            <label>Team:</label>
                            <input
                                type="text"
                                name="team"
                                value={editingPlayer.team}
                                maxLength="3"
                                disabled
                            />
                        </div>
                        {activeTab === 'batters' ? (
                            <>
                                <div className="form-group">
                                    <label>Score (Runs):</label>
                                    <input
                                        type="number"
                                        name="scores"
                                        value={editingPlayer.scores ?? editingPlayer.runs ?? editingPlayer.rating ?? 0}
                                        onChange={handlePlayerInputChange}
                                        min="0"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Overs Played:</label>
                                    <input
                                        type="text"
                                        name="overs"
                                        value={editingPlayer.overs ?? editingPlayer.oversPlayed ?? '0.0'}
                                        onChange={handlePlayerInputChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Strike Rate:</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="strikeRate"
                                        value={editingPlayer.strikeRate ?? 0}
                                        onChange={handlePlayerInputChange}
                                        min="0"
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label>Taken Wickets:</label>
                                    <input
                                        type="number"
                                        name="wickets"
                                        value={editingPlayer.wickets ?? editingPlayer.takenWickets ?? editingPlayer.rating ?? 0}
                                        onChange={handlePlayerInputChange}
                                        min="0"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Overs Bowled:</label>
                                    <input
                                        type="text"
                                        name="overs"
                                        value={editingPlayer.overs ?? editingPlayer.oversBowled ?? '0.0'}
                                        onChange={handlePlayerInputChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Economy:</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="economy"
                                        value={editingPlayer.economy ?? 0}
                                        onChange={handlePlayerInputChange}
                                        min="0"
                                    />
                                </div>
                            </>
                        )}
                        <div className="form-actions">
                            <button
                                onClick={() => updatePlayer(getPlayerType())}
                                className="save-btn"
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={() => setEditingPlayer(null)}
                                className="cancel-btn"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="ranking-table">
                            <table>
                                <thead>
                                    {activeTab === 'batters' ? (
                                        <tr>
                                            <th>Rank</th>
                                            <th>Name</th>
                                            <th>Team</th>
                                            <th>Scores (Runs)</th>
                                            <th>Overs</th>
                                            <th>Strike Rate</th>
                                            <th>Actions</th>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <th>Rank</th>
                                            <th>Name</th>
                                            <th>Team</th>
                                            <th>Taken Wickets</th>
                                            <th>Overs</th>
                                            <th>Economy</th>
                                            <th>Actions</th>
                                        </tr>
                                    )}
                                </thead>
                                <tbody>
                                    {!getSortedPlayers(activeTab === 'batters' ? batters : bowlers, activeTab) &&
                                        (
                                            <p style={{ marginTop: '20px' }}>There are no {activeTab === 'batters' ? 'batters' : 'bowlers'} available yet</p>
                                        )
                                    }
                                    {getSortedPlayers(activeTab === 'batters' ? batters : bowlers, activeTab).map((player) => (
                                        <tr key={player.id} className={player.rank <= 3 ? 'top-three' : ''}>
                                            <td>{player.rank}</td>
                                            <td>{player.name}</td>
                                            <td>{player.team}</td>
                                            {activeTab === 'batters' ? (
                                                <>
                                                    <td><strong>{player.scores ?? player.runs ?? player.rating ?? 0}</strong></td>
                                                    <td>{player.overs ?? player.oversPlayed ?? (player.balls ? `${Math.floor(player.balls / 6)}.${player.balls % 6}` : '0.0')}</td>
                                                    <td>{Number(player.strikeRate || 0).toFixed(2)}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td><strong>{player.wickets ?? player.takenWickets ?? player.rating ?? 0}</strong></td>
                                                    <td>{player.overs ?? player.oversBowled ?? (player.balls ? `${Math.floor(player.balls / 6)}.${player.balls % 6}` : '0.0')}</td>
                                                    <td>{Number(player.economy || 0).toFixed(2)}</td>
                                                </>
                                            )}
                                            <td>
                                                <button
                                                    onClick={() => setEditingPlayer(player)}
                                                    className="edit-btn"
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )
            ) : editingTeam ? (
                <div className="edit-team-form">
                    <h3>Edit Team</h3>
                    <div className="form-group">
                        <label>Team:</label>
                        <input
                            type="text"
                            name="team"
                            value={editingTeam.team}
                            disabled
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Played:</label>
                            <input
                                type="number"
                                name="played"
                                value={editingTeam.played}
                                onChange={handleTeamInputChange}
                                min="0"
                                style={{ width: '60px' }}
                            />
                        </div>
                        <div className="form-group">
                            <label>Won:</label>
                            <input
                                type="number"
                                name="won"
                                value={editingTeam.won}
                                onChange={handleTeamInputChange}
                                min="0"
                                style={{ width: '60px' }}
                            />
                        </div>
                        <div className="form-group">
                            <label>Lost:</label>
                            <input
                                type="number"
                                name="lost"
                                value={editingTeam.lost}
                                onChange={handleTeamInputChange}
                                min="0"
                                style={{ width: '60px' }}
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Tied:</label>
                            <input
                                type="number"
                                name="nr"
                                value={editingTeam.nr}
                                onChange={handleTeamInputChange}
                                min="0"
                                style={{ width: '60px' }}
                            />
                        </div>
                        <div className="form-group">
                            <label>Points:</label>
                            <input
                                type="number"
                                name="pts"
                                value={editingTeam.pts}
                                onChange={handleTeamInputChange}
                                style={{ width: '60px' }}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label>NRR:</label>
                            <input
                                type="number"
                                name="nrr"
                                value={editingTeam.nrr}
                                onChange={handleTeamInputChange}
                                step="0.01"
                                style={{ width: '60px' }}
                            />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button onClick={updateTeam} className="save-btn">
                            Save Changes
                        </button>
                        <button
                            onClick={() => setEditingTeam(null)}
                            className="cancel-btn"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="points-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Pos</th>
                                    <th>Team</th>
                                    <th>Played</th>
                                    <th>Won</th>
                                    <th>Lost</th>
                                    <th>Tied</th>
                                    <th>Pts</th>
                                    <th>NRR</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getSortedTeams(pointsTable).map((team) => (
                                    <tr key={team.id}>
                                        <td>{team.rank}</td>
                                        <td>{team.team}</td>
                                        <td>{team.played}</td>
                                        <td>{team.won}</td>
                                        <td>{team.lost}</td>
                                        <td>{team.nr}</td>
                                        <td>{team.pts}</td>
                                        <td>{team.nrr > 0 ? `+${team.nrr}` : team.nrr}</td>
                                        <td>
                                            <button
                                                onClick={() => setEditingTeam(team)}
                                                className="edit-btn"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default Ranking;