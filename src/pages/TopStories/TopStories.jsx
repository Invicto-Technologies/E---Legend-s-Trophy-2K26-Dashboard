// pages/TopStories.jsx
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

    const addNewStory = async () => {
        try {
            const storyId = Date.now();

            const updates = {};
            updates[`AllStories/${storyId}`] = newStory;

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
                    <div className="form-group">
                        <label>Topic:</label>
                        <input
                            type="text"
                            name="topic"
                            value={editingStory.topic}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="form-group">
                        <label>Description:</label>
                        <textarea
                            name="description"
                            value={editingStory.description}
                            onChange={handleInputChange}
                            rows="3"
                        />
                    </div>
                    <div className="form-group">
                        <label>Time:</label>
                        <input
                            type="text"
                            name="time"
                            value={editingStory.time}
                            onChange={handleInputChange}
                            placeholder="e.g., 2025.05.22 02.50AM"
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
                    <div className="form-group">
                        <label>Topic:</label>
                        <input
                            type="text"
                            name="topic"
                            value={newStory.topic}
                            onChange={handleInputChange}
                            placeholder="Enter story topic"
                        />
                    </div>
                    <div className="form-group">
                        <label>Description:</label>
                        <textarea
                            name="description"
                            value={newStory.description}
                            onChange={handleInputChange}
                            placeholder="Enter story description"
                            rows="3"
                        />
                    </div>
                    <div className="form-group">
                        <label>Time:</label>
                        <input
                            type="text"
                            name="time"
                            value={newStory.time}
                            onChange={handleInputChange}
                            placeholder="e.g., 2025.05.22 02.50AM"
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