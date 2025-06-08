// pages/Teams.jsx
import React, { useEffect, useState } from 'react';
import { ref, onValue, set, update } from 'firebase/database';
import { database } from '../../components/firebase';
import './Teams.css';

const Teams = () => {
    const [teamsData, setTeamsData] = useState({});
    const [editingTeam, setEditingTeam] = useState(null);
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [editingPlayerCategory, setEditingPlayerCategory] = useState(null);
    const [showAddPlayer, setShowAddPlayer] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [showExchangeModal, setShowExchangeModal] = useState(false);
    const [mainSquadPlayer, setMainSquadPlayer] = useState(null);
    const [extraPlayer, setExtraPlayer] = useState(null);
    const [newPlayer, setNewPlayer] = useState({
        id: '',
        name: '',
        role: '',
        icon: 'bat'
    });

    //Get firebase data 
    useEffect(() => {
        const teamsRef = ref(database, 'teamData');
        onValue(teamsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setTeamsData(data);
            }
        });
    }, []);

    //Handle input data
    const handleTeamInputChange = (e) => {
        const { name, value } = e.target;
        if (editingTeam) {
            setEditingTeam(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handlePlayerInputChange = (e) => {
        const { name, value } = e.target;
        if (editingPlayer) {
            setEditingPlayer(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const updateTeam = async () => {
        try {
            const teamKey = `E2${editingTeam.id}`;
            const teamRef = ref(database, `teamData/${teamKey}`);

            await update(teamRef, {
                name: editingTeam.name,
                captain: editingTeam.captain
            });

            setEditingTeam(null);
            alert('Team updated successfully!');
        } catch (error) {
            console.error('Error updating team:', error);
            alert('Failed to update team');
        }
    };

    const updatePlayer = async (isExtraPlayer) => {
        try {
            const playerRef = ref(database, `teamData/${selectedTeam}/${isExtraPlayer}/${editingPlayer.id}`);

            await set(playerRef, editingPlayer);

            setEditingPlayer(null);
            setEditingPlayerCategory(null);
            alert('Player updated successfully!');
        } catch (error) {
            console.error('Error updating player:', error);
            alert('Failed to update player');
        }
    };

    const addNewPlayer = async (isExtraPlayer = false) => {
        try {
            const playerId = new Date().getTime();
            const playerPath = isExtraPlayer ? 'extraPlayers' : 'players';
            const playerRef = ref(database, `teamData/${selectedTeam}/${playerPath}/${playerId}`);

            await set(playerRef, {
                ...newPlayer,
                id: playerId
            });

            setNewPlayer({
                id: '',
                name: '',
                role: '',
                icon: 'bat'
            });
            setShowAddPlayer(false);
            alert(`New ${isExtraPlayer ? 'extra ' : ''}player added successfully!`);
        } catch (error) {
            console.error('Error adding new player:', error);
            alert(`Failed to add new ${isExtraPlayer ? 'extra ' : ''}player`);
        }
    };

    //Exchange player
    const handleExchangePlayers = async () => {
        if (!mainSquadPlayer || !extraPlayer || !selectedTeam) return;

        try {
            const teamRef = ref(database, `teamData/${selectedTeam}`);

            // Prepare updates
            const updates = {
                [`players/${mainSquadPlayer.id}`]: null, // Remove from main squad
                [`extraPlayers/${extraPlayer.id}`]: null, // Remove from extras
                [`players/${extraPlayer.id}`]: { // Add to main squad
                    id: extraPlayer.id,
                    name: extraPlayer.name,
                    role: extraPlayer.role || 'Player',
                    icon: extraPlayer.icon || 'bat'
                },
                [`extraPlayers/${mainSquadPlayer.id}`]: { // Add to extras
                    id: mainSquadPlayer.id,
                    name: mainSquadPlayer.name,
                    ...(mainSquadPlayer.role && { role: mainSquadPlayer.role }),
                    ...(mainSquadPlayer.icon && { icon: mainSquadPlayer.icon })
                }
            };

            await update(teamRef, updates);
            resetExchange();
            alert('Players exchanged successfully!');
        } catch (error) {
            console.error('Error exchanging players:', error);
            alert('Failed to exchange players');
        }
    };

    const resetExchange = () => {
        setMainSquadPlayer(null);
        setExtraPlayer(null);
        setShowExchangeModal(false);
    };

    return (
        <div className="teams-container">
            <h2>Teams</h2>

            {editingTeam ? (
                <div className="edit-team-form">
                    <h3>Edit Team</h3>
                    <div className="form-group">
                        <label>Team Name:</label>
                        <input
                            type="text"
                            name="name"
                            value={editingTeam.name}
                            disabled
                        />
                    </div>
                    <div className="form-group">
                        <label>Captain:</label>
                        <input
                            type="text"
                            name="captain"
                            value={editingTeam.captain}
                            onChange={handleTeamInputChange}
                        />
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
            ) : editingPlayer ? (
                <div className="edit-player-form">
                    <h3>Edit Player</h3>
                    <div className="form-group">
                        <label>Player Name:</label>
                        <input
                            type="text"
                            name="name"
                            value={editingPlayer.name}
                            onChange={handlePlayerInputChange}
                        />
                    </div>
                    <div className="form-group">
                        <label>Role:</label>
                        <select
                            name="role"
                            value={editingPlayer.role}
                            onChange={handlePlayerInputChange}
                        >
                            <option value="Batter">Batter</option>
                            <option value="Bowler">Bowler</option>
                            <option value="All Rounder">All-Rounder</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Icon Type:</label>
                        <select
                            name="icon"
                            value={editingPlayer.icon}
                            onChange={handlePlayerInputChange}
                        >
                            <option value="bat">bat</option>
                            <option value="ball">ball</option>
                            <option value="all-rounder">all-rounder</option>
                        </select>
                    </div>
                    <div className="form-actions">
                        <button
                            onClick={() => updatePlayer(editingPlayerCategory)}
                            className="save-btn"
                        >
                            Save Changes
                        </button>
                        <button
                            onClick={() => [setEditingPlayer(null), setEditingPlayerCategory(null)]}
                            className="cancel-btn"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : showAddPlayer && selectedTeam ? (
                <div className="add-player-form">
                    <h3>Add Extra Player to {teamsData[selectedTeam]?.name}</h3>
                    <div className="form-group">
                        <label>Player Name:</label>
                        <input
                            type="text"
                            name="name"
                            value={newPlayer.name}
                            onChange={handlePlayerInputChange}
                            placeholder="Player's name"
                        />
                    </div>
                    <div className="form-group">
                        <label>Role:</label>
                        <input
                            type="text"
                            name="role"
                            value={newPlayer.role}
                            onChange={handlePlayerInputChange}
                            placeholder="e.g., Captain, Vice Captain, Wicket Keeper, Bowler, Batter,etc."
                        />
                    </div>
                    <div className="form-group">
                        <label>Icon Type:</label>
                        <select
                            name="icon"
                            value={newPlayer.icon}
                            onChange={handlePlayerInputChange}
                        >
                            <option value="bat">bat</option>
                            <option value="ball">ball</option>
                            <option value="all-rounder">all-rounder</option>
                        </select>
                    </div>
                    <div className="form-actions">
                        <button onClick={() => addNewPlayer(true)} className="save-btn extra">
                            Add Extra Player
                        </button>
                        <button
                            onClick={() => setShowAddPlayer(false)}
                            className="cancel-btn"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="teams-grid">
                        {Object.keys(teamsData).length > 0 ? (
                            Object.entries(teamsData).map(([teamKey, team]) => (
                                <div key={teamKey} className="team-card">
                                    <div className="team-header">
                                        <h3>{team.name}</h3>
                                        <div className="team-captain">Captain: {team.captain}</div>
                                        <div className="team-actions">
                                            <button
                                                onClick={() => {
                                                    setEditingTeam({
                                                        id: team.id,
                                                        name: team.name,
                                                        captain: team.captain
                                                    });
                                                    setSelectedTeam(teamKey);
                                                }}
                                                className="edit-btn"
                                            >
                                                Edit Team
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedTeam(teamKey);
                                                    setShowAddPlayer(true);
                                                }}
                                                className="add-player-btn"
                                            >
                                                Add Extra Player
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedTeam(teamKey);
                                                    setShowExchangeModal(true);
                                                }}
                                                className="exchange-team-btn"
                                            >
                                                Exchange Players
                                            </button>
                                        </div>
                                    </div>

                                    <div className="players-section">
                                        <h4 style={{ color: 'rgb(5, 152, 210)' }}>Main Squad</h4>
                                        <div className="players-list">
                                            {team.players && Object.entries(team.players).map(([playerId, player]) => (
                                                <div key={playerId} className="player-card">
                                                    <div className="player-info">
                                                        <div className="player-name">{player.name}</div>
                                                        <div className="player-role">{player.role}</div>
                                                    </div>
                                                    <div className="player-actions">
                                                        <button
                                                            onClick={() => {
                                                                setEditingPlayer(player);
                                                                setEditingPlayerCategory("players");
                                                                setSelectedTeam(teamKey);
                                                            }}
                                                            className="edit-btn"
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="players-section">
                                        <h4 style={{ color: 'rgb(5, 152, 210)' }}>Extra Players</h4>
                                        <div className="players-list">
                                            {team.extraPlayers && Object.entries(team.extraPlayers).map(([playerId, player]) => (
                                                <div key={playerId} className="player-card">
                                                    <div className="player-info">
                                                        <div className="player-name">{player.name}</div>
                                                        <div className="player-role">{player.role}</div>
                                                    </div>
                                                    <div className="player-actions">
                                                        <button
                                                            onClick={() => {
                                                                setEditingPlayer(player);
                                                                setEditingPlayerCategory("extraPlayers");
                                                                setSelectedTeam(teamKey);
                                                            }}
                                                            className="edit-btn"
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="no-teams">No teams available</p>
                        )}
                    </div>
                </>
            )}
            {showExchangeModal && selectedTeam && teamsData[selectedTeam] && (
                <div className="modal-overlay">
                    <div className="exchange-modal">
                        <h3 style={{ color: 'rgb(5, 152, 210)' }}>Exchange Players - {teamsData[selectedTeam].name}</h3>

                        <div className="exchange-columns">
                            {/* Main Squad Column */}
                            <div className="exchange-column">
                                <h4>Main Squad</h4>
                                <div className="player-list">
                                    {Object.values(teamsData[selectedTeam].players || {}).map(player => (
                                        <div
                                            key={player.id}
                                            className={`player-item ${mainSquadPlayer?.id === player.id ? 'selected' : ''}`}
                                            onClick={() => setMainSquadPlayer(player)}
                                        >
                                            <div className="player-info">
                                                <div className="player-name">{player.name}</div>
                                                <div className="player-role">{player.role}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Extra Players Column */}
                            <div className="exchange-column">
                                <h4>Extra Players</h4>
                                <div className="player-list">
                                    {Object.values(teamsData[selectedTeam].extraPlayers || {}).map(player => (
                                        <div
                                            key={player.id}
                                            className={`player-item ${extraPlayer?.id === player.id ? 'selected' : ''}`}
                                            onClick={() => setExtraPlayer(player)}
                                        >
                                            <div className="player-info">
                                                <div className="player-name">{player.name}</div>
                                                {player.role && <div className="player-role">{player.role}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <div className="selection-info">
                                {mainSquadPlayer && (
                                    <div className="selected-player">
                                        <span>Main Squad: </span>
                                        <strong>{mainSquadPlayer.name}</strong>
                                    </div>
                                )}
                                {extraPlayer && (
                                    <div className="selected-player">
                                        <span>Extra Player: </span>
                                        <strong>{extraPlayer.name}</strong>
                                    </div>
                                )}
                            </div>

                            <div className="action-buttons">
                                <button
                                    onClick={handleExchangePlayers}
                                    disabled={!mainSquadPlayer || !extraPlayer}
                                    className="confirm-btn"
                                >
                                    Confirm Exchange
                                </button>
                                <button
                                    onClick={resetExchange}
                                    className="cancel-btn"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Teams;