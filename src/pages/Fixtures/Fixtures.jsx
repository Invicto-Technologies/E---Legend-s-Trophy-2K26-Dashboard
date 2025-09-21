import React, { useEffect, useState } from 'react';
import { ref, onValue, set, push } from 'firebase/database';
import { database } from '../../components/firebase';
import './Fixtures.css';

const Fixtures = () => {
    const [isFixtures, setIsFixtures] = useState(0);
    const [finishedMatches, setFinishedMatches] = useState({});
    const [editingMatch, setEditingMatch] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [teamsData, setTeamsData] = useState({});
    const [newMatch, setNewMatch] = useState({
        id: '',
        title: '',
        teams: '',
        result: '',
        score: '',
        time: ''
    });
    const [dateInput, setDateInput] = useState('');
    const [timeInput, setTimeInput] = useState('');
    const [selectedTeam1, setSelectedTeam1] = useState('');
    const [selectedTeam2, setSelectedTeam2] = useState('');

    // Format time to "YYYY.MM.DD HH.MMAM/PM" format
    const formatTime = (dateString, timeString) => {
        if (!dateString || !timeString) return '';

        const date = new Date(dateString);
        const timeParts = timeString.split(':');
        const hours = parseInt(timeParts[0]);
        const minutes = timeParts[1];

        // Format date as YYYY.MM.DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        // Format time as HH.MMAM/PM
        const period = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12; // Convert to 12-hour format
        const formattedTime = `${String(formattedHours).padStart(2, '0')}.${minutes}${period}`;

        return `${year}.${month}.${day} ${formattedTime}`;
    };

    // Parse existing time for editing
    const parseExistingTime = (timeStr) => {
        if (!timeStr) return { date: '', time: '' };

        try {
            // Split into date and time parts
            const [datePart, timePart] = timeStr.split(' ');

            // Extract date components
            const [year, month, day] = datePart.split('.');

            // Extract time components
            const timeValue = timePart.slice(0, -2); // Remove AM/PM
            const period = timePart.slice(-2); // Get AM/PM
            const [hours, minutes] = timeValue.split('.');

            // Convert to 24-hour format for time input
            let hours24 = parseInt(hours);
            if (period === 'PM' && hours24 !== 12) {
                hours24 += 12;
            } else if (period === 'AM' && hours24 === 12) {
                hours24 = 0;
            }

            // Format date for date input (YYYY-MM-DD)
            const formattedDate = `${year}-${month}-${day}`;

            // Format time for time input (HH:MM)
            const formattedTime = `${String(hours24).padStart(2, '0')}:${minutes}`;

            return { date: formattedDate, time: formattedTime };
        } catch (error) {
            console.error('Error parsing time:', error);
            return { date: '', time: '' };
        }
    };

    // Parse teams for editing
    const parseExistingTeams = (teamsStr) => {
        if (!teamsStr) return { team1: '', team2: '' };

        try {
            const teams = teamsStr.split(' vs ');
            return {
                team1: teams[0] || '',
                team2: teams[1] || ''
            };
        } catch (error) {
            console.error('Error parsing teams:', error);
            return { team1: '', team2: '' };
        }
    };

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

        // Load teams data
        const teamsRef = ref(database, 'teamData');
        onValue(teamsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setTeamsData(data);
            }
        });
    }, []);

    // Reset inputs when opening add form
    useEffect(() => {
        if (showAddForm) {
            const now = new Date();
            const formattedDate = now.toISOString().split('T')[0];
            const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            setDateInput(formattedDate);
            setTimeInput(formattedTime);
            setSelectedTeam1('');
            setSelectedTeam2('');

            // Set the initial formatted time
            setNewMatch(prev => ({
                ...prev,
                time: formatTime(formattedDate, formattedTime),
                teams: ''
            }));
        }
    }, [showAddForm]);

    // Set inputs when editing a match
    useEffect(() => {
        if (editingMatch) {
            const { date, time } = parseExistingTime(editingMatch.time);
            const { team1, team2 } = parseExistingTeams(editingMatch.teams);

            setDateInput(date);
            setTimeInput(time);
            setSelectedTeam1(team1);
            setSelectedTeam2(team2);
        }
    }, [editingMatch]);

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

    const handleTeam1Change = (e) => {
        const team1 = e.target.value;
        setSelectedTeam1(team1);

        // Update teams format
        const teamsValue = team1 && selectedTeam2 ? `${team1} vs ${selectedTeam2}` : '';

        if (editingMatch) {
            setEditingMatch(prev => ({
                ...prev,
                teams: teamsValue
            }));
        } else {
            setNewMatch(prev => ({
                ...prev,
                teams: teamsValue
            }));
        }
    };

    const handleTeam2Change = (e) => {
        const team2 = e.target.value;
        setSelectedTeam2(team2);

        // Update teams format
        const teamsValue = selectedTeam1 && team2 ? `${selectedTeam1} vs ${team2}` : '';

        if (editingMatch) {
            setEditingMatch(prev => ({
                ...prev,
                teams: teamsValue
            }));
        } else {
            setNewMatch(prev => ({
                ...prev,
                teams: teamsValue
            }));
        }
    };

    const handleDateChange = (e) => {
        const date = e.target.value;
        setDateInput(date);

        if (editingMatch) {
            const formattedTime = formatTime(date, timeInput);
            setEditingMatch(prev => ({
                ...prev,
                time: formattedTime
            }));
        } else {
            const formattedTime = formatTime(date, timeInput);
            setNewMatch(prev => ({
                ...prev,
                time: formattedTime
            }));
        }
    };

    const handleTimeChange = (e) => {
        const time = e.target.value;
        setTimeInput(time);

        if (editingMatch) {
            const formattedTime = formatTime(dateInput, time);
            setEditingMatch(prev => ({
                ...prev,
                time: formattedTime
            }));
        } else {
            const formattedTime = formatTime(dateInput, time);
            setNewMatch(prev => ({
                ...prev,
                time: formattedTime
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
        if (!selectedTeam1 || !selectedTeam2) {
            alert('Please select both teams');
            return;
        }

        if (selectedTeam1 === selectedTeam2) {
            alert('Cannot select the same team for both sides');
            return;
        }

        try {
            const matchesRef = ref(database, 'FixturesData/finishedMatches');
            const newMatchRef = push(matchesRef);

            // Generate a simple ID based on timestamp
            const matchId = new Date().getTime();

            await set(newMatchRef, {
                ...newMatch,
                id: matchId,
                active: 1 // Default to active
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
        if (!selectedTeam1 || !selectedTeam2) {
            alert('Please select both teams');
            return;
        }

        if (selectedTeam1 === selectedTeam2) {
            alert('Cannot select the same team for both sides');
            return;
        }

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
                                <label>Team 1:</label>
                                <select
                                    value={selectedTeam1}
                                    onChange={handleTeam1Change}
                                >
                                    <option value="">Select Team 1</option>
                                    {Object.entries(teamsData).map(([teamKey, team]) => (
                                        <option key={teamKey} value={teamKey}>
                                            {team.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Team 2:</label>
                                <select
                                    value={selectedTeam2}
                                    onChange={handleTeam2Change}
                                >
                                    <option value="">Select Team 2</option>
                                    {Object.entries(teamsData).map(([teamKey, team]) => (
                                        teamKey !== selectedTeam1 && (
                                            <option key={teamKey} value={teamKey}>
                                                {team.name}
                                            </option>
                                        )
                                    ))}
                                </select>
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
                                <label>Date:</label>
                                <input
                                    type="date"
                                    value={dateInput}
                                    onChange={handleDateChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Time:</label>
                                <input
                                    type="time"
                                    value={timeInput}
                                    onChange={handleTimeChange}
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
                                <label>Team 1:</label>
                                <select
                                    value={selectedTeam1}
                                    onChange={handleTeam1Change}
                                >
                                    <option value="">Select Team 1</option>
                                    {Object.entries(teamsData).map(([teamKey, team]) => (
                                        <option key={teamKey} value={teamKey}>
                                            {team.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Team 2:</label>
                                <select
                                    value={selectedTeam2}
                                    onChange={handleTeam2Change}
                                >
                                    <option value="">Select Team 2</option>
                                    {Object.entries(teamsData).map(([teamKey, team]) => (
                                        teamKey !== selectedTeam1 && (
                                            <option key={teamKey} value={teamKey}>
                                                {team.name}
                                            </option>
                                        )
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Result:</label>
                                <input
                                    type="text"
                                    name="result"
                                    value={newMatch.result}
                                    onChange={handleInputChange}
                                    placeholder="e.g. E21 won by 45 runs"
                                />
                            </div>
                            <div className="form-group">
                                <label>Score:</label>
                                <input
                                    type="text"
                                    name="score"
                                    value={newMatch.score}
                                    onChange={handleInputChange}
                                    placeholder="e.g. E21 185/4 (20) • E22 140/10 (20)"
                                />
                            </div>
                            <div className="form-group">
                                <label>Date:</label>
                                <input
                                    type="date"
                                    value={dateInput}
                                    onChange={handleDateChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Time:</label>
                                <input
                                    type="time"
                                    value={timeInput}
                                    onChange={handleTimeChange}
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