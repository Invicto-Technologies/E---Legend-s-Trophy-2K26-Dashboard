import React, { useState, useEffect, useRef } from 'react';
import AdminSubNav from '../../../components/Navigation/AdminSubNav';
import Footer from '../../../components/common/Footer/Footer';
import ToastNotification from '../../../components/common/ToastNotification';
import { useAdminTournament } from '../../../contexts/AdminTournamentContext';
import { useAdminProcessing } from '../../../contexts/AdminProcessingContext';
import {
    subscribeTournamentSettings,
    updateTournamentSettings
} from '../../../services/rtdbService';
import {
    MdTune,
    MdTrackChanges,
    MdSportsCricket,
    MdRestartAlt,
    MdInfoOutline,
    MdCampaign,
    MdSpeed,
    MdSave,
    MdEmojiEvents
} from 'react-icons/md';
import './TournamentAdjustments.css';

const TournamentAdjustments = () => {
    const {
        tournaments,
        selectedTournamentId,
        selectTournament,
        activeTournamentId
    } = useAdminTournament();

    const { withProcessing } = useAdminProcessing();
    const toastRef = useRef(null);

    // Current working tournament edition
    const effectiveTournamentId = selectedTournamentId || activeTournamentId || "E-Legend's Trophy 2K26";

    // Tournament Settings State
    const [pitchBenchmark, setPitchBenchmark] = useState(140);
    const [projRateA, setProjRateA] = useState(8.0);
    const [projRateB, setProjRateB] = useState(10.0);
    const [showProjectedScore, setShowProjectedScore] = useState(true);
    const [showDlsPar, setShowDlsPar] = useState(true);
    const [overLimit, setOverLimit] = useState(20);
    const [maxOversPerBowler, setMaxOversPerBowler] = useState(4);
    const [isSpecialMatch, setIsSpecialMatch] = useState(false);
    const [specialMatchBadge, setSpecialMatchBadge] = useState('Special Match');
    const [globalAnnouncement, setGlobalAnnouncement] = useState('');
    const [syncToLiveMatch, setSyncToLiveMatch] = useState(true);
    // Interactive simulation preview state
    const [simRuns, setSimRuns] = useState(95);
    const [simOvers, setSimOvers] = useState(11.4);

    // Subscribe to tournament settings in RTDB
    useEffect(() => {
        const unsub = subscribeTournamentSettings(effectiveTournamentId, (data) => {
            if (data) {
                setPitchBenchmark(Number(data.pitchBenchmark) || 140);
                if (Array.isArray(data.projectedRates)) {
                    setProjRateA(Number(data.projectedRates[0]) || 8.0);
                    setProjRateB(Number(data.projectedRates[1]) || 10.0);
                }
                setShowProjectedScore(data.showProjectedScore !== false);
                setShowDlsPar(data.showDlsPar !== false);
                setOverLimit(Number(data.overLimit) || 20);
                setMaxOversPerBowler(Number(data.maxOversPerBowler) || 4);
                setIsSpecialMatch(Boolean(data.isSpecialMatch));
                setSpecialMatchBadge(data.specialMatchBadge || 'Special Match');
                setGlobalAnnouncement(data.globalAnnouncement || '');
            }
        });

        return () => unsub && unsub();
    }, [effectiveTournamentId]);

    // Live preview calculations based on simulation inputs
    const simLegalBalls = Math.floor(simOvers) * 6 + Math.round((simOvers % 1) * 10);
    const simCrr = simLegalBalls > 0 ? (simRuns / simLegalBalls) * 6 : 0;
    const simRemBalls = Math.max(0, (overLimit * 6) - simLegalBalls);
    const simProjAtCrr = Math.round(simRuns + (simCrr * (simRemBalls / 6)));
    const simProjAtRateA = Math.round(simRuns + (projRateA * (simRemBalls / 6)));
    const simProjAtRateB = Math.round(simRuns + (projRateB * (simRemBalls / 6)));

    // Save tournament settings
    const handleSave = async (e) => {
        if (e) e.preventDefault();

        await withProcessing(async () => {
            const payload = {
                pitchBenchmark: Number(pitchBenchmark) || 140,
                projectedRates: [Number(projRateA) || 8.0, Number(projRateB) || 10.0],
                showProjectedScore: Boolean(showProjectedScore),
                showDlsPar: Boolean(showDlsPar),
                overLimit: Number(overLimit) || 20,
                maxOversPerBowler: Number(maxOversPerBowler) || Math.ceil((Number(overLimit) || 20) / 5),
                isSpecialMatch: Boolean(isSpecialMatch),
                specialMatchBadge: specialMatchBadge.trim(),
                globalAnnouncement: globalAnnouncement.trim()
            };

            await updateTournamentSettings(effectiveTournamentId, payload, syncToLiveMatch);
            toastRef.current?.showToast('success', `Tournament settings updated for ${effectiveTournamentId}!`);
        }, 'Saving Tournament Rules...', 'Broadcasting pitch benchmarks and tournament playing conditions...');
    };

    // Reset to defaults
    const handleReset = () => {
        setPitchBenchmark(140);
        setProjRateA(8.0);
        setProjRateB(10.0);
        setShowProjectedScore(true);
        setShowDlsPar(true);
        setOverLimit(20);
        setMaxOversPerBowler(4);
        setIsSpecialMatch(false);
        setSpecialMatchBadge('Special Match');
        setGlobalAnnouncement('');
        toastRef.current?.showToast('info', 'Reset all fields to balanced tournament defaults.');
    };

    return (
        <div className="admin-adjustments-page">
            <ToastNotification ref={toastRef} />
            <AdminSubNav />

            <div className="ta-content-wrapper">
                {/* Tournament Context Header */}
                <div className="ta-hero-header">
                    <div className="ta-hero-info">
                        <div className="ta-badge-row">
                            <span className="ta-badge-primary">TOURNAMENT ENGINE</span>
                            {effectiveTournamentId === activeTournamentId && (
                                <span className="ta-badge-active">ACTIVE LIVE EDITION</span>
                            )}
                        </div>
                        <h1>
                            <MdTune className="ta-header-icon" /> Tournament Rules, Benchmarks &amp; Adjustments
                        </h1>
                        <p>
                            Configure tournament-wide pitch par benchmarks (G), projected score rates, match over formats, and spectator live scoreboard visibility. Matches inherit these defaults automatically.
                        </p>
                    </div>

                    {/* Tournament Edition Selector */}
                    <div className="ta-selector-box">
                        <label htmlFor="ta-tourney-select">Managing Edition:</label>
                        <div className="ta-select-wrap">
                            <MdEmojiEvents className="ta-select-icon" />
                            <select
                                id="ta-tourney-select"
                                value={selectedTournamentId || activeTournamentId || ''}
                                onChange={(e) => selectTournament(e.target.value)}
                                className="ta-tourney-dropdown"
                            >
                                {tournaments.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name || t.id} {t.id === activeTournamentId ? '★ (Active)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Main Settings Form */}
                <form onSubmit={handleSave} className="ta-form">
                    <div className="ta-grid">
                        {/* 1. Ground & Pitch Par Benchmark */}
                        <div className="ta-card">
                            <div className="ta-card-header">
                                <div className="ta-card-title">
                                    <MdTune className="card-icon" />
                                    <h3>Ground &amp; Pitch Par Benchmark (G Score)</h3>
                                </div>
                                <span className="ta-val-pill highlight">{pitchBenchmark} Runs</span>
                            </div>
                            <p className="ta-card-desc">
                                The standard 20-over total score expected on this pitch. Serves as the mathematical foundation for Duckworth-Lewis-Stern (DLS) target scaling during rain interruptions.
                            </p>

                            <div className="ta-field-body">
                                <div className="ta-slider-row">
                                    <input
                                        type="range"
                                        min="90"
                                        max="240"
                                        step="1"
                                        value={pitchBenchmark}
                                        onChange={(e) => setPitchBenchmark(Number(e.target.value))}
                                        className="ta-slider"
                                    />
                                    <input
                                        type="number"
                                        min="80"
                                        max="250"
                                        value={pitchBenchmark}
                                        onChange={(e) => setPitchBenchmark(Number(e.target.value))}
                                        className="ta-number-input"
                                    />
                                    <span className="ta-unit">Runs</span>
                                </div>

                                <div className="ta-quick-chips">
                                    <span className="chips-label">Quick Presets:</span>
                                    {[
                                        { label: '120 (Bowlers Pitch)', val: 120 },
                                        { label: '140 (Pitch Par / Ground)', val: 140 },
                                        { label: '160 (Batting Surface)', val: 160 },
                                        { label: '180 (High Scoring)', val: 180 }
                                    ].map(chip => (
                                        <button
                                            key={chip.val}
                                            type="button"
                                            className={`ta-chip ${pitchBenchmark === chip.val ? 'active' : ''}`}
                                            onClick={() => setPitchBenchmark(chip.val)}
                                        >
                                            {chip.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Plain-English Value Explanation */}
                                <div className="ta-value-insight">
                                    <MdInfoOutline className="insight-icon" />
                                    <div>
                                        <strong>How this value works in play:</strong>
                                        <p>
                                            At <strong>{pitchBenchmark} runs</strong>, an innings reduced to 10 overs will have a DLS par base of ~<strong>{Math.round(pitchBenchmark * 0.589)} runs</strong>. Raising this value increases the target score required by the chasing team after rain delays; lowering it protects the chasing team on tough bowling tracks.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Projected Score Reference Rates */}
                        <div className="ta-card">
                            <div className="ta-card-header">
                                <div className="ta-card-title">
                                    <MdTrackChanges className="card-icon" />
                                    <h3>Projected Score Spectator Reference Rates</h3>
                                </div>
                            </div>
                            <p className="ta-card-desc">
                                Spectators see real-time projected final innings totals on the live 3D scoreboard at current CRR as well as at these two reference run rates (RPO).
                            </p>

                            <div className="ta-field-body">
                                <div className="ta-rates-row">
                                    <div className="ta-rate-box">
                                        <span className="rate-lbl">Rate A (Conservative RPO)</span>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="4"
                                            max="20"
                                            value={projRateA}
                                            onChange={(e) => setProjRateA(Number(e.target.value))}
                                            className="ta-number-input"
                                        />
                                        <span className="rate-hint">Pacing rate for rebuilding &amp; middle overs</span>
                                    </div>
                                    <div className="ta-rate-box">
                                        <span className="rate-lbl">Rate B (Accelerated RPO)</span>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="4"
                                            max="20"
                                            value={projRateB}
                                            onChange={(e) => setProjRateB(Number(e.target.value))}
                                            className="ta-number-input"
                                        />
                                        <span className="rate-hint">Pacing rate for death overs &amp; power-hitting</span>
                                    </div>
                                </div>

                                <div className="ta-quick-chips">
                                    <span className="chips-label">Presets:</span>
                                    {[
                                        { label: '7.0 & 9.0 (Cautious)', a: 7.0, b: 9.0 },
                                        { label: '8.0 & 10.0 (Standard)', a: 8.0, b: 10.0 },
                                        { label: '9.0 & 11.0 (Death Overs)', a: 9.0, b: 11.0 },
                                        { label: '10.0 & 12.0 (Explosive)', a: 10.0, b: 12.0 }
                                    ].map(combo => (
                                        <button
                                            key={combo.label}
                                            type="button"
                                            className={`ta-chip ${projRateA === combo.a && projRateB === combo.b ? 'active' : ''}`}
                                            onClick={() => { setProjRateA(combo.a); setProjRateB(combo.b); }}
                                        >
                                            {combo.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="ta-value-insight">
                                    <MdInfoOutline className="insight-icon" />
                                    <div>
                                        <strong>How spectator projections work:</strong>
                                        <p>
                                            Viewers on the live 3D match center see real-time score predictions: <strong>@ CRR</strong> displays what the team reaches at their exact current pace, <strong>@ {projRateA} RPO</strong> projects a cautious innings trajectory, and <strong>@ {projRateB} RPO</strong> models aggressive boundary-hitting in the death overs.
                                        </p>
                                    </div>
                                </div>

                                {/* Interactive Simulator / Preview */}
                                <div className="ta-sim-card">
                                    <div className="ta-sim-header">
                                        <MdSpeed /> Live Scoreboard Spectator Widget Preview
                                    </div>
                                    <div className="ta-sim-inputs">
                                        <div className="sim-sub">
                                            <span>Simulated Runs:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max="300"
                                                value={simRuns}
                                                onChange={(e) => setSimRuns(Number(e.target.value))}
                                                className="ta-sim-num"
                                            />
                                        </div>
                                        <div className="sim-sub">
                                            <span>Overs Bowled:</span>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="1"
                                                max={overLimit}
                                                value={simOvers}
                                                onChange={(e) => setSimOvers(Number(e.target.value))}
                                                className="ta-sim-num"
                                            />
                                        </div>
                                    </div>
                                    <div className="ta-sim-pill-preview">
                                        <span className="sim-pill crr">
                                            @ CRR ({simCrr.toFixed(1)}): <strong>{simProjAtCrr}</strong>
                                        </span>
                                        <span className="sim-pill">
                                            @ {projRateA} RPO: <strong>{simProjAtRateA}</strong>
                                        </span>
                                        <span className="sim-pill">
                                            @ {projRateB} RPO: <strong>{simProjAtRateB}</strong>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Tournament Playing Conditions & Match Format */}
                        <div className="ta-card">
                            <div className="ta-card-header">
                                <div className="ta-card-title">
                                    <MdSportsCricket className="card-icon" />
                                    <h3>Default Match Format &amp; Playing Conditions</h3>
                                </div>
                                <span className="ta-val-pill">{overLimit} Overs</span>
                            </div>
                            <p className="ta-card-desc">
                                Default match duration and bowler quota for all matches in this tournament. Individual matches can still be curtailed on-the-fly from the scoring console.
                            </p>

                            <div className="ta-field-body">
                                <div className="ta-row-group">
                                    <div className="ta-inline-field">
                                        <label>Match Format (Overs / Side):</label>
                                        <div className="ta-input-with-chips">
                                            <input
                                                type="number"
                                                min="5"
                                                max="50"
                                                value={overLimit}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    setOverLimit(val);
                                                    setMaxOversPerBowler(Math.ceil(val / 5));
                                                }}
                                                className="ta-number-input"
                                            />
                                            <div className="ta-quick-chips">
                                                {[5, 8, 10, 12, 15, 20].map(ov => (
                                                    <button
                                                        key={ov}
                                                        type="button"
                                                        className={`ta-chip ${overLimit === ov ? 'active' : ''}`}
                                                        onClick={() => {
                                                            setOverLimit(ov);
                                                            setMaxOversPerBowler(Math.ceil(ov / 5));
                                                        }}
                                                    >
                                                        {ov} Ov
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="ta-inline-field">
                                        <div className="ta-label-with-action">
                                            <label>Max Overs Per Bowler Quota:</label>
                                            <button
                                                type="button"
                                                className="ta-mini-btn"
                                                onClick={() => setMaxOversPerBowler(Math.ceil(overLimit / 5))}
                                            >
                                                Auto (Overs ÷ 5)
                                            </button>
                                        </div>
                                        <div className="ta-bowler-quota-row">
                                            <input
                                                type="number"
                                                min="1"
                                                max={overLimit}
                                                value={maxOversPerBowler}
                                                onChange={(e) => setMaxOversPerBowler(Number(e.target.value))}
                                                className="ta-number-input"
                                            />
                                            <span className="ta-unit">overs / bowler (Rule 13.1)</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="ta-rule-note">
                                    <MdInfoOutline />
                                    <span><strong>ICC DLS Minimum Rule:</strong> Matches must reach at least 5.0 completed overs in both innings for an official result.</span>
                                </div>

                                <div className="ta-value-insight">
                                    <MdInfoOutline className="insight-icon" />
                                    <div>
                                        <strong>Match rule enforcement:</strong>
                                        <p>
                                            All fixtures created for this edition will default to <strong>{overLimit} overs per side</strong> with a bowler ceiling of <strong>{maxOversPerBowler} overs</strong>. Scorers in the scoring console are notified when a bowler completes their {maxOversPerBowler}-over limit.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Scoreboard Feature Toggles & Global Broadcast */}
                        <div className="ta-card">
                            <div className="ta-card-header">
                                <div className="ta-card-title">
                                    <MdCampaign className="card-icon" />
                                    <h3>Scoreboard Visibility &amp; Global Announcement</h3>
                                </div>
                            </div>
                            <p className="ta-card-desc">
                                Control which advanced analytical pills appear to spectators, and broadcast global announcement tickers across all spectator views.
                            </p>

                            <div className="ta-field-body">
                                <div className="ta-toggle-group">
                                    <label className="ta-toggle-row">
                                        <input
                                            type="checkbox"
                                            checked={showProjectedScore}
                                            onChange={(e) => setShowProjectedScore(e.target.checked)}
                                        />
                                        <div className="ta-toggle-text">
                                            <strong>Show Projected Score Widget on Live Scoreboard</strong>
                                            <span>Renders compact projected score at CRR, Rate A, and Rate B in center column and over pills.</span>
                                        </div>
                                    </label>

                                    <label className="ta-toggle-row">
                                        <input
                                            type="checkbox"
                                            checked={showDlsPar}
                                            onChange={(e) => setShowDlsPar(e.target.checked)}
                                        />
                                        <div className="ta-toggle-text">
                                            <strong>Show Live DLS Par Pill on Live Scoreboard (2nd Innings)</strong>
                                            <span>Renders real-time ball-by-ball Par score and (+ahead / -behind) comparison during chase.</span>
                                        </div>
                                    </label>

                                    <label className="ta-toggle-row">
                                        <input
                                            type="checkbox"
                                            checked={isSpecialMatch}
                                            onChange={(e) => setIsSpecialMatch(e.target.checked)}
                                        />
                                        <div className="ta-toggle-text">
                                            <strong>Special / Exhibition Match Mode</strong>
                                            <span>Enables distinct gold badge styling for special or friendly derby matches.</span>
                                        </div>
                                    </label>
                                </div>

                                {isSpecialMatch && (
                                    <div className="ta-special-badge-input">
                                        <label>Special Match Badge Tag:</label>
                                        <input
                                            type="text"
                                            value={specialMatchBadge}
                                            onChange={(e) => setSpecialMatchBadge(e.target.value)}
                                            className="ta-text-input"
                                            placeholder="e.g. Special Match, Grand Final, Alumni Derby"
                                        />
                                        <div className="ta-quick-chips">
                                            {['Special Match', 'Grand Final', 'Semi-Final', 'Exhibition Clash', 'Alumni Derby'].map(badge => (
                                                <button
                                                    key={badge}
                                                    type="button"
                                                    className={`ta-chip ${specialMatchBadge === badge ? 'active' : ''}`}
                                                    onClick={() => setSpecialMatchBadge(badge)}
                                                >
                                                    {badge}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="ta-announcement-input-group">
                                    <label>
                                        Global Tournament Announcement / Ticker Banner:
                                        <span className="ta-field-hint">Displayed at the top of spectator scoreboards (leave blank for standard live status).</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={globalAnnouncement}
                                        onChange={(e) => setGlobalAnnouncement(e.target.value)}
                                        className="ta-text-input"
                                        placeholder="e.g. Welcome to E-Legends Trophy 2K26! Grand Final scheduled for 3:00 PM."
                                    />
                                </div>

                                <div className="ta-value-insight">
                                    <MdInfoOutline className="insight-icon" />
                                    <div>
                                        <strong>Audience experience:</strong>
                                        <p>
                                            Toggling these controls enables or hides advanced analytical badges (Projected totals, 2nd-innings DLS Par tracker, or custom event badges) across spectator devices. The announcement banner appears as a live ticker broadcast at the top of the 3D scoreboard.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="ta-action-bar">
                        <div className="ta-sync-wrap">
                            <label className="ta-sync-checkbox">
                                <input
                                    type="checkbox"
                                    checked={syncToLiveMatch}
                                    onChange={(e) => setSyncToLiveMatch(e.target.checked)}
                                />
                                <span>Sync immediately to currently running live match and broadcast</span>
                            </label>
                            <span className="ta-sync-hint">Pushes updated par benchmarks and rates straight to Firebase RTDB for active matches without interrupting scoring.</span>
                        </div>

                        <div className="ta-actions-right">
                            <button
                                type="button"
                                onClick={handleReset}
                                className="ta-btn-reset"
                            >
                                <MdRestartAlt /> Reset to Defaults
                            </button>

                            <button
                                type="submit"
                                className="ta-btn-save"
                            >
                                <MdSave /> Save Tournament Rules &amp; Benchmarks
                            </button>
                        </div>
                    </div>
                </form>
            </div>
            <Footer />
        </div>
    );
};

export default TournamentAdjustments;
