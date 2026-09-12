import React, { useState, useEffect, useRef } from 'react';
import TiltCard from '../../../components/3D/TiltCard';
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import ToastNotification from '../../../components/common/ToastNotification';
import Footer from '../../../components/common/Footer/Footer';
import AdminSubNav from '../../../components/Navigation/AdminSubNav';
import ImageCropModal from '../../../components/common/ImageCropModal/ImageCropModal';
import { uploadToCloudinary } from '../../../services/cloudinaryService';
import {
    subscribeCommonGallery,
    saveCommonGalleryPhoto,
    deleteCommonGalleryPhoto,
    subscribeTournamentIndex
} from '../../../services/rtdbService';
import {
    MdPhotoLibrary,
    MdAddAPhoto,
    MdSearch,
    MdClose,
    MdEdit,
    MdDelete,
    MdAccessTime,
    MdVisibility,
    MdImage,
    MdCloudUpload,
    MdSync,
    MdCrop,
    MdCheckCircle,
    MdOpenInNew,
    MdEmojiEvents
} from 'react-icons/md';
import './GalleryManagement.css';

const GALLERY_CATEGORIES = [
    'Match Action',
    'Trophy & Awards',
    'Opening Ceremony',
    'Team Squads',
    'Celebrations',
    'Stadium & Fans',
    'Highlights'
];

const STANDARD_TOURNAMENTS = [
    "E-Legend's Trophy 2K26",
    "E-Legend's Trophy 2K25",
    "E-Legend's Trophy 2K23",
    "E-Legend's Trophy 2K22",
    "E-Legend's Trophy 2K20",
];

export const resolvePhotoUrl = (url) => {
    if (!url) return '';
    const trimmed = String(url).trim();
    if (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('blob:')
    ) {
        return trimmed;
    }
    if (trimmed.startsWith('/')) {
        return trimmed;
    }
    return '/' + trimmed;
};

const GalleryManagement = () => {
    const toastRef = useRef(null);

    // Gallery Data
    const [photos, setPhotos] = useState([]);
    const [tournamentsList, setTournamentsList] = useState(STANDARD_TOURNAMENTS);

    // Filters & Search
    const [tournamentFilter, setTournamentFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal & Operations
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPhoto, setEditingPhoto] = useState(null);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [lightboxPhoto, setLightboxPhoto] = useState(null);

    // Form fields
    const [formTitle, setFormTitle] = useState('');
    const [formTournament, setFormTournament] = useState("E-Legend's Trophy 2K26");
    const [formCategory, setFormCategory] = useState('Match Action');
    const [formCaption, setFormCaption] = useState('');
    const [formImageUrl, setFormImageUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Crop Modal & Preview
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState('');
    const [imageLoadError, setImageLoadError] = useState(false);

    // 1. Subscribe to Common Gallery
    useEffect(() => {
        const unsub = subscribeCommonGallery((data) => {
            setPhotos(data || []);
        });
        return () => unsub();
    }, []);

    // 2. Subscribe to Tournament Index to dynamically populate tournament dropdown options
    useEffect(() => {
        const unsubIndex = subscribeTournamentIndex((indexList) => {
            if (indexList && indexList.length > 0) {
                const names = indexList.map((t) => t.name || t.id || `E-Legend's Trophy ${t.editionId}`);
                const merged = Array.from(new Set([...names, ...STANDARD_TOURNAMENTS]));
                setTournamentsList(merged);
            }
        });
        return () => unsubIndex();
    }, []);

    // Dynamic list of tournaments that actually have photos, plus default options
    const existingTournamentsWithPhotos = Array.from(
        new Set(photos.map((p) => p.tournamentId).filter(Boolean))
    );

    // All available tournament filter options
    const allTournamentFilterOptions = Array.from(
        new Set(['All', ...existingTournamentsWithPhotos, "E-Legend's Trophy 2K26", "E-Legend's Trophy 2K25"])
    );

    // Open create modal
    const handleOpenCreate = () => {
        setEditingPhoto(null);
        setFormTitle('');
        setFormTournament(tournamentFilter !== 'All' ? tournamentFilter : "E-Legend's Trophy 2K26");
        setFormCategory('Match Action');
        setFormCaption('');
        setFormImageUrl('');
        setImageLoadError(false);
        setModalOpen(true);
    };

    // Open edit modal
    const handleOpenEdit = (photo) => {
        setEditingPhoto(photo);
        setFormTitle(photo.title || '');
        setFormTournament(photo.tournamentId || "E-Legend's Trophy 2K26");
        setFormCategory(photo.category || 'Match Action');
        setFormCaption(photo.caption || '');
        setFormImageUrl(photo.imageUrl || '');
        setImageLoadError(false);
        setModalOpen(true);
    };

    // Handle file selection and trigger crop
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

    // Handle completed crop (croppedBase64)
    const handleCropComplete = async (croppedBase64) => {
        setCropModalOpen(false);
        setIsUploading(true);
        try {
            const uploadedUrl = await uploadToCloudinary(croppedBase64);
            setFormImageUrl(uploadedUrl);
            toastRef.current?.showToast('success', 'Image framed and uploaded successfully!');
        } catch (error) {
            console.warn('Cloudinary upload warning, using cropped data URI directly:', error);
            setFormImageUrl(croppedBase64);
            toastRef.current?.showToast('info', 'Cropped image applied successfully.');
        } finally {
            setIsUploading(false);
        }
    };

    // Re-crop existing image URL
    const handleCropCurrentUrl = () => {
        if (!formImageUrl) return;
        setCropImageSrc(resolvePhotoUrl(formImageUrl));
        setCropModalOpen(true);
    };

    // Save Photo (Create / Update)
    const handleSavePhoto = async (e) => {
        e.preventDefault();
        if (!formTitle.trim()) {
            toastRef.current?.showToast('error', 'Please provide a title for the photo.');
            return;
        }
        if (!formImageUrl.trim()) {
            toastRef.current?.showToast('error', 'Please provide or upload a photo image.');
            return;
        }

        try {
            const photoData = {
                id: editingPhoto ? editingPhoto.id : `photo_${Date.now()}`,
                title: formTitle.trim(),
                tournamentId: formTournament.trim() || "E-Legend's Trophy 2K26",
                category: formCategory,
                caption: formCaption.trim(),
                imageUrl: formImageUrl.trim(),
                uploadedAt: editingPhoto?.uploadedAt || new Date().toISOString().split('T')[0],
                timestamp: editingPhoto?.timestamp || Date.now()
            };

            await saveCommonGalleryPhoto(photoData);
            setModalOpen(false);
            setEditingPhoto(null);
            toastRef.current?.showToast('success', `Photo ${editingPhoto ? 'updated' : 'added'} successfully!`);
        } catch (error) {
            console.error('Error saving gallery photo:', error);
            toastRef.current?.showToast('error', 'Failed to save gallery photo.');
        }
    };

    // Confirm Delete Photo
    const handleConfirmDelete = async () => {
        if (!deleteTargetId) return;
        try {
            await deleteCommonGalleryPhoto(deleteTargetId);
            setDeleteTargetId(null);
            toastRef.current?.showToast('success', 'Photo removed from gallery.');
        } catch (error) {
            console.error('Error deleting photo:', error);
            toastRef.current?.showToast('error', 'Failed to delete photo.');
        }
    };

    // Filter and search logic
    const filteredPhotos = photos.filter((p) => {
        const matchesTournament = tournamentFilter === 'All' || p.tournamentId === tournamentFilter;
        const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
        const matchesSearch = !searchQuery.trim() ||
            (p.title && p.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.caption && p.caption.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.tournamentId && p.tournamentId.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesTournament && matchesCategory && matchesSearch;
    });

    return (
        <div className="gallery-mgmt-page">
            <AdminSubNav />
            <ToastNotification ref={toastRef} />

            <div className="gm-container">
                {/* Header */}
                <div className="gm-header">
                    <div>
                        <div className="gm-badge-row">
                            <span className="gm-tag">CENTRAL TOURNAMENT REPOSITORY</span>
                            <span className="gm-common-pill">Common for All Tournaments</span>
                        </div>
                        <h1 className="gm-title">Tournament Gallery Management</h1>
                        <p className="gm-subtitle">
                            Upload, organize, and categorize tournament photography across all editions. Admin can categorize photos by tournament and matchday category.
                        </p>
                    </div>

                    <div className="gm-header-actions">
                        <button
                            type="button"
                            className="cx-btn-primary"
                            onClick={handleOpenCreate}
                            id="add-gallery-photo-btn"
                        >
                            <MdAddAPhoto /> Add Tournament Photo
                        </button>
                    </div>
                </div>

                {/* Filter Toolbar: Tournament selector, Category chips, Search */}
                <div className="gm-toolbar-card">
                    {/* Level 1: Tournament Categorization Selector */}
                    <div className="gm-tournament-filter-bar">
                        <div className="gm-tournament-filter-label">
                            <MdEmojiEvents className="gm-trophy-icon" />
                            <span>Select Tournament:</span>
                        </div>
                        <div className="gm-tournament-pills" role="tablist" aria-label="Tournament Filter">
                            {allTournamentFilterOptions.map((tName) => {
                                const count = tName === 'All'
                                    ? photos.length
                                    : photos.filter((p) => p.tournamentId === tName).length;
                                return (
                                    <button
                                        key={tName}
                                        type="button"
                                        className={`gm-tournament-pill ${tournamentFilter === tName ? 'active' : ''}`}
                                        onClick={() => setTournamentFilter(tName)}
                                    >
                                        <span>{tName}</span>
                                        <span className="gm-pill-count">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Level 2: Category Chips & Search Bar */}
                    <div className="gm-sub-toolbar">
                        <div className="gm-category-chips" role="tablist" aria-label="Photo Categories">
                            <button
                                type="button"
                                className={`gm-category-chip ${categoryFilter === 'All' ? 'active' : ''}`}
                                onClick={() => setCategoryFilter('All')}
                            >
                                All Themes ({tournamentFilter === 'All' ? photos.length : photos.filter(p => p.tournamentId === tournamentFilter).length})
                            </button>
                            {GALLERY_CATEGORIES.map((cat) => {
                                const count = photos.filter((p) => {
                                    const matchT = tournamentFilter === 'All' || p.tournamentId === tournamentFilter;
                                    return matchT && p.category === cat;
                                }).length;
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        className={`gm-category-chip ${categoryFilter === cat ? 'active' : ''}`}
                                        onClick={() => setCategoryFilter(cat)}
                                    >
                                        {cat} {count > 0 && <span className="cat-chip-count">{count}</span>}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="gm-search-box">
                            <MdSearch className="gm-search-icon" />
                            <input
                                type="text"
                                className="gm-search-input"
                                placeholder="Search moments, captions, batches..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    className="gm-search-clear"
                                    onClick={() => setSearchQuery('')}
                                >
                                    <MdClose />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Photos Grid */}
                {filteredPhotos.length === 0 ? (
                    <div className="gm-empty-card">
                        <div className="gm-empty-icon-circle">
                            <MdPhotoLibrary />
                        </div>
                        <h3>No Photos in Gallery</h3>
                        <p>
                            {photos.length === 0
                                ? 'No photos in the database yet. Click "Add First Photo" to upload photography.'
                                : 'No photos match your current tournament filter, category, or search keyword.'}
                        </p>
                        <div className="gm-empty-actions">
                            {photos.length > 0 && (
                                <button
                                    className="gm-btn-secondary"
                                    onClick={() => {
                                        setTournamentFilter('All');
                                        setCategoryFilter('All');
                                        setSearchQuery('');
                                    }}
                                >
                                    Reset Filters
                                </button>
                            )}
                            <button className="cx-btn-primary" onClick={handleOpenCreate}>
                                <MdAddAPhoto /> Add First Photo
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="gm-photos-grid">
                        {filteredPhotos.map((photo) => (
                            <TiltCard key={photo.id} className="gm-photo-card" maxTilt={6}>
                                <div
                                    className="gm-photo-thumb-wrap"
                                    onClick={() => setLightboxPhoto(photo)}
                                    title="Click to preview full-size photo"
                                >
                                    <img
                                        src={resolvePhotoUrl(photo.imageUrl)}
                                        alt={photo.title || 'Tournament photo'}
                                        className="gm-photo-thumb"
                                        loading="lazy"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop';
                                        }}
                                    />
                                    <div className="gm-photo-overlay">
                                        <button
                                            type="button"
                                            className="gm-photo-action-btn view"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setLightboxPhoto(photo);
                                            }}
                                            title="View Full Resolution"
                                        >
                                            <MdVisibility />
                                        </button>
                                        <button
                                            type="button"
                                            className="gm-photo-action-btn edit"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenEdit(photo);
                                            }}
                                            title="Edit Photo Details"
                                        >
                                            <MdEdit />
                                        </button>
                                        <button
                                            type="button"
                                            className="gm-photo-action-btn delete"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteTargetId(photo.id);
                                            }}
                                            title="Delete Photo"
                                        >
                                            <MdDelete />
                                        </button>
                                    </div>
                                    <div className="gm-thumb-badges">
                                        <span className="gm-thumb-tournament-pill">
                                            {photo.tournamentId || "E-Legend's Trophy"}
                                        </span>
                                        {photo.category && (
                                            <span className="gm-thumb-category-pill">{photo.category}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="gm-card-body">
                                    <h4 className="gm-card-title" onClick={() => setLightboxPhoto(photo)}>
                                        {photo.title || 'Untitled Moment'}
                                    </h4>
                                    {photo.caption && (
                                        <p className="gm-card-caption">{photo.caption}</p>
                                    )}
                                </div>
                            </TiltCard>
                        ))}
                    </div>
                )}
            </div>

            {/* CREATE / EDIT PHOTO MODAL */}
            {modalOpen && (
                <div className="gm-modal-overlay" onClick={() => setModalOpen(false)}>
                    <div className="gm-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="gm-modal-header">
                            <div className="gm-modal-header-left">
                                <div className="gm-modal-header-icon">
                                    <MdPhotoLibrary />
                                </div>
                                <div>
                                    <span className="gm-modal-badge">
                                        {editingPhoto ? 'EDIT PHOTO' : 'NEW GALLERY MOMENT'}
                                    </span>
                                    <h3>{editingPhoto ? 'Edit Photo Details' : 'Add Tournament Photo'}</h3>
                                    <p className="gm-modal-sub">
                                        Categorize this image by tournament edition and theme category.
                                    </p>
                                </div>
                            </div>
                            <button
                                className="gm-modal-close"
                                onClick={() => setModalOpen(false)}
                                aria-label="Close"
                            >
                                <MdClose />
                            </button>
                        </div>

                        <form onSubmit={handleSavePhoto} className="gm-form">
                            {/* SECTION 1: TOURNAMENT & BASIC INFO */}
                            <div className="gm-section-box">
                                <div className="gm-section-header">
                                    <span className="gm-section-step">1</span>
                                    <div>
                                        <h4>Tournament Categorization & Title</h4>
                                        <p className="gm-section-desc">Assign this moment to its specific tournament edition and provide a descriptive title.</p>
                                    </div>
                                </div>

                                <div className="gm-form-group">
                                    <label>Tournament Edition *</label>
                                    <div className="gm-select-wrap">
                                        <select
                                            className="gm-select"
                                            value={formTournament}
                                            onChange={(e) => setFormTournament(e.target.value)}
                                            required
                                        >
                                            {tournamentsList.map((t) => (
                                                <option key={t} value={t}>
                                                    {t}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <span className="gm-field-hint">This photo will be categorized under this tournament in both the Admin panel and public Home gallery.</span>
                                </div>

                                <div className="gm-form-group">
                                    <label>Photo Title *</label>
                                    <input
                                        type="text"
                                        className="gm-input"
                                        placeholder="e.g. Captains Trophy Presentation 2K25"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="gm-form-group">
                                    <label>Theme Category *</label>
                                    <div className="gm-category-selector-chips">
                                        {GALLERY_CATEGORIES.map((cat) => (
                                            <button
                                                key={cat}
                                                type="button"
                                                className={`gm-cat-select-btn ${formCategory === cat ? 'selected' : ''}`}
                                                onClick={() => setFormCategory(cat)}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="gm-form-group">
                                    <label>Caption / Match Notes (Optional)</label>
                                    <textarea
                                        rows="3"
                                        className="gm-textarea"
                                        placeholder="Add background context, player names, bowler/batsman milestones, or venue details..."
                                        value={formCaption}
                                        onChange={(e) => setFormCaption(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* SECTION 2: PHOTO IMAGE & CROP */}
                            <div className="gm-section-box">
                                <div className="gm-section-header">
                                    <span className="gm-section-step">2</span>
                                    <div>
                                        <h4>Upload or Select Photography</h4>
                                        <p className="gm-section-desc">Upload a high-resolution photo, adjust the visible crop area, or choose a 2K25 preset.</p>
                                    </div>
                                </div>

                                <div className="gm-form-group">
                                    <div className="gm-label-row">
                                        <label><MdImage /> Photo Source *</label>
                                        <div className="gm-image-action-btns">
                                            {formImageUrl && (
                                                <button
                                                    type="button"
                                                    className="gm-crop-header-btn"
                                                    onClick={handleCropCurrentUrl}
                                                    title="Crop or reframe visible photo area"
                                                >
                                                    <MdCrop /> Crop & Frame
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="gm-upload-btn"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                            >
                                                {isUploading ? (
                                                    <><MdSync className="spin-icon" /> Uploading...</>
                                                ) : (
                                                    <><MdCloudUpload /> Upload & Crop Photo</>
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
                                        type="text"
                                        className="gm-input"
                                        placeholder="Image path or Cloudinary URL (e.g. assets/images/slider/image01.jpeg)"
                                        value={formImageUrl}
                                        onChange={(e) => {
                                            setFormImageUrl(e.target.value);
                                            setImageLoadError(false);
                                        }}
                                        required
                                    />
                                </div>

                                {formImageUrl && (
                                    <div className="gm-image-preview-box">
                                        <span className="gm-preview-badge">Live Photo Preview</span>
                                        <button
                                            type="button"
                                            className="gm-crop-floating-btn"
                                            onClick={handleCropCurrentUrl}
                                            title="Frame and crop photo"
                                        >
                                            <MdCrop /> Crop & Frame Photo
                                        </button>
                                        {imageLoadError ? (
                                            <div className="gm-preview-error">
                                                <MdImage className="gm-preview-error-icon" />
                                                <p>Preview unavailable. Please verify image URL or upload a file.</p>
                                            </div>
                                        ) : (
                                            <img
                                                key={formImageUrl}
                                                src={resolvePhotoUrl(formImageUrl)}
                                                alt="Gallery Preview"
                                                onError={() => setImageLoadError(true)}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="gm-modal-actions">
                                <button
                                    type="button"
                                    className="gm-btn-cancel"
                                    onClick={() => setModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="cx-btn-primary">
                                    <MdCheckCircle /> {editingPhoto ? 'Save Changes' : 'Add to Tournament Gallery'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* FULLSCREEN LIGHTBOX MODAL */}
            {lightboxPhoto && (
                <div className="gm-lightbox-overlay" onClick={() => setLightboxPhoto(null)}>
                    <div className="gm-lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            className="gm-lightbox-close"
                            onClick={() => setLightboxPhoto(null)}
                            aria-label="Close Lightbox"
                        >
                            <MdClose />
                        </button>
                        <div className="gm-lightbox-img-wrap">
                            <img
                                src={resolvePhotoUrl(lightboxPhoto.imageUrl)}
                                alt={lightboxPhoto.title}
                                className="gm-lightbox-img"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop';
                                }}
                            />
                        </div>
                        <div className="gm-lightbox-info">
                            <div className="gm-lightbox-meta">
                                <span className="gm-lightbox-tournament-tag">
                                    <MdEmojiEvents /> {lightboxPhoto.tournamentId || "E-Legend's Trophy"}
                                </span>
                                {lightboxPhoto.category && (
                                    <span className="gm-lightbox-category-tag">{lightboxPhoto.category}</span>
                                )}
                                <span className="gm-lightbox-time">
                                    <MdAccessTime /> {lightboxPhoto.uploadedAt || 'Matchday'}
                                </span>
                            </div>
                            <h3 className="gm-lightbox-title">{lightboxPhoto.title || 'Tournament Photo'}</h3>
                            {lightboxPhoto.caption && (
                                <p className="gm-lightbox-desc">{lightboxPhoto.caption}</p>
                            )}
                            <div className="gm-lightbox-actions">
                                <a
                                    href={resolvePhotoUrl(lightboxPhoto.imageUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="gm-lightbox-btn"
                                >
                                    <MdOpenInNew /> Open Full Resolution
                                </a>
                                <button
                                    type="button"
                                    className="gm-lightbox-btn edit"
                                    onClick={() => {
                                        const p = lightboxPhoto;
                                        setLightboxPhoto(null);
                                        handleOpenEdit(p);
                                    }}
                                >
                                    <MdEdit /> Edit Details
                                </button>
                                <button
                                    type="button"
                                    className="gm-lightbox-btn delete"
                                    onClick={() => {
                                        const pId = lightboxPhoto.id;
                                        setLightboxPhoto(null);
                                        setDeleteTargetId(pId);
                                    }}
                                >
                                    <MdDelete /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={Boolean(deleteTargetId)}
                title="Delete Gallery Photo"
                message="Are you sure you want to permanently delete this photo from the Tournament Gallery? This action cannot be undone."
                confirmText="Delete Photo"
                cancelText="Cancel"
                type="danger"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteTargetId(null)}
            />

            {/* Image Crop Modal */}
            <ImageCropModal
                isOpen={cropModalOpen}
                imageSrc={cropImageSrc}
                title="Crop & Frame Tournament Photo"
                cropShape="rect"
                aspectRatio={16 / 9}
                onCropComplete={handleCropComplete}
                onCancel={() => setCropModalOpen(false)}
            />

            <Footer />
        </div>
    );
};

export default GalleryManagement;
