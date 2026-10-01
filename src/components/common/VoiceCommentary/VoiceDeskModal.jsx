import React, { useState, useEffect } from 'react';
import {
    MdTune,
    MdMic,
    MdSportsCricket,
    MdClose,
    MdVolumeUp,
    MdVolumeOff,
    MdVolumeMute
} from 'react-icons/md';
import { FaBolt, FaSmile, FaFrown, FaRegMeh } from 'react-icons/fa';
import './VoiceDeskModal.css';

const VoiceDeskModal = ({ isOpen, onClose, voiceState }) => {
    const [activeTab, setActiveTab] = useState('audio'); // 'audio' | 'voices' | 'feed'

    // Close on Escape key press
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !voiceState) return null;

    const {
        isEnabled,
        toggleVoice,
        volume,
        setVolume,
        volumeArthur,
        setVolumeArthur,
        volumeDavid,
        setVolumeDavid,
        volumeFx,
        setVolumeFx,
        dynamicVolume,
        setDynamicVolume,
        isMuted,
        setIsMuted,
        isDuoEnabled,
        setIsDuoEnabled,
        soundFxEnabled,
        setSoundFxEnabled,
        pacingMode,
        setPacingMode,
        dialogueFeed = [],
        availableVoices = [],
        voice1,
        setVoice1,
        voice2,
        setVoice2,
        replayLastBall
    } = voiceState;

    const renderEmotionIcon = (emotion) => {
        switch (emotion) {
            case 'bat_crack':
            case 'roar':
                return <FaBolt className="vdm-emotion-icon roar" title="Excitement / Roar" />;
            case 'surprise':
                return <span className="vdm-emotion-emoji" title="Surprise / Gasp">😲</span>;
            case 'laughter':
                return <FaSmile className="vdm-emotion-icon laugh" title="Laughter / Banter" />;
            case 'sad':
                return <FaFrown className="vdm-emotion-icon sad" title="Disappointment / Sigh" />;
            default:
                return <FaRegMeh className="vdm-emotion-icon neutral" />;
        }
    };

    return (
        <div className="vdm-backdrop" onClick={onClose} role="dialog" aria-modal="true">
            <div className="vdm-modal-window" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="vdm-header">
                    <div className="vdm-title-group">
                        <div className="vdm-icon-badge">
                            <MdTune />
                        </div>
                        <div>
                            <h3 className="vdm-title">Broadcast Audio Mixing Desk</h3>
                            <p className="vdm-subtitle">Real-world commentator volumes, stadium FX &amp; vocal personas</p>
                        </div>
                    </div>
                    <div className="vdm-header-actions">
                        <button
                            type="button"
                            className={`vdm-power-chip ${isEnabled ? 'active' : ''}`}
                            onClick={() => toggleVoice()}
                            title="Toggle commentary power"
                        >
                            {isEnabled ? 'ON AIR' : 'OFF AIR'}
                        </button>
                        <button
                            type="button"
                            className="vdm-close-btn"
                            onClick={onClose}
                            title="Close Desk (Esc)"
                            aria-label="Close modal"
                        >
                            <MdClose />
                        </button>
                    </div>
                </div>

                {/* Desk Navigation Tabs */}
                <div className="vdm-tabs">
                    <button
                        type="button"
                        className={`vdm-tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
                        onClick={() => setActiveTab('audio')}
                    >
                        <MdTune /> Real-World Volumes &amp; Mics
                    </button>
                    <button
                        type="button"
                        className={`vdm-tab-btn ${activeTab === 'voices' ? 'active' : ''}`}
                        onClick={() => setActiveTab('voices')}
                    >
                        <MdMic /> Commentator Personas
                    </button>
                    <button
                        type="button"
                        className={`vdm-tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
                        onClick={() => setActiveTab('feed')}
                    >
                        <MdSportsCricket /> Duo Dialogue Feed
                    </button>
                </div>

                {/* Modal Body Content */}
                <div className="vdm-body">
                    {/* TAB 1: Audio & Volumes */}
                    {activeTab === 'audio' && (
                        <div className="vdm-tab-content">
                            {/* Master Volume Bar */}
                            <div className="vdm-master-bar">
                                <div className="vdm-master-left">
                                    <button
                                        type="button"
                                        className={`vdm-mute-btn ${isMuted ? 'muted' : ''}`}
                                        onClick={() => setIsMuted(!isMuted)}
                                        title={isMuted ? 'Unmute All Audio' : 'Mute All Audio'}
                                    >
                                        {isMuted ? <MdVolumeOff /> : volume < 0.3 ? <MdVolumeMute /> : <MdVolumeUp />}
                                    </button>
                                    <div>
                                        <h4 className="vdm-master-title">Master Broadcast Volume</h4>
                                        <p className="vdm-master-sub">Overall sound level across both commentators and effects</p>
                                    </div>
                                </div>
                                <div className="vdm-master-right">
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={isMuted ? 0 : volume}
                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        className="vdm-slider master-slider"
                                        aria-label="Master Volume Slider"
                                    />
                                    <span className="vdm-pct-badge">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
                                </div>
                            </div>

                            {/* 3 Mic Cards Grid */}
                            <div className="vdm-mics-grid">
                                {/* Arthur Mic */}
                                <div className="vdm-card">
                                    <div className="vdm-card-head">
                                        <span className="vdm-card-icon">🎙️</span>
                                        <div className="vdm-card-titles">
                                            <h4>Arthur — Lead Mic</h4>
                                            <p>Play-by-play delivery &amp; milestone caller</p>
                                        </div>
                                        <span className="vdm-level-pill arthur">{Math.round(volumeArthur * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={volumeArthur}
                                        onChange={(e) => setVolumeArthur(parseFloat(e.target.value))}
                                        className="vdm-slider arthur-slider"
                                        aria-label="Arthur Mic Volume"
                                    />
                                </div>

                                {/* David Mic */}
                                <div className="vdm-card">
                                    <div className="vdm-card-head">
                                        <span className="vdm-card-icon">🧠</span>
                                        <div className="vdm-card-titles">
                                            <h4>David — Analyst Mic</h4>
                                            <p>Field tactics, banter &amp; color commentary</p>
                                        </div>
                                        <span className="vdm-level-pill david">{Math.round(volumeDavid * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={volumeDavid}
                                        onChange={(e) => setVolumeDavid(parseFloat(e.target.value))}
                                        className="vdm-slider david-slider"
                                        aria-label="David Mic Volume"
                                    />
                                </div>

                                {/* Stadium Sound FX */}
                                <div className="vdm-card">
                                    <div className="vdm-card-head">
                                        <span className="vdm-card-icon">🔊</span>
                                        <div className="vdm-card-titles">
                                            <h4>Stadium Sound FX</h4>
                                            <p>Bat cracks, crowd roars, gasps &amp; sighs</p>
                                        </div>
                                        <span className="vdm-level-pill fx">{Math.round(volumeFx * 100)}%</span>
                                    </div>
                                    <div className="vdm-slider-row">
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={volumeFx}
                                            disabled={!soundFxEnabled}
                                            onChange={(e) => setVolumeFx(parseFloat(e.target.value))}
                                            className="vdm-slider fx-slider"
                                            aria-label="Sound FX Volume"
                                        />
                                        <button
                                            type="button"
                                            className={`vdm-chip-toggle ${soundFxEnabled ? 'active' : ''}`}
                                            onClick={() => setSoundFxEnabled(!soundFxEnabled)}
                                        >
                                            {soundFxEnabled ? 'FX ON' : 'FX OFF'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Broadcast Modulations */}
                            <div className="vdm-grid-two">
                                {/* Dynamic Auto-Modulation */}
                                <div className="vdm-card-feature">
                                    <div className="vdm-feat-head">
                                        <div>
                                            <h4>Dynamic Auto-Volume Modulation</h4>
                                            <p>Boosts voice intensity on 4s, 6s, and wickets; softens naturally on dot balls</p>
                                        </div>
                                        <button
                                            type="button"
                                            className={`vdm-chip-toggle ${dynamicVolume ? 'active' : ''}`}
                                            onClick={() => setDynamicVolume(!dynamicVolume)}
                                        >
                                            {dynamicVolume ? 'ENABLED' : 'DISABLED'}
                                        </button>
                                    </div>
                                </div>

                                {/* Broadcast Pacing Mode */}
                                <div className="vdm-card-feature">
                                    <h4>Stadium Pacing &amp; Breathing Silence</h4>
                                    <p className="vdm-card-desc">Natural breathing pauses between ball deliveries</p>
                                    <div className="vdm-pacing-grid">
                                        <button
                                            type="button"
                                            className={`vdm-pacing-chip ${pacingMode === 'relaxed' ? 'selected' : ''}`}
                                            onClick={() => setPacingMode('relaxed')}
                                        >
                                            <strong>Relaxed (Recommended)</strong>
                                            <span>70% stadium silence between balls</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`vdm-pacing-chip ${pacingMode === 'moderate' ? 'selected' : ''}`}
                                            onClick={() => setPacingMode('moderate')}
                                        >
                                            <strong>Moderate</strong>
                                            <span>Balanced commentary updates</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`vdm-pacing-chip ${pacingMode === 'balls_only' ? 'selected' : ''}`}
                                            onClick={() => setPacingMode('balls_only')}
                                        >
                                            <strong>Deliveries Only</strong>
                                            <span>100% silence between deliveries</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: Personas & Voices */}
                    {activeTab === 'voices' && (
                        <div className="vdm-tab-content">
                            <div className="vdm-voices-grid">
                                {/* Arthur Voice */}
                                <div className="vdm-card">
                                    <div className="vdm-card-head">
                                        <span className="vdm-card-icon">🎙️</span>
                                        <div>
                                            <h4>Arthur's Voice Persona</h4>
                                            <p>Lead play-by-play caller</p>
                                        </div>
                                    </div>
                                    <select
                                        className="vdm-select"
                                        value={voice1?.name || ''}
                                        onChange={(e) => {
                                            const v = availableVoices.find(x => x.name === e.target.value);
                                            if (v) setVoice1(v);
                                        }}
                                        aria-label="Arthur Voice Select"
                                    >
                                        {availableVoices.map(v => (
                                            <option key={v.name} value={v.name}>
                                                {v.name} ({v.lang})
                                            </option>
                                        ))}
                                    </select>
                                    <span className="vdm-hint">Pitched at 0.94 • Rate: 1.05 (Masculine Lead Cricket Caller)</span>
                                </div>

                                {/* David Voice */}
                                <div className="vdm-card">
                                    <div className="vdm-card-head">
                                        <span className="vdm-card-icon">🧠</span>
                                        <div>
                                            <h4>David's Voice Persona</h4>
                                            <p>Expert color analyst</p>
                                        </div>
                                    </div>
                                    <select
                                        className="vdm-select"
                                        value={voice2?.name || ''}
                                        onChange={(e) => {
                                            const v = availableVoices.find(x => x.name === e.target.value);
                                            if (v) setVoice2(v);
                                        }}
                                        aria-label="David Voice Select"
                                    >
                                        {availableVoices.map(v => (
                                            <option key={v.name} value={v.name}>
                                                {v.name} ({v.lang})
                                            </option>
                                        ))}
                                    </select>
                                    <span className="vdm-hint">Pitched at 0.88 • Rate: 0.96 (Deep Baritone Expert Analyst)</span>
                                </div>

                                {/* Duo Mode Toggle */}
                                <div className="vdm-card duo-toggle-card">
                                    <h4>Two-Person Commentary Duo</h4>
                                    <p>Alternates commentary calls between Arthur and David with live broadcast banter</p>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                                        <button
                                            type="button"
                                            className={`vdm-duo-btn ${isDuoEnabled ? 'active' : ''}`}
                                            onClick={() => setIsDuoEnabled(!isDuoEnabled)}
                                        >
                                            {isDuoEnabled ? '2-PERSON DUO ACTIVE' : 'SOLO COMMENTARY'}
                                        </button>
                                        {replayLastBall && (
                                            <button
                                                type="button"
                                                className="vdm-duo-btn"
                                                style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(16, 185, 129, 0.35))', borderColor: 'rgba(34, 197, 94, 0.5)', color: '#4ade80' }}
                                                onClick={() => {
                                                    if (!isEnabled) toggleVoice(true);
                                                    else replayLastBall();
                                                }}
                                                title="Hear Arthur & David speak the latest ball delivery"
                                            >
                                                🎙️ Test Commentary Duo
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: Duo Dialogue Feed */}
                    {activeTab === 'feed' && (
                        <div className="vdm-tab-content">
                            <div className="vdm-feed-head">
                                <h4>Recent Duo Dialogue Log</h4>
                                <span className="vdm-feed-count">{dialogueFeed.length} spoken lines</span>
                            </div>
                            <div className="vdm-feed-list">
                                {dialogueFeed.length > 0 ? (
                                    dialogueFeed.map(item => (
                                        <div key={item.id} className={`vdm-feed-item ${item.speaker.toLowerCase()}`}>
                                            <div className="vdm-feed-item-meta">
                                                <span className={`vdm-feed-speaker ${item.speaker.toLowerCase()}`}>
                                                    {item.speaker === 'David' ? '🧠 David' : '🎙️ Arthur'}
                                                </span>
                                                <span className="vdm-feed-role">{item.role}</span>
                                                {item.emotion && (
                                                    <span className="vdm-feed-emotion">
                                                        {renderEmotionIcon(item.emotion)}
                                                    </span>
                                                )}
                                                <span className="vdm-feed-time">{item.timestamp}</span>
                                            </div>
                                            <p className="vdm-feed-text">"{item.text}"</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="vdm-feed-empty">
                                        <span>No dialogue spoken yet. Ball calls and atmospheric updates will log here in real time.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VoiceDeskModal;
