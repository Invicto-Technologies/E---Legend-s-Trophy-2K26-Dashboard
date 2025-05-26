// pages/Fixtures.jsx
import React, { useEffect, useState } from 'react';
import { ref, onValue, set, push } from 'firebase/database';
import { database } from '../../components/firebase';
import './Fixtures.css';

const Fixtures = () => {
    const [isFixtures, setIsFixtures] = useState(0);
    const [finishedMatches, setFinishedMatches] = useState({});
    const [editingMatch, setEditingMatch] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newMatch, setNewMatch] = useState({
        id: '',
        title: '',
        teams: '',
        result: '',
        score: '',
        time: ''
    });

    //date format sorting
    const parseMatchTime = (timeStr) => {
        // Split into date and time parts
        const [datePart, timePart] = timeStr.split(' ');

        // Extract date components
        const [year, month, day] = datePart.split('.').map(Number);

        // Extract time components
        const timeValue = timePart.slice(0, -2); // Remove AM/PM
        const period = timePart.slice(-2); // Get AM/PM
        const [hours, minutes] = timeValue.split('.').map(Number);

        // Convert to 24-hour format
        let hours24 = hours;
        if (period === 'PM' && hours !== 12) {
            hours24 += 12;
        } else if (period === 'AM' && hours === 12) {
            hours24 = 0;
        }

        return new Date(year, month - 1, day, hours24, minutes);
    };

    // Sort matches by datetime
    const getSortedMatches = () => {
        return Object.entries(finishedMatches)
            .map(([key, match]) => ({
                key,
                match,
                datetime: parseMatchTime(match.time)
            }))
            .sort((a, b) => a.datetime - b.datetime)
            .map(({ key, match }) => [key, match]);
    };

    useEffect(() => {
        const fixturesRef = ref(database, 'FixturesData');
        onValue(fixturesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setIsFixtures(data.isFixtures);
                setFinishedMatches(data.finishedMatches || {});
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

    const toggleMatchStatus = async (matchId, currentStatus) => {
        try {
            const matchRef = ref(database, `FixturesData/finishedMatches/${matchId}/active`);
            await set(matchRef, currentStatus === 1 ? 0 : 1);
        } catch (error) {
            console.error('Error toggling match status:', error);
            alert('Failed to toggle match status');
        }
    };

    const addNewMatch = async () => {
        try {
            const matchesRef = ref(database, 'FixturesData/finishedMatches');
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
                result: '',
                score: '',
                time: ''
            });
            setShowAddForm(false);
            alert('New fixture added successfully!');
        } catch (error) {
            console.error('Error adding new fixture:', error);
            alert('Failed to add new fixture');
        }
    };

    const updateMatch = async () => {
        try {
            const matchRef = ref(database, `FixturesData/finishedMatches/${editingMatch.id}`);
            await set(matchRef, editingMatch);
            setEditingMatch(null);
            alert('Fixture updated successfully!');
        } catch (error) {
            console.error('Error updating fixture:', error);
            alert('Failed to update fixture');
        }
    };

    const toggleFixturesStatus = () => {
        const newStatus = isFixtures === 1 ? 0 : 1;
        setIsFixtures(newStatus);
        const statusRef = ref(database, 'FixturesData/isFixtures');
        set(statusRef, newStatus);
    };

    return (
        <div className="fixtures-container">
            <h2>Fixtures</h2>

            <div className="fixtures-status-control">
                <label>
                    Fixtures Status:
                    <span className={`status-indicator ${isFixtures ? 'active' : 'inactive'}`}>
                        {isFixtures ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    <button onClick={toggleFixturesStatus} className="toggle-status-btn">
                        {isFixtures ? 'Deactivate' : 'Activate'}
                    </button>
                </label>
            </div>

            {isFixtures ? (
                <>
                    {editingMatch ? (
                        <div className="edit-fixture-form">
                            <h3>Edit Fixture</h3>
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
                                <label>Result:</label>
                                <input
                                    type="text"
                                    name="result"
                                    value={editingMatch.result}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Score:</label>
                                <input
                                    type="text"
                                    name="score"
                                    value={editingMatch.score}
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
                        <div className="add-fixture-form">
                            <h3>Add New Fixture</h3>
                            <div className="form-group">
                                <label>Title:</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={newMatch.title}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 1st, 2nd, 3rd"
                                />
                            </div>
                            <div className="form-group">
                                <label>Teams:</label>
                                <input
                                    type="text"
                                    name="teams"
                                    value={newMatch.teams}
                                    onChange={handleInputChange}
                                    placeholder="e.g., E21 vs E22"
                                />
                            </div>
                            <div className="form-group">
                                <label>Result:</label>
                                <input
                                    type="text"
                                    name="result"
                                    value={newMatch.result}
                                    onChange={handleInputChange}
                                    placeholder="e.g., E21 won by 45 runs"
                                />
                            </div>
                            <div className="form-group">
                                <label>Score:</label>
                                <input
                                    type="text"
                                    name="score"
                                    value={newMatch.score}
                                    onChange={handleInputChange}
                                    placeholder="e.g., E21 185/4 (20) • E22 140/10 (20)"
                                />
                            </div>
                            <div className="form-group">
                                <label>Time:</label>
                                <input
                                    type="text"
                                    name="time"
                                    value={newMatch.time}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 2025.05.22 02.57AM"
                                />
                            </div>
                            <div className="form-actions">
                                <button onClick={addNewMatch} className="save-btn">
                                    Add Fixture
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
                                className="add-fixture-btn"
                            >
                                Add New Fixture
                            </button>

                            <div className="fixtures-list">
                                {Object.keys(finishedMatches).length > 0 ? (
                                    getSortedMatches().map(([key, match]) => (
                                        <div key={key} className={`fixture-card ${match.active ? '' : 'inactive'}`}>
                                            <div className="fixture-header">
                                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                                    <h3>{match.title}</h3>
                                                    <button
                                                        onClick={() => toggleMatchStatus(key, match.active)}
                                                        className={`status-toggle ${match.active ? 'active' : 'inactive'}`}
                                                    >
                                                        {match.active ? 'Active' : 'Inactive'}
                                                    </button>
                                                </div>
                                                <div className="fixture-teams">{match.teams}</div>
                                            </div>
                                            <div className="fixture-result">
                                                <strong>Result:</strong> {match.result}
                                            </div>
                                            <div className="fixture-score">
                                                <strong>Score:</strong> {match.score}
                                            </div>
                                            <div className="fixture-time">
                                                <strong>Time:</strong> {match.time}
                                            </div>
                                            <div className="fixture-actions">
                                                <button
                                                    onClick={() => setEditingMatch({ ...match, id: key })}
                                                    className="edit-btn"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="no-fixtures">No fixtures available</p>
                                )}
                            </div>
                        </>
                    )}
                </>
            ) : (
                <div className="fixtures-inactive">
                    <p>Fixtures are currently inactive.</p>
                    <p>Activate to view and manage fixtures.</p>
                </div>
            )}
        </div>
    );
};

export default Fixtures;