import React from 'react';
import { Link } from 'react-router-dom';
import TiltCard from '../../3D/TiltCard';
import {
    MdCalendarToday,
    MdLocationOn,
    MdSportsCricket,
    MdCheckCircle,
    MdSchedule,
    MdEmojiEvents,
    MdStar
} from 'react-icons/md';
import './MatchCard.css';

/**
 * Check if a match is finished/completed vs upcoming/scheduled
 */
export const isMatchFinished = (m) => {
    if (!m) return false;
    if (m.finished === 1 || m.finished === '1' || m.finished === true) return true;
    const res = (m.result || '').trim().toLowerCase();
    if (res && res !== 'scheduled' && res !== 'match scheduled' && res !== 'tbd' && res !== 'draw pending') {
        return true;
    }
    const score = (m.score || '').trim().toLowerCase();
    if (score && score !== 'scheduled' && score !== 'match scheduled' && score !== 'match concluded' && score !== 'tbd') {
        if (/\d+\s*\/\s*\d+/.test(score)) {
            return true;
        }
    }
    return false;
};

/**
 * Check if a match is currently live in progress
 */
export const isMatchCurrentlyLive = (m, liveData) => {
    if (!m) return false;
    if (m.isLive === 1 || m.isLive === true || String(m.status || '').toLowerCase() === 'live') return true;

    if (liveData?.isLive) {
        const livePath = String(liveData.currentMatchPath || '').split('/').pop().trim().toLowerCase();
        const liveTitle = String(liveData.liveScore?.matchTitle || '').split('/').pop().trim().toLowerCase();
        const mTitle = String(m.title || m.name || '').trim().toLowerCase();
        const mId = String(m.id || '').trim().toLowerCase();

        // Exact match comparison on title or ID to prevent "semi-final 1" matching "final"
        if (mTitle) {
            const normMTitle = mTitle.replace(/\s+match$/, '');
            const normLiveTitle = liveTitle.replace(/\s+match$/, '');
            const normLivePath = livePath.replace(/\s+match$/, '');
            if (normLiveTitle && normMTitle === normLiveTitle) return true;
            if (normLivePath && normMTitle === normLivePath) return true;
        }
        if (mId && (mId === liveTitle || mId === livePath)) {
            return true;
        }

        // Teams comparison ONLY if teams are defined and contain ' vs '
        const mTeams = String(m.teams || '').trim().toLowerCase();
        const liveTeams = String(liveData.liveScore?.status || '').trim().toLowerCase();
        if (mTeams && mTeams.includes(' vs ') && !mTeams.includes('tbd')) {
            if (liveTeams.includes(mTeams)) {
                return true;
            }
        }
    }
    return false;
};

/**
 * Parse match date and time for chronological ascending sort
 */
export const parseMatchDateTime = (m) => {
    if (!m) return 0;
    const dateStr = (m.date || '').trim();
    const timeStr = (m.time || '').trim();

    if (dateStr && timeStr) {
        const combined = `${dateStr.replace(/\./g, '-')} ${timeStr}`;
        const parsed = Date.parse(combined);
        if (!isNaN(parsed)) return parsed;
    }
    if (dateStr) {
        const parsed = Date.parse(dateStr.replace(/\./g, '-'));
        if (!isNaN(parsed)) return parsed;
    }
    if (timeStr) {
        const parsed = Date.parse(timeStr.replace(/\./g, '-'));
        if (!isNaN(parsed)) return parsed;
    }

    // For unscheduled/TBD finals (no date/time), ensure they sort to the end of fixtures rather than epoch 0
    const titleLower = String(m.title || '').toLowerCase();
    if (titleLower.includes('final') || titleLower.includes('qualifier')) {
        return 9999999999999;
    }
    return Number(m.id) || 9999999999990;
};

const MatchCard = ({ match, teamsMap = {}, teamsData = {}, className = '' }) => {
    if (!match) return null;

    const finished = isMatchFinished(match);
    const teams = teamsMap && Object.keys(teamsMap).length > 0 ? teamsMap : (teamsData || {});

    // Extract team names with support for undefined/TBD finals
    let t1Name = match.team1;
    let t2Name = match.team2;
    if (!t1Name || !t2Name) {
        const rawTeams = (match.teams || '').trim();
        if (rawTeams.includes(' vs ')) {
            const parts = rawTeams.split(' vs ');
            t1Name = t1Name || parts[0]?.trim();
            t2Name = t2Name || parts[1]?.trim();
        } else if (rawTeams && rawTeams.toLowerCase() !== 'scheduled') {
            t1Name = t1Name || rawTeams;
            t2Name = t2Name || 'TBD';
        }
    }
    t1Name = (t1Name || '').trim() || 'TBD';
    t2Name = (t2Name || '').trim() || 'TBD';

    // Extract team crests/logos
    const t1Obj = teams[t1Name] || {};
    const t2Obj = teams[t2Name] || {};
    const t1Logo = t1Obj.logo || t1Obj.logoUrl || t1Obj.crest || '';
    const t2Logo = t2Obj.logo || t2Obj.logoUrl || t2Obj.crest || '';

    // Parse team scores if available
    let t1Score = '';
    let t2Score = '';
    if (finished && match.score && match.score !== 'Scheduled') {
        const scoreParts = match.score.split(' • ');
        if (scoreParts.length === 2) {
            t1Score = scoreParts[0].replace(t1Name, '').trim();
            t2Score = scoreParts[1].replace(t2Name, '').trim();
        } else {
            t1Score = match.score;
        }
    }

    // Determine winner highlights
    const res = (match.result || '').toLowerCase();
    const t1Won = finished && t1Name !== 'TBD' && res.includes(t1Name.toLowerCase()) && res.includes('won');
    const t2Won = finished && t2Name !== 'TBD' && res.includes(t2Name.toLowerCase()) && res.includes('won');

    return (
        <TiltCard className={`pro-match-card ${finished ? 'is-completed' : 'is-scheduled space-saving'} ${className}`} maxTilt={6}>
            {/* Card Header Bar */}
            <div className="pmc-top-bar">
                <span className="pmc-stage-badge">{match.title ? `${match.title} Match` : 'Match'}</span>
                <span className={`pmc-status-pill ${finished ? 'completed' : 'scheduled'}`}>
                    {finished ? (
                        <>
                            <MdCheckCircle className="pmc-pill-icon" />
                            <span>Completed {res.includes('dls') ? '• DLS' : ''}</span>
                        </>
                    ) : (
                        <>
                            <MdSchedule className="pmc-pill-icon" />
                            <span>Upcoming</span>
                        </>
                    )}
                </span>
                <div className="pmc-schedule-snippet">
                    <MdCalendarToday className="pmc-cal-icon" />
                    <span>{match.date || 'Date TBD'}</span>
                    {match.time && <span className="pmc-time-dot">• {match.time}</span>}
                </div>
            </div>

            {finished ? (
                <>
                    {/* Concluded Match Scoreboard Grid (2 rows for runs/wickets/overs) */}
                    <div className="pmc-competitors">
                        {/* Team 1 Row */}
                        <div className={`pmc-team-row ${t1Won ? 'winner' : ''}`}>
                            <div className="pmc-team-identity">
                                {t1Logo ? (
                                    <img src={t1Logo} alt={t1Name} className="pmc-team-crest" onError={(e) => { e.target.style.display = 'none'; }} />
                                ) : (
                                    <div className="pmc-team-avatar-fallback">{t1Name.substring(0, 3)}</div>
                                )}
                                <span className="pmc-team-name">{t1Name}</span>
                                {t1Won && <MdEmojiEvents className="pmc-winner-trophy" title="Winner" />}
                            </div>
                            <div className="pmc-team-score-block">
                                {t1Score ? (
                                    <span className="pmc-score-text">{t1Score}</span>
                                ) : (
                                    <span className="pmc-score-pending">-</span>
                                )}
                            </div>
                        </div>

                        <div className="pmc-divider-vs">
                            <span className="pmc-vs-line" />
                            <span className="pmc-vs-text">VS</span>
                            <span className="pmc-vs-line" />
                        </div>

                        {/* Team 2 Row */}
                        <div className={`pmc-team-row ${t2Won ? 'winner' : ''}`}>
                            <div className="pmc-team-identity">
                                {t2Logo ? (
                                    <img src={t2Logo} alt={t2Name} className="pmc-team-crest" onError={(e) => { e.target.style.display = 'none'; }} />
                                ) : (
                                    <div className="pmc-team-avatar-fallback">{t2Name.substring(0, 3)}</div>
                                )}
                                <span className="pmc-team-name">{t2Name}</span>
                                {t2Won && <MdEmojiEvents className="pmc-winner-trophy" title="Winner" />}
                            </div>
                            <div className="pmc-team-score-block">
                                {t2Score ? (
                                    <span className="pmc-score-text">{t2Score}</span>
                                ) : (
                                    <span className="pmc-score-pending">-</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Outcome Banner */}
                    <div className="pmc-status-banner result-mode">
                        <p className="pmc-result-text">
                            <MdCheckCircle className="pmc-banner-icon success" />
                            <span>{match.result || 'Match Concluded'}</span>
                        </p>
                    </div>

                    {/* Footer Bar */}
                    <div className="pmc-footer">
                        {match.mom ? (
                            <div className="pmc-potm-pill">
                                <MdStar className="potm-star-icon" />
                                <span className="potm-label">PoTM:</span>
                                <strong className="potm-name">{match.mom}</strong>
                            </div>
                        ) : (
                            <div className="pmc-venue-tag">
                                <MdSportsCricket /> {match.overs}
                            </div>
                        )}
                        <Link to={`/match/${match.title || match.id}`} className="pmc-action-link">
                            Scorecard
                        </Link>
                    </div>
                </>
            ) : (
                <>
                    {/* Space-Saving Upcoming Single-Row Competitors (2 Teams + VS in 1 row) */}
                    <div className="pmc-teams-single-row">
                        <div className="pmc-single-team left">
                            {t1Logo ? (
                                <img src={t1Logo} alt={t1Name} className="pmc-single-crest" onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                                <div className={`pmc-single-avatar ${t1Name === 'TBD' ? 'is-tbd' : ''}`}>
                                    {t1Name === 'TBD' ? 'TBD' : t1Name.substring(0, 3)}
                                </div>
                            )}
                            <span className="pmc-single-name" title={t1Name}>{t1Name}</span>
                        </div>

                        <div className="pmc-single-vs-wrap">
                            <span className="pmc-single-vs-pill">VS</span>
                        </div>

                        <div className="pmc-single-team right">
                            <span className="pmc-single-name" title={t2Name}>{t2Name}</span>
                            {t2Logo ? (
                                <img src={t2Logo} alt={t2Name} className="pmc-single-crest" onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                                <div className={`pmc-single-avatar ${t2Name === 'TBD' ? 'is-tbd' : ''}`}>
                                    {t2Name === 'TBD' ? 'TBD' : t2Name.substring(0, 3)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Space-Saving Upcoming Info Bar (Venue & Format, NO match center button) */}
                    <div className="pmc-upcoming-footer">
                        <span className="pmc-upcoming-venue" title={match.venue || 'Faculty Cricket Grounds'}>
                            <MdLocationOn className="pmc-pin-icon" />
                            <span>{match.venue || 'Faculty Cricket Grounds'}</span>
                        </span>
                        <span className="pmc-upcoming-format">
                            <MdSportsCricket className="pmc-cricket-icon" /> T20 Format
                        </span>
                    </div>
                </>
            )}
        </TiltCard>
    );
};

export default MatchCard;
