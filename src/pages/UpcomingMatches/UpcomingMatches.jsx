import React, { useEffect, useState } from 'react';
import { ref, onValue, set, push, remove } from 'firebase/database';
import { database } from '../../components/firebase';
import './UpcomingMatches.css';

const UpcomingMatches = () => {
    const [isUpcoming, setIsUpcoming] = useState(0);
    const [upcomingMatches, setUpcomingMatches] = useState({});
    const [editingMatch, setEditingMatch] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [teamsData, setTeamsData] = useState({});
    const [newMatch, setNewMatch] = useState({
        active: 1,
        id: '',
        title: '',
        teams: '',
        time: '',
        date: ''
    });
    const [selectedTeam1, setSelectedTeam1] = useState('');
    const [selectedTeam2, setSelectedTeam2] = useState('');
    const [dateInput, setDateInput] = useState('');
    const [timeInput, setTimeInput] = useState('');

    // Format date to "DD-MMM-YYYY" format (e.g., 01-Nov-2025)
    const formatDate = (dateString) => {
        if (!dateString) return '';

        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
    };

    // Format time to "HH:MM AM/PM" format (e.g., 01:00 PM)
    const formatTime = (timeString) => {
        if (!timeString) return '';

        const timeParts = timeString.split(':');
        const hours = parseInt(timeParts[0]);
        const minutes = timeParts[1];

        const period = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12; // Convert to 12-hour format

        return `${String(formattedHours).padStart(2, '0')}:${minutes} ${period}`;
    };

    // Parse existing date for editing
    const parseExistingDate = (dateStr) => {
        if (!dateStr) return '';

        try {
            const [day, monthName, year] = dateStr.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = monthNames.indexOf(monthName);

            if (month === -1) return '';

            return `${year}-${String(month + 1).padStart(2, '0')}-${day}`;
        } catch (error) {
            console.error('Error parsing date:', error);
            return '';
        }
    };

    // Parse existing time for editing
    const parseExistingTime = (timeStr) => {
        if (!timeStr) return '';

        try {
            const [timeValue, period] = timeStr.split(' ');
            const [hours, minutes] = timeValue.split(':');

            // Convert to 24-hour format
            let hours24 = parseInt(hours);
            if (period === 'PM' && hours24 !== 12) {
                hours24 += 12;
            } else if (period === 'AM' && hours24 === 12) {
                hours24 = 0;
            }

            return `${String(hours24).padStart(2, '0')}:${minutes}`;
        } catch (error) {
            console.error('Error parsing time:', error);
            return '';
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

    // Function to convert date string to Date object
    const parseMatchDateTime = (dateStr, timeStr) => {
        // Parse date in "01-Nov-2025" format
        const dateParts = dateStr.split('-');
        const day = parseInt(dateParts[0], 10);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames.indexOf(dateParts[1]);
        const year = parseInt(dateParts[2], 10);

        // Parse time in "2:30 PM" format
        const timeParts = timeStr.split(' ');
        const timeValue = timeParts[0];
        const period = timeParts[1];
        const [hours, minutes] = timeValue.split(':').map(Number);

        // Convert to 24-hour format
        let hours24 = hours;
        if (period === 'PM' && hours !== 12) {
            hours24 += 12;
        } else if (period === 'AM' && hours === 12) {
            hours24 = 0;
        }
        return new Date(year, month, day, hours24, minutes);
    };

    // Sort matches by date and time
    const getSortedMatches = () => {
        return Object.entries(upcomingMatches)
            .map(([key, match]) => ({
                key,
                match,
                dateTime: parseMatchDateTime(match.date, match.time)
            }))
            .sort((a, b) => a.dateTime - b.dateTime)
            .map(({ key, match }) => [key, match]);
    };

    useEffect(() => {
        const upcomingDataRef = ref(database, 'UpcomingMatchData');
        onValue(upcomingDataRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setIsUpcoming(data.isUpcoming);
                setUpcomingMatches(data.upcomingMatches || {});
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

            // Set the initial formatted time and date
            setNewMatch(prev => ({
                ...prev,
                time: formatTime(formattedTime),
                date: formatDate(formattedDate),
                teams: ''
            }));
        }
    }, [showAddForm]);

    // Set inputs when editing a match
    useEffect(() => {
        if (editingMatch) {
            const date = parseExistingDate(editingMatch.date);
            const time = parseExistingTime(editingMatch.time);
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
                [name]: name === 'active' || name === 'id' ? Number(value) : value
            }));
        } else {
            setNewMatch(prev => ({
                ...prev,
                [name]: name === 'active' || name === 'id' ? Number(value) : value
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

        const formattedDate = formatDate(date);

        if (editingMatch) {
            setEditingMatch(prev => ({
                ...prev,
                date: formattedDate
            }));
        } else {
            setNewMatch(prev => ({
                ...prev,
                date: formattedDate
            }));
        }
    };

    const handleTimeChange = (e) => {
        const time = e.target.value;
        setTimeInput(time);

        const formattedTime = formatTime(time);

        if (editingMatch) {
            setEditingMatch(prev => ({
                ...prev,
                time: formattedTime
            }));
        } else {
            setNewMatch(prev => ({
                ...prev,
                time: formattedTime
            }));
        }
    };

    const toggleMatchStatus = async (matchId, currentStatus) => {
        try {
            const matchRef = ref(database, `UpcomingMatchData/upcomingMatches/${matchId}/active`);
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

        setIsUploading(true);
        try {
            const matchesRef = ref(database, 'UpcomingMatchData/upcomingMatches');
            const newMatchRef = push(matchesRef);
            const matchId = new Date().getTime();

            await set(newMatchRef, {
                ...newMatch,
                id: matchId
            });

            setNewMatch({
                active: 1,
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
            setIsUploading(false);
        }
        finally {
            setIsUploading(false);
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
                <label >
                    Upcoming Matches Status:
                    <label className={`upComingStatus-indicator ${isUpcoming ? 'active' : 'inactive'}`}>
                        {isUpcoming ? 'ACTIVE' : 'INACTIVE'}
                    </label>
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
                                <label>Active Status:</label>
                                <select
                                    name="active"
                                    value={editingMatch.active}
                                    onChange={handleInputChange}
                                >
                                    <option value={1}>Active</option>
                                    <option value={0}>Inactive</option>
                                </select>
                            </div>
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
                        <div className="add-match-form">
                            <h3>Add New Match</h3>
                            <div className="form-group">
                                <label>Title:</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={newMatch.title}
                                    onChange={handleInputChange}
                                    placeholder="e.g. 1st, 2nd, 3rd"
                                    disabled={isUploading}
                                />
                            </div>
                            <div className="form-group">
                                <label>Team 1:</label>
                                <select
                                    value={selectedTeam1}
                                    onChange={handleTeam1Change}
                                    disabled={isUploading}
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
                                    disabled={isUploading}
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
                                <label>Date:</label>
                                <input
                                    type="date"
                                    value={dateInput}
                                    onChange={handleDateChange}
                                    disabled={isUploading}
                                />
                            </div>
                            <div className="form-group">
                                <label>Time:</label>
                                <input
                                    type="time"
                                    value={timeInput}
                                    onChange={handleTimeChange}
                                    disabled={isUploading}
                                />
                            </div>
                            <div className="form-actions">
                                <button
                                    onClick={addNewMatch}
                                    className="save-btn"
                                    disabled={isUploading}
                                >
                                    {isUploading ? (
                                        <>
                                            <span className="spinner"></span>
                                            Uploading...
                                        </>
                                    ) : (
                                        'Add Match'
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowAddForm(false)}
                                    className="cancel-btn"
                                    disabled={isUploading}
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
                                    getSortedMatches().map(([key, match]) => (
                                        <div key={key} className={`match-card ${match.active ? '' : 'inactive'}`}>
                                            <div className="match-header">
                                                <h3>{match.title}</h3>
                                                <button
                                                    onClick={() => toggleMatchStatus(key, match.active)}
                                                    className={`status-toggle ${match.active ? 'active' : 'inactive'}`}
                                                >
                                                    {match.active ? 'Active' : 'Inactive'}
                                                </button>
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