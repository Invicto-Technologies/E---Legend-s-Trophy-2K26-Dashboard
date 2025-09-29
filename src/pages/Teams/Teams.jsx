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
    const [showAddTeam, setShowAddTeam] = useState(false);
    const [newPlayer, setNewPlayer] = useState({
        id: '',
        name: '',
        role: '',
        icon: 'bat',
        imageUrl: ''
    });
    const [newTeam, setNewTeam] = useState({
        id: '',
        name: '',
        captain: ''
    });
    const [teamPlayers, setTeamPlayers] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState({
        name: '',
        role: 'Batter',
        icon: 'bat',
        imageUrl: ''
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

    // Function to get icon based on role
    const getIconByRole = (role) => {
        switch (role) {
            case 'Batter': return 'bat';
            case 'Bowler': return 'ball';
            case 'All Rounder': return 'all-rounder';
            case 'Wicket Keeper': return 'wicket';
            default: return 'bat';
        }
    };

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

    const handleNewTeamInputChange = (e) => {
        const { name, value } = e.target;
        setNewTeam(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePlayerInputChange = (e) => {
        const { name, value } = e.target;
        if (editingPlayer) {
            const updatedPlayer = {
                ...editingPlayer,
                [name]: value
            };

            // Automatically set icon based on role
            if (name === 'role') {
                updatedPlayer.icon = getIconByRole(value);
            }

            setEditingPlayer(updatedPlayer);
        } else if (showAddPlayer) {
            const updatedPlayer = {
                ...newPlayer,
                [name]: value
            };

            // Automatically set icon based on role
            if (name === 'role') {
                updatedPlayer.icon = getIconByRole(value);
            }

            setNewPlayer(updatedPlayer);
        }
    };

    const handleCurrentPlayerChange = (e) => {
        const { name, value } = e.target;
        const updatedPlayer = {
            ...currentPlayer,
            [name]: value
        };

        // Automatically set icon based on role
        if (name === 'role') {
            updatedPlayer.icon = getIconByRole(value);
        }

        setCurrentPlayer(updatedPlayer);
    };

    const addPlayerToTeam = () => {
        if (!currentPlayer.name) {
            alert('Please enter player name');
            return;
        }

        const newPlayer = {
            id: new Date().getTime(),
            ...currentPlayer
        };

        setTeamPlayers(prev => [...prev, newPlayer]);
        setCurrentPlayer({
            name: '',
            role: 'Batter',
            icon: 'bat'
        });
    };

    const removePlayerFromTeam = (id) => {
        setTeamPlayers(prev => prev.filter(player => player.id !== id));
    };

    const addNewTeam = async () => {
        if (teamPlayers.length !== 11) {
            alert('Please add exactly 11 players to the main squad');
            return;
        }

        if (!newTeam.name || !newTeam.captain) {
            alert('Please fill in all team details');
            return;
        }

        try {
            // Generate a unique ID for the new team
            const teamId = new Date().getTime();

            // Convert teamPlayers array to object with player IDs as keys
            const playersObject = {};
            teamPlayers.forEach(player => {
                playersObject[player.id] = {
                    id: player.id,
                    name: player.name,
                    role: player.role,
                    icon: player.icon
                };
            });

            // Create the team structure
            const teamRef = ref(database, `teamData/${newTeam.name}`);

            await set(teamRef, {
                id: teamId,
                name: `${newTeam.name} Batch`,
                captain: newTeam.captain,
                players: playersObject,
                extraPlayers: {}
            });

            // Reset form
            setNewTeam({
                id: '',
                name: '',
                captain: ''
            });
            setTeamPlayers([]);
            setShowAddTeam(false);
            alert('Team with 11 players added successfully!');
        } catch (error) {
            console.error('Error adding new team:', error);
            alert('Failed to add new team');
        }
    };

    const updateTeam = async () => {
        try {
            const teamRef = ref(database, `teamData/${selectedTeam}`);

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

    const deleteTeam = async (teamKey) => {
        if (window.confirm(`Are you sure you want to delete ${teamsData[teamKey].name}? This action cannot be undone.`)) {
            try {
                const teamRef = ref(database, `teamData/${teamKey}`);
                await set(teamRef, null);
                alert('Team deleted successfully!');
            } catch (error) {
                console.error('Error deleting team:', error);
                alert('Failed to delete team');
            }
        }
    };

    return (
        <div className="teams-container">
            <h2>Teams</h2>

            {showAddTeam ? (
                <div className="add-team-form">
                    <h3>Add New Team with 11 Players</h3>

                    <div className="form-group">
                        <label>Team Name:</label>
                        <input
                            type="text"
                            name="name"
                            value={newTeam.name}
                            onChange={handleNewTeamInputChange}
                            placeholder="Enter team name (e.g. E21)"
                        />
                    </div>

                    <div className="form-group">
                        <label>Captain:</label>
                        <input
                            type="text"
                            name="captain"
                            value={newTeam.captain}
                            onChange={handleNewTeamInputChange}
                            placeholder="Enter captain name"
                        />
                    </div>

                    <div className="players-form-section">
                        <h4>Add Players including captain(11 required)</h4>
                        <div className="current-player-form">
                            <div className="form-group">
                                <label>Player Name:</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={currentPlayer.name}
                                    onChange={handleCurrentPlayerChange}
                                    placeholder="Player name"
                                />
                            </div>

                            <div className="form-group">
                                <label>Role:</label>
                                <select
                                    name="role"
                                    value={currentPlayer.role}
                                    onChange={handleCurrentPlayerChange}
                                >
                                    <option value="Batter">Batter</option>
                                    <option value="Bowler">Bowler</option>
                                    <option value="All Rounder">All-Rounder</option>
                                    <option value="Wicket Keeper">Wicket Keeper</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Image URL:</label>
                                <input
                                    type="text"
                                    name="imageUrl"
                                    value={editingPlayer.imageUrl || ''}
                                    onChange={handleCurrentPlayerChange}
                                    placeholder="Enter player image URL"
                                />
                            </div>

                            <button onClick={addPlayerToTeam} className="add-player-btn">
                                Add Player
                            </button>
                        </div>

                        <div className="players-list-preview">
                            <h5>Current Players ({teamPlayers.length}/11)</h5>
                            {teamPlayers.length === 0 ? (
                                <p>No players added yet</p>
                            ) : (
                                <div className="players-grid">
                                    {teamPlayers.map(player => (
                                        <div key={player.id} className="player-preview-card">
                                            <div className="player-preview-info">
                                                <div className="player-name">{player.name}</div>
                                                <div className="player-role">{player.role} ({player.icon})</div>
                                            </div>
                                            <button
                                                onClick={() => removePlayerFromTeam(player.id)}
                                                className="remove-player-btn"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-actions">
                        <button
                            onClick={addNewTeam}
                            className="save-btn"
                            disabled={teamPlayers.length !== 11}
                        >
                            Add Team with {teamPlayers.length}/11 Players
                        </button>
                        <button
                            onClick={() => setShowAddTeam(false)}
                            className="cancel-btn"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : editingTeam ? (
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
                            <option value="Wicket Keeper">Wicket Keeper</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Image URL:</label>
                        <input
                            type="text"
                            name="imageUrl"
                            value={editingPlayer.imageUrl || ''}
                            onChange={handlePlayerInputChange}
                            placeholder="Enter player image URL"
                        />
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
                        <select
                            name="role"
                            value={newPlayer.role}
                            onChange={handlePlayerInputChange}
                        >
                            <option value="Batter">Batter</option>
                            <option value="Bowler">Bowler</option>
                            <option value="All Rounder">All-Rounder</option>
                            <option value="Wicket Keeper">Wicket Keeper</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Image URL:</label>
                        <input
                            type="text"
                            name="imageUrl"
                            value={editingPlayer.imageUrl || ''}
                            onChange={handlePlayerInputChange}
                            placeholder="Enter player image URL"
                        />
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
                    <button
                        onClick={() => setShowAddTeam(true)}
                        className="add-team-btn"
                    >
                        Add New Team
                    </button>

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
                                            <button
                                                onClick={() => deleteTeam(teamKey)}
                                                className="delete-btn"
                                            >
                                                Delete Team
                                            </button>
                                        </div>
                                    </div>

                                    <div className="players-section">
                                        <h4 style={{ color: 'rgb(5, 152, 210)' }}>Main Squad ({team.players ? Object.keys(team.players).length : 0})</h4>
                                        <div className="players-list">
                                            {team.players && Object.entries(team.players).map(([playerId, player]) => (
                                                <div key={playerId} className="player-card">
                                                    {player.imageUrl ? (
                                                        <img
                                                            src={(player.imageUrl)}
                                                            alt={player.name}
                                                            className="player-image"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                            }}
                                                        />
                                                    ) :
                                                        <div className={`player-icon ${player.icon}`}></div>
                                                    }
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
                                        <h4 style={{ color: 'rgb(5, 152, 210)' }}>Extra Players ({team.extraPlayers ? Object.keys(team.extraPlayers).length : 0})</h4>
                                        <div className="players-list">
                                            {team.extraPlayers && Object.entries(team.extraPlayers).map(([playerId, player]) => (
                                                <div key={playerId} className="player-card">
                                                    <div className={`player-icon ${player.icon}`}></div>
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
                                            <div className={`player-icon ${player.icon}`}></div>
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
                                            <div className={`player-icon ${player.icon}`}></div>
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