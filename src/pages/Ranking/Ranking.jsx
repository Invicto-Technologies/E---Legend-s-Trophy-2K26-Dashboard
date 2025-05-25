// pages/Ranking.jsx
import React, { useEffect, useState } from 'react';
import { ref, onValue, set, push } from 'firebase/database';
import { database } from '../../components/firebase';
import './Ranking.css';

const Ranking = () => {
    const [batters, setBatters] = useState({});
    const [bowlers, setBowlers] = useState({});
    const [pointsTable, setPointsTable] = useState({});
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [editingTeam, setEditingTeam] = useState(null);
    const [showAddForm, setShowAddForm] = useState(null);
    const [newPlayer, setNewPlayer] = useState({
        id: '',
        name: '',
        team: '',
        rating: 0
    });
    const [newTeam, setNewTeam] = useState({
        id: '',
        team: '',
        played: 0,
        won: 0,
        lost: 0,
        nr: 0,
        pts: 0,
        nrr: 0
    });
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

    const handlePlayerInputChange = (e) => {
        const { name, value } = e.target;
        if (editingPlayer) {
            setEditingPlayer(prev => ({
                ...prev,
                [name]: name === 'rating' || name === 'id' ? Number(value) : value
            }));
        } else {
            setNewPlayer(prev => ({
                ...prev,
                [name]: name === 'rating' || name === 'id' ? Number(value) : value
            }));
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
        } else {
            setNewTeam(prev => ({
                ...prev,
                [name]: name === 'id' || name === 'played' || name === 'won' ||
                    name === 'lost' || name === 'nr' || name === 'pts' ?
                    Number(value) : value
            }));
        }
    };

    const addNewPlayer = async (type) => {
        try {
            const playersRef = ref(database, `RankingData/${type}`);
            const newPlayerRef = push(playersRef);

            // Generate a simple ID based on timestamp
            const playerId = new Date().getTime();

            await set(newPlayerRef, {
                ...newPlayer,
                id: playerId
            });

            setNewPlayer({
                id: '',
                name: '',
                team: '',
                rating: 0
            });
            setShowAddForm(null);
            alert(`New ${type.slice(0, -1)} added successfully!`);
        } catch (error) {
            console.error(`Error adding new ${type.slice(0, -1)}:`, error);
            alert(`Failed to add new ${type.slice(0, -1)}`);
        }
    };

    const addNewTeam = async () => {
        try {
            const teamsRef = ref(database, 'RankingData/pointsTable');
            const newTeamRef = push(teamsRef);

            // Generate a simple ID based on timestamp
            const teamId = new Date().getTime();

            await set(newTeamRef, {
                ...newTeam,
                id: teamId
            });

            setNewTeam({
                id: '',
                team: '',
                played: 0,
                won: 0,
                lost: 0,
                nr: 0,
                pts: 0,
                nrr: 0
            });
            setShowAddForm(null);
            alert('New team added to points table successfully!');
        } catch (error) {
            console.error('Error adding new team:', error);
            alert('Failed to add new team');
        }
    };

    const updatePlayer = async (type) => {
        try {
            const playerRef = ref(database, `RankingData/${type}/${editingPlayer.id}`);
            await set(playerRef, editingPlayer);
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
                                onChange={handlePlayerInputChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>Team:</label>
                            <input
                                type="text"
                                name="team"
                                value={editingPlayer.team}
                                onChange={handlePlayerInputChange}
                                maxLength="3"
                                placeholder="3-letter code (e.g., IND)"
                            />
                        </div>
                        <div className="form-group">
                            <label>Rating:</label>
                            <input
                                type="number"
                                name="rating"
                                value={editingPlayer.rating}
                                onChange={handlePlayerInputChange}
                                min="0"
                                max="1000"
                            />
                        </div>
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
                ) : showAddForm === activeTab ? (
                    <div className="add-player-form">
                        <h3>Add New {activeTab.slice(0, -1)}</h3>
                        <div className="form-group">
                            <label>Name:</label>
                            <input
                                type="text"
                                name="name"
                                value={newPlayer.name}
                                onChange={handlePlayerInputChange}
                                placeholder="Player's name"
                            />
                        </div>
                        <div className="form-group">
                            <label>Team:</label>
                            <input
                                type="text"
                                name="team"
                                value={newPlayer.team}
                                onChange={handlePlayerInputChange}
                                maxLength="3"
                                placeholder="3-letter code (e.g., IND)"
                            />
                        </div>
                        <div className="form-group">
                            <label>Rating:</label>
                            <input
                                type="number"
                                name="rating"
                                value={newPlayer.rating}
                                onChange={handlePlayerInputChange}
                                min="0"
                                max="1000"
                                placeholder="Rating points"
                            />
                        </div>
                        <div className="form-actions">
                            <button
                                onClick={() => addNewPlayer(getPlayerType())}
                                className="save-btn"
                            >
                                Add {activeTab.slice(0, -1)}
                            </button>
                            <button
                                onClick={() => setShowAddForm(null)}
                                className="cancel-btn"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={() => setShowAddForm(activeTab)}
                            className="add-btn"
                        >
                            Add New {activeTab.slice(0, -1)}
                        </button>

                        <div className="ranking-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Name</th>
                                        <th>Team</th>
                                        <th>Rating</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(activeTab === 'batters' ? batters : bowlers)
                                        .sort((a, b) => b[1].rating - a[1].rating)
                                        .map(([key, player], index) => (
                                            <tr key={key}>
                                                <td>{index + 1}</td>
                                                <td>{player.name}</td>
                                                <td>{player.team}</td>
                                                <td>{player.rating}</td>
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
                            onChange={handleTeamInputChange}
                            placeholder="Team name (e.g., E21)"
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
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>No Result:</label>
                            <input
                                type="number"
                                name="nr"
                                value={editingTeam.nr}
                                onChange={handleTeamInputChange}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label>Points:</label>
                            <input
                                type="number"
                                name="pts"
                                value={editingTeam.pts}
                                onChange={handleTeamInputChange}
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
            ) : showAddForm === 'pointsTable' ? (
                <div className="add-team-form">
                    <h3>Add New Team</h3>
                    <div className="form-group">
                        <label>Team:</label>
                        <input
                            type="text"
                            name="team"
                            value={newTeam.team}
                            onChange={handleTeamInputChange}
                            placeholder="Team name (e.g., E21)"
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Played:</label>
                            <input
                                type="number"
                                name="played"
                                value={newTeam.played}
                                onChange={handleTeamInputChange}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label>Won:</label>
                            <input
                                type="number"
                                name="won"
                                value={newTeam.won}
                                onChange={handleTeamInputChange}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label>Lost:</label>
                            <input
                                type="number"
                                name="lost"
                                value={newTeam.lost}
                                onChange={handleTeamInputChange}
                                min="0"
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>No Result:</label>
                            <input
                                type="number"
                                name="nr"
                                value={newTeam.nr}
                                onChange={handleTeamInputChange}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label>Points:</label>
                            <input
                                type="number"
                                name="pts"
                                value={newTeam.pts}
                                onChange={handleTeamInputChange}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label>NRR:</label>
                            <input
                                type="number"
                                name="nrr"
                                value={newTeam.nrr}
                                onChange={handleTeamInputChange}
                                step="0.01"
                            />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button onClick={addNewTeam} className="save-btn">
                            Add Team
                        </button>
                        <button
                            onClick={() => setShowAddForm(null)}
                            className="cancel-btn"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <button
                        onClick={() => setShowAddForm('pointsTable')}
                        className="add-btn"
                    >
                        Add New Team
                    </button>

                    <div className="points-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Pos</th>
                                    <th>Team</th>
                                    <th>Played</th>
                                    <th>Won</th>
                                    <th>Lost</th>
                                    <th>NR</th>
                                    <th>Pts</th>
                                    <th>NRR</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(pointsTable)
                                    .sort((a, b) => b[1].pts - a[1].pts || b[1].nrr - a[1].nrr)
                                    .map(([key, team], index) => (
                                        <tr key={key}>
                                            <td>{index + 1}</td>
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