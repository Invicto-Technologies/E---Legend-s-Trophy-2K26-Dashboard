import React from 'react';
import {
    MdVolumeUp,
    MdVolumeOff,
    MdVolumeMute,
    MdReplay,
    MdTune
} from 'react-icons/md';
import { FaHeadphones } from 'react-icons/fa';
import './VoiceCommentaryBar.css';

const VoiceCommentaryBar = ({
    voiceState,
    variant = 'default', // 'compact' | 'feed' | 'default'
    showDeskButton = true,
    onOpenDesk,
    hideWhenDisabled = false
}) => {
    if (!voiceState || !voiceState.isSupported) {
        return null;
    }

    const {
        isEnabled,
        toggleVoice,
        isSpeaking,
        activeSpeaker,
        volume,
        setVolume,
        isMuted,
        setIsMuted,
        replayLastBall
    } = voiceState;

    // 1. If configured to hide when disabled (e.g. top of right column), return null
    if (hideWhenDisabled && !isEnabled) {
        return null;
    }

    const isCompact = variant === 'compact';
    const isFeed = variant === 'feed';

    // 2. When voice is OFF in the ball-by-ball feed, render a sleek space-saving bar
    if (!isEnabled) {
        return (
            <div className="vcb-feed-standby-bar">
                <button
                    type="button"
                    className="vcb-feed-start-btn"
                    onClick={() => toggleVoice()}
                    title="Click to start live 2-person AI commentary"
                >
                    <FaHeadphones className="vcb-headphone-anim" />
                    <span className="vcb-label-desktop">Start Voice Commentary</span>
                    <span className="vcb-label-mobile">Commentary</span>
                </button>
                {showDeskButton && onOpenDesk && (
                    <button
                        type="button"
                        className="vcb-feed-desk-btn"
                        onClick={onOpenDesk}
                        title="Open Audio Mixing Desk Settings"
                    >
                        <MdTune />
                        <span className="vcb-label-desktop">Desk</span>
                    </button>
                )}
            </div>
        );
    }

    // 3. When voice is ON: Render in ONE SINGLE ROW without wrapping
    return (
        <div className={`voice-broadcast-console variant-${variant} is-active ${isSpeaking ? 'is-speaking' : ''}`}>
            <div className={`vcb-strip one-row ${isFeed ? 'feed-strip' : ''} ${isCompact ? 'compact-strip' : ''}`}>
                {/* 1. On-Air Power Button */}
                <div className="vcb-col-power">
                    <button
                        type="button"
                        className={`vcb-on-air-btn on-air ${isFeed ? 'btn-feed' : ''} ${isCompact ? 'btn-compact' : ''}`}
                        onClick={() => toggleVoice()}
                        title="Click to turn Voice Commentary OFF"
                        aria-label="Toggle Voice Commentary"
                    >
                        <FaHeadphones className="vcb-headphone-anim" />
                        <div className="vcb-btn-text-group">
                            <span className="vcb-btn-title">ON AIR</span>
                            <span className="vcb-btn-subtitle vcb-hide-mobile">Arthur &amp; David</span>
                        </div>
                        <span className="vcb-live-indicator live" />
                    </button>
                </div>

                {/* 2. Duo Commentator Avatars with Speaking Wave */}
                <div className={`vcb-duo-avatars ${isFeed ? 'feed-duo' : ''} ${isCompact ? 'compact-duo' : ''}`}>
                    {/* Arthur */}
                    <div
                        className={`vcb-avatar-badge ${activeSpeaker === 'Arthur' && isSpeaking ? 'speaking-halo' : ''}`}
                        title="Arthur: Lead Play-by-Play Broadcaster"
                    >
                        <span className="vcb-avatar-icon lead">🎙️</span>
                        <div className="vcb-avatar-meta vcb-hide-mobile">
                            <span className="vcb-avatar-name">Arthur</span>
                        </div>
                        {activeSpeaker === 'Arthur' && isSpeaking && (
                            <span className="vcb-speech-wave">
                                <span />
                                <span />
                                <span />
                            </span>
                        )}
                    </div>

                    <span className="vcb-duo-sep vcb-hide-mobile">&amp;</span>

                    {/* David */}
                    <div
                        className={`vcb-avatar-badge ${activeSpeaker === 'David' && isSpeaking ? 'speaking-halo' : ''}`}
                        title="David: Color Expert &amp; Analyst"
                    >
                        <span className="vcb-avatar-icon analyst">🧠</span>
                        <div className="vcb-avatar-meta vcb-hide-mobile">
                            <span className="vcb-avatar-name">David</span>
                        </div>
                        {activeSpeaker === 'David' && isSpeaking && (
                            <span className="vcb-speech-wave analyst-wave">
                                <span />
                                <span />
                                <span />
                            </span>
                        )}
                    </div>
                </div>

                {/* 3. Audio & Volume Controls (Strict single row) */}
                <div className="vcb-col-actions one-row-actions">
                    {/* Replay last ball delivery call */}
                    {!isCompact && replayLastBall && (
                        <button
                            type="button"
                            className="vcb-quick-btn"
                            onClick={replayLastBall}
                            title="Replay commentary for the last delivery"
                            aria-label="Replay last delivery"
                        >
                            <MdReplay />
                            <span className="vcb-btn-label-hide-xs">Replay</span>
                        </button>
                    )}

                    {/* Mute Button */}
                    <button
                        type="button"
                        className={`vcb-quick-btn ${isMuted ? 'is-muted' : ''}`}
                        onClick={() => setIsMuted(!isMuted)}
                        title={isMuted ? 'Unmute Commentary' : 'Mute Commentary'}
                        aria-label="Toggle mute"
                    >
                        {isMuted ? <MdVolumeOff /> : volume < 0.3 ? <MdVolumeMute /> : <MdVolumeUp />}
                    </button>

                    {/* Master Volume Slider */}
                    <div className="vcb-slider-wrap" title={`Master Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="vcb-slider master-slider"
                            aria-label="Master volume slider"
                        />
                        <span className="vcb-slider-pct vcb-hide-mobile">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
                    </div>

                    {/* Desk Button (Only shown if requested, e.g. in ball by ball section) */}
                    {showDeskButton && onOpenDesk && (
                        <button
                            type="button"
                            className="vcb-desk-toggle-btn"
                            onClick={onOpenDesk}
                            title="Open Real-World Audio Volume Desk &amp; Commentator Settings"
                            aria-label="Open audio mixing desk"
                        >
                            <MdTune />
                            <span className="vcb-btn-label-hide-xs">Desk</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VoiceCommentaryBar;
