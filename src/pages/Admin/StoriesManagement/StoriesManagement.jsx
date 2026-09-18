import React, { useState, useEffect, useRef } from 'react';
import TiltCard from '../../../components/3D/TiltCard';
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import ToastNotification from '../../../components/common/ToastNotification';
import Footer from '../../../components/common/Footer/Footer';
import AdminSubNav from '../../../components/Navigation/AdminSubNav';
import ImageCropModal from '../../../components/common/ImageCropModal/ImageCropModal';
import { uploadToCloudinary } from '../../../services/cloudinaryService';
import { useAdminTournament } from '../../../contexts/AdminTournamentContext';
import { useAdminProcessing } from '../../../contexts/AdminProcessingContext';
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
    MdAdd,
    MdCrop,
    MdSportsCricket,
    MdCheck
} from 'react-icons/md';
import './StoriesManagement.css';

export const CRICKET_BACKGROUND_PRESETS = [
    {
        id: 'cricket-stadium-night',
        title: 'Night Floodlit Stadium',
        category: 'Stadium',
        url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80',
        thumb: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=300&q=75'
    },
    {
        id: 'cricket-arena-sunset',
        title: 'Golden Sunset Stadium',
        category: 'Stadium',
        url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
        thumb: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=75'
    },
    {
        id: 'cricket-arena-lights',
        title: 'Grand Arena Floodlights',
        category: 'Stadium',
        url: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80',
        thumb: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=300&q=75'
    },
    {
        id: 'cricket-ball-pitch',
        title: 'Red Leather Cricket Ball',
        category: 'Equipment',
        url: 'https://images.unsplash.com/photo-1593341646782-e0b495cff86d?auto=format&fit=crop&w=1200&q=80',
        thumb: 'https://images.unsplash.com/photo-1593341646782-e0b495cff86d?auto=format&fit=crop&w=300&q=75'
    },
    {
        id: 'cricket-equipment-gear',
        title: 'Cricket Bat & Leather Ball',
        category: 'Equipment',
        url: 'https://images.unsplash.com/photo-1589801258579-18e091f4ca26?auto=format&fit=crop&w=1200&q=80',
        thumb: 'https://images.unsplash.com/photo-1589801258579-18e091f4ca26?auto=format&fit=crop&w=300&q=75'
    },
    {
        id: 'cricket-batsman-shot',
        title: 'Batsman Power Shot',
        category: 'Action',
        url: 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?auto=format&fit=crop&w=1200&q=80',
        thumb: 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?auto=format&fit=crop&w=300&q=75'
    },
    {
        id: 'cricket-player-action',
        title: 'Match Day Action',
        category: 'Action',
        url: 'https://images.unsplash.com/photo-1577471488278-16eec37ffcc2?auto=format&fit=crop&w=1200&q=80',
        thumb: 'https://images.unsplash.com/photo-1577471488278-16eec37ffcc2?auto=format&fit=crop&w=300&q=75'
    },
    {
        id: 'cricket-stumps-wickets',
        title: 'Wickets & Pitch Bails',
        category: 'Field',
        url: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&w=1200&q=80',
        thumb: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&w=300&q=75'
    },
    {
        id: 'cricket-green-turf',
        title: 'Lush Match Outfield',
        category: 'Field',
        url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
        thumb: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=300&q=75'
    },
    {
        id: 'cricket-trophy-victory',
        title: 'Championship Trophy',
        category: 'Victory',
        url: 'https://images.unsplash.com/photo-1578269174936-2709b6aeb913?auto=format&fit=crop&w=1200&q=80',
        thumb: 'https://images.unsplash.com/photo-1578269174936-2709b6aeb913?auto=format&fit=crop&w=300&q=75'
    },
    {
        id: 'cricket-team-celebration',
        title: 'Team Victory Celebration',
        category: 'Victory',
        url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80',
        thumb: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=300&q=75'
    },
    {
        id: 'cricket-golden-cup',
        title: 'Golden Champions Cup',
        category: 'Victory',
        url: 'https://images.unsplash.com/photo-1563299796-17596ed6b017?auto=format&fit=crop&w=1200&q=80',
        thumb: 'https://images.unsplash.com/photo-1563299796-17596ed6b017?auto=format&fit=crop&w=300&q=75'
    }
];

const StoriesManagement = () => {
    const toastRef = useRef(null);
    const { selectedTournamentId } = useAdminTournament();
    const { withProcessing } = useAdminProcessing();

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
    const [selectedPresetCat, setSelectedPresetCat] = useState('All');


    useEffect(() => {
        const unsub = subscribeStories((data) => {
            if (data) {
                const arr = Object.keys(data).map(k => ({
                    id: k,
                    ...data[k]
                }));
                // Sort by ID descending (most recent first)
                arr.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
                setStories(arr);
            } else {
                setStories([]);
            }
        }, selectedTournamentId);
        return () => unsub();
    }, [selectedTournamentId]);

    const formatCurrentTime = () => {
        const now = new Date();
        const hrs = now.getHours();
        const mins = String(now.getMinutes()).padStart(2, '0');
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        const h12 = hrs % 12 || 12;
        return `${h12}:${mins} ${ampm}`;
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

    const filteredPresets = selectedPresetCat === 'All'
        ? CRICKET_BACKGROUND_PRESETS
        : CRICKET_BACKGROUND_PRESETS.filter(p => p.category === selectedPresetCat);

    const handleSelectCricketPreset = (preset) => {
        if (imageUrl === preset.url) {
            setImageUrl('');
        } else {
            setImageUrl(preset.url);
        }
    };

    const handlePickFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toastRef.current?.showToast('error', 'Please select a valid image file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setCropImageSrc(reader.result);
            setCropModalOpen(true);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCropComplete = async (croppedBlob, croppedDataUrl) => {
        setCropModalOpen(false);
        setIsUploading(true);
        await withProcessing(async () => {
            try {
                const uploadPayload = croppedBlob || croppedDataUrl;
                const result = await uploadToCloudinary(uploadPayload, {
                    folder: 'elegends_2k26/stories'
                });
                const uploadedUrl = typeof result === 'string' ? result : (result.secure_url || result.url);
                setImageUrl(uploadedUrl);
                toastRef.current?.showToast('success', 'Image cropped and uploaded successfully!');
            } catch (error) {
                console.error('Cloudinary upload error in stories:', error);
                toastRef.current?.showToast('error', `Cloudinary upload failed: ${error.message || 'Please check configuration'}`);
            } finally {
                setIsUploading(false);
            }
        }, 'Uploading Image...', 'Storing cropped image in Cloudinary...');
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

        await withProcessing(async () => {
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
        }, 'Saving Story...', 'Publishing tournament announcement to database...');
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetId) return;
        await withProcessing(async () => {
            try {
                await deleteStory(deleteTargetId, selectedTournamentId);
                setDeleteTargetId(null);
                toastRef.current?.showToast('success', 'Story bulletin removed successfully.');
            } catch (error) {
                console.error('Error deleting story:', error);
                toastRef.current?.showToast('error', 'Failed to delete story.');
            }
        }, 'Deleting Story...', 'Removing story from database...');
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
                                    <img
                                        src={story.ImageURL}
                                        alt={story.topic}
                                        className="smc-thumb"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
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
                                        <p className="sm-section-desc">Select an authentic cricket manner background from the web, upload your own photo, or enter a custom image URL.</p>
                                    </div>
                                </div>

                                {/* Cricket Manner Background Presets from Internet */}
                                <div className="sm-cricket-presets-section">
                                    <div className="sm-preset-header-bar">
                                        <div className="sm-preset-title-wrap">
                                            <div className="sm-preset-icon-badge">
                                                <MdSportsCricket />
                                            </div>
                                            <div>
                                                <span className="sm-preset-title">Cricket Manner Backgrounds (Web Presets)</span>
                                                <span className="sm-preset-subtitle">Click any thumbnail below to instantly set this story's background banner</span>
                                            </div>
                                        </div>

                                        <div className="sm-preset-filter-pills">
                                            {['All', 'Stadium', 'Action', 'Equipment', 'Victory', 'Field'].map((cat) => (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    className={`sm-preset-cat-btn ${selectedPresetCat === cat ? 'active' : ''}`}
                                                    onClick={() => setSelectedPresetCat(cat)}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="sm-presets-grid">
                                        {filteredPresets.map((preset) => {
                                            const isSelected = imageUrl === preset.url;
                                            return (
                                                <div
                                                    key={preset.id}
                                                    className={`sm-preset-card ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => handleSelectCricketPreset(preset)}
                                                    title={`Use "${preset.title}" as story cover`}
                                                    role="button"
                                                    tabIndex={0}
                                                >
                                                    <div className="sm-preset-thumb-wrap">
                                                        <img
                                                            src={preset.thumb}
                                                            alt={preset.title}
                                                            loading="lazy"
                                                            onError={(e) => {
                                                                e.currentTarget.onerror = null;
                                                                e.currentTarget.src = 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=300&q=75';
                                                            }}
                                                        />
                                                        <span className="sm-preset-tag">{preset.category}</span>
                                                        {isSelected && (
                                                            <div className="sm-preset-active-check">
                                                                <MdCheck />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="sm-preset-name">{preset.title}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="sm-form-group sm-custom-img-group">
                                    <div className="sm-label-row">
                                        <label><MdImage /> Or Custom Image URL / Upload</label>
                                        <div className="sm-image-action-btns">
                                            {imageUrl && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="sm-clear-btn"
                                                        onClick={() => setImageUrl('')}
                                                        title="Clear selected image"
                                                    >
                                                        <MdClose /> Clear Image
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="sm-crop-header-btn"
                                                        onClick={handleOpenCropForCurrent}
                                                        title="Crop or reframe visible image area"
                                                    >
                                                        <MdCrop /> Crop Image
                                                    </button>
                                                </>
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
                                            onChange={handlePickFile}
                                        />
                                    </div>
                                    <input
                                        type="url"
                                        className="sm-input"
                                        placeholder="Cloudinary image URL, Unsplash URL, or https://..."
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                    />
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
