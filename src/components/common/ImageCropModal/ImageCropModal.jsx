import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MdClose, MdCheck, MdZoomIn, MdZoomOut, MdCrop, MdRefresh } from 'react-icons/md';
import './ImageCropModal.css';

/**
 * ImageCropModal
 * Zero-dependency HTML5 Canvas image cropper with real-time visible area preview,
 * pan, zoom, and circular/square mask options.
 */
const ImageCropModal = ({
    isOpen,
    imageSrc,
    title = 'Crop Image',
    aspectRatio = 1, // 1 for 1:1 square/circle, can be customized
    cropShape = 'circle', // 'circle' or 'rect'
    onCropComplete,
    onCancel
}) => {
    const [imageObj, setImageObj] = useState(null);
    const [currentCropShape, setCurrentCropShape] = useState(cropShape);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [previewDataUrl, setPreviewDataUrl] = useState('');

    const canvasRef = useRef(null);
    const previewCanvasRef = useRef(null);
    const containerRef = useRef(null);

    const VIEWPORT_SIZE = 300; // Size of the interactive crop box in pixels

    // Sync cropShape prop when modal opens or prop changes
    useEffect(() => {
        setCurrentCropShape(cropShape);
    }, [cropShape, isOpen]);

    // Load Image
    useEffect(() => {
        if (!imageSrc || !isOpen) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            setImageObj(img);
            setZoom(1);
            setOffset({ x: 0, y: 0 });
        };
        img.src = imageSrc;
    }, [imageSrc, isOpen]);

    // Draw Interactive Canvas & Generate Live Preview
    const drawCanvas = useCallback(() => {
        if (!imageObj || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = VIEWPORT_SIZE;
        const height = VIEWPORT_SIZE / aspectRatio;

        canvas.width = width;
        canvas.height = height;

        ctx.clearRect(0, 0, width, height);

        // Calculate base fitting scale
        const baseScale = Math.max(width / imageObj.width, height / imageObj.height);
        const currentScale = baseScale * zoom;

        const drawWidth = imageObj.width * currentScale;
        const drawHeight = imageObj.height * currentScale;

        // Center position + user offset
        const drawX = (width - drawWidth) / 2 + offset.x;
        const drawY = (height - drawHeight) / 2 + offset.y;

        // 1. Draw full image
        ctx.drawImage(imageObj, drawX, drawY, drawWidth, drawHeight);

        // 2. Generate cropped preview for the preview bubble
        if (previewCanvasRef.current) {
            const pCanvas = previewCanvasRef.current;
            const pCtx = pCanvas.getContext('2d');
            const pWidth = 140;
            const pHeight = Math.round(140 / (aspectRatio || 1));
            pCanvas.width = pWidth;
            pCanvas.height = pHeight;

            pCtx.clearRect(0, 0, pWidth, pHeight);

            if (currentCropShape === 'circle') {
                pCtx.beginPath();
                pCtx.arc(pWidth / 2, pHeight / 2, Math.min(pWidth, pHeight) / 2, 0, Math.PI * 2);
                pCtx.clip();
            }

            pCtx.drawImage(canvas, 0, 0, pWidth, pHeight);
            setPreviewDataUrl(pCanvas.toDataURL('image/png'));
        }
    }, [imageObj, zoom, offset, aspectRatio, currentCropShape]);

    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);

    // Mouse / Touch Drag Handlers for Panning
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({
            x: e.clientX - offset.x,
            y: e.clientY - offset.y
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setOffset({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            setIsDragging(true);
            setDragStart({
                x: e.touches[0].clientX - offset.x,
                y: e.touches[0].clientY - offset.y
            });
        }
    };

    const handleTouchMove = (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        setOffset({
            x: e.touches[0].clientX - dragStart.x,
            y: e.touches[0].clientY - dragStart.y
        });
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    const handleReset = () => {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    };

    // Final High-Resolution Export
    const handleConfirmCrop = () => {
        if (!imageObj || !canvasRef.current) return;

        // Render to high-resolution export canvas
        const exportCanvas = document.createElement('canvas');
        const exportWidth = aspectRatio > 1.2 ? 800 : 512;
        const exportHeight = Math.round(exportWidth / aspectRatio);
        exportCanvas.width = exportWidth;
        exportCanvas.height = exportHeight;

        const ctx = exportCanvas.getContext('2d');

        if (currentCropShape === 'circle') {
            ctx.beginPath();
            ctx.arc(exportWidth / 2, exportHeight / 2, Math.min(exportWidth, exportHeight) / 2, 0, Math.PI * 2);
            ctx.clip();
        }

        const width = VIEWPORT_SIZE;
        const height = VIEWPORT_SIZE / aspectRatio;
        const baseScale = Math.max(width / imageObj.width, height / imageObj.height);
        const currentScale = baseScale * zoom;

        const scaleMultiplier = exportWidth / width;

        const drawWidth = imageObj.width * currentScale * scaleMultiplier;
        const drawHeight = imageObj.height * currentScale * scaleMultiplier;

        const drawX = ((width - (imageObj.width * currentScale)) / 2 + offset.x) * scaleMultiplier;
        const drawY = ((height - (imageObj.height * currentScale)) / 2 + offset.y) * scaleMultiplier;

        ctx.drawImage(imageObj, drawX, drawY, drawWidth, drawHeight);

        exportCanvas.toBlob((blob) => {
            if (blob) {
                const dataUrl = exportCanvas.toDataURL('image/png');
                onCropComplete(blob, dataUrl);
            }
        }, 'image/png');
    };

    if (!isOpen) return null;

    return (
        <div className="icm-modal-overlay" onClick={onCancel}>
            <div className="icm-modal-card" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="icm-modal-header">
                    <div className="icm-header-left">
                        <div className="icm-header-icon">
                            <MdCrop />
                        </div>
                        <div>
                            <span className="icm-modal-badge">IMAGE VISIBLE AREA</span>
                            <h3 className="icm-modal-title">{title}</h3>
                            <p className="icm-modal-sub">
                                Drag to pan and use the zoom slider to adjust exactly what is visible inside the frame.
                            </p>
                        </div>
                    </div>
                    <button className="icm-modal-close" onClick={onCancel} aria-label="Close">
                        <MdClose />
                    </button>
                </div>

                {/* Cropper Work Area */}
                <div className="icm-crop-workspace">
                    <div
                        className="icm-viewport-container"
                        ref={containerRef}
                        style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE / aspectRatio}px` }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* The Canvas drawing the image with user pan and zoom */}
                        <canvas ref={canvasRef} className="icm-crop-canvas" />

                        {/* Visible Area Guide & Mask */}
                        <div className={`icm-crop-mask ${currentCropShape === 'circle' ? 'is-circle' : 'is-rect'}`}>
                            <div className="icm-mask-grid">
                                <span className="grid-line horizontal" />
                                <span className="grid-line vertical" />
                            </div>
                        </div>
                    </div>

                    {/* Live Preview Bubble */}
                    <div className="icm-preview-column">
                        <span className="icm-preview-label">Live Visible Preview</span>
                        <div
                            className={`icm-preview-bubble ${currentCropShape === 'circle' ? 'circle' : 'rounded'}`}
                            style={currentCropShape !== 'circle' ? { width: '130px', height: `${Math.round(130 / (aspectRatio || 1))}px` } : {}}
                        >
                            {previewDataUrl ? (
                                <img src={previewDataUrl} alt="Crop preview" />
                            ) : (
                                <div className="icm-preview-skeleton" />
                            )}
                        </div>
                        <span className="icm-preview-hint">What users will see</span>
                    </div>
                </div>

                {/* Hidden canvas for generating the small preview */}
                <canvas ref={previewCanvasRef} style={{ display: 'none' }} />

                {/* Controls Bar */}
                <div className="icm-controls-bar">
                    <div className="icm-shape-switch">
                        <button
                            type="button"
                            className={`icm-shape-btn ${currentCropShape === 'rect' ? 'active' : ''}`}
                            onClick={() => setCurrentCropShape('rect')}
                            title="Crop as Square / Rectangle (Full Logo)"
                        >
                            Square / Logo
                        </button>
                        <button
                            type="button"
                            className={`icm-shape-btn ${currentCropShape === 'circle' ? 'active' : ''}`}
                            onClick={() => setCurrentCropShape('circle')}
                            title="Crop as Circle (Player Avatar)"
                        >
                            Circle
                        </button>
                    </div>

                    <div className="icm-zoom-control">
                        <button
                            type="button"
                            className="icm-zoom-btn"
                            onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
                            title="Zoom Out"
                        >
                            <MdZoomOut />
                        </button>
                        <input
                            type="range"
                            min="0.6"
                            max="3"
                            step="0.05"
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="icm-zoom-slider"
                        />
                        <button
                            type="button"
                            className="icm-zoom-btn"
                            onClick={() => setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(1))))}
                            title="Zoom In"
                        >
                            <MdZoomIn />
                        </button>
                        <span className="icm-zoom-val">{Math.round(zoom * 100)}%</span>
                    </div>

                    <button type="button" className="icm-btn-reset" onClick={handleReset} title="Reset pan & zoom">
                        <MdRefresh /> Reset
                    </button>
                </div>

                {/* Modal Footer Actions */}
                <div className="icm-modal-actions">
                    <button type="button" className="cx-btn-secondary" onClick={onCancel}>
                        Cancel
                    </button>
                    <button type="button" className="cx-btn-confirm primary" onClick={handleConfirmCrop}>
                        <MdCheck /> Crop & Use Image
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageCropModal;
