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
 * Check if a match is currently live in progress
 */
export const isMatchCurrentlyLive = (m, liveData) => {
    if (!m) return false;
    if (m.isLive === 1 || m.isLive === true || String(m.status || '').toLowerCase() === 'live') return true;
    if (m.common?.isLive === 1 || m.common?.isLive === true || String(m.common?.status || '').toLowerCase() === 'live') return true;
    if (String(m.score || '').toLowerCase() === 'live' || String(m.common?.score || '').toLowerCase() === 'live') return true;

    if (liveData?.isLive) {
        const livePath = String(liveData.currentMatchPath || '').split('/').pop().trim().toLowerCase();
        const liveTitle = String(liveData.liveScore?.matchTitle || '').split('/').pop().trim().toLowerCase();
        const mTitle = String(m.title || m.name || m.common?.title || '').trim().toLowerCase();
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
        const mTeams = String(m.teams || m.common?.teams || '').trim().toLowerCase();
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
 * Check if a match is finished/completed vs upcoming/scheduled
 * CRITICAL: A match that is currently live must NEVER be considered finished!
 */
export const isMatchFinished = (m, liveData) => {
    if (!m) return false;

    // Check if match is live (via match object flags or global liveData)
    const validLiveData = (liveData && typeof liveData === 'object' && !Array.isArray(liveData)) ? liveData : null;
    if (isMatchCurrentlyLive(m, validLiveData)) return false;

    // Explicit finished flag
    if (m.finished === 1 || m.finished === '1' || m.finished === true ||
        m.common?.finished === 1 || m.common?.finished === '1' || m.common?.finished === true ||
        m.isFinished === 1 || m.isFinished === '1' || m.isFinished === true) {
        return true;
    }

    // Explicit finished status
    const status = String(m.status || m.common?.status || '').toLowerCase().trim();
    if (status === 'finished' || status === 'completed' || status === 'match completed' || status === 'concluded') {
        return true;
    }

    const res = (m.result || m.common?.result || '').trim().toLowerCase();
    // If finished is explicitly 0, it's not finished unless result declares a clear winner or match conclusion
    if (m.finished === 0 || m.finished === '0' || m.finished === false ||
        m.common?.finished === 0 || m.common?.finished === '0' || m.common?.finished === false) {
        if (res && (res.includes('won') || res.includes('tied') || res.includes('concluded') || res.includes('draw match') || res.includes('abandoned') || res.includes('no result'))) {
            return true;
        }
        return false;
    }

    if (res && res !== 'scheduled' && res !== 'match scheduled' && res !== 'tbd' && res !== 'draw pending' && res !== 'live' && res !== 'in progress') {
        return true;
    }

    const score = (m.score || m.common?.score || '').trim().toLowerCase();
    if (score && score !== 'scheduled' && score !== 'match scheduled' && score !== 'match concluded' && score !== 'tbd' && score !== 'live') {
        // Only consider score with runs/wickets finished if finished is 1 or result explicitly declares winner
        if (/\d+\s*\/\s*\d+/.test(score) && (m.finished === 1 || m.common?.finished === 1 || (res && res.includes('won')))) {
            return true;
        }
    }
    return false;
};

/**
 * Parse match date and time for chronological ascending sort
 */
export const parseMatchDateTime = (m) => {
    if (!m) return 9999999999999;
    const dateStr = (m.date || m.common?.date || '').trim();
    const timeStr = (m.time || m.common?.time || '').trim();

    if (dateStr) {
        let normalizedDate = dateStr.replace(/\./g, '-').replace(/\//g, '-');
        // Check if DD-MM-YYYY format (e.g. 15-03-2026)
        const dmyMatch = normalizedDate.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (dmyMatch) {
            normalizedDate = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
        }

        if (timeStr) {
            // Check 12-hour AM/PM time or 24-hour time
            const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
            let normalizedTime = timeStr;
            if (timeMatch) {
                let hour = parseInt(timeMatch[1], 10);
                const min = timeMatch[2];
                const meridiem = (timeMatch[3] || '').toUpperCase();
                if (meridiem === 'PM' && hour < 12) hour += 12;
                if (meridiem === 'AM' && hour === 12) hour = 0;
                normalizedTime = `${String(hour).padStart(2, '0')}:${min}`;
            }
            const combined = `${normalizedDate}T${normalizedTime}`;
            const parsed = Date.parse(combined);
            if (!isNaN(parsed)) return parsed;
            const parsedFallback = Date.parse(`${normalizedDate} ${normalizedTime}`);
            if (!isNaN(parsedFallback)) return parsedFallback;
        }

        const parsedDateOnly = Date.parse(normalizedDate);
        if (!isNaN(parsedDateOnly)) return parsedDateOnly;
    }

    // For unscheduled/TBD matches without dates, place them after scheduled matches
    const titleLower = String(m.title || m.name || '').toLowerCase();
    const baseUnscheduled = 9000000000000;
    if (titleLower.includes('final') && !titleLower.includes('semi')) {
        return baseUnscheduled + 90000000;
    }
    if (titleLower.includes('semi-final 2') || titleLower.includes('sf 2') || titleLower.includes('sf2')) {
        return baseUnscheduled + 80000000;
    }
    if (titleLower.includes('semi-final 1') || titleLower.includes('sf 1') || titleLower.includes('sf1')) {
        return baseUnscheduled + 70000000;
    }
    const numId = Number(m.id);
    return !isNaN(numId) ? (baseUnscheduled + (numId % 1000000)) : baseUnscheduled + 50000000;
};

/**
 * Determine which team batted 1st in the match
 */
export const getFirstBattingTeamName = (match, t1Name, t2Name) => {
    if (!match) return t1Name;
    const t1Clean = (t1Name || '').trim().toLowerCase();
    const t2Clean = (t2Name || '').trim().toLowerCase();

    // 1. Direct string: firstBattingTeam or common.firstBattingTeam
    const fbt = String(match.firstBattingTeam || match.common?.firstBattingTeam || '').trim().toLowerCase();
    if (fbt) {
        if (t1Clean && fbt === t1Clean) return t1Name;
        if (t2Clean && fbt === t2Clean) return t2Name;
    }

    // 2. Numeric: firstBat or common.firstBat
    const fb = match.firstBat ?? match.common?.firstBat;
    if (fb === 1) return t1Name;
    if (fb === 2) return t2Name;

    // 3. Toss winner & decision
    const tw = String(match.tossWinner || match.common?.tossWinner || '').trim().toLowerCase();
    const td = String(match.tossDecision || match.common?.tossDecision || '').trim().toLowerCase();
    if (tw && td) {
        const choseBat = td.includes('bat');
        if (t1Clean && tw === t1Clean) return choseBat ? t1Name : t2Name;
        if (t2Clean && tw === t2Clean) return choseBat ? t2Name : t1Name;
    }

    // 4. Result text inference:
    // "won by X wickets" -> winning team chased (batted 2nd) -> other team batted 1st
    // "won by X runs" -> winning team defended (batted 1st) -> winning team batted 1st
    const res = String(match.result || match.common?.result || '').trim().toLowerCase();
    if (res) {
        const wonByWickets = res.includes('wicket') || res.includes('wkt');
        const wonByRuns = res.includes('run');

        if (wonByWickets) {
            if (t1Clean && res.includes(t1Clean)) return t2Name;
            if (t2Clean && res.includes(t2Clean)) return t1Name;
        } else if (wonByRuns) {
            if (t1Clean && res.includes(t1Clean)) return t1Name;
            if (t2Clean && res.includes(t2Clean)) return t2Name;
        }
    }

    return t1Name;
};

const MatchCard = ({ match, teamsMap = {}, teamsData = {}, className = '', liveData = null }) => {
    if (!match) return null;

    const finished = isMatchFinished(match, liveData);
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

    // Parse team scores reliably
    const extractTeamScore = (fullScore, teamName) => {
        if (!fullScore || !teamName) return '';
        const parts = String(fullScore).split(' • ');
        for (const part of parts) {
            const trimmed = part.trim();
            if (trimmed.toLowerCase().includes(teamName.toLowerCase())) {
                const regex = new RegExp(`^${teamName}\\s*`, 'i');
                return trimmed.replace(regex, '').trim();
            }
        }
        return '';
    };

    let t1Score = '';
    let t2Score = '';
    if (finished && match.score && match.score !== 'Scheduled') {
        t1Score = extractTeamScore(match.score, t1Name);
        t2Score = extractTeamScore(match.score, t2Name);
        if (!t1Score && !t2Score) {
            const scoreParts = match.score.split(' • ');
            if (scoreParts.length === 2) {
                t1Score = scoreParts[0].trim();
                t2Score = scoreParts[1].trim();
            } else {
                t1Score = match.score;
            }
        }
    }

    // Determine winner highlights
    const res = (match.result || '').toLowerCase();
    const t1Won = finished && t1Name !== 'TBD' && res.includes(t1Name.toLowerCase()) && res.includes('won');
    const t2Won = finished && t2Name !== 'TBD' && res.includes(t2Name.toLowerCase()) && res.includes('won');

    // Determine 1st innings team (Top Row) and 2nd innings team (Bottom Row)
    const firstBatTeamName = getFirstBattingTeamName(match, t1Name, t2Name);
    const isT1FirstBat = t2Name === 'TBD' || firstBatTeamName.toLowerCase() === t1Name.toLowerCase();

    // Top row = 1st innings team
    const topTeamName = isT1FirstBat ? t1Name : t2Name;
    const topTeamLogo = isT1FirstBat ? t1Logo : t2Logo;
    const topTeamScore = isT1FirstBat ? t1Score : t2Score;
    const topTeamWon = isT1FirstBat ? t1Won : t2Won;

    // Bottom row = 2nd innings team
    const bottomTeamName = isT1FirstBat ? t2Name : t1Name;
    const bottomTeamLogo = isT1FirstBat ? t2Logo : t1Logo;
    const bottomTeamScore = isT1FirstBat ? t2Score : t1Score;
    const bottomTeamWon = isT1FirstBat ? t2Won : t1Won;

    const isSpecial = Boolean(
        match.isSpecial ||
        match.matchType === 'special' ||
        (match.title && match.title.toLowerCase().includes('special'))
    );

    return (
        <TiltCard className={`pro-match-card ${finished ? 'is-completed' : 'is-scheduled space-saving'} ${isSpecial ? 'is-special-match' : ''} ${className}`} maxTilt={6}>
            {/* Card Header Bar */}
            <div className="pmc-top-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span className={isSpecial ? "pmc-special-badge" : "pmc-stage-badge"}>{match.title ? `${match.title} Match` : 'Match'}</span>
                </div>
                <div className="pmc-top-right">
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
            </div>

            {finished ? (
                <>
                    {/* Concluded Match Scoreboard Grid (1st innings team in top row, 2nd innings team in bottom row) */}
                    <div className="pmc-competitors">
                        {/* 1st Innings Team Row (Top) */}
                        <div className={`pmc-team-row ${topTeamWon ? 'winner' : ''}`}>
                            <div className="pmc-team-identity">
                                {topTeamLogo ? (
                                    <img src={topTeamLogo} alt={topTeamName} className="pmc-team-crest" onError={(e) => { e.target.style.display = 'none'; }} />
                                ) : (
                                    <div className="pmc-team-avatar-fallback">{topTeamName.substring(0, 3)}</div>
                                )}
                                <span className="pmc-team-name">{topTeamName}</span>
                                {topTeamWon && <MdEmojiEvents className="pmc-winner-trophy" title="Winner" />}
                            </div>
                            <div className="pmc-team-score-block">
                                {topTeamScore ? (
                                    <span className="pmc-score-text">{topTeamScore}</span>
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

                        {/* 2nd Innings Team Row (Bottom) */}
                        <div className={`pmc-team-row ${bottomTeamWon ? 'winner' : ''}`}>
                            <div className="pmc-team-identity">
                                {bottomTeamLogo ? (
                                    <img src={bottomTeamLogo} alt={bottomTeamName} className="pmc-team-crest" onError={(e) => { e.target.style.display = 'none'; }} />
                                ) : (
                                    <div className="pmc-team-avatar-fallback">{bottomTeamName.substring(0, 3)}</div>
                                )}
                                <span className="pmc-team-name">{bottomTeamName}</span>
                                {bottomTeamWon && <MdEmojiEvents className="pmc-winner-trophy" title="Winner" />}
                            </div>
                            <div className="pmc-team-score-block">
                                {bottomTeamScore ? (
                                    <span className="pmc-score-text">{bottomTeamScore}</span>
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
                        {(() => {
                            const targetTourney = match.tournamentId || match.editionId || match.tourneyId || (match.matchPath ? match.matchPath.split('/')[1] : null);
                            const scorecardUrl = `/match/${encodeURIComponent(match.title || match.id)}${targetTourney ? `?tourney=${encodeURIComponent(targetTourney)}` : ''}`;
                            return (
                                <Link to={scorecardUrl} className="pmc-action-link">
                                    Scorecard
                                </Link>
                            );
                        })()}
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
                            <span><MdLocationOn className="pmc-pin-icon" /> {match.venue || 'Faculty Cricket Grounds'}</span>
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
