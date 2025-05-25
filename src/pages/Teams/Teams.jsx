// pages/Teams.jsx
import React, { useEffect, useState } from 'react';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { database } from '../../components/firebase';
import './Teams.css';

const Teams = () => {
    const [teamsData, setTeamsData] = useState({});
    const [editingTeam, setEditingTeam] = useState(null);
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [showAddTeam, setShowAddTeam] = useState(false);
    const [showAddPlayer, setShowAddPlayer] = useState(false);
    const [newTeam, setNewTeam] = useState({
        id: '',
        name: '',
        captain: '',
        players: {},
        extraPlayers: {}
    });
    const [newPlayer, setNewPlayer] = useState({
        id: '',
        name: '',
        role: '',
        icon: 'bat'
    });
    const [selectedTeam, setSelectedTeam] = useState(null);

    useEffect(() => {
        const teamsRef = ref(database, 'teamData');
        onValue(teamsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setTeamsData(data);
            }
        });
    }, []);

    const handleTeamInputChange = (e) => {
        const { name, value } = e.target;
        if (editingTeam) {
            setEditingTeam(prev => ({
                ...prev,
                [name]: value
            }));
        } else {
            setNewTeam(prev => ({
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
        } else {
            setNewPlayer(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const addNewTeam = async () => {
        try {
            const teamKey = `E${newTeam.id}`;
            const teamRef = ref(database, `teamData/${teamKey}`);

            await set(teamRef, {
                ...newTeam,
                players: {},
                extraPlayers: {}
            });

            setNewTeam({
                id: '',
                name: '',
                captain: '',
                players: {},
                extraPlayers: {}
            });
            setShowAddTeam(false);
            alert('New team added successfully!');
        } catch (error) {
            console.error('Error adding new team:', error);
            alert('Failed to add new team');
        }
    };

    const updateTeam = async () => {
        try {
            const teamKey = `E${editingTeam.id}`;
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

    const deleteTeam = async (teamKey) => {
        if (window.confirm('Are you sure you want to delete this team and all its players?')) {
            try {
                const teamRef = ref(database, `teamData/${teamKey}`);
                await remove(teamRef);
                alert('Team deleted successfully!');
            } catch (error) {
                console.error('Error deleting team:', error);
                alert('Failed to delete team');
            }
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

    const updatePlayer = async (isExtraPlayer = false) => {
        try {
            const playerPath = isExtraPlayer ? 'extraPlayers' : 'players';
            const playerRef = ref(database, `teamData/${selectedTeam}/${playerPath}/${editingPlayer.id}`);

            await set(playerRef, editingPlayer);

            setEditingPlayer(null);
            alert('Player updated successfully!');
        } catch (error) {
            console.error('Error updating player:', error);
            alert('Failed to update player');
        }
    };

    const deletePlayer = async (playerId, isExtraPlayer = false) => {
        if (window.confirm('Are you sure you want to delete this player?')) {
            try {
                const playerPath = isExtraPlayer ? 'extraPlayers' : 'players';
                const playerRef = ref(database, `teamData/${selectedTeam}/${playerPath}/${playerId}`);
                await remove(playerRef);
                alert('Player deleted successfully!');
            } catch (error) {
                console.error('Error deleting player:', error);
                alert('Failed to delete player');
            }
        }
    };

    const getIconClass = (icon) => {
        switch (icon) {
            case 'bat': return 'player-icon bat';
            case 'ball': return 'player-icon ball';
            case 'all-rounder': return 'player-icon all-rounder';
            default: return 'player-icon bat';
        }
    };

    return (
        <div className="teams-container">
            <h2>Teams</h2>

            {editingTeam ? (
                <div className="edit-team-form">
                    <h3>Edit Team</h3>
                    <div className="form-group">
                        <label>Team ID (EXX):</label>
                        <input
                            type="text"
                            name="id"
                            value={`E${editingTeam.id}`}
                            disabled
                        />
                    </div>
                    <div className="form-group">
                        <label>Team Name:</label>
                        <input
                            type="text"
                            name="name"
                            value={editingTeam.name}
                            onChange={handleTeamInputChange}
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
            ) : showAddTeam ? (
                <div className="add-team-form">
                    <h3>Add New Team</h3>
                    <div className="form-group">
                        <label>Team ID (Just the number):</label>
                        <input
                            type="number"
                            name="id"
                            value={newTeam.id}
                            onChange={handleTeamInputChange}
                            placeholder="e.g., 25 for E25"
                        />
                    </div>
                    <div className="form-group">
                        <label>Team Name:</label>
                        <input
                            type="text"
                            name="name"
                            value={newTeam.name}
                            onChange={handleTeamInputChange}
                            placeholder="e.g., E25 Batch"
                        />
                    </div>
                    <div className="form-group">
                        <label>Captain:</label>
                        <input
                            type="text"
                            name="captain"
                            value={newTeam.captain}
                            onChange={handleTeamInputChange}
                            placeholder="Captain's name"
                        />
                    </div>
                    <div className="form-actions">
                        <button onClick={addNewTeam} className="save-btn">
                            Add Team
                        </button>
                        <button
                            onClick={() => setShowAddTeam(false)}
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
                        <input
                            type="text"
                            name="role"
                            value={editingPlayer.role}
                            onChange={handlePlayerInputChange}
                            placeholder="e.g., Captain, Bowler, etc."
                        />
                    </div>
                    <div className="form-group">
                        <label>Icon Type:</label>
                        <select
                            name="icon"
                            value={editingPlayer.icon}
                            onChange={handlePlayerInputChange}
                        >
                            <option value="bat">Batter</option>
                            <option value="ball">Bowler</option>
                            <option value="all-rounder">All Rounder</option>
                        </select>
                    </div>
                    <div className="form-actions">
                        <button
                            onClick={() => updatePlayer(editingPlayer.id >= 10 && editingPlayer.id % 10 !== 1 && editingPlayer.id % 10 !== 2 && editingPlayer.id % 10 !== 3)}
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
            ) : showAddPlayer && selectedTeam ? (
                <div className="add-player-form">
                    <h3>Add New Player to {teamsData[selectedTeam]?.name}</h3>
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
                            placeholder="e.g., Captain, Bowler, etc."
                        />
                    </div>
                    <div className="form-group">
                        <label>Icon Type:</label>
                        <select
                            name="icon"
                            value={newPlayer.icon}
                            onChange={handlePlayerInputChange}
                        >
                            <option value="bat">Batter</option>
                            <option value="ball">Bowler</option>
                            <option value="all-rounder">All Rounder</option>
                        </select>
                    </div>
                    <div className="form-actions">
                        <button onClick={() => addNewPlayer(false)} className="save-btn">
                            Add Main Player
                        </button>
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
                                                onClick={() => deleteTeam(teamKey)}
                                                className="delete-btn"
                                            >
                                                Delete Team
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedTeam(teamKey);
                                                    setShowAddPlayer(true);
                                                }}
                                                className="add-player-btn"
                                            >
                                                Add Player
                                            </button>
                                        </div>
                                    </div>

                                    <div className="players-section">
                                        <h4>Main Squad</h4>
                                        <div className="players-list">
                                            {team.players && Object.entries(team.players).map(([playerId, player]) => (
                                                <div key={playerId} className="player-card">
                                                    <div className={getIconClass(player.icon)}></div>
                                                    <div className="player-info">
                                                        <div className="player-name">{player.name}</div>
                                                        <div className="player-role">{player.role}</div>
                                                    </div>
                                                    <div className="player-actions">
                                                        <button
                                                            onClick={() => {
                                                                setEditingPlayer(player);
                                                                setSelectedTeam(teamKey);
                                                            }}
                                                            className="edit-btn"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => deletePlayer(playerId, false)}
                                                            className="delete-btn"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="players-section">
                                        <h4>Extra Players</h4>
                                        <div className="players-list">
                                            {team.extraPlayers && Object.entries(team.extraPlayers).map(([playerId, player]) => (
                                                <div key={playerId} className="player-card">
                                                    <div className="player-icon extra"></div>
                                                    <div className="player-info">
                                                        <div className="player-name">{player.name}</div>
                                                        {player.role && <div className="player-role">{player.role}</div>}
                                                    </div>
                                                    <div className="player-actions">
                                                        <button
                                                            onClick={() => {
                                                                setEditingPlayer(player);
                                                                setSelectedTeam(teamKey);
                                                            }}
                                                            className="edit-btn"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => deletePlayer(playerId, true)}
                                                            className="delete-btn"
                                                        >
                                                            Delete
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
        </div>
    );
};

export default Teams;