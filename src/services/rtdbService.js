import { ref, onValue, get, set, update, remove } from 'firebase/database';
import { database, firebaseConfig } from '../components/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import fallbackExport from '../data/fallbackData.json';

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

export const subscribeMatch = (matchTitle, callback, customTourneyId) => {
    if (!matchTitle) return () => {};
    const cleanTitle = matchTitle.replace(/^\//, '');

    try {
        if (customTourneyId) {
            const targetKey = resolveTournamentKey(customTourneyId);
            const matchRef = ref(database, `Tournaments/${targetKey}/${cleanTitle}`);
            const unsub = onValue(matchRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    callback(data);
                } else {
                    const fallbackTourney = getFallbackTournament(targetKey);
                    const matchFallback = fallbackTourney?.[cleanTitle] || fallbackTourney?.matches?.[cleanTitle] || cachedFallbackData?.[cleanTitle] || null;
                    callback(matchFallback);
                }
            }, (error) => {
                console.warn(`Match [${cleanTitle}] error for ${targetKey}:`, error);
                const fallbackTourney = getFallbackTournament(targetKey);
                callback(fallbackTourney?.[cleanTitle] || fallbackTourney?.matches?.[cleanTitle] || cachedFallbackData?.[cleanTitle] || null);
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

            const matchRef = ref(database, `Tournaments/${targetKey}/${cleanTitle}`);
            currentUnsub = onValue(matchRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    callback(data);
                } else {
                    const fallbackTourney = getFallbackTournament(targetKey);
                    const matchFallback = fallbackTourney?.[cleanTitle] || fallbackTourney?.matches?.[cleanTitle] || cachedFallbackData?.[cleanTitle] || null;
                    callback(matchFallback);
                }
            }, (error) => {
                console.warn(`Match [${cleanTitle}] error for ${targetKey}:`, error);
                const fallbackTourney = getFallbackTournament(targetKey);
                callback(fallbackTourney?.[cleanTitle] || fallbackTourney?.matches?.[cleanTitle] || cachedFallbackData?.[cleanTitle] || null);
            });
        }, () => {
            const targetKey = resolveTournamentKey(currentActiveTournamentId);
            const fallbackTourney = getFallbackTournament(targetKey);
            callback(fallbackTourney?.[cleanTitle] || fallbackTourney?.matches?.[cleanTitle] || cachedFallbackData?.[cleanTitle] || null);
        });

        return () => {
            if (currentUnsub) currentUnsub();
            outerUnsub();
        };
    } catch (error) {
        console.error('Error subscribing to match:', error);
        const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
        const fallbackTourney = getFallbackTournament(targetKey);
        callback(fallbackTourney?.[cleanTitle] || fallbackTourney?.matches?.[cleanTitle] || cachedFallbackData?.[cleanTitle] || null);
        return () => {};
    }
};

export const getMatchData = async (matchTitle, customTourneyId) => {
    const cleanTitle = matchTitle.replace(/^\//, '');
    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
    try {
        const matchRef = ref(database, `Tournaments/${targetKey}/${cleanTitle}`);
        const snap = await get(matchRef);
        if (snap.exists()) {
            return snap.val();
        }
        const fallbackTourney = getFallbackTournament(targetKey);
        return fallbackTourney?.[cleanTitle] || fallbackTourney?.matches?.[cleanTitle] || cachedFallbackData?.[cleanTitle] || null;
    } catch (e) {
        const fallbackTourney = getFallbackTournament(targetKey);
        return fallbackTourney?.[cleanTitle] || fallbackTourney?.matches?.[cleanTitle] || cachedFallbackData?.[cleanTitle] || null;
    }
};

export const updateMatchData = async (matchTitle, data, customTourneyId) => {
    const cleanTitle = matchTitle.replace(/^\//, '');
    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
    const matchRef = ref(database, `Tournaments/${targetKey}/${cleanTitle}`);
    return update(matchRef, data);
};

export const setMatchData = async (matchTitle, data, customTourneyId) => {
    const cleanTitle = matchTitle.replace(/^\//, '');
    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
    const matchRef = ref(database, `Tournaments/${targetKey}/${cleanTitle}`);
    return set(matchRef, data);
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
    const finishRef = ref(database, `Tournaments/${targetKey}/FixturesData/finishedMatches/${matchId}`);
    return set(finishRef, {
        active: 1,
        id: matchId,
        ...matchSummary
    });
};

export const updateFixturesData = async (data, customTourneyId) => {
    const targetKey = resolveTournamentKey(customTourneyId || currentActiveTournamentId);
    const fixturesRef = ref(database, `Tournaments/${targetKey}/FixturesData`);
    return update(fixturesRef, data);
};

/* ==========================================================================
   RANKINGS & POINTS TABLE (Scoped to active tournament)
   ========================================================================== */

export const subscribeRankings = (callback) => {
    try {
        const activeRef = ref(database, 'activeTournamentId');
        let currentUnsub = null;

        const outerUnsub = onValue(activeRef, (activeSnap) => {
            const activeId = activeSnap.val() || currentActiveTournamentId || "E-Legend's Trophy 2K26";
            currentActiveTournamentId = activeId;
            const targetKey = resolveTournamentKey(activeId);

            if (currentUnsub) currentUnsub();

            const rankingRef = ref(database, `Tournaments/${targetKey}/RankingData`);
            currentUnsub = onValue(rankingRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    callback(data);
                } else {
                    const fallbackTourney = getFallbackTournament(targetKey);
                    callback(fallbackTourney?.RankingData || { batters: {}, bowlers: {}, pointsTable: [] });
                }
            }, (error) => {
                console.warn(`RankingData error for ${targetKey}:`, error);
                const fallbackTourney = getFallbackTournament(targetKey);
                callback(fallbackTourney?.RankingData || { batters: {}, bowlers: {}, pointsTable: [] });
            });
        }, () => {
            const targetKey = resolveTournamentKey(currentActiveTournamentId);
            const fallbackTourney = getFallbackTournament(targetKey);
            callback(fallbackTourney?.RankingData || { batters: {}, bowlers: {}, pointsTable: [] });
        });

        return () => {
            if (currentUnsub) currentUnsub();
            outerUnsub();
        };
    } catch (error) {
        console.error('Error subscribing to RankingData:', error);
        const targetKey = resolveTournamentKey(currentActiveTournamentId);
        const fallbackTourney = getFallbackTournament(targetKey);
        callback(fallbackTourney?.RankingData || { batters: {}, bowlers: {}, pointsTable: [] });
        return () => {};
    }
};

export const updateRankings = async (rankingsData) => {
    const targetKey = resolveTournamentKey(currentActiveTournamentId);
    const rankingRef = ref(database, `Tournaments/${targetKey}/RankingData`);
    return update(rankingRef, rankingsData);
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

