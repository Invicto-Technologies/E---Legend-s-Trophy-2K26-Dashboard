// pages/LiveMatch.jsx
import React, { useEffect, useState } from 'react';
import { ref, onValue, set, push } from 'firebase/database';
import { database } from '../../components/firebase';
import './LiveMatch.css';

const LiveMatch = () => {
    const [isLive, setIsLive] = useState(0);
    const [liveScore, setLiveScore] = useState({
        matchTitle: "",
        firstBat: 0,
        status: "",
        team1: {
            name: "",
            score: 0,
            wicket: 0,
            overs: 0,
        },
        team2: {
            name: "",
            score: 0,
            wicket: 0,
            overs: 0,
        },
    });
    const [editing, setEditing] = useState(false);
    const [newMatch, setNewMatch] = useState(false);

    useEffect(() => {
        const liveDataRef = ref(database, 'LiveData');
        onValue(liveDataRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setIsLive(data.isLive);
                setLiveScore(data.liveScore || {
                    matchTitle: "",
                    firstBat: 0,
                    status: "",
                    team1: { name: "", score: 0, wicket: 0, overs: 0 },
                    team2: { name: "", score: 0, wicket: 0, overs: 0 }
                });
            }
        });
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Handle nested team data
        if (name.startsWith('team1.')) {
            const field = name.split('.')[1];
            setLiveScore(prev => ({
                ...prev,
                team1: {
                    ...prev.team1,
                    [field]: field === 'name' ? value : Number(value)
                }
            }));
        }
        else if (name.startsWith('team2.')) {
            const field = name.split('.')[1];
            setLiveScore(prev => ({
                ...prev,
                team2: {
                    ...prev.team2,
                    [field]: field === 'name' ? value : Number(value)
                }
            }));
        }
        else {
            setLiveScore(prev => ({
                ...prev,
                [name]: name === 'matchTitle' || name === 'status' ? value : Number(value)
            }));
        }
    };

    const saveLiveData = async () => {
        try {
            const liveDataRef = ref(database, 'LiveData');
            await set(liveDataRef, {
                isLive: isLive,
                liveScore: liveScore
            });
            setEditing(false);
            setNewMatch(false);
            alert('Live match data saved successfully!');
        } catch (error) {
            console.error('Error saving live data:', error);
            alert('Failed to save live match data');
        }
    };

    const startNewMatch = () => {
        setNewMatch(true);
        setEditing(true);
        setLiveScore({
            matchTitle: "",
            firstBat: 0,
            status: "",
            team1: { name: "", score: 0, wicket: 0, overs: 0 },
            team2: { name: "", score: 0, wicket: 0, overs: 0 }
        });
        setIsLive(1);
    };

    const toggleLiveStatus = () => {
        setIsLive(prev => prev === 1 ? 0 : 1);
    };

    return (
        <div className="live-match-container">
            <h2>Live Match</h2>

            <div className="live-status-control">
                <label>
                    Match Status:
                    <span className={`status-indicator ${isLive ? 'live' : 'not-live'}`}>
                        {isLive ? 'LIVE' : 'NOT LIVE'}
                    </span>
                    <button onClick={toggleLiveStatus} className="toggle-status-btn">
                        {isLive ? 'End Match' : 'Start Match'}
                    </button>
                </label>
            </div>

            {isLive ? (
                <>
                    {editing ? (
                        <div className="edit-live-match-form">
                            <div className="form-group">
                                <label>Match Title:</label>
                                <input
                                    type="text"
                                    name="matchTitle"
                                    value={liveScore.matchTitle}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="form-group">
                                <label>Status Message:</label>
                                <input
                                    type="text"
                                    name="status"
                                    value={liveScore.status}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="form-group">
                                <label>First Batting Team (0 for Team1, 1 for Team2):</label>
                                <input
                                    type="number"
                                    name="firstBat"
                                    value={liveScore.firstBat}
                                    onChange={handleInputChange}
                                    min="0"
                                    max="1"
                                />
                            </div>

                            <div className="team-inputs">
                                <div className="team-form">
                                    <h3>Team 1</h3>
                                    <div className="form-group">
                                        <label>Name:</label>
                                        <input
                                            type="text"
                                            name="team1.name"
                                            value={liveScore.team1.name}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Score:</label>
                                        <input
                                            type="number"
                                            name="team1.score"
                                            value={liveScore.team1.score}
                                            onChange={handleInputChange}
                                            min="0"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Wickets:</label>
                                        <input
                                            type="number"
                                            name="team1.wicket"
                                            value={liveScore.team1.wicket}
                                            onChange={handleInputChange}
                                            min="0"
                                            max="10"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Overs:</label>
                                        <input
                                            type="number"
                                            name="team1.overs"
                                            value={liveScore.team1.overs}
                                            onChange={handleInputChange}
                                            min="0"
                                            max="20"
                                            step="0.1"
                                        />
                                    </div>
                                </div>

                                <div className="team-form">
                                    <h3>Team 2</h3>
                                    <div className="form-group">
                                        <label>Name:</label>
                                        <input
                                            type="text"
                                            name="team2.name"
                                            value={liveScore.team2.name}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Score:</label>
                                        <input
                                            type="number"
                                            name="team2.score"
                                            value={liveScore.team2.score}
                                            onChange={handleInputChange}
                                            min="0"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Wickets:</label>
                                        <input
                                            type="number"
                                            name="team2.wicket"
                                            value={liveScore.team2.wicket}
                                            onChange={handleInputChange}
                                            min="0"
                                            max="10"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Overs:</label>
                                        <input
                                            type="number"
                                            name="team2.overs"
                                            value={liveScore.team2.overs}
                                            onChange={handleInputChange}
                                            min="0"
                                            max="20"
                                            step="0.1"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button onClick={saveLiveData} className="save-btn">
                                    Save
                                </button>
                                <button
                                    onClick={() => {
                                        setEditing(false);
                                        if (newMatch) {
                                            setIsLive(0);
                                            setNewMatch(false);
                                        }
                                    }}
                                    className="cancel-btn"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="live-match-display">
                            <div className="match-header">
                                <h3>{liveScore.matchTitle || 'Match Title'}</h3>
                                <p className="match-status">{liveScore.status || 'Match status'}</p>
                            </div>

                            <div className="scorecard">
                                <div className={`team-score ${liveScore.firstBat === 0 ? 'batting' : ''}`}>
                                    <h4>{liveScore.team1.name || 'Team 1'}</h4>
                                    <p className="score">
                                        {liveScore.team1.score || 0}/{liveScore.team1.wicket || 0}
                                    </p>
                                    <p className="overs">({liveScore.team1.overs || 0} overs)</p>
                                </div>

                                <div className="vs-separator">vs</div>

                                <div className={`team-score ${liveScore.firstBat === 1 ? 'batting' : ''}`}>
                                    <h4>{liveScore.team2.name || 'Team 2'}</h4>
                                    <p className="score">
                                        {liveScore.team2.score || 0}/{liveScore.team2.wicket || 0}
                                    </p>
                                    <p className="overs">({liveScore.team2.overs || 0} overs)</p>
                                </div>
                            </div>

                            <div className="match-actions">
                                <button onClick={() => setEditing(true)} className="edit-btn">
                                    Edit Match Data
                                </button>
                                {!newMatch && (
                                    <button onClick={startNewMatch} className="new-match-btn">
                                        Start New Match
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="no-live-match">
                    <p>No live match currently. Start a new match when ready.</p>
                    <button onClick={startNewMatch} className="start-match-btn">
                        Start New Match
                    </button>
                </div>
            )}
        </div>
    );
};

export default LiveMatch;