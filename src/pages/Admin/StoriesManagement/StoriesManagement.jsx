import React, { useState, useEffect, useRef } from 'react';
import TiltCard from '../../../components/3D/TiltCard';
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import ToastNotification from '../../../components/common/ToastNotification';
import Footer from '../../../components/common/Footer/Footer';
import {
    subscribeStories,
    saveStory,
    deleteStory
} from '../../../services/rtdbService';
import {
    MdEdit,
    MdDelete,
    MdAccessTime,
    MdClose,
    MdArticle,
    MdNewspaper,
    MdImage,
    MdCheckCircle,
    MdAutoAwesome
} from 'react-icons/md';
import AdminSubNav from '../../../components/Navigation/AdminSubNav';
import { useAdminTournament } from '../../../contexts/AdminTournamentContext';
import './StoriesManagement.css';

const MATCH_SITUATION_PRESETS = [
    { label: '🏆 Trophy & Champions', url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop', hint: 'Final win & celebration' },
    { label: '🏏 Match Action', url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop', hint: 'Live play & batting/bowling' },
    { label: '💥 Boundary Blitz', url: 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=800&auto=format&fit=crop', hint: 'Sixes & power hitting' },
    { label: '⚡ Wicket Strike', url: 'https://images.unsplash.com/photo-1589487391730-58f20eb2c308?w=800&auto=format&fit=crop', hint: 'Dismissal & stumps flying' },
    { label: '🙌 Team Huddle', url: 'https://images.unsplash.com/photo-1569517282132-25d22f4573e6?w=800&auto=format&fit=crop', hint: 'Team spirit & victory roar' },
    { label: '🏟️ Stadium Night', url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop', hint: 'Floodlights & ground atmosphere' },
    { label: '🎯 Thrilling Finish', url: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&auto=format&fit=crop', hint: 'Super over & nail-biter' },
    { label: '🤝 Toss & Matchday', url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop', hint: 'Captains handshake & toss' },
    { label: '🌧️ Weather & Delay', url: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800&auto=format&fit=crop', hint: 'Rain delay & pitch inspection' },
    { label: '🔥 High Derby Clash', url: 'https://images.unsplash.com/photo-1516796181074-bf453fbfa3e6?w=800&auto=format&fit=crop', hint: 'Intense batch rivalry clash' }
];

const StoriesManagement = () => {
    const toastRef = useRef();
    const { selectedTournamentId } = useAdminTournament();
    const [stories, setStories] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingStory, setEditingStory] = useState(null);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    // Form inputs
    const [topic, setTopic] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [timeStr, setTimeStr] = useState('');

    useEffect(() => {
        const unsub = subscribeStories((data) => {
            if (data) {
                const list = Object.entries(data).map(([id, s]) => ({ id, ...s }));
                setStories(list.reverse());
            } else {
                setStories([]);
            }
        }, selectedTournamentId);
        return () => unsub();
    }, [selectedTournamentId]);

    const formatCurrentTime = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const period = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = String(hours % 12 || 12).padStart(2, '0');
        return `${year}.${month}.${day} ${formattedHours}.${minutes}${period}`;
    };

    const handleOpenCreate = () => {
        setEditingStory(null);
        setTopic('');
        setDescription('');
        setImageUrl('');
        setTimeStr(formatCurrentTime());
        setModalOpen(true);
    };

    const handleOpenEdit = (story) => {
        setEditingStory(story);
        setTopic(story.topic || '');
        setDescription(story.description || '');
        setImageUrl(story.ImageURL || story.imageUrl || story.image || story.coverImage || '');
        setTimeStr(story.time || formatCurrentTime());
        setModalOpen(true);
    };

    const handleSaveStory = async (e) => {
        e.preventDefault();
        if (!topic.trim() || !description.trim()) {
            toastRef.current.showToast('error', 'Please fill in both title and description.');
            return;
        }

        try {
            const storyPayload = {
                id: editingStory ? editingStory.id : Date.now().toString(),
                topic: topic.trim(),
                description: description.trim(),
                time: timeStr || formatCurrentTime(),
                ImageURL: imageUrl.trim() || '',
                imageUrl: imageUrl.trim() || ''
            };

            await saveStory(storyPayload, selectedTournamentId);
            setModalOpen(false);
            toastRef.current.showToast('success', `Story ${editingStory ? 'updated' : 'published'} successfully!`);
        } catch (error) {
            console.error('Error saving story:', error);
            toastRef.current.showToast('error', 'Failed to save story.');
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetId) return;
        try {
            await deleteStory(deleteTargetId, selectedTournamentId);
            setDeleteTargetId(null);
            toastRef.current.showToast('success', 'Story deleted successfully.');
        } catch (error) {
            console.error('Error deleting story:', error);
            toastRef.current.showToast('error', 'Failed to delete story.');
        }
    };

    return (
        <div className="stories-mgmt-page">
            <AdminSubNav />
            <ToastNotification ref={toastRef} />

            <div className="sm-container">
                {/* Header */}
                <div className="sm-header">
                    <div>
                        <span className="sm-tag">TOURNAMENT BROADCASTS & NEWS</span>
                        <h1 className="sm-title">Stories Management</h1>
                        <p className="sm-subtitle">
                            Publish news, milestones, alert banners, and match highlights to the audience view.
                        </p>
                    </div>

                    <button className="cx-btn-primary" onClick={handleOpenCreate}>
                        Create New Story
                    </button>
                </div>

                {/* Stories Grid */}
                {stories.length === 0 ? (
                    <div className="sm-compact-empty-banner">
                        <div className="sm-empty-banner-left">
                            <div className="sm-empty-icon-bubble">
                                <MdArticle />
                            </div>
                            <div className="sm-empty-banner-text">
                                <h3>No tournament stories or bulletins published yet</h3>
                                <p>Publish news bulletins, player spotlights, and tournament highlights to the audience view.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="sm-stories-grid">
                        {stories.map((story) => (
                            <TiltCard key={story.id} className="sm-story-card" maxTilt={6}>
                                <div className="smc-header">
                                    <span className="smc-time">
                                        <MdAccessTime /> {story.time}
                                    </span>
                                    <div className="smc-actions">
                                        <button className="smc-action-btn edit" onClick={() => handleOpenEdit(story)} data-tooltip="Edit Story">
                                            <MdEdit />
                                        </button>
                                        <button className="smc-action-btn delete" onClick={() => setDeleteTargetId(story.id)} data-tooltip="Delete Story">
                                            <MdDelete />
                                        </button>
                                    </div>
                                </div>

                                {story.ImageURL && (
                                    <img src={story.ImageURL} alt={story.topic} className="smc-thumb" />
                                )}

                                <h3 className="smc-topic">{story.topic}</h3>
                                <p className="smc-desc">{story.description}</p>
                            </TiltCard>
                        ))}
                    </div>
                )}
            </div>

            {/* Publish & Edit Story Modal */}
            {modalOpen && (
                <div className="sm-modal-overlay" onClick={() => setModalOpen(false)}>
                    <div className="sm-modal-card pro-story-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="sm-modal-header">
                            <div className="sm-modal-header-left">
                                <div className="sm-modal-header-icon">
                                    <MdNewspaper />
                                </div>
                                <div>
                                    <span className="sm-modal-badge">{editingStory ? 'EDIT STORY' : 'NEW BROADCAST'}</span>
                                    <h3>{editingStory ? 'Edit Story Bulletin' : 'Publish New Story'}</h3>
                                    <p className="sm-modal-sub">
                                        {editingStory 
                                            ? 'Update announcement details, match recaps, or hero imagery.' 
                                            : 'Publish news, live match recaps, or tournament notices to the public feed.'}
                                    </p>
                                </div>
                            </div>
                            <button className="sm-modal-close" onClick={() => setModalOpen(false)} aria-label="Close">
                                <MdClose />
                            </button>
                        </div>

                        <form onSubmit={handleSaveStory} className="sm-form">
                            {/* SECTION 1: STORY CONTENT */}
                            <div className="sm-section-box">
                                <div className="sm-section-header">
                                    <span className="sm-section-step">1</span>
                                    <div>
                                        <h4>Story Narrative & Details</h4>
                                        <p className="sm-section-desc">Enter a captivating headline and comprehensive tournament story or match summary.</p>
                                    </div>
                                </div>

                                <div className="sm-form-group">
                                    <label>Story Topic / Headline *</label>
                                    <input
                                        type="text"
                                        className="sm-input"
                                        placeholder="e.g. E21 Dominates Opening Fixture with 42-Run Victory"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        required
                                    />
                                    <span className="sm-field-hint">Catchy headline displayed prominently across the user homepage and stories feed.</span>
                                </div>

                                <div className="sm-form-group">
                                    <label>Story Description / Full Narrative *</label>
                                    <textarea
                                        rows="6"
                                        className="sm-textarea"
                                        placeholder="Enter the complete news announcement, match highlights, notable performances, or batch congratulations..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        required
                                    />
                                    <span className="sm-field-hint">Supports multiline paragraphs for detailed match reports and scorecard summaries.</span>
                                </div>
                            </div>

                            {/* SECTION 2: MEDIA & TIMING */}
                            <div className="sm-section-box">
                                <div className="sm-section-header">
                                    <span className="sm-section-step">2</span>
                                    <div>
                                        <h4>Cover Media & Publication Timing</h4>
                                        <p className="sm-section-desc">Attach a banner image and set the broadcast timestamp shown to users.</p>
                                    </div>
                                </div>

                                <div className="sm-form-group">
                                    <div className="sm-label-row">
                                        <label><MdAccessTime /> Broadcast Timestamp</label>
                                        <button
                                            type="button"
                                            className="sm-time-now-btn"
                                            onClick={() => setTimeStr(formatCurrentTime())}
                                            title="Set to current local time"
                                        >
                                            <MdAutoAwesome /> Set to Now
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        className="sm-input"
                                        placeholder="YYYY.MM.DD HH.MMAM/PM"
                                        value={timeStr}
                                        onChange={(e) => setTimeStr(e.target.value)}
                                    />
                                    <span className="sm-field-hint">Timestamp shown to viewers on the news card (e.g. {formatCurrentTime()})</span>
                                </div>

                                <div className="sm-form-group">
                                    <label><MdImage /> Cover Image URL (Optional)</label>
                                    <input
                                        type="url"
                                        className="sm-input"
                                        placeholder="https://images.unsplash.com/..."
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                    />
                                    <div className="sm-preset-chips">
                                        <span className="sm-presets-label">Match Situation Presets:</span>
                                        {MATCH_SITUATION_PRESETS.map((preset, pIdx) => (
                                            <button
                                                key={pIdx}
                                                type="button"
                                                className={`sm-preset-btn ${imageUrl === preset.url ? 'active' : ''}`}
                                                onClick={() => setImageUrl(preset.url)}
                                                title={preset.hint}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {imageUrl && (
                                    <div className="sm-image-preview-box">
                                        <span className="sm-preview-badge">Live Image Preview</span>
                                        <img src={imageUrl} alt="Cover Preview" onError={(e) => { e.target.style.display = 'none'; }} />
                                    </div>
                                )}
                            </div>

                            <div className="sm-modal-actions">
                                <button type="button" className="sm-btn-cancel" onClick={() => setModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="sm-btn-submit">
                                    <MdCheckCircle /> {editingStory ? 'Save Changes' : 'Publish Story to Feed'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={Boolean(deleteTargetId)}
                title="Delete Story"
                message="Are you sure you want to permanently delete this story from AllStories? This action cannot be undone."
                confirmText="Delete Story"
                type="danger"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteTargetId(null)}
            />

            <Footer />
        </div>
    );
};

export default StoriesManagement;
