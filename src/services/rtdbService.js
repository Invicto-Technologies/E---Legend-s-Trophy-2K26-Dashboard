import { ref, onValue, get, set, update, remove } from 'firebase/database';
import { database, firebaseConfig } from '../components/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import fallbackExport from '../data/fallbackData.json';
import { getMatchOutcome } from '../utils/cricketEngine';

// Cached fallback data for offline / empty state
const cachedFallbackData = fallbackExport || {};

export const getFallbackData = () => cachedFallbackData;

/* ==========================================================================
   ACTIVE TOURNAMENT RESOLUTION
   ========================================================================== */

let currentActiveTournamentId = cachedFallbackData?.activeTournamentId || "E-Legend's Trophy 2K26";

// Keep activeTournamentId updated in real-time
try {
    const activeRef = ref(database, 'activeTournamentId');
    onValue(activeRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
            currentActiveTournamentId = val;
        }
    });
} catch (e) {
    // Offline mode
}

export const getActiveTournamentId = () => currentActiveTournamentId;

export const resolveTournamentKey = (id) => {
    const targetId = id || currentActiveTournamentId || "E-Legend's Trophy 2K26";
    const tournaments = cachedFallbackData?.Tournaments || {};

    if (tournaments[targetId]) return targetId;

    // Check if stripped or full exists
    const stripped = String(targetId).replace(/^E-Legend's Trophy\s*/i, '').replace(/^E-Legends Trophy\s*/i, '').trim();
    if (tournaments[stripped]) return stripped;

    const full = `E-Legend's Trophy ${targetId}`;
    if (tournaments[full]) return full;

    return targetId;
};

/**
 * Universal label resolver that formats activeTournamentId or tournament objects
 * into clean, non-duplicated strings for Header, Home Hero, and Web title
 */
export const resolveTournamentLabels = (tourney) => {
    let rawName = "E-Legend's Trophy 2K26";
    let customTitle = "";
    let customYear = null;

    if (typeof tourney === 'string' && tourney.trim()) {
        rawName = tourney.trim();
    } else if (tourney && typeof tourney === 'object') {
        rawName = (tourney.name || tourney.id || tourney.activeId || currentActiveTournamentId || "E-Legend's Trophy 2K26").trim();
        customTitle = tourney.title || "";
        if (tourney.year) customYear = String(tourney.year).trim();
    } else if (currentActiveTournamentId) {
        rawName = currentActiveTournamentId.trim();
    }

    // Extract edition code like "2K26", "2K25", "2026", etc.
    const match = rawName.match(/2K\d{2}|\b20\d{2}\b/i);
    let editionCode = match 
        ? match[0].toUpperCase() 
        : rawName.replace(/^E-Legend's\s*Trophy\s*/i, '').replace(/^E-Legends\s*Trophy\s*/i, '').trim() || '2K26';

    // Normalize to "2K26" type
    if (/^\d{4}$/.test(editionCode)) {
        editionCode = `2K${editionCode.slice(-2)}`;
    } else if (/^\d{2}$/.test(editionCode)) {
        editionCode = `2K${editionCode}`;
    }

    const year = customYear || (editionCode.startsWith('2K') ? `20${editionCode.slice(2)}` : (editionCode.match(/\d{4}/) ? editionCode : '2026'));

    // Ensure full name is clean e.g. "E-Legend's Trophy 2K26"
    let fullName = rawName;
    if (!fullName.toLowerCase().includes("legend")) {
        fullName = `E-Legend's Trophy ${editionCode}`;
    }

    // Header branding: as year use "2K26" type
    const headerPrefix = "E-Legend's Trophy";
    const headerAccent = editionCode;

    // Home Hero title lines:
    // Line 1: E-LEGEND'S
    // Line 2: TROPHY 2K26 (with glowing gradient)
    const heroLine1 = "E-LEGEND'S";
    const heroLine2 = `TROPHY ${editionCode}`;

    const webTitle = fullName;
    const subtitle = customTitle || `Prof. A. Thurairajah Memorial Cricket Tournament ${year}`;

    return {
        fullName,
        editionCode,
        year,
        headerPrefix,
        headerAccent,
        heroLine1,
        heroLine2,
        webTitle,
        subtitle
    };
};

export const getFallbackTournament = (key) => {
    const k = resolveTournamentKey(key);
    return cachedFallbackData?.Tournaments?.[k] || null;
};

/* ==========================================================================
   LIVE DATA (Scoped to active tournament)
   ========================================================================== */

export const subscribeLiveData = (callback) => {
    try {
        const activeRef = ref(database, 'activeTournamentId');
        let currentUnsub = null;

        const outerUnsub = onValue(activeRef, (activeSnap) => {
            const activeId = activeSnap.val() || currentActiveTournamentId || "E-Legend's Trophy 2K26";
            currentActiveTournamentId = activeId;
            const targetKey = resolveTournamentKey(activeId);

            if (currentUnsub) currentUnsub();

            const liveRef = ref(database, `Tournaments/${targetKey}/LiveData`);
            currentUnsub = onValue(liveRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    callback(data);
                } else {
                    const fallbackTourney = getFallbackTournament(targetKey);
                    callback(fallbackTourney?.LiveData || cachedFallbackData?.LiveData || { isLive: 0, currentMatchPath: "", liveScore: null });
                }
            }, (error) => {
                console.warn(`LiveData subscription error for ${targetKey}, using fallback:`, error);
                const fallbackTourney = getFallbackTournament(targetKey);
                callback(fallbackTourney?.LiveData || cachedFallbackData?.LiveData || { isLive: 0, currentMatchPath: "", liveScore: null });
            });
        }, (error) => {
            console.warn('activeTournamentId subscription error for LiveData:', error);
            const targetKey = resolveTournamentKey(currentActiveTournamentId);
            const fallbackTourney = getFallbackTournament(targetKey);
            callback(fallbackTourney?.LiveData || cachedFallbackData?.LiveData || { isLive: 0, currentMatchPath: "", liveScore: null });
        });

        return () => {
            if (currentUnsub) currentUnsub();
            outerUnsub();
        };
    } catch (error) {
        console.error('Error creating LiveData subscription:', error);
        const targetKey = resolveTournamentKey(currentActiveTournamentId);
        const fallbackTourney = getFallbackTournament(targetKey);
        callback(fallbackTourney?.LiveData || cachedFallbackData?.LiveData || { isLive: 0, currentMatchPath: "", liveScore: null });
        return () => {};
    }
};

export const updateLiveData = async (liveData) => {
    const targetKey = resolveTournamentKey(currentActiveTournamentId);
    const liveRef = ref(database, `Tournaments/${targetKey}/LiveData`);
    return update(liveRef, liveData);
};

/* ==========================================================================
   MATCHES (Scoped to active tournament: Tournaments/{targetKey}/{cleanTitle})
   ========================================================================== */

/**
 * Bulletproof cricket score string parser that supports team names with digits (e.g., E21, E24, SF1).
 * Example inputs:
 *  "E21 29/3 (2.4) • E24 0/0 (0)"
 *  "E22 80/2 (7.3) • E23 78/6 (10)"
 *  "Team 1 145/6 (15.0) • Team 2 139/8 (15.0)"
 */
export const parseCricketScoreString = (scoreStr) => {
    if (!scoreStr || typeof scoreStr !== 'string') return null;
    const parts = scoreStr.split(' • ');
    const parsePart = (p) => {
        if (!p) return null;
        // Priority 1: Match standard cricket score pattern "runs/wickets (overs)" or "runs/wickets"
        // Uses (?:^|\s) boundary so digits in team names (e.g., "E21") won't be captured as runs
        let m = p.match(/(?:^|\s)(\d+)\/(\d+)(?:\s*\(([\d.]+)\))?/);
        if (m) {
            return {
                runs: parseInt(m[1], 10) || 0,
                wickets: parseInt(m[2], 10) || 0,
                overs: m[3] ? parseFloat(m[3]) : 0
            };
        }
        // Priority 2: Match runs with overs in parentheses e.g. "120 (15.0)"
        m = p.match(/(?:^|\s)(\d+)(?:\s*\(([\d.]+)\))/);
        if (m) {
            return {
                runs: parseInt(m[1], 10) || 0,
                wickets: 0,
                overs: m[2] ? parseFloat(m[2]) : 0
            };
        }
        return null;
    };

    return {
        p1: parsePart(parts[0]),
        p2: parts[1] ? parsePart(parts[1]) : null
    };
};

/**
 * Universal helper to build structured player roster for any team from teamData
 */
export const buildPlayersRoster = (teamObj, defaultPrefix = 'Player') => {
    const result = {};
    const squadList = Object.values(teamObj?.players || {}).map((p, idx) => ({
        ...p,
        type: p.type || (idx < 11 ? 'Playing XI' : 'Reserve')
    }));
    const extraList = Object.values(teamObj?.extraPlayers || {}).map(p => ({
        ...p,
        type: p.type || 'Reserve'
    }));
    const rawList = [...squadList, ...extraList];
    if (rawList.length > 0) {
        rawList.forEach((p, idx) => {
            const pid = p.id || idx + 1;
            result[pid] = {
                id: pid,
                name: p.name || `${defaultPrefix} Player ${idx + 1}`,
                imageUrl: p.imageUrl || p.ImageURL || p.imageuRL || p.image || p.photo || '',
                role: p.role || 'All Rounder',
                runs: p.runs || 0,
                balls: p.balls || 0,
                boundaries: {
                    fours: p.fours || p.boundaries?.fours || 0,
                    sixes: p.sixes || p.boundaries?.sixes || 0,
                    singles: p.boundaries?.singles || 0,
                    twos: p.boundaries?.twos || 0
                },
                fours: p.fours || p.boundaries?.fours || 0,
                sixes: p.sixes || p.boundaries?.sixes || 0,
                strikeRate: '0.00',
                dismissal: p.dismissal || '',
                status: p.status || 'yet to bat',
                hand: p.hand || (idx % 3 === 0 ? 'Left Hand' : 'Right Hand'),
                type: p.type || (idx < 11 ? 'Playing XI' : 'Reserve'),
                shots: p.shots || {}
            };
        });
    } else {
        for (let i = 1; i <= 15; i++) {
            result[i] = {
                id: i,
                name: `${defaultPrefix} Player ${i}`,
                imageUrl: '',
                role: 'Player',
                runs: 0,
                balls: 0,
                boundaries: { fours: 0, sixes: 0, singles: 0, twos: 0 },
                fours: 0,
                sixes: 0,
                strikeRate: '0.00',
                dismissal: '',
                status: 'yet to bat',
                hand: i % 4 === 0 ? 'Left Hand' : 'Right Hand',
                type: i <= 11 ? 'Playing XI' : 'Reserve',
                shots: {}
            };
        }
    }
    return result;
};

/**
 * Universal helper to construct a complete scheduled match payload for RTDB
 */
export const buildInitialMatchPayload = (m, teamsData = {}) => {
    const cleanTitle = decodeURIComponent(String(m.title || m.name || '')).replace(/^\//, '').split('/').pop().trim();
    let [t1 = 'Team 1', t2 = 'Team 2'] = String(m.teams || '').split(' vs ').map(s => s.trim());
    t1 = m.team1 || t1 || 'Team 1';
    t2 = m.team2 || t2 || 'Team 2';

    const findTeamObj = (name) => {
        if (!name || !teamsData) return {};
        if (teamsData[name]) return teamsData[name];
        const norm = String(name).trim().toLowerCase();
        return Object.values(teamsData).find(t =>
            String(t.name || t.teamName || t.id || '').trim().toLowerCase() === norm
        ) || {};
    };

    const t1Obj = findTeamObj(t1);
    const t2Obj = findTeamObj(t2);
    const t1Players = buildPlayersRoster(t1Obj, t1);
    const t2Players = buildPlayersRoster(t2Obj, t2);

    return {
        id: m.id || Date.now(),
        common: {
            matchId: String(m.id || cleanTitle),
            title: cleanTitle,
            teams: `${t1} vs ${t2}`,
            date: m.date || '',
            time: m.time || '',
            venue: m.venue || 'Faculty Cricket Grounds',
            umpire1: m.umpire1 || 'Mr. S. Ketheeswaran',
            umpire2: m.umpire2 || 'Mr. N. Ramanan',
            status: 'Match Scheduled',
            finished: 0,
            firstBat: 1,
            firstBattingTeam: t1,
            overLimit: 15,
            result: 'Scheduled',
            score: 'Scheduled',
            mom: '',
            ballType: 'Hard Ball',
            tossWinner: t1,
            tossDecision: 'bat'
        },
        team1: {
            name: t1,
            overs: 0,
            totalBalls: 0,
            totalRuns: 0,
            totalWickets: 0,
            totalExtraAmount: 0,
            extraTypes: [],
            players: t1Players,
            ballFaceBatsman: null,
            otherSideBatsman: null,
            bowler: null,
            bowlers: {},
            currentPartnership: null,
            partnerships: {}
        },
        team2: {
            name: t2,
            overs: 0,
            totalBalls: 0,
            totalRuns: 0,
            totalWickets: 0,
            totalExtraAmount: 0,
            extraTypes: [],
            players: t2Players,
            ballFaceBatsman: null,
            otherSideBatsman: null,
            bowler: null,
            bowlers: {},
            currentPartnership: null,
            partnerships: {}
        }
    };
};

/**
 * Helper to enrich match data from FixturesData/finishedMatches when root node is empty, scheduled, or zeroed.
 */
export const enrichMatchWithFixturesData = (matchData, finishedMatches, matchTitle, customTourneyId) => {
    if (!finishedMatches || typeof finishedMatches !== 'object') return matchData;

    const rawTarget = decodeURIComponent(String(matchTitle || '')).replace(/^\//, '').split('/').pop().trim();
    const normTarget = rawTarget.toLowerCase();
    const normTargetSpaced = normTarget.replace(/[-_]/g, ' ');

    // Find in finishedMatches: Prioritize exact ID/Title match first
    let found = null;

    // Pass 1: Strict exact matching by ID, title, or matchId
    for (const [k, v] of Object.entries(finishedMatches)) {
        if (!v || typeof v !== 'object') continue;
        const vTitle = String(v.title || '').trim().toLowerCase();
        const vTitleSpaced = vTitle.replace(/[-_]/g, ' ');
        const vId = String(v.id || k).trim();

        if (
            vId === rawTarget ||
            vTitle === normTarget ||
            vTitleSpaced === normTargetSpaced ||
            (v.matchId && String(v.matchId).trim().toLowerCase() === normTarget)
        ) {
            found = { ...v, _key: k };
            break;
        }
    }

    // Pass 2: Safe fuzzy match (only if no exact match was found)
    if (!found) {
        for (const [k, v] of Object.entries(finishedMatches)) {
            if (!v || typeof v !== 'object') continue;
            const vTitle = String(v.title || '').trim().toLowerCase();
            const vTitleSpaced = vTitle.replace(/[-_]/g, ' ');

            // Guard: Never match "Final" with "Semi-Final" or "Quarter-Final"
            const isTargetFinalOnly = normTarget === 'final' || normTargetSpaced === 'final' || normTargetSpaced === 'the final' || normTargetSpaced === 'final match';
            const isCandidateSemiOrQuarter = vTitleSpaced.includes('semi') || vTitleSpaced.includes('quarter');
            if (isTargetFinalOnly && isCandidateSemiOrQuarter) {
                continue;
            }

            // Guard: Never match Semi-Final 1 with Semi-Final 2 (check contained digits)
            const targetNum = (normTarget.match(/\d+/) || [])[0];
            const candNum = (vTitle.match(/\d+/) || [])[0];
            if (targetNum && candNum && targetNum !== candNum) {
                continue;
            }

            // Guard: If candidate is a final, target must not be semi/quarter
            const isCandidateFinalOnly = vTitleSpaced === 'final' || vTitleSpaced === 'the final' || vTitleSpaced === 'final match';
            const isTargetSemiOrQuarter = normTargetSpaced.includes('semi') || normTargetSpaced.includes('quarter');
            if (isCandidateFinalOnly && isTargetSemiOrQuarter) {
                continue;
            }

            if (
                vTitleSpaced === `${normTargetSpaced} match` ||
                normTargetSpaced === `${vTitleSpaced} match` ||
                vTitleSpaced === `the ${normTargetSpaced}` ||
                normTargetSpaced === `the ${vTitleSpaced}`
            ) {
                found = { ...v, _key: k };
                break;
            }
        }
    }

    if (!found) return matchData;

    const parsed = parseCricketScoreString(found.score);
    const [t1FromTeams = 'Team 1', t2FromTeams = 'Team 2'] = String(found.teams || '').split(' vs ').map(s => s.trim());

    // Check if matchData already has complete finished score
    const hasDataScores = matchData && (
        (Number(matchData.team1?.totalRuns || 0) > 0 || Number(matchData.team1?.overs || 0) > 0) ||
        (Number(matchData.team2?.totalRuns || 0) > 0 || Number(matchData.team2?.overs || 0) > 0)
    ) && matchData.common?.result;

    const isMatchConcluded = Boolean(
        found.result && !['scheduled', 'match scheduled', 'tbd', 'live'].includes(String(found.result).trim().toLowerCase())
    );

    const base = matchData ? { ...matchData } : {};
    const baseCommon = base.common ? { ...base.common } : {};
    const baseTeam1 = base.team1 ? { ...base.team1 } : {};
    const baseTeam2 = base.team2 ? { ...base.team2 } : {};

    const enrichedCommon = {
        ...baseCommon,
        title: baseCommon.title || found.title || rawTarget,
        teams: found.teams || baseCommon.teams || `${t1FromTeams} vs ${t2FromTeams}`,
        date: found.date || baseCommon.date || '',
        time: found.time || baseCommon.time || '',
        venue: found.venue || baseCommon.venue || '',
        umpire1: found.umpire1 || baseCommon.umpire1 || '',
        umpire2: found.umpire2 || baseCommon.umpire2 || '',
        result: (isMatchConcluded ? found.result : baseCommon.result) || found.result || '',
        score: (isMatchConcluded ? found.score : baseCommon.score) || found.score || '',
        status: (isMatchConcluded ? found.result : baseCommon.status) || found.result || baseCommon.status || 'Match Finished',
        finished: isMatchConcluded ? 1 : (baseCommon.finished ?? 0),
        isFinished: isMatchConcluded ? true : Boolean(baseCommon.isFinished)
    };

    const team1Name = baseTeam1.name || (typeof found.team1 === 'string' ? found.team1 : found.team1?.name) || t1FromTeams;
    const team2Name = baseTeam2.name || (typeof found.team2 === 'string' ? found.team2 : found.team2?.name) || t2FromTeams;

    // Resolve team rosters from fallback if missing
    let p1 = baseTeam1.players;
    let p2 = baseTeam2.players;
    if (!p1 || Object.keys(p1).length === 0) {
        const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
        const fbTourney = getFallbackTournament(targetKey);
        const tObj = fbTourney?.teamData?.[team1Name] || cachedFallbackData?.Tournaments?.[targetKey]?.teamData?.[team1Name] || {};
        p1 = buildPlayersRoster(tObj, team1Name);
    }
    if (!p2 || Object.keys(p2).length === 0) {
        const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
        const fbTourney = getFallbackTournament(targetKey);
        const tObj = fbTourney?.teamData?.[team2Name] || cachedFallbackData?.Tournaments?.[targetKey]?.teamData?.[team2Name] || {};
        p2 = buildPlayersRoster(tObj, team2Name);
    }

    const enrichedTeam1 = {
        ...baseTeam1,
        name: team1Name,
        totalRuns: (hasDataScores && Number(baseTeam1.totalRuns) > 0) ? Number(baseTeam1.totalRuns) : (parsed?.p1?.runs ?? Number(baseTeam1.totalRuns || 0)),
        totalWickets: (hasDataScores && baseTeam1.totalWickets !== undefined) ? Number(baseTeam1.totalWickets) : (parsed?.p1?.wickets ?? Number(baseTeam1.totalWickets || 0)),
        overs: (hasDataScores && Number(baseTeam1.overs) > 0) ? Number(baseTeam1.overs) : (parsed?.p1?.overs ?? Number(baseTeam1.overs || 0)),
        players: p1 || {}
    };

    const enrichedTeam2 = {
        ...baseTeam2,
        name: team2Name,
        totalRuns: (hasDataScores && Number(baseTeam2.totalRuns) > 0) ? Number(baseTeam2.totalRuns) : (parsed?.p2?.runs ?? Number(baseTeam2.totalRuns || 0)),
        totalWickets: (hasDataScores && baseTeam2.totalWickets !== undefined) ? Number(baseTeam2.totalWickets) : (parsed?.p2?.wickets ?? Number(baseTeam2.totalWickets || 0)),
        overs: (hasDataScores && Number(baseTeam2.overs) > 0) ? Number(baseTeam2.overs) : (parsed?.p2?.overs ?? Number(baseTeam2.overs || 0)),
        players: p2 || {}
    };

    return {
        ...base,
        common: enrichedCommon,
        team1: enrichedTeam1,
        team2: enrichedTeam2,
        result: enrichedCommon.result,
        score: enrichedCommon.score,
        finished: isMatchConcluded ? 1 : (base.finished ?? 0),
        isFinished: isMatchConcluded ? true : Boolean(base.isFinished)
    };
};

export const subscribeMatch = (matchTitle, callback, customTourneyId) => {
    if (!matchTitle) return () => {};
    const rawClean = decodeURIComponent(String(matchTitle)).replace(/^\//, '').split('/').pop().trim();
    const cleanTitle = rawClean;

    const resolveMatchFallback = async (targetKey, cb) => {
        try {
            const tourneySnap = await get(ref(database, `Tournaments/${targetKey}`));
            const tourneyVal = tourneySnap.val();
            if (tourneyVal) {
                const normTarget = rawClean.toLowerCase();
                const normTargetSpaced = normTarget.replace(/[-_]/g, ' ');
                const finishedMatches = tourneyVal.FixturesData?.finishedMatches || {};

                // 1. Direct key (exact or decoded)
                let directMatch = tourneyVal[cleanTitle] || tourneyVal[rawClean];
                if (directMatch) {
                    const enriched = enrichMatchWithFixturesData(directMatch, finishedMatches, cleanTitle, targetKey);
                    cb(enriched);
                    return;
                }

                // 2. Search children in tournament (matching title, matchId, id, or key)
                for (const [k, v] of Object.entries(tourneyVal)) {
                    if (!v || typeof v !== 'object' || k === 'FixturesData' || k === 'LiveData' || k === 'UpcomingMatchData' || k === 'RankingData' || k === 'teamData') continue;
                    const vTitle = String(v.common?.title || v.title || v.common?.matchId || v.id || k).trim().toLowerCase();
                    const vTitleSpaced = vTitle.replace(/[-_]/g, ' ');
                    if (vTitle === normTarget || vTitleSpaced === normTargetSpaced || String(v.id) === String(cleanTitle) || String(v.common?.matchId) === String(cleanTitle)) {
                        const enriched = enrichMatchWithFixturesData(v, finishedMatches, cleanTitle, targetKey);
                        cb(enriched);
                        return;
                    }
                }

                // 3. Check FixturesData/finishedMatches directly
                const enrichedFromFixtures = enrichMatchWithFixturesData(null, finishedMatches, cleanTitle, targetKey);
                if (enrichedFromFixtures) {
                    cb(enrichedFromFixtures);
                    return;
                }
            }
        } catch (e) {
            console.warn('Error in resolveMatchFallback:', e);
        }

        const fallbackTourney = getFallbackTournament(targetKey);
        const rawCleanFallback = decodeURIComponent(cleanTitle).trim();
        const matchFallback = fallbackTourney?.[cleanTitle] || fallbackTourney?.[rawCleanFallback] || fallbackTourney?.matches?.[cleanTitle] || fallbackTourney?.matches?.[rawCleanFallback] || cachedFallbackData?.[cleanTitle] || null;
        cb(matchFallback);
    };

    const setupMatchAndFixturesSubscription = (targetKey, cb) => {
        let latestMatchData = null;
        let latestFinishedMatches = null;
        let matchReceived = false;
        let fixturesReceived = false;

        const emitUpdated = () => {
            if (!matchReceived && !fixturesReceived) return;

            let result = enrichMatchWithFixturesData(latestMatchData, latestFinishedMatches, cleanTitle, targetKey);
            if (result && (result.team1?.players && Object.keys(result.team1.players).length > 0)) {
                cb(result);
            } else {
                resolveMatchFallback(targetKey, cb);
            }
        };

        const matchRef = ref(database, `Tournaments/${targetKey}/${cleanTitle}`);
        const unsubMatch = onValue(matchRef, (snapshot) => {
            latestMatchData = snapshot.val();
            matchReceived = true;
            emitUpdated();
        }, (error) => {
            console.warn(`Match [${cleanTitle}] error for ${targetKey}:`, error);
            matchReceived = true;
            emitUpdated();
        });

        const fixturesRef = ref(database, `Tournaments/${targetKey}/FixturesData/finishedMatches`);
        const unsubFixtures = onValue(fixturesRef, (snapshot) => {
            latestFinishedMatches = snapshot.val();
            fixturesReceived = true;
            emitUpdated();
        }, (error) => {
            console.warn(`FixturesData for Match [${cleanTitle}] error for ${targetKey}:`, error);
            fixturesReceived = true;
            emitUpdated();
        });

        return () => {
            unsubMatch();
            unsubFixtures();
        };
    };

    try {
        if (customTourneyId) {
            const targetKey = resolveTournamentKey(customTourneyId);
            return setupMatchAndFixturesSubscription(targetKey, callback);
        }

        const activeRef = ref(database, 'activeTournamentId');
        let currentUnsub = null;

        const outerUnsub = onValue(activeRef, (activeSnap) => {
            const activeId = activeSnap.val() || currentActiveTournamentId || "E-Legend's Trophy 2K26";
            currentActiveTournamentId = activeId;
            const targetKey = resolveTournamentKey(activeId);

            if (currentUnsub) currentUnsub();
            currentUnsub = setupMatchAndFixturesSubscription(targetKey, callback);
        }, () => {
            const targetKey = resolveTournamentKey(currentActiveTournamentId);
            resolveMatchFallback(targetKey, callback);
        });

        return () => {
            if (currentUnsub) currentUnsub();
            outerUnsub();
        };
    } catch (error) {
        console.error('Error subscribing to match:', error);
        const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
        resolveMatchFallback(targetKey, callback);
        return () => {};
    }
};

export const getMatchData = async (matchTitle, customTourneyId) => {
    if (!matchTitle) return null;
    const cleanTitle = decodeURIComponent(String(matchTitle || '')).replace(/^\//, '').split('/').pop().trim();
    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
    try {
        const [matchSnap, fixturesSnap] = await Promise.all([
            get(ref(database, `Tournaments/${targetKey}/${cleanTitle}`)),
            get(ref(database, `Tournaments/${targetKey}/FixturesData/finishedMatches`))
        ]);

        const rawData = matchSnap.exists() ? matchSnap.val() : null;
        const finishedMatches = fixturesSnap.exists() ? fixturesSnap.val() : {};

        // If direct match snap has full data with players, return enriched
        if (rawData && rawData.team1?.players && Object.keys(rawData.team1.players).length > 0) {
            const enriched = enrichMatchWithFixturesData(rawData, finishedMatches, cleanTitle, targetKey);
            if (enriched) return enriched;
        }

        // Check if cleanTitle was a match ID in finishedMatches and points to a known title
        for (const [k, f] of Object.entries(finishedMatches)) {
            if (!f) continue;
            const fId = String(f.id || k);
            const fTitle = String(f.title || '').trim();
            if ((fId === cleanTitle || String(f.id) === cleanTitle) && fTitle && fTitle !== cleanTitle) {
                const altSnap = await get(ref(database, `Tournaments/${targetKey}/${fTitle}`));
                if (altSnap.exists()) {
                    const enriched = enrichMatchWithFixturesData(altSnap.val(), finishedMatches, cleanTitle, targetKey);
                    if (enriched) return enriched;
                }
            }
        }

        const enriched = enrichMatchWithFixturesData(rawData, finishedMatches, cleanTitle, targetKey);
        if (enriched && enriched.team1?.players && Object.keys(enriched.team1.players).length > 0) return enriched;

        const tourneySnap = await get(ref(database, `Tournaments/${targetKey}`));
        const tourneyVal = tourneySnap.val();
        if (tourneyVal) {
            const normTarget = String(cleanTitle).trim().toLowerCase();
            const normTargetSpaced = normTarget.replace(/[-_]/g, ' ');
            for (const [k, v] of Object.entries(tourneyVal)) {
                if (!v || typeof v !== 'object') continue;
                const title = String(v.common?.title || v.title || v.id || k).trim().toLowerCase();
                const titleSpaced = title.replace(/[-_]/g, ' ');
                if (title === normTarget || titleSpaced === normTargetSpaced || String(v.id) === String(cleanTitle) || String(v.common?.matchId) === String(cleanTitle)) {
                    return enrichMatchWithFixturesData(v, finishedMatches, cleanTitle, targetKey);
                }
            }
        }
        if (enriched) return enriched;

        const fallbackTourney = getFallbackTournament(targetKey);
        return fallbackTourney?.[cleanTitle] || fallbackTourney?.matches?.[cleanTitle] || cachedFallbackData?.[cleanTitle] || null;
    } catch (e) {
        const fallbackTourney = getFallbackTournament(targetKey);
        return fallbackTourney?.[cleanTitle] || fallbackTourney?.matches?.[cleanTitle] || cachedFallbackData?.[cleanTitle] || null;
    }
};

export const updateMatchData = async (matchTitle, data, customTourneyId) => {
    const cleanTitle = String(matchTitle || '').replace(/^\//, '').split('/').pop();
    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
    const matchRef = ref(database, `Tournaments/${targetKey}/${cleanTitle}`);
    return update(matchRef, data);
};

export const setMatchData = async (matchTitle, data, customTourneyId) => {
    const cleanTitle = String(matchTitle || '').replace(/^\//, '').split('/').pop();
    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
    const matchRef = ref(database, `Tournaments/${targetKey}/${cleanTitle}`);
    return set(matchRef, data);
};

/**
 * Completely delete a match from RTDB:
 * 1. Removes from {tournament_name}/{match_name} (Tournaments/${targetKey}/${cleanTitle} and numeric ID node if distinct)
 * 2. Removes from FixturesData (finishedMatches, publishedMatches, draftMatches) under both targetKey and root
 * 3. Removes from UpcomingMatchData (upcomingMatches) under both targetKey and root
 */
export const deleteMatchCompletely = async (matchOrKey, customTourneyId) => {
    if (!matchOrKey) return;

    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);

    const matchId = matchOrKey?.id ? String(matchOrKey.id).trim() : (typeof matchOrKey === 'string' ? matchOrKey.trim() : '');
    const matchTitle = matchOrKey?.title || matchOrKey?.name || (typeof matchOrKey === 'string' ? matchOrKey : '');
    const cleanTitle = decodeURIComponent(String(matchTitle || matchId || '')).replace(/^\//, '').split('/').pop().trim();
    const normTitle = cleanTitle.toLowerCase();
    const normId = matchId.toLowerCase();

    const teamsStr = String(matchOrKey?.teams || '').toLowerCase();
    const [t1 = '', t2 = ''] = teamsStr.split(' vs ').map(s => s.trim());

    // 1. Delete root match node in Tournaments/${targetKey}/${cleanTitle}
    if (cleanTitle) {
        try {
            await remove(ref(database, `Tournaments/${targetKey}/${cleanTitle}`));
        } catch (err) {
            console.warn(`Could not remove Tournaments/${targetKey}/${cleanTitle}:`, err);
        }
    }

    // Also delete Tournaments/${targetKey}/${matchId} if distinct from cleanTitle
    if (matchId && matchId !== cleanTitle) {
        try {
            await remove(ref(database, `Tournaments/${targetKey}/${matchId}`));
        } catch (err) {
            console.warn(`Could not remove Tournaments/${targetKey}/${matchId}:`, err);
        }
    }

    // 2. Helper to remove from a fixtures collection (finishedMatches, publishedMatches, draftMatches)
    const removeFromFixturesCollection = async (collectionPath) => {
        try {
            const colRef = ref(database, collectionPath);
            const snap = await get(colRef);
            const map = snap.val();
            if (!map || typeof map !== 'object') return;

            const keysToRemove = [];

            // Direct key hits
            if (matchId && map[matchId] !== undefined) keysToRemove.push(matchId);
            if (cleanTitle && map[cleanTitle] !== undefined && !keysToRemove.includes(cleanTitle)) keysToRemove.push(cleanTitle);

            // Deep scan for match by id, title, or teams
            Object.entries(map).forEach(([k, item]) => {
                if (!item || keysToRemove.includes(k)) return;
                const itemTitle = String(item.title || item.name || '').trim().toLowerCase();
                const itemId = String(item.id || k).trim().toLowerCase();
                const itemTeams = String(item.teams || '').trim().toLowerCase();

                const isSameId = (normId && itemId === normId) || (normTitle && itemId === normTitle);
                const isSameTitle = (normTitle && itemTitle === normTitle) || (normId && itemTitle === normId);
                const isSameTeams = t1 && t2 && itemTeams.includes(t1) && itemTeams.includes(t2);

                if (isSameId || isSameTitle || isSameTeams) {
                    keysToRemove.push(k);
                }
            });

            for (const k of keysToRemove) {
                await remove(ref(database, `${collectionPath}/${k}`));
            }
        } catch (err) {
            console.warn(`Error removing from ${collectionPath}:`, err);
        }
    };

    // Remove from all FixturesData collections
    await removeFromFixturesCollection(`Tournaments/${targetKey}/FixturesData/finishedMatches`);
    await removeFromFixturesCollection(`Tournaments/${targetKey}/FixturesData/publishedMatches`);
    await removeFromFixturesCollection(`Tournaments/${targetKey}/FixturesData/draftMatches`);
    await removeFromFixturesCollection(`FixturesData/finishedMatches`);

    // 3. Remove from UpcomingMatchData
    const removeFromUpcomingCollection = async (upcomingPath) => {
        try {
            const upRef = ref(database, upcomingPath);
            const snap = await get(upRef);
            const upMap = snap.val();
            if (!upMap || typeof upMap !== 'object') return;

            const keysToRemove = [];
            if (matchId && upMap[matchId] !== undefined) keysToRemove.push(matchId);
            if (cleanTitle && upMap[cleanTitle] !== undefined && !keysToRemove.includes(cleanTitle)) keysToRemove.push(cleanTitle);

            Object.entries(upMap).forEach(([k, item]) => {
                if (!item || keysToRemove.includes(k)) return;
                const itemTitle = String(item.title || item.name || '').trim().toLowerCase();
                const itemId = String(item.id || k).trim().toLowerCase();
                const itemTeams = String(item.teams || '').trim().toLowerCase();

                const isSameId = (normId && itemId === normId) || (normTitle && itemId === normTitle);
                const isSameTitle = (normTitle && itemTitle === normTitle) || (normId && itemTitle === normId);
                const isSameTeams = t1 && t2 && itemTeams.includes(t1) && itemTeams.includes(t2);

                if (isSameId || isSameTitle || isSameTeams) {
                    keysToRemove.push(k);
                }
            });

            for (const k of keysToRemove) {
                await remove(ref(database, `${upcomingPath}/${k}`));
            }
        } catch (err) {
            console.warn(`Error removing from ${upcomingPath}:`, err);
        }
    };

    await removeFromUpcomingCollection(`Tournaments/${targetKey}/UpcomingMatchData/upcomingMatches`);
    await removeFromUpcomingCollection(`UpcomingMatchData/upcomingMatches`);
};

export const deleteMatchData = async (matchKey, customTourneyId) => {
    return deleteMatchCompletely(matchKey, customTourneyId);
};

/* ==========================================================================
   FIXTURES & SCHEDULES (Scoped to active tournament)
   ========================================================================== */

export const subscribeFixtures = (callback, customTourneyId) => {
    try {
        if (customTourneyId) {
            const targetKey = resolveTournamentKey(customTourneyId);
            const fixturesRef = ref(database, `Tournaments/${targetKey}/FixturesData`);
            const unsub = onValue(fixturesRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    callback(data);
                } else {
                    const fallbackTourney = getFallbackTournament(targetKey);
                    callback(fallbackTourney?.FixturesData || { isFixtures: 1, finishedMatches: {} });
                }
            }, (error) => {
                console.warn(`FixturesData error for ${targetKey}:`, error);
                const fallbackTourney = getFallbackTournament(targetKey);
                callback(fallbackTourney?.FixturesData || { isFixtures: 1, finishedMatches: {} });
            });
            return unsub;
        }

        const activeRef = ref(database, 'activeTournamentId');
        let currentUnsub = null;

        const outerUnsub = onValue(activeRef, (activeSnap) => {
            const activeId = activeSnap.val() || currentActiveTournamentId || "E-Legend's Trophy 2K26";
            currentActiveTournamentId = activeId;
            const targetKey = resolveTournamentKey(activeId);

            if (currentUnsub) currentUnsub();

            const fixturesRef = ref(database, `Tournaments/${targetKey}/FixturesData`);
            currentUnsub = onValue(fixturesRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    callback(data);
                } else {
                    const fallbackTourney = getFallbackTournament(targetKey);
                    callback(fallbackTourney?.FixturesData || { isFixtures: 1, finishedMatches: {} });
                }
            }, (error) => {
                console.warn(`FixturesData error for ${targetKey}:`, error);
                const fallbackTourney = getFallbackTournament(targetKey);
                callback(fallbackTourney?.FixturesData || { isFixtures: 1, finishedMatches: {} });
            });
        }, () => {
            const targetKey = resolveTournamentKey(currentActiveTournamentId);
            const fallbackTourney = getFallbackTournament(targetKey);
            callback(fallbackTourney?.FixturesData || { isFixtures: 1, finishedMatches: {} });
        });

        return () => {
            if (currentUnsub) currentUnsub();
            outerUnsub();
        };
    } catch (error) {
        console.error('Error subscribing to FixturesData:', error);
        const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
        const fallbackTourney = getFallbackTournament(targetKey);
        callback(fallbackTourney?.FixturesData || { isFixtures: 1, finishedMatches: {} });
        return () => {};
    }
};

export const subscribeUpcoming = (callback, customTourneyId) => {
    try {
        if (customTourneyId) {
            const targetKey = resolveTournamentKey(customTourneyId);
            const upcomingRef = ref(database, `Tournaments/${targetKey}/UpcomingMatchData`);
            const unsub = onValue(upcomingRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    callback(data);
                } else {
                    const fallbackTourney = getFallbackTournament(targetKey);
                    callback(fallbackTourney?.UpcomingMatchData || { isUpcoming: 1 });
                }
            }, () => {
                const fallbackTourney = getFallbackTournament(targetKey);
                callback(fallbackTourney?.UpcomingMatchData || { isUpcoming: 1 });
            });
            return unsub;
        }

        const activeRef = ref(database, 'activeTournamentId');
        let currentUnsub = null;

        const outerUnsub = onValue(activeRef, (activeSnap) => {
            const activeId = activeSnap.val() || currentActiveTournamentId || "E-Legend's Trophy 2K26";
            currentActiveTournamentId = activeId;
            const targetKey = resolveTournamentKey(activeId);

            if (currentUnsub) currentUnsub();

            const upcomingRef = ref(database, `Tournaments/${targetKey}/UpcomingMatchData`);
            currentUnsub = onValue(upcomingRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    callback(data);
                } else {
                    const fallbackTourney = getFallbackTournament(targetKey);
                    callback(fallbackTourney?.UpcomingMatchData || { isUpcoming: 1 });
                }
            }, () => {
                const fallbackTourney = getFallbackTournament(targetKey);
                callback(fallbackTourney?.UpcomingMatchData || { isUpcoming: 1 });
            });
        }, () => {
            const targetKey = resolveTournamentKey(currentActiveTournamentId);
            const fallbackTourney = getFallbackTournament(targetKey);
            callback(fallbackTourney?.UpcomingMatchData || { isUpcoming: 1 });
        });

        return () => {
            if (currentUnsub) currentUnsub();
            outerUnsub();
        };
    } catch (error) {
        console.error('Error subscribing to UpcomingMatchData:', error);
        const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
        const fallbackTourney = getFallbackTournament(targetKey);
        callback(fallbackTourney?.UpcomingMatchData || { isUpcoming: 1 });
        return () => {};
    }
};

export const saveFinishedMatch = async (matchId, matchSummary, customTourneyId) => {
    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
    let targetKeyToUse = matchId;

    // 1. In FixturesData/finishedMatches: update existing fixture in-place (do not create duplicate schedule cards in draw)
    try {
        const fixturesRef = ref(database, `Tournaments/${targetKey}/FixturesData/finishedMatches`);
        const snapshot = await get(fixturesRef);
        const fixturesMap = snapshot.val() || {};

        const normTitle = String(matchSummary.title || '').trim().toLowerCase();
        const normSummaryTeams = String(matchSummary.teams || '').trim().toLowerCase();
        const summaryTeamsList = normSummaryTeams.split(' vs ').map(s => s.trim()).filter(Boolean);

        let existingFixtureKey = null;
        const duplicateKeysToDelete = [];

        Object.entries(fixturesMap).forEach(([k, item]) => {
            if (!item) return;
            const itemTitle = String(item.title || item.name || '').trim().toLowerCase();
            const itemTeams = String(item.teams || '').trim().toLowerCase();
            const itemId = String(item.id || k);

            const isSameId = itemId === String(matchId);
            const isSameTitle = itemTitle && normTitle && (itemTitle === normTitle);
            const isSameTeams = summaryTeamsList.length === 2 &&
                itemTeams.includes(summaryTeamsList[0]) &&
                itemTeams.includes(summaryTeamsList[1]);

            if (isSameId || isSameTitle || isSameTeams) {
                if (!existingFixtureKey) {
                    existingFixtureKey = k;
                } else {
                    // Queue previously created duplicate cards for cleanup
                    duplicateKeysToDelete.push(k);
                }
            }
        });

        targetKeyToUse = existingFixtureKey || matchId;
        const existingData = fixturesMap[targetKeyToUse] || {};

        // Update in-place to preserve schedule metadata (date, time, venue, umpires)
        const finishRef = ref(database, `Tournaments/${targetKey}/FixturesData/finishedMatches/${targetKeyToUse}`);
        await set(finishRef, {
            ...existingData,
            ...matchSummary,
            id: existingData.id || targetKeyToUse,
            active: 1,
            finished: 1,
            isFinished: true
        });

        // Clean up duplicate keys in draw if any exist
        for (const dupKey of duplicateKeysToDelete) {
            await remove(ref(database, `Tournaments/${targetKey}/FixturesData/finishedMatches/${dupKey}`));
        }
    } catch (err) {
        console.error('Error updating finished match in FixturesData:', err);
        const finishRef = ref(database, `Tournaments/${targetKey}/FixturesData/finishedMatches/${targetKeyToUse}`);
        await set(finishRef, {
            active: 1,
            id: targetKeyToUse,
            finished: 1,
            isFinished: true,
            ...matchSummary
        });
    }

    // 2. Remove completed match from UpcomingMatchData (both tournament-scoped and root level)
    try {
        const normTitle = String(matchSummary.title || '').trim().toLowerCase();
        const normSummaryTeams = String(matchSummary.teams || '').trim().toLowerCase();
        const summaryTeamsList = normSummaryTeams.split(' vs ').map(s => s.trim()).filter(Boolean);

        const removeMatchingUpcoming = async (path) => {
            const upRef = ref(database, path);
            const snap = await get(upRef);
            const upMap = snap.val();
            if (!upMap || typeof upMap !== 'object') return;

            for (const [key, item] of Object.entries(upMap)) {
                if (!item) continue;
                const itemTitle = String(item.title || item.name || '').trim().toLowerCase();
                const itemTeams = String(item.teams || '').trim().toLowerCase();
                const itemId = String(item.id || key);

                const isSameId = itemId === String(matchId);
                const isSameTitle = itemTitle && normTitle && (itemTitle === normTitle);
                const isSameTeams = summaryTeamsList.length === 2 &&
                    itemTeams.includes(summaryTeamsList[0]) &&
                    itemTeams.includes(summaryTeamsList[1]);

                if (isSameId || isSameTitle || isSameTeams) {
                    await remove(ref(database, `${path}/${key}`));
                }
            }
        };

        await removeMatchingUpcoming(`Tournaments/${targetKey}/UpcomingMatchData/upcomingMatches`);
        await removeMatchingUpcoming(`UpcomingMatchData/upcomingMatches`);
    } catch (err) {
        console.error('Error removing finished match from UpcomingMatchData:', err);
    }
};

export const updateFixturesData = async (data, customTourneyId) => {
    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
    const fixturesRef = ref(database, `Tournaments/${targetKey}/FixturesData`);
    return update(fixturesRef, data);
};

/* ==========================================================================
   RANKINGS & POINTS TABLE (Scoped to active tournament)
   ========================================================================== */

export const normalizeRankingData = (raw) => {
    if (!raw) return { batters: {}, bowlers: {}, pointsTable: [] };
    const normalized = { ...raw };

    const parseOversToBallsLocal = (ov) => {
        if (ov === null || ov === undefined || ov === '') return 0;
        const ovNum = typeof ov === 'string' ? parseFloat(ov) : Number(ov);
        if (isNaN(ovNum)) return 0;
        const fullOvers = Math.floor(ovNum);
        const remBalls = Math.round((ovNum - fullOvers) * 10);
        return (fullOvers * 6) + remBalls;
    };

    if (normalized.batters) {
        const normBatters = {};
        Object.entries(normalized.batters).forEach(([k, b]) => {
            if (!b) return;
            const scores = Number(b.scores ?? b.runs ?? b.score ?? b.rating ?? 0);
            const balls = Number(b.balls || (b.overs ? parseOversToBallsLocal(b.overs) : 0));
            const overs = b.overs || b.oversPlayed || (balls > 0 ? `${Math.floor(balls / 6)}.${balls % 6}` : '0.0');
            const strikeRate = b.strikeRate !== undefined
                ? Number(b.strikeRate)
                : (balls > 0 ? parseFloat(((scores / balls) * 100).toFixed(2)) : 0.00);

            normBatters[k] = {
                ...b,
                scores,
                runs: scores,
                balls,
                overs,
                oversPlayed: overs,
                strikeRate
            };
        });
        normalized.batters = normBatters;
    }

    if (normalized.bowlers) {
        const normBowlers = {};
        Object.entries(normalized.bowlers).forEach(([k, b]) => {
            if (!b) return;
            const wickets = Number(b.wickets ?? b.takenWickets ?? b.rating ?? 0);
            const balls = Number(b.balls || (b.overs ? parseOversToBallsLocal(b.overs) : 0));
            const overs = b.overs || b.oversBowled || (balls > 0 ? `${Math.floor(balls / 6)}.${balls % 6}` : '0.0');
            const runsConceded = Number(b.runsConceded ?? b.runs ?? 0);
            const economy = b.economy !== undefined
                ? Number(b.economy)
                : (balls > 0 ? parseFloat(((runsConceded * 6) / balls).toFixed(2)) : 0.00);

            normBowlers[k] = {
                ...b,
                wickets,
                takenWickets: wickets,
                balls,
                overs,
                oversBowled: overs,
                runsConceded,
                runs: runsConceded,
                economy
            };
        });
        normalized.bowlers = normBowlers;
    }

    return normalized;
};

export const subscribeRankings = (callback) => {
    try {
        const activeRef = ref(database, 'activeTournamentId');
        let currentUnsub = null;

        const safeCallback = (data) => {
            callback(normalizeRankingData(data));
        };

        const outerUnsub = onValue(activeRef, (activeSnap) => {
            const activeId = activeSnap.val() || currentActiveTournamentId || "E-Legend's Trophy 2K26";
            currentActiveTournamentId = activeId;
            const targetKey = resolveTournamentKey(activeId);

            if (currentUnsub) currentUnsub();

            const rankingRef = ref(database, `Tournaments/${targetKey}/RankingData`);
            currentUnsub = onValue(rankingRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    safeCallback(data);
                } else {
                    const fallbackTourney = getFallbackTournament(targetKey);
                    safeCallback(fallbackTourney?.RankingData || { batters: {}, bowlers: {}, pointsTable: [] });
                }
            }, (error) => {
                console.warn(`RankingData error for ${targetKey}:`, error);
                const fallbackTourney = getFallbackTournament(targetKey);
                safeCallback(fallbackTourney?.RankingData || { batters: {}, bowlers: {}, pointsTable: [] });
            });
        }, () => {
            const targetKey = resolveTournamentKey(currentActiveTournamentId);
            const fallbackTourney = getFallbackTournament(targetKey);
            safeCallback(fallbackTourney?.RankingData || { batters: {}, bowlers: {}, pointsTable: [] });
        });

        return () => {
            if (currentUnsub) currentUnsub();
            outerUnsub();
        };
    } catch (error) {
        console.error('Error subscribing to RankingData:', error);
        const targetKey = resolveTournamentKey(currentActiveTournamentId);
        const fallbackTourney = getFallbackTournament(targetKey);
        callback(normalizeRankingData(fallbackTourney?.RankingData || { batters: {}, bowlers: {}, pointsTable: [] }));
        return () => {};
    }
};

export const updateRankings = async (rankingsData, customTourneyId) => {
    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
    const rankingRef = ref(database, `Tournaments/${targetKey}/RankingData`);
    return update(rankingRef, rankingsData);
};

/**
 * Automatically updates tournament rankings (Points Table, Top Batters, Top Bowlers)
 * when a match is finalized. Scoped to the selected tournament.
 */
export const recordMatchRankings = async (finishedMatchPayload, customTourneyId) => {
    try {
        // Special Match Safeguard: Exhibition / Friendly matches do NOT affect tournament rankings or points table
        if (finishedMatchPayload?.isSpecial || finishedMatchPayload?.matchType === 'special') {
            console.log('Special match concluded - skipping tournament rankings & points table update.');
            return;
        }

        const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
        const rankingRef = ref(database, `Tournaments/${targetKey}/RankingData`);
        const snapshot = await get(rankingRef);
        let rankingData = snapshot.val();

        if (!rankingData) {
            const fallbackTourney = getFallbackTournament(targetKey);
            rankingData = JSON.parse(JSON.stringify(fallbackTourney?.RankingData || { batters: {}, bowlers: {}, pointsTable: [] }));
        } else {
            rankingData = JSON.parse(JSON.stringify(rankingData));
        }

        const team1 = finishedMatchPayload?.team1 || {};
        const team2 = finishedMatchPayload?.team2 || {};
        const t1Name = (team1.name || 'Team 1').trim();
        const t2Name = (team2.name || 'Team 2').trim();
        const t1Runs = Number(team1.totalRuns || 0);
        const t2Runs = Number(team2.totalRuns || 0);
        const t1Wickets = Number(team1.totalWickets || 0);
        const t2Wickets = Number(team2.totalWickets || 0);
        const t1Balls = Number(team1.totalBalls || 0);
        const t2Balls = Number(team2.totalBalls || 0);
        const maxOvers = Number(finishedMatchPayload?.common?.overLimit || 15);

        // Helper to compute effective overs faced for cricket NRR
        const getEffectiveOversFaced = (oversStr, balls, wickets, limit) => {
            if (wickets >= 10) return limit; // All out counts as full allocation
            if (balls > 0) {
                return Math.floor(balls / 6) + ((balls % 6) / 6);
            }
            if (oversStr !== undefined && oversStr !== null) {
                const parts = String(oversStr).split('.');
                const comp = parseInt(parts[0] || '0', 10);
                const rem = parseInt(parts[1] || '0', 10);
                return comp + (rem / 6);
            }
            return limit;
        };

        const t1OversFaced = Math.max(0.1, getEffectiveOversFaced(team1.overs, t1Balls, t1Wickets, maxOvers));
        const t2OversFaced = Math.max(0.1, getEffectiveOversFaced(team2.overs, t2Balls, t2Wickets, maxOvers));

        // 1. UPDATE POINTS TABLE
        let rawPointsTable = rankingData.pointsTable || [];
        let pointsList = Array.isArray(rawPointsTable)
            ? rawPointsTable.filter(Boolean)
            : Object.values(rawPointsTable).filter(Boolean);

        const findOrCreateTeam = (tName) => {
            const clean = tName.toLowerCase();
            let entry = pointsList.find(item => (item.team || '').trim().toLowerCase() === clean);
            if (!entry) {
                const maxId = pointsList.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
                entry = {
                    id: maxId + 1,
                    team: tName,
                    played: 0,
                    won: 0,
                    lost: 0,
                    nr: 0,
                    pts: 0,
                    nrr: 0,
                    runsFor: 0,
                    oversFor: 0,
                    runsAgainst: 0,
                    oversAgainst: 0
                };
                pointsList.push(entry);
            }
            return entry;
        };

        const t1Entry = findOrCreateTeam(t1Name);
        const t2Entry = findOrCreateTeam(t2Name);

        const outcome = getMatchOutcome(finishedMatchPayload);
        const t1Won = outcome.winningTeamKey === 'team1';
        const t2Won = outcome.winningTeamKey === 'team2';

        // Team 1 Points Table Update
        const t1PrevPlayed = Number(t1Entry.played || 0);
        t1Entry.played = t1PrevPlayed + 1;
        if (t1Won) {
            t1Entry.won = (Number(t1Entry.won) || 0) + 1;
            t1Entry.pts = (Number(t1Entry.pts) || 0) + 2;
        } else if (t2Won) {
            t1Entry.lost = (Number(t1Entry.lost) || 0) + 1;
        } else {
            t1Entry.nr = (Number(t1Entry.nr) || 0) + 1;
            t1Entry.pts = (Number(t1Entry.pts) || 0) + 1;
        }

        // Team 2 Points Table Update
        const t2PrevPlayed = Number(t2Entry.played || 0);
        t2Entry.played = t2PrevPlayed + 1;
        if (t2Won) {
            t2Entry.won = (Number(t2Entry.won) || 0) + 1;
            t2Entry.pts = (Number(t2Entry.pts) || 0) + 2;
        } else if (t1Won) {
            t2Entry.lost = (Number(t2Entry.lost) || 0) + 1;
        } else {
            t2Entry.nr = (Number(t2Entry.nr) || 0) + 1;
            t2Entry.pts = (Number(t2Entry.pts) || 0) + 1;
        }

        // Net Run Rate Updates (Standard cumulative cricket NRR formula)
        const t1MatchRRFor = t1Runs / t1OversFaced;
        const t1MatchRRAgainst = t2Runs / t2OversFaced;
        const t1MatchNRR = t1MatchRRFor - t1MatchRRAgainst;

        const t2MatchRRFor = t2Runs / t2OversFaced;
        const t2MatchRRAgainst = t1Runs / t1OversFaced;
        const t2MatchNRR = t2MatchRRFor - t2MatchRRAgainst;

        if (t1Entry.runsFor !== undefined && t1Entry.oversFor !== undefined && t1Entry.oversFor > 0) {
            t1Entry.runsFor = (Number(t1Entry.runsFor) || 0) + t1Runs;
            t1Entry.oversFor = (Number(t1Entry.oversFor) || 0) + t1OversFaced;
            t1Entry.runsAgainst = (Number(t1Entry.runsAgainst) || 0) + t2Runs;
            t1Entry.oversAgainst = (Number(t1Entry.oversAgainst) || 0) + t2OversFaced;
            t1Entry.nrr = parseFloat(((t1Entry.runsFor / t1Entry.oversFor) - (t1Entry.runsAgainst / t1Entry.oversAgainst)).toFixed(2));
        } else {
            t1Entry.runsFor = t1Runs;
            t1Entry.oversFor = t1OversFaced;
            t1Entry.runsAgainst = t2Runs;
            t1Entry.oversAgainst = t2OversFaced;
            const prevNRR = Number(t1Entry.nrr || 0);
            t1Entry.nrr = t1PrevPlayed > 0
                ? parseFloat((((prevNRR * t1PrevPlayed) + t1MatchNRR) / (t1PrevPlayed + 1)).toFixed(2))
                : parseFloat(t1MatchNRR.toFixed(2));
        }

        if (t2Entry.runsFor !== undefined && t2Entry.oversFor !== undefined && t2Entry.oversFor > 0) {
            t2Entry.runsFor = (Number(t2Entry.runsFor) || 0) + t2Runs;
            t2Entry.oversFor = (Number(t2Entry.oversFor) || 0) + t2OversFaced;
            t2Entry.runsAgainst = (Number(t2Entry.runsAgainst) || 0) + t1Runs;
            t2Entry.oversAgainst = (Number(t2Entry.oversAgainst) || 0) + t1OversFaced;
            t2Entry.nrr = parseFloat(((t2Entry.runsFor / t2Entry.oversFor) - (t2Entry.runsAgainst / t2Entry.oversAgainst)).toFixed(2));
        } else {
            t2Entry.runsFor = t2Runs;
            t2Entry.oversFor = t2OversFaced;
            t2Entry.runsAgainst = t1Runs;
            t2Entry.oversAgainst = t1OversFaced;
            const prevNRR = Number(t2Entry.nrr || 0);
            t2Entry.nrr = t2PrevPlayed > 0
                ? parseFloat((((prevNRR * t2PrevPlayed) + t2MatchNRR) / (t2PrevPlayed + 1)).toFixed(2))
                : parseFloat(t2MatchNRR.toFixed(2));
        }

        // Sort points table: PTS descending, then NRR descending
        pointsList.sort((a, b) => {
            if (b.pts !== a.pts) return (b.pts || 0) - (a.pts || 0);
            return (b.nrr || 0) - (a.nrr || 0);
        });

        rankingData.pointsTable = pointsList;

        // Helper to convert cricket overs (number or string, e.g. "3.2" or 3.2) to total legal balls
        const parseOversToBalls = (ov) => {
            if (ov === null || ov === undefined || ov === '') return 0;
            const ovNum = typeof ov === 'string' ? parseFloat(ov) : Number(ov);
            if (isNaN(ovNum)) return 0;
            const fullOvers = Math.floor(ovNum);
            const remBalls = Math.round((ovNum - fullOvers) * 10);
            return (fullOvers * 6) + remBalls;
        };

        // 2. UPDATE BATTERS LEADERBOARD (Store scores, overs, strike rate - not rating)
        rankingData.batters = rankingData.batters || {};
        const allBattersFromMatch = [
            ...Object.values(team1.players || {}).map(p => ({ ...p, team: t1Name })),
            ...Object.values(team2.players || {}).map(p => ({ ...p, team: t2Name }))
        ];

        allBattersFromMatch.forEach(p => {
            const matchRuns = Number(p.runs || 0);
            const matchBalls = Number(p.balls || 0);
            if (matchRuns > 0 || matchBalls > 0) {
                // Find existing batter in leaderboard
                const existingKey = Object.keys(rankingData.batters).find(k => {
                    const b = rankingData.batters[k];
                    if (!b || !b.name || !p.name) return false;
                    const sameName = b.name.trim().toLowerCase() === p.name.trim().toLowerCase();
                    const sameTeam = !b.team || !p.team || b.team.trim().toLowerCase() === p.team.trim().toLowerCase();
                    return sameName && sameTeam;
                });

                if (existingKey) {
                    const currentB = rankingData.batters[existingKey];
                    const prevScores = Number(currentB.scores ?? currentB.runs ?? currentB.rating ?? 0);
                    const totalScores = prevScores + matchRuns;

                    // Accumulate balls faced and calculate overs played
                    const prevBalls = Number(currentB.balls || (currentB.overs ? parseOversToBalls(currentB.overs) : 0));
                    const totalBalls = prevBalls + matchBalls;
                    const totalOversPlayed = totalBalls > 0
                        ? `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`
                        : '0.0';

                    // Strike rate = (Scores / Balls) * 100
                    const strikeRate = totalBalls > 0
                        ? parseFloat(((totalScores / totalBalls) * 100).toFixed(2))
                        : 0.00;

                    const updatedBatter = {
                        ...currentB,
                        scores: totalScores,
                        runs: totalScores,
                        balls: totalBalls,
                        overs: totalOversPlayed,
                        oversPlayed: totalOversPlayed,
                        strikeRate: strikeRate
                    };
                    // User explicitly requested: "store scores (not rating)"
                    delete updatedBatter.rating;

                    rankingData.batters[existingKey] = updatedBatter;
                } else if (matchRuns > 0 || matchBalls > 0) {
                    const bKey = String(p.id || `bat_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
                    const totalScores = matchRuns;
                    const totalBalls = matchBalls;
                    const totalOversPlayed = totalBalls > 0
                        ? `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`
                        : '0.0';
                    const strikeRate = totalBalls > 0
                        ? parseFloat(((totalScores / totalBalls) * 100).toFixed(2))
                        : 0.00;

                    rankingData.batters[bKey] = {
                        id: p.id || bKey,
                        name: p.name,
                        team: p.team,
                        scores: totalScores,
                        runs: totalScores,
                        balls: totalBalls,
                        overs: totalOversPlayed,
                        oversPlayed: totalOversPlayed,
                        strikeRate: strikeRate
                    };
                }
            }
        });

        // 3. UPDATE BOWLERS LEADERBOARD (Store taken wickets, overs bowled, economy - not rating)
        rankingData.bowlers = rankingData.bowlers || {};
        const allBowlersFromMatch = [
            ...Object.values(team1.bowlers || {}).map(b => ({ ...b, team: t1Name })),
            ...Object.values(team2.bowlers || {}).map(b => ({ ...b, team: t2Name }))
        ];

        allBowlersFromMatch.forEach(b => {
            const matchWickets = Number(b.wickets || 0);
            const matchBalls = b.balls !== undefined ? Number(b.balls) : parseOversToBalls(b.overs);
            const matchRunsConceded = Number(b.runs || 0);

            if (matchWickets > 0 || matchBalls > 0 || Number(b.overs || 0) > 0) {
                const existingKey = Object.keys(rankingData.bowlers).find(k => {
                    const eb = rankingData.bowlers[k];
                    if (!eb || !eb.name || !b.name) return false;
                    const sameName = eb.name.trim().toLowerCase() === b.name.trim().toLowerCase();
                    const sameTeam = !eb.team || !b.team || eb.team.trim().toLowerCase() === b.team.trim().toLowerCase();
                    return sameName && sameTeam;
                });

                if (existingKey) {
                    const currentBowler = rankingData.bowlers[existingKey];
                    const prevWickets = Number(currentBowler.wickets ?? currentBowler.takenWickets ?? currentBowler.rating ?? 0);
                    const totalWickets = prevWickets + matchWickets;

                    const prevBalls = Number(currentBowler.balls || parseOversToBalls(currentBowler.overs));
                    const totalBalls = prevBalls + matchBalls;
                    const totalOversBowled = totalBalls > 0
                        ? `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`
                        : '0.0';

                    const prevRunsConceded = Number(currentBowler.runsConceded ?? currentBowler.runs ?? 0);
                    const totalRunsConceded = prevRunsConceded + matchRunsConceded;

                    // Economy = (Runs Conceded * 6) / Total Legal Balls
                    const economy = totalBalls > 0
                        ? parseFloat(((totalRunsConceded * 6) / totalBalls).toFixed(2))
                        : 0.00;

                    const updatedBowler = {
                        ...currentBowler,
                        wickets: totalWickets,
                        takenWickets: totalWickets,
                        balls: totalBalls,
                        overs: totalOversBowled,
                        oversBowled: totalOversBowled,
                        runsConceded: totalRunsConceded,
                        runs: totalRunsConceded,
                        economy: economy
                    };
                    // User explicitly requested: "store Taken wickets (not rating)"
                    delete updatedBowler.rating;

                    rankingData.bowlers[existingKey] = updatedBowler;
                } else if (matchWickets > 0 || matchBalls > 0 || Number(b.overs || 0) > 0) {
                    const bowlKey = String(b.id || `bowl_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
                    const totalWickets = matchWickets;
                    const totalBalls = matchBalls;
                    const totalOversBowled = totalBalls > 0
                        ? `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`
                        : '0.0';
                    const totalRunsConceded = matchRunsConceded;
                    const economy = totalBalls > 0
                        ? parseFloat(((totalRunsConceded * 6) / totalBalls).toFixed(2))
                        : 0.00;

                    rankingData.bowlers[bowlKey] = {
                        id: b.id || bowlKey,
                        name: b.name,
                        team: b.team,
                        wickets: totalWickets,
                        takenWickets: totalWickets,
                        balls: totalBalls,
                        overs: totalOversBowled,
                        oversBowled: totalOversBowled,
                        runsConceded: totalRunsConceded,
                        runs: totalRunsConceded,
                        economy: economy
                    };
                }
            }
        });

        // 4. PERSIST UPDATED RANKINGS TO FIREBASE REALTIME DATABASE
        await set(ref(database, `Tournaments/${targetKey}/RankingData`), rankingData);
        return rankingData;
    } catch (error) {
        console.error('Error recording match rankings:', error);
        throw error;
    }
};

/* ==========================================================================
   STORIES (Scoped to active tournament)
   ========================================================================== */

export const subscribeStories = (callback, customTourneyId) => {
    try {
        if (customTourneyId) {
            const targetKey = resolveTournamentKey(customTourneyId);
            const storiesRef = ref(database, `Tournaments/${targetKey}/AllStories`);
            const unsub = onValue(storiesRef, (snapshot) => {
                const data = snapshot.val();
                if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                    callback(data);
                } else {
                    const fallbackTourney = getFallbackTournament(targetKey);
                    const fallbackStories = fallbackTourney?.AllStories;
                    if (fallbackStories && typeof fallbackStories === 'object' && Object.keys(fallbackStories).length > 0) {
                        callback(fallbackStories);
                    } else {
                        callback({});
                    }
                }
            }, (error) => {
                console.warn(`AllStories error for ${targetKey}:`, error);
                const fallbackTourney = getFallbackTournament(targetKey);
                const fallbackStories = fallbackTourney?.AllStories;
                if (fallbackStories && typeof fallbackStories === 'object' && Object.keys(fallbackStories).length > 0) {
                    callback(fallbackStories);
                } else {
                    callback({});
                }
            });
            return unsub;
        }

        const activeRef = ref(database, 'activeTournamentId');
        let currentUnsub = null;

        const outerUnsub = onValue(activeRef, (activeSnap) => {
            const activeId = activeSnap.val() || currentActiveTournamentId || "E-Legend's Trophy 2K26";
            currentActiveTournamentId = activeId;
            const targetKey = resolveTournamentKey(activeId);

            if (currentUnsub) currentUnsub();

            const storiesRef = ref(database, `Tournaments/${targetKey}/AllStories`);
            currentUnsub = onValue(storiesRef, (snapshot) => {
                const data = snapshot.val();
                if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                    callback(data);
                } else {
                    // Strictly scoped to targetKey. NEVER fall back to another tournament or legacy stories.
                    const fallbackTourney = getFallbackTournament(targetKey);
                    const fallbackStories = fallbackTourney?.AllStories;
                    if (fallbackStories && typeof fallbackStories === 'object' && Object.keys(fallbackStories).length > 0) {
                        callback(fallbackStories);
                    } else {
                        callback({});
                    }
                }
            }, (error) => {
                console.warn(`AllStories error for ${targetKey}:`, error);
                const fallbackTourney = getFallbackTournament(targetKey);
                const fallbackStories = fallbackTourney?.AllStories;
                if (fallbackStories && typeof fallbackStories === 'object' && Object.keys(fallbackStories).length > 0) {
                    callback(fallbackStories);
                } else {
                    callback({});
                }
            });
        }, () => {
            const targetKey = resolveTournamentKey(currentActiveTournamentId);
            const fallbackTourney = getFallbackTournament(targetKey);
            const fallbackStories = fallbackTourney?.AllStories;
            if (fallbackStories && typeof fallbackStories === 'object' && Object.keys(fallbackStories).length > 0) {
                callback(fallbackStories);
            } else {
                callback({});
            }
        });

        return () => {
            if (currentUnsub) currentUnsub();
            outerUnsub();
        };
    } catch (error) {
        console.error('Error subscribing to AllStories:', error);
        callback({});
        return () => {};
    }
};

export const saveStory = async (story, customTourneyId) => {
    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
    const id = story.id || Date.now().toString();
    const storyRef = ref(database, `Tournaments/${targetKey}/AllStories/${id}`);
    return set(storyRef, {
        ...story,
        id
    });
};

export const deleteStory = async (storyId, customTourneyId) => {
    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
    const storyRef = ref(database, `Tournaments/${targetKey}/AllStories/${storyId}`);
    return remove(storyRef);
};



/* ==========================================================================
   TEAMS & SQUADS (Scoped to active tournament)
   ========================================================================== */

export const subscribeTeams = (callback, customTourneyId) => {
    try {
        if (customTourneyId) {
            const targetKey = resolveTournamentKey(customTourneyId);
            const teamsRef = ref(database, `Tournaments/${targetKey}/teamData`);
            const unsub = onValue(teamsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    callback(data);
                } else {
                    const fallbackTourney = getFallbackTournament(targetKey);
                    callback(fallbackTourney?.teamData || fallbackTourney?.teams || {});
                }
            }, (error) => {
                console.warn(`teamData error for ${targetKey}:`, error);
                const fallbackTourney = getFallbackTournament(targetKey);
                callback(fallbackTourney?.teamData || fallbackTourney?.teams || {});
            });
            return unsub;
        }

        const activeRef = ref(database, 'activeTournamentId');
        let currentUnsub = null;

        const outerUnsub = onValue(activeRef, (activeSnap) => {
            const activeId = activeSnap.val() || currentActiveTournamentId || "E-Legend's Trophy 2K26";
            currentActiveTournamentId = activeId;
            const targetKey = resolveTournamentKey(activeId);

            if (currentUnsub) currentUnsub();

            const teamsRef = ref(database, `Tournaments/${targetKey}/teamData`);
            currentUnsub = onValue(teamsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    callback(data);
                } else {
                    const fallbackTourney = getFallbackTournament(targetKey);
                    callback(fallbackTourney?.teamData || fallbackTourney?.teams || {});
                }
            }, (error) => {
                console.warn(`teamData error for ${targetKey}:`, error);
                const fallbackTourney = getFallbackTournament(targetKey);
                callback(fallbackTourney?.teamData || fallbackTourney?.teams || {});
            });
        }, () => {
            const targetKey = resolveTournamentKey(currentActiveTournamentId);
            const fallbackTourney = getFallbackTournament(targetKey);
            callback(fallbackTourney?.teamData || fallbackTourney?.teams || {});
        });

        return () => {
            if (currentUnsub) currentUnsub();
            outerUnsub();
        };
    } catch (error) {
        console.error('Error subscribing to teamData:', error);
        const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
        const fallbackTourney = getFallbackTournament(targetKey);
        callback(fallbackTourney?.teamData || fallbackTourney?.teams || {});
        return () => {};
    }
};

export const saveTeamData = async (teamsData, customTourneyId) => {
    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
    const teamsRef = ref(database, `Tournaments/${targetKey}/teamData`);
    return set(teamsRef, teamsData);
};

export const createNewTeam = async (teamKey, teamData, customTourneyId) => {
    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
    const teamRef = ref(database, `Tournaments/${targetKey}/teamData/${teamKey}`);
    try {
        await set(teamRef, teamData);
    } catch (e) {
        console.warn('Firebase create team failed or offline, updating fallback:', e);
    }
    const fallbackTourney = getFallbackTournament(targetKey);
    if (fallbackTourney) {
        if (!fallbackTourney.teamData) fallbackTourney.teamData = {};
        fallbackTourney.teamData[teamKey] = teamData;
    }
    return teamData;
};

export const deleteTeam = async (teamKey, customTourneyId) => {
    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
    const teamRef = ref(database, `Tournaments/${targetKey}/teamData/${teamKey}`);
    try {
        await remove(teamRef);
    } catch (e) {
        console.warn('Firebase delete team failed or offline, updating fallback:', e);
    }
    const fallbackTourney = getFallbackTournament(targetKey);
    if (fallbackTourney?.teamData && fallbackTourney.teamData[teamKey]) {
        delete fallbackTourney.teamData[teamKey];
    }
    return true;
};

export const updateTeamSquad = async (teamKey, teamData, customTourneyId) => {
    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
    const teamRef = ref(database, `Tournaments/${targetKey}/teamData/${teamKey}`);
    return update(teamRef, teamData);
};

export const updateTeamDetails = async (teamKey, details, customTourneyId) => {
    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
    const teamRef = ref(database, `Tournaments/${targetKey}/teamData/${teamKey}`);
    try {
        await update(teamRef, details);
    } catch (e) {
        console.warn('Firebase update team details failed or offline, updating fallback:', e);
    }
    const fallbackTourney = getFallbackTournament(targetKey);
    if (fallbackTourney?.teamData?.[teamKey]) {
        Object.assign(fallbackTourney.teamData[teamKey], details);
    }
    return details;
};

export const saveBatchPlayers = async (batchKey, players, customTourneyId) => {
    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
    const playersRef = ref(database, `Tournaments/${targetKey}/teamData/${batchKey}/players`);
    return set(playersRef, players);
};

export const registerCaptainAuth = async (email, password) => {
    const appName = `SecondaryAuthApp_${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, appName);
    const secondaryAuth = getAuth(secondaryApp);
    try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        await signOut(secondaryAuth);
        return { success: true, uid: userCredential.user.uid, email: userCredential.user.email };
    } finally {
        try {
            await deleteApp(secondaryApp);
        } catch (e) {
            // cleanup safely
        }
    }
};

/* ==========================================================================
   TOURNAMENTS & HISTORICAL EDITIONS (/Tournaments, /TournamentIndex)
   ========================================================================== */

export const subscribeTournamentIndex = (callback) => {
    try {
        const indexRef = ref(database, 'TournamentIndex');
        const unsubscribe = onValue(indexRef, (snapshot) => {
            const data = snapshot.val();
            if (data && Array.isArray(data) && data.length > 0) {
                callback(data);
            } else if (cachedFallbackData?.TournamentIndex && Array.isArray(cachedFallbackData.TournamentIndex)) {
                callback(cachedFallbackData.TournamentIndex);
            } else {
                callback([
                    {
                        id: "E-Legend's Trophy 2K26",
                        editionId: "2K26",
                        year: 2026,
                        name: "E-Legend's Trophy 2K26",
                        title: "Prof. A. Thurairajah Memorial Cricket Tournament 2026",
                        status: "upcoming",
                        startDate: "2026-10-10T08:00:00",
                        endDate: "2026-10-12T18:00:00",
                        venue: "Faculty of Engineering Grounds, Kilinochchi"
                    },
                    {
                        id: "E-Legend's Trophy 2K25",
                        editionId: "2K25",
                        year: 2025,
                        name: "E-Legend's Trophy 2K25",
                        title: "Prof. A. Thurairajah Memorial Cricket Tournament 2025",
                        status: "completed",
                        champion: "E21 Batch",
                        runnerUp: "E22 Batch",
                        startDate: "2025-10-04T08:00:00",
                        endDate: "2025-10-06T18:30:00",
                        venue: "Faculty of Engineering Grounds, Kilinochchi"
                    }
                ]);
            }
        }, (err) => {
            console.warn('TournamentIndex subscription error, using fallback:', err);
            callback(cachedFallbackData?.TournamentIndex || []);
        });
        return unsubscribe;
    } catch (error) {
        console.error('Error subscribing to TournamentIndex:', error);
        callback(cachedFallbackData?.TournamentIndex || []);
        return () => {};
    }
};

export const subscribeActiveTournament = (callback) => {
    try {
        const activeRef = ref(database, 'activeTournamentId');
        let currentEditionUnsub = null;

        const unsubscribe = onValue(activeRef, (snapshot) => {
            const activeId = snapshot.val() || currentActiveTournamentId || "E-Legend's Trophy 2K26";
            currentActiveTournamentId = activeId;
            const targetKey = resolveTournamentKey(activeId);

            if (currentEditionUnsub) currentEditionUnsub();

            const editionRef = ref(database, `Tournaments/${targetKey}`);
            currentEditionUnsub = onValue(editionRef, (edSnap) => {
                const edData = edSnap.val();
                if (edData && edData.info) {
                    callback({ activeId, ...edData.info, fullData: edData });
                } else {
                    const fallbackEd = getFallbackTournament(targetKey);
                    callback({ activeId, ...fallbackEd?.info, fullData: fallbackEd });
                }
            }, () => {
                const fallbackEd = getFallbackTournament(targetKey);
                callback({ activeId, ...fallbackEd?.info, fullData: fallbackEd });
            });
        }, () => {
            const targetKey = resolveTournamentKey(currentActiveTournamentId);
            const fallbackEd = getFallbackTournament(targetKey);
            callback({ activeId: currentActiveTournamentId, ...fallbackEd?.info, fullData: fallbackEd });
        });

        return () => {
            if (currentEditionUnsub) currentEditionUnsub();
            unsubscribe();
        };
    } catch (err) {
        const targetKey = resolveTournamentKey(currentActiveTournamentId);
        const fallbackEd = getFallbackTournament(targetKey);
        callback({ activeId: currentActiveTournamentId, ...fallbackEd?.info, fullData: fallbackEd });
        return () => {};
    }
};

export const setActiveTournamentId = async (editionId) => {
    currentActiveTournamentId = editionId;
    return set(ref(database, 'activeTournamentId'), editionId);
};

export const subscribeTournamentEdition = (editionId, callback) => {
    if (!editionId) return () => {};
    const targetKey = resolveTournamentKey(editionId);

    try {
        const editionRef = ref(database, `Tournaments/${targetKey}`);
        const unsubscribe = onValue(editionRef, (snapshot) => {
            const data = snapshot.val();
            if (data && (data.info || data.RankingData || data['1st'])) {
                callback(data);
            } else {
                const fallbackData = getFallbackTournament(targetKey);
                callback(fallbackData);
            }
        }, (err) => {
            console.warn(`Error subscribing to Tournaments/${targetKey}, using fallback:`, err);
            const fallbackData = getFallbackTournament(targetKey);
            callback(fallbackData);
        });
        return unsubscribe;
    } catch (error) {
        console.error(`Error subscribing to Tournaments/${targetKey}:`, error);
        callback(getFallbackTournament(targetKey));
        return () => {};
    }
};

export const getTournamentEdition = async (editionId) => {
    const targetKey = resolveTournamentKey(editionId);
    try {
        const editionRef = ref(database, `Tournaments/${targetKey}`);
        const snapshot = await get(editionRef);
        if (snapshot.exists() && snapshot.val()) return snapshot.val();
        return getFallbackTournament(targetKey);
    } catch (error) {
        console.warn(`Error fetching Tournaments/${targetKey}:`, error);
        return getFallbackTournament(targetKey);
    }
};

export const saveTournamentEdition = async (editionId, editionData) => {
    const targetKey = resolveTournamentKey(editionId);
    const editionRef = ref(database, `Tournaments/${targetKey}`);
    return set(editionRef, editionData);
};

export const createTournament = async (tournamentData) => {
    const { id, name, title, year, startDate, endDate, venue, organizers, description, status } = tournamentData;
    const cleanId = (id || name || `E-Legend's Trophy 2K${String(year || new Date().getFullYear()).slice(-2)}`).trim();
    const cleanEdition = `2K${String(year || new Date().getFullYear()).slice(-2)}`;

    const info = {
        id: cleanId,
        editionId: cleanEdition,
        name: name || `E-Legend's Trophy ${cleanEdition}`,
        title: title || `Prof. A. Thurairajah Memorial Cricket Tournament ${year || ''}`,
        year: parseInt(year) || new Date().getFullYear(),
        startDate: startDate || new Date().toISOString(),
        endDate: endDate || '',
        venue: venue || 'Faculty of Engineering Grounds, Kilinochchi',
        organizers: organizers || 'Faculty of Engineering, University of Jaffna',
        description: description || '',
        status: status || 'upcoming',
        champion: tournamentData.champion || '',
        runnerUp: tournamentData.runnerUp || ''
    };

    // Pre-seed squad template from baseline teams
    const templateTeams = getFallbackTournament('2K25')?.teamData || cachedFallbackData?.teamData || {};

    const fullTournamentData = {
        info,
        awards: [],
        FixturesData: { isFixtures: 1, finishedMatches: {} },
        LiveData: { isLive: 0, currentMatchPath: "", liveScore: null },
        RankingData: {
            pointsTable: [
                null,
                { id: 1, team: "E21", played: 0, won: 0, lost: 0, nr: 0, pts: 0, nrr: 0.00 },
                { id: 2, team: "E22", played: 0, won: 0, lost: 0, nr: 0, pts: 0, nrr: 0.00 },
                { id: 3, team: "E23", played: 0, won: 0, lost: 0, nr: 0, pts: 0, nrr: 0.00 },
                { id: 4, team: "E24", played: 0, won: 0, lost: 0, nr: 0, pts: 0, nrr: 0.00 }
            ],
            batters: {},
            bowlers: {}
        },
        UpcomingMatchData: { isUpcoming: 1 },
        teamData: templateTeams,
        AllStories: {}
    };

    // Save full tournament node under primary cleanId
    await set(ref(database, `Tournaments/${cleanId}`), fullTournamentData);

    // Update TournamentIndex
    const indexSnap = await get(ref(database, 'TournamentIndex'));
    let indexList = indexSnap.exists() && Array.isArray(indexSnap.val()) ? indexSnap.val() : [];
    
    // Remove if already exists
    indexList = indexList.filter(item => item.id !== cleanId && item.editionId !== cleanEdition);
    
    // Add new tournament to front
    indexList.unshift({
        id: cleanId,
        editionId: cleanEdition,
        year: info.year,
        name: info.name,
        title: info.title,
        status: info.status,
        startDate: info.startDate,
        endDate: info.endDate,
        venue: info.venue,
        champion: info.champion || ''
    });

    await set(ref(database, 'TournamentIndex'), indexList);
    return cleanId;
};

export const updateTournamentInfo = async (editionId, updatedInfo) => {
    const targetKey = resolveTournamentKey(editionId);
    const infoRef = ref(database, `Tournaments/${targetKey}/info`);
    await update(infoRef, updatedInfo);

    // Also update TournamentIndex entry
    const indexSnap = await get(ref(database, 'TournamentIndex'));
    if (indexSnap.exists() && Array.isArray(indexSnap.val())) {
        const indexList = indexSnap.val().map(item => {
            if (item.id === editionId || item.editionId === editionId || item.name === editionId) {
                return {
                    ...item,
                    name: updatedInfo.name !== undefined ? updatedInfo.name : item.name,
                    title: updatedInfo.title !== undefined ? updatedInfo.title : item.title,
                    year: updatedInfo.year !== undefined ? parseInt(updatedInfo.year) : item.year,
                    status: updatedInfo.status !== undefined ? updatedInfo.status : item.status,
                    startDate: updatedInfo.startDate !== undefined ? updatedInfo.startDate : item.startDate,
                    endDate: updatedInfo.endDate !== undefined ? updatedInfo.endDate : item.endDate,
                    venue: updatedInfo.venue !== undefined ? updatedInfo.venue : item.venue,
                    champion: updatedInfo.champion !== undefined ? updatedInfo.champion : item.champion,
                    runnerUp: updatedInfo.runnerUp !== undefined ? updatedInfo.runnerUp : item.runnerUp
                };
            }
            return item;
        });
        await set(ref(database, 'TournamentIndex'), indexList);
    }
    return true;
};

export const deleteTournament = async (editionId) => {
    const targetKey = resolveTournamentKey(editionId);
    await remove(ref(database, `Tournaments/${targetKey}`));

    // Remove from TournamentIndex
    const indexSnap = await get(ref(database, 'TournamentIndex'));
    if (indexSnap.exists() && Array.isArray(indexSnap.val())) {
        const updatedIndex = indexSnap.val().filter(item => item.id !== editionId && item.editionId !== editionId);
        await set(ref(database, 'TournamentIndex'), updatedIndex);
    }
    return true;
};

/* ==========================================================================
   APP DOWNLOAD & SYSTEM
   ========================================================================== */

export const subscribeDownloadCount = (callback) => {
    try {
        const countRef = ref(database, 'downloadCount');
        const unsubscribe = onValue(countRef, (snapshot) => {
            const count = snapshot.val();
            if (count !== null && count !== undefined) {
                callback(Number(count));
            } else {
                callback(314);
            }
        }, (err) => {
            console.warn('DownloadCount subscription error:', err);
            callback(314);
        });
        return unsubscribe;
    } catch (error) {
        callback(314);
        return () => {};
    }
};

export const incrementDownloadCount = async () => {
    try {
        const countRef = ref(database, 'downloadCount');
        const snap = await get(countRef);
        const current = snap.exists() ? Number(snap.val()) || 0 : 314;
        const newCount = current + 1;
        await set(countRef, newCount);

        // Also mirror inside AppInfo
        try {
            await set(ref(database, 'AppInfo/downloadCount'), newCount);
        } catch (e) {}

        return newCount;
    } catch (err) {
        console.warn('Error incrementing download count:', err);
        return 315;
    }
};

/* ==========================================================================
   WEB VIEWERS & TRAFFIC ANALYTICS
   ========================================================================== */

export const subscribeWebViewsCount = (callback) => {
    try {
        const viewsRef = ref(database, 'webViewsCount');
        const unsubscribe = onValue(viewsRef, (snapshot) => {
            const count = snapshot.val();
            if (count !== null && count !== undefined) {
                callback(Number(count));
            } else {
                callback(1840);
            }
        }, (err) => {
            console.warn('WebViewsCount subscription error:', err);
            callback(1840);
        });
        return unsubscribe;
    } catch (error) {
        callback(1840);
        return () => {};
    }
};

export const recordWebView = async () => {
    try {
        const sessionKey = 'e_legends_web_session_viewed';
        if (typeof window !== 'undefined' && window.sessionStorage) {
            if (sessionStorage.getItem(sessionKey)) {
                return;
            }
            sessionStorage.setItem(sessionKey, 'true');
        }

        const viewsRef = ref(database, 'webViewsCount');
        const snap = await get(viewsRef);
        const current = snap.exists() ? Number(snap.val()) || 0 : 1840;
        const newCount = current + 1;
        await set(viewsRef, newCount);

        try {
            await set(ref(database, 'AppInfo/webViewsCount'), newCount);
        } catch (e) {}

        return newCount;
    } catch (err) {
        console.warn('Error recording web view:', err);
    }
};

/* ==========================================================================
   COMMON TOURNAMENT GALLERY MANAGEMENT (PURE FIREBASE RTDB)
   ========================================================================== */

const sortGalleryPhotos = (photos) => {
    return photos.sort((a, b) => {
        const hasOrderA = typeof a.order === 'number';
        const hasOrderB = typeof b.order === 'number';
        if (hasOrderA && hasOrderB) {
            if (a.order !== b.order) return a.order - b.order;
        } else if (hasOrderA) {
            return -1;
        } else if (hasOrderB) {
            return 1;
        }
        return (b.timestamp || 0) - (a.timestamp || 0);
    });
};

export const subscribeCommonGallery = (callback) => {
    try {
        const galleryRef = ref(database, 'Gallery');
        const unsubscribe = onValue(galleryRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                let photos = [];
                if (Array.isArray(data)) {
                    photos = data.filter(Boolean);
                } else if (typeof data === 'object' && data !== null) {
                    photos = Object.keys(data).map((key) => ({
                        id: key,
                        ...data[key]
                    }));
                }
                sortGalleryPhotos(photos);
                callback(photos);
            } else {
                callback([]);
            }
        }, (err) => {
            console.warn('Common Gallery subscription error:', err);
            callback([]);
        });
        return unsubscribe;
    } catch (error) {
        console.error('Error subscribing to Common Gallery:', error);
        callback([]);
        return () => {};
    }
};

export const getCommonGallery = async () => {
    try {
        const galleryRef = ref(database, 'Gallery');
        const snapshot = await get(galleryRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            let photos = [];
            if (Array.isArray(data)) {
                photos = data.filter(Boolean);
            } else if (typeof data === 'object' && data !== null) {
                photos = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key]
                }));
            }
            sortGalleryPhotos(photos);
            return photos;
        }
        return [];
    } catch (err) {
        console.warn('Error fetching gallery:', err);
        return [];
    }
};

export const saveCommonGalleryPhoto = async (photoData) => {
    try {
        const photoId = photoData.id || `photo_${Date.now()}`;
        const photoRef = ref(database, `Gallery/${photoId}`);
        const payload = {
            id: photoId,
            title: photoData.title || 'Tournament Moment',
            tournamentId: photoData.tournamentId || "E-Legend's Trophy 2K26",
            category: photoData.category || 'Match Action',
            caption: photoData.caption || '',
            imageUrl: photoData.imageUrl || '',
            uploadedAt: photoData.uploadedAt || new Date().toISOString().split('T')[0],
            timestamp: photoData.timestamp || Date.now()
        };

        if (typeof photoData.order === 'number') {
            payload.order = photoData.order;
        } else if (photoData.order !== undefined && photoData.order !== '' && !isNaN(Number(photoData.order))) {
            payload.order = Number(photoData.order);
        }

        await set(photoRef, payload);
        return payload;
    } catch (err) {
        console.error('Error saving gallery photo:', err);
        throw err;
    }
};

export const saveGalleryPhotosOrder = async (orderedPhotos, allPhotos = []) => {
    try {
        const updates = {};
        
        // If an overall array is provided, merge the ordered subset sequence properly
        if (allPhotos.length > 0 && orderedPhotos.length < allPhotos.length) {
            const orderedIdSet = new Set(orderedPhotos.map(p => p.id));
            let orderedCursor = 0;
            const fullMerged = allPhotos.map(p => {
                if (orderedIdSet.has(p.id)) {
                    const item = orderedPhotos[orderedCursor];
                    orderedCursor += 1;
                    return item;
                }
                return p;
            });
            fullMerged.forEach((photo, index) => {
                if (photo && photo.id) {
                    updates[`Gallery/${photo.id}/order`] = index;
                }
            });
        } else {
            orderedPhotos.forEach((photo, index) => {
                if (photo && photo.id) {
                    updates[`Gallery/${photo.id}/order`] = index;
                }
            });
        }

        if (Object.keys(updates).length > 0) {
            await update(ref(database), updates);
        }
        return true;
    } catch (err) {
        console.error('Error saving gallery photos order:', err);
        throw err;
    }
};

export const deleteCommonGalleryPhoto = async (photoId) => {
    try {
        const photoRef = ref(database, `Gallery/${photoId}`);
        await remove(photoRef);
        return true;
    } catch (err) {
        console.error('Error deleting gallery photo:', err);
        throw err;
    }
};

// Backwards compatibility aliases
export const subscribeGallery = subscribeCommonGallery;
export const saveGalleryPhoto = saveCommonGalleryPhoto;
export const saveGalleryOrder = saveGalleryPhotosOrder;
export const deleteGalleryPhoto = deleteCommonGalleryPhoto;


