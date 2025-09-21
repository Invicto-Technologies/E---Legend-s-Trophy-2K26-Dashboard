import React, { useEffect, useState } from 'react';
import { ref, onValue, set, update, remove } from 'firebase/database';
import { database } from '../../components/firebase';
import './TopStories.css';

const TopStories = () => {
    const [allStories, setAllStories] = useState({});
    const [editingStory, setEditingStory] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newStory, setNewStory] = useState({
        id: '',
        topic: '',
        description: '',
        time: ''
    });
    const [dateInput, setDateInput] = useState('');
    const [timeInput, setTimeInput] = useState('');

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
    const getSortedStories = () => {
        return Object.entries(allStories)
            .map(([key, match]) => ({
                key,
                match,
                datetime: parseMatchTime(match.time)
            }))
            .sort((a, b) => b.datetime - a.datetime)
            .map(({ key, match }) => [key, match]);
    };

    useEffect(() => {
        const storiesRef = ref(database, 'AllStories');
        onValue(storiesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setAllStories(data);
            }
        });
    }, []);

    // Reset date and time inputs when opening add form
    useEffect(() => {
        if (showAddForm) {
            const now = new Date();
            const formattedDate = now.toISOString().split('T')[0];
            const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            setDateInput(formattedDate);
            setTimeInput(formattedTime);
            
            // Set the initial formatted time
            setNewStory(prev => ({
                ...prev,
                time: formatTime(formattedDate, formattedTime)
            }));
        }
    }, [showAddForm]);

    // Set date and time inputs when editing a story
    useEffect(() => {
        if (editingStory) {
            const { date, time } = parseExistingTime(editingStory.time);
            setDateInput(date);
            setTimeInput(time);
        }
    }, [editingStory]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (editingStory) {
            setEditingStory(prev => ({
                ...prev,
                [name]: value
            }));
        } else {
            setNewStory(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleDateChange = (e) => {
        const date = e.target.value;
        setDateInput(date);
        
        if (editingStory) {
            const formattedTime = formatTime(date, timeInput);
            setEditingStory(prev => ({
                ...prev,
                time: formattedTime
            }));
        } else {
            const formattedTime = formatTime(date, timeInput);
            setNewStory(prev => ({
                ...prev,
                time: formattedTime
            }));
        }
    };

    const handleTimeChange = (e) => {
        const time = e.target.value;
        setTimeInput(time);
        
        if (editingStory) {
            const formattedTime = formatTime(dateInput, time);
            setEditingStory(prev => ({
                ...prev,
                time: formattedTime
            }));
        } else {
            const formattedTime = formatTime(dateInput, time);
            setNewStory(prev => ({
                ...prev,
                time: formattedTime
            }));
        }
    };

    const addNewStory = async () => {
        try {
            const storyId = Date.now();

            const updates = {};
            updates[`AllStories/${storyId}`] = {
                ...newStory,
                id: storyId
            };

            await update(ref(database), updates);

            setNewStory({
                id: '',
                topic: '',
                description: '',
                time: ''
            });
            setShowAddForm(false);
            alert('New story added successfully!');
        } catch (error) {
            console.error('Error adding new story:', error);
            alert('Failed to add new story');
        }
    };

    const updateStory = async () => {
        try {
            const storyRef = ref(database, `AllStories/${editingStory.id}`);
            await set(storyRef, editingStory);
            setEditingStory(null);
            alert('Story updated successfully!');
        } catch (error) {
            console.error('Error updating story:', error);
            alert('Failed to update story');
        }
    };

    const deleteStory = async (storyId) => {
        if (window.confirm('Are you sure you want to delete this story?')) {
            try {
                const storyRef = ref(database, `AllStories/${storyId}`);
                await remove(storyRef);
                alert('Story deleted successfully!');
            } catch (error) {
                console.error('Error deleting story:', error);
                alert('Failed to delete story');
            }
        }
    };

    return (
        <div className="top-stories-container">
            <h2>Top Stories</h2>

            {editingStory ? (
                <div className="edit-story-form">
                    <h3>Edit Story</h3>
                    <div className="form-group-top-stories">
                        <label>Topic:</label>
                        <input
                            type="text"
                            name="topic"
                            value={editingStory.topic}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="form-group-top-stories">
                        <label>Description:</label>
                        <textarea
                            name="description"
                            value={editingStory.description}
                            onChange={handleInputChange}
                            rows="3"
                        />
                    </div>
                    <div className="form-group-top-stories">
                        <label>Date:</label>
                        <input
                            type="date"
                            value={dateInput}
                            onChange={handleDateChange}
                        />
                    </div>
                    <div className="form-group-top-stories">
                        <label>Time:</label>
                        <input
                            type="time"
                            value={timeInput}
                            onChange={handleTimeChange}
                        />
                    </div>
                    <div className="form-actions">
                        <button onClick={updateStory} className="save-btn">
                            Save Changes
                        </button>
                        <button
                            onClick={() => setEditingStory(null)}
                            className="cancel-btn"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : showAddForm ? (
                <div className="add-story-form">
                    <h3>Add New Story</h3>
                    <div className="form-group-top-stories">
                        <label>Topic:</label>
                        <input
                            type="text"
                            name="topic"
                            value={newStory.topic}
                            onChange={handleInputChange}
                            placeholder="Enter story topic"
                        />
                    </div>
                    <div className="form-group-top-stories">
                        <label>Description:</label>
                        <textarea
                            name="description"
                            value={newStory.description}
                            onChange={handleInputChange}
                            placeholder="Enter story description"
                            rows="3"
                        />
                    </div>
                    <div className="form-group-top-stories">
                        <label>Date:</label>
                        <input
                            type="date"
                            value={dateInput}
                            onChange={handleDateChange}
                        />
                    </div>
                    <div className="form-group-top-stories">
                        <label>Time:</label>
                        <input
                            type="time"
                            value={timeInput}
                            onChange={handleTimeChange}
                        />
                    </div>
                    <div className="form-actions">
                        <button onClick={addNewStory} className="save-btn">
                            Add Story
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
                        className="add-story-btn"
                    >
                        Add New Story
                    </button>

                    <div className="stories-grid">
                        {Object.keys(allStories).length > 0 ? (
                            getSortedStories().map(([key, story]) => (
                                <div key={key} className="story-card">
                                    <div className="story-time">{story.time}</div>
                                    <h3 className="story-topic">{story.topic}</h3>
                                    <p className="story-description">{story.description}</p>
                                    <div className="story-actions">
                                        <button
                                            onClick={() => setEditingStory({ ...story, id: key })}
                                            className="edit-btn"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => deleteStory(key)}
                                            className="delete-btn"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="no-stories">No stories available</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default TopStories;