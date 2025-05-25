// pages/UpcomingMatches.jsx
import React, { useEffect, useState } from 'react';
import { ref, onValue, set, push, remove } from 'firebase/database';
import { database } from '../../components/firebase';
import './UpcomingMatches.css';

const UpcomingMatches = () => {
    const [isUpcoming, setIsUpcoming] = useState(0);
    const [upcomingMatches, setUpcomingMatches] = useState({});
    const [editingMatch, setEditingMatch] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newMatch, setNewMatch] = useState({
        id: '',
        title: '',
        teams: '',
        time: '',
        date: ''
    });

    useEffect(() => {
        const upcomingDataRef = ref(database, 'UpcomingMatchData');
        onValue(upcomingDataRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setIsUpcoming(data.isUpcoming);
                setUpcomingMatches(data.upcomingMatches || {});
            }
        });
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (editingMatch) {
            setEditingMatch(prev => ({
                ...prev,
                [name]: value
            }));
        } else {
            setNewMatch(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const addNewMatch = async () => {
        try {
            const matchesRef = ref(database, 'UpcomingMatchData/upcomingMatches');
            const newMatchRef = push(matchesRef);

            // Generate a simple ID based on timestamp
            const matchId = new Date().getTime();

            await set(newMatchRef, {
                ...newMatch,
                id: matchId
            });

            setNewMatch({
                id: '',
                title: '',
                teams: '',
                time: '',
                date: ''
            });
            setShowAddForm(false);
            alert('New match added successfully!');
        } catch (error) {
            console.error('Error adding new match:', error);
            alert('Failed to add new match');
        }
    };

    const updateMatch = async () => {
        try {
            const matchRef = ref(database, `UpcomingMatchData/upcomingMatches/${editingMatch.id}`);
            await set(matchRef, editingMatch);
            setEditingMatch(null);
            alert('Match updated successfully!');
        } catch (error) {
            console.error('Error updating match:', error);
            alert('Failed to update match');
        }
    };

    const deleteMatch = async (matchId) => {
        if (window.confirm('Are you sure you want to delete this match?')) {
            try {
                const matchRef = ref(database, `UpcomingMatchData/upcomingMatches/${matchId}`);
                await remove(matchRef);
                alert('Match deleted successfully!');
            } catch (error) {
                console.error('Error deleting match:', error);
                alert('Failed to delete match');
            }
        }
    };

    const toggleUpcomingStatus = () => {
        const newStatus = isUpcoming === 1 ? 0 : 1;
        setIsUpcoming(newStatus);
        const statusRef = ref(database, 'UpcomingMatchData/isUpcoming');
        set(statusRef, newStatus);
    };

    return (
        <div className="upcoming-matches-container">
            <h2>Upcoming Matches</h2>

            <div className="upcoming-status-control">
                <label>
                    Upcoming Matches Status:
                    <span className={`status-indicator ${isUpcoming ? 'active' : 'inactive'}`}>
                        {isUpcoming ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    <button onClick={toggleUpcomingStatus} className="toggle-status-btn">
                        {isUpcoming ? 'Deactivate' : 'Activate'}
                    </button>
                </label>
            </div>

            {isUpcoming ? (
                <>
                    {editingMatch ? (
                        <div className="edit-match-form">
                            <h3>Edit Match</h3>
                            <div className="form-group">
                                <label>Title:</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={editingMatch.title}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Teams:</label>
                                <input
                                    type="text"
                                    name="teams"
                                    value={editingMatch.teams}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Time:</label>
                                <input
                                    type="text"
                                    name="time"
                                    value={editingMatch.time}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Date:</label>
                                <input
                                    type="text"
                                    name="date"
                                    value={editingMatch.date}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-actions">
                                <button onClick={updateMatch} className="save-btn">
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => setEditingMatch(null)}
                                    className="cancel-btn"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : showAddForm ? (
                        <div className="add-match-form">
                            <h3>Add New Match</h3>
                            <div className="form-group">
                                <label>Title:</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={newMatch.title}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 5th, 6th, Final"
                                />
                            </div>
                            <div className="form-group">
                                <label>Teams:</label>
                                <input
                                    type="text"
                                    name="teams"
                                    value={newMatch.teams}
                                    onChange={handleInputChange}
                                    placeholder="e.g., E21 vs E24"
                                />
                            </div>
                            <div className="form-group">
                                <label>Time:</label>
                                <input
                                    type="text"
                                    name="time"
                                    value={newMatch.time}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 01:00 PM"
                                />
                            </div>
                            <div className="form-group">
                                <label>Date:</label>
                                <input
                                    type="text"
                                    name="date"
                                    value={newMatch.date}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 01-Nov-2025"
                                />
                            </div>
                            <div className="form-actions">
                                <button onClick={addNewMatch} className="save-btn">
                                    Add Match
                                </button>
                                <button
                                    onClick={() => setShowAddForm(false)}
                                    className="cancel-btn"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="add-match-btn"
                            >
                                Add New Match
                            </button>

                            <div className="matches-list">
                                {Object.keys(upcomingMatches).length > 0 ? (
                                    Object.entries(upcomingMatches).map(([key, match]) => (
                                        <div key={key} className="match-card">
                                            <div className="match-header">
                                                <h3>{match.title}</h3>
                                                <div className="match-teams">{match.teams}</div>
                                            </div>
                                            <div className="match-details">
                                                <div className="match-time">{match.time}</div>
                                                <div className="match-date">{match.date}</div>
                                            </div>
                                            <div className="match-actions">
                                                <button
                                                    onClick={() => setEditingMatch({ ...match, id: key })}
                                                    className="edit-btn"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => deleteMatch(key)}
                                                    className="delete-btn"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="no-matches">No upcoming matches scheduled</p>
                                )}
                            </div>
                        </>
                    )}
                </>
            ) : (
                <div className="upcoming-inactive">
                    <p>Upcoming matches are currently inactive.</p>
                    <p>Activate to view and manage upcoming matches.</p>
                </div>
            )}
        </div>
    );
};

export default UpcomingMatches;