import React, { useState, useEffect, useRef } from 'react';
import TiltCard from '../../../components/3D/TiltCard';
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import ToastNotification from '../../../components/common/ToastNotification';
import Footer from '../../../components/common/Footer/Footer';
import AdminSubNav from '../../../components/Navigation/AdminSubNav';
import ImageCropModal from '../../../components/common/ImageCropModal/ImageCropModal';
import { uploadToCloudinary } from '../../../services/cloudinaryService';
import { useAdminTournament } from '../../../contexts/AdminTournamentContext';
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
    MdCloudUpload,
    MdSync,
    MdEmojiEvents,
    MdSportsCricket,
    MdBolt,
    MdFlashOn,
    MdGroups,
    MdStadium,
    MdAdsClick,
    MdHandshake,
    MdCloudQueue,
    MdWhatshot,
    MdAdd,
    MdCrop
} from 'react-icons/md';
import './StoriesManagement.css';

const MATCH_SITUATION_PRESETS = [
    { title: 'Trophy & Champions', icon: MdEmojiEvents, url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop', hint: 'Final win & celebration' },
    { title: 'Match Action', icon: MdSportsCricket, url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop', hint: 'Live play & batting/bowling' },
    { title: 'Boundary Blitz', icon: MdBolt, url: 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=800&auto=format&fit=crop', hint: 'Sixes & power hitting' },
    { title: 'Wicket Strike', icon: MdFlashOn, url: 'https://images.unsplash.com/photo-1589487391730-58f20eb2c308?w=800&auto=format&fit=crop', hint: 'Dismissal & stumps flying' },
    { title: 'Team Huddle', icon: MdGroups, url: 'https://images.unsplash.com/photo-1569517282132-25d22f4573e6?w=800&auto=format&fit=crop', hint: 'Team spirit & victory roar' },
    { title: 'Stadium Night', icon: MdStadium, url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop', hint: 'Floodlights & ground atmosphere' },
    { title: 'Thrilling Finish', icon: MdAdsClick, url: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&auto=format&fit=crop', hint: 'Super over & nail-biter' },
    { title: 'Toss & Matchday', icon: MdHandshake, url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop', hint: 'Captains handshake & toss' },
    { title: 'Weather & Delay', icon: MdCloudQueue, url: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800&auto=format&fit=crop', hint: 'Rain delay & pitch inspection' },
    { title: 'High Derby Clash', icon: MdWhatshot, url: 'https://images.unsplash.com/photo-1516796181074-bf453fbfa3e6?w=800&auto=format&fit=crop', hint: 'Intense batch rivalry clash' }
];

const StoriesManagement = () => {
    const toastRef = useRef(null);
    const { selectedTournamentId } = useAdminTournament();

    const [stories, setStories] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingStory, setEditingStory] = useState(null);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    const [topic, setTopic] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [timeStr, setTimeStr] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState('');

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
        const date = now.toISOString().split('T')[0];
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${date} ${hours}:${minutes} ${ampm}`;
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
        setImageUrl(story.ImageURL || '');
        setTimeStr(story.time || formatCurrentTime());
        setModalOpen(true);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toastRef.current?.showToast('error', 'Please select a valid image file (JPG, PNG, WebP).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setCropImageSrc(event.target.result);
            setCropModalOpen(true);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCropComplete = async (croppedBase64) => {
        setCropModalOpen(false);
        setIsUploading(true);
        try {
            const uploadedUrl = await uploadToCloudinary(croppedBase64);
            setImageUrl(uploadedUrl);
            toastRef.current?.showToast('success', 'Image cropped and uploaded successfully!');
        } catch (error) {
            console.warn('Cloudinary upload warning, using cropped data URI directly:', error);
            setImageUrl(croppedBase64);
            toastRef.current?.showToast('info', 'Cropped image applied successfully.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleOpenCropForCurrent = () => {
        if (!imageUrl) return;
        setCropImageSrc(imageUrl);
        setCropModalOpen(true);
    };

    const handleSaveStory = async (e) => {
        e.preventDefault();
        if (!topic.trim()) {
            toastRef.current?.showToast('error', 'Please enter a story topic or headline.');
            return;
        }
        if (!description.trim()) {
            toastRef.current?.showToast('error', 'Please enter a story description or content.');
            return;
        }

        try {
            const storyData = {
                id: editingStory ? editingStory.id : `story_${Date.now()}`,
                topic: topic.trim(),
                description: description.trim(),
                ImageURL: imageUrl.trim(),
                time: timeStr.trim() || formatCurrentTime()
            };

            await saveStory(storyData, selectedTournamentId);
            setModalOpen(false);
            setEditingStory(null);
            toastRef.current?.showToast('success', `Story ${editingStory ? 'updated' : 'published'} successfully!`);
        } catch (error) {
            console.error('Error saving story:', error);
            toastRef.current?.showToast('error', 'Failed to save story.');
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetId) return;
        try {
            await deleteStory(deleteTargetId, selectedTournamentId);
            setDeleteTargetId(null);
            toastRef.current?.showToast('success', 'Story bulletin removed successfully.');
        } catch (error) {
            console.error('Error deleting story:', error);
            toastRef.current?.showToast('error', 'Failed to delete story.');
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
                        <h1 className="sm-title">Stories & Bulletins Management</h1>
                        <p className="sm-subtitle">
                            Publish announcements, match highlights, milestone alerts, and tournament news to the public homepage and stories feed.
                        </p>
                    </div>

                    <div className="sm-header-actions">
                        <button className="cx-btn-primary" onClick={handleOpenCreate} id="create-story-btn">
                            <MdAdd /> Create New Story
                        </button>
                    </div>
                </div>

                {/* Stories List */}
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
                        <button className="sm-empty-action-btn" onClick={handleOpenCreate}>
                            <MdAdd /> Publish First Story
                        </button>
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
                                        <button
                                            className="smc-action-btn edit"
                                            onClick={() => handleOpenEdit(story)}
                                            data-tooltip="Edit Story"
                                        >
                                            <MdEdit />
                                        </button>
                                        <button
                                            className="smc-action-btn delete"
                                            onClick={() => setDeleteTargetId(story.id)}
                                            data-tooltip="Delete Story"
                                        >
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

            {/* CREATE / EDIT MODAL */}
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

                                <div className="sm-form-group">
                                    <label>Timestamp / Broadcast Schedule</label>
                                    <input
                                        type="text"
                                        className="sm-input"
                                        placeholder="e.g. 2026-03-14 02:45 PM"
                                        value={timeStr}
                                        onChange={(e) => setTimeStr(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* SECTION 2: HERO COVER IMAGE */}
                            <div className="sm-section-box">
                                <div className="sm-section-header">
                                    <span className="sm-section-step">2</span>
                                    <div>
                                        <h4>Story Hero Cover Image (Optional)</h4>
                                        <p className="sm-section-desc">Add visual flair with a custom upload, crop adjustment, or match preset banner.</p>
                                    </div>
                                </div>

                                <div className="sm-form-group">
                                    <div className="sm-label-row">
                                        <label><MdImage /> Cover Image Source</label>
                                        <div className="sm-image-action-btns">
                                            {imageUrl && (
                                                <button
                                                    type="button"
                                                    className="sm-crop-header-btn"
                                                    onClick={handleOpenCropForCurrent}
                                                    title="Crop or reframe visible image area"
                                                >
                                                    <MdCrop /> Crop Image
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="sm-upload-btn"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                            >
                                                {isUploading ? (
                                                    <><MdSync className="spin-icon" /> Uploading...</>
                                                ) : (
                                                    <><MdCloudUpload /> Upload & Crop</>
                                                )}
                                            </button>
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            style={{ display: 'none' }}
                                            accept="image/*"
                                            onChange={handleFileSelect}
                                        />
                                    </div>
                                    <input
                                        type="url"
                                        className="sm-input"
                                        placeholder="Cloudinary image URL or https://..."
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                    />
                                    <div className="sm-preset-chips">
                                        <span className="sm-presets-label">Matchday Presets:</span>
                                        {MATCH_SITUATION_PRESETS.map((preset, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                className={`sm-preset-btn ${imageUrl === preset.url ? 'active' : ''}`}
                                                onClick={() => setImageUrl(preset.url)}
                                                title={preset.hint}
                                            >
                                                <span>{preset.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {imageUrl && (
                                    <div className="sm-image-preview-box">
                                        <span className="sm-preview-badge">Live Cover Preview</span>
                                        <button
                                            type="button"
                                            className="sm-crop-floating-btn"
                                            onClick={handleOpenCropForCurrent}
                                            title="Frame and crop image"
                                        >
                                            <MdCrop /> Crop & Frame
                                        </button>
                                        <img src={imageUrl} alt="Story Preview" onError={(e) => { e.target.style.display = 'none'; }} />
                                    </div>
                                )}
                            </div>

                            <div className="sm-modal-actions">
                                <button type="button" className="sm-btn-cancel" onClick={() => setModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="sm-btn-submit">
                                    <MdCheckCircle /> {editingStory ? 'Save Changes' : 'Publish Story'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Story Confirmation Modal */}
            <ConfirmationModal
                isOpen={Boolean(deleteTargetId)}
                title="Delete Story"
                message="Are you sure you want to permanently delete this story bulletin? This action cannot be undone."
                confirmText="Delete Story"
                cancelText="Cancel"
                type="danger"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteTargetId(null)}
            />

            {/* Image Crop Modal */}
            <ImageCropModal
                isOpen={cropModalOpen}
                imageSrc={cropImageSrc}
                title="Crop Story Cover Image"
                cropShape="rect"
                aspectRatio={16 / 9}
                onCropComplete={handleCropComplete}
                onCancel={() => setCropModalOpen(false)}
            />

            <Footer />
        </div>
    );
};

export default StoriesManagement;
