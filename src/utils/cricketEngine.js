/**
 * Cricket Engine - Standardized Cricket Law & Outcome Engine
 * Handles precise match result calculations:
 * - Defending team (batting 1st) wins by runs (firstBatScore - secondBatScore)
 * - Chasing team (batting 2nd) wins by wickets (10 - secondBatWickets)
 * - Duckworth-Lewis-Stern (DLS) method revised target calculations
 * - Tie outcomes
 */

/**
 * Calculates the official cricket match result string based on innings order and scores.
 * 
 * Rules:
 * 1. If Team Batting 1st scores more than Team Batting 2nd:
 *    => Defending team wins by X runs (margin = Team1 - Team2)
 *    e.g., Team A 250, Team B 230 => "Team A won by 20 runs"
 * 
 * 2. If Team Batting 2nd scores more than Team Batting 1st:
 *    => Chasing team wins by Y wickets (margin = 10 - wickets lost)
 *    e.g., Team B reaches target with 6 wickets lost => "Team B won by 4 wickets"
 * 
 * 3. DLS Method:
 *    - If chasing team reaches or exceeds revised target => won by (10 - wickets) wickets (DLS Method)
 *    - If chasing team finishes 1 run short of target => Match Tied (DLS Method)
 *    - If chasing team finishes below target => Defending team won by ((target - 1) - score) runs (DLS Method)
 * 
 * 4. Identical scores without DLS => "Match Tied"
 * 
 * @param {Object} matchData 
 * @returns {string} Official match outcome string
 */
export const calculateMatchResult = (matchData) => {
    if (!matchData) return 'Match Completed';

    const common = matchData.common || {};
    let firstBatNum = Number(common.firstBat);
    if (!firstBatNum || (firstBatNum !== 1 && firstBatNum !== 2)) {
        // Fallback using toss if available
        const toss = common.toss;
        if (toss && toss.winner && toss.decision) {
            const isT1Winner = (matchData.team1?.name && toss.winner.trim().toLowerCase() === matchData.team1.name.trim().toLowerCase()) || toss.winner === 'team1';
            if (toss.decision === 'bat') {
                firstBatNum = isT1Winner ? 1 : 2;
            } else {
                firstBatNum = isT1Winner ? 2 : 1;
            }
        } else {
            firstBatNum = 1;
        }
    }

    const firstBatKey = firstBatNum === 1 ? 'team1' : 'team2';
    const secondBatKey = firstBatNum === 1 ? 'team2' : 'team1';

    const firstBatTeam = matchData[firstBatKey] || {};
    const secondBatTeam = matchData[secondBatKey] || {};

    const firstBatName = firstBatTeam.name || (firstBatKey === 'team1' ? 'Team 1' : 'Team 2');
    const secondBatName = secondBatTeam.name || (secondBatKey === 'team1' ? 'Team 1' : 'Team 2');

    const firstBatScore = Number(firstBatTeam.totalRuns) || 0;

    const secondBatScore = Number(secondBatTeam.totalRuns) || 0;
    const secondBatWickets = Number(secondBatTeam.totalWickets) || 0;

    // 1. Duckworth-Lewis-Stern (DLS) Handling
    const isDls = Boolean(common.dls?.isApplied);
    const dlsTarget = Number(common.dls?.revisedTarget);

    if (isDls && dlsTarget > 0) {
        if (secondBatScore >= dlsTarget) {
            const wicketsLeft = Math.max(1, 10 - secondBatWickets);
            return `${secondBatName} won by ${wicketsLeft} ${wicketsLeft === 1 ? 'wicket' : 'wickets'} (DLS Method)`;
        } else if (secondBatScore === dlsTarget - 1) {
            return 'Match Tied (DLS Method)';
        } else {
            const runsDiff = Math.max(1, (dlsTarget - 1) - secondBatScore);
            return `${firstBatName} won by ${runsDiff} ${runsDiff === 1 ? 'run' : 'runs'} (DLS Method)`;
        }
    }

    // 2. Standard Cricket Match Outcomes:
    // Chasing team (Batting 2nd) reaches the target -> Wins by remaining wickets
    if (secondBatScore > firstBatScore) {
        const wicketsLeft = Math.max(1, 10 - secondBatWickets);
        return `${secondBatName} won by ${wicketsLeft} ${wicketsLeft === 1 ? 'wicket' : 'wickets'}`;
    }

    // Defending team (Batting 1st) holds off the chase -> Wins by runs
    if (firstBatScore > secondBatScore) {
        const runsDiff = firstBatScore - secondBatScore;
        return `${firstBatName} won by ${runsDiff} ${runsDiff === 1 ? 'run' : 'runs'}`;
    }

    // Exact equal scores
    return 'Match Tied';
};

/**
 * Returns detailed outcome metadata for points table, awards and analytics.
 */
export const getMatchOutcome = (matchData) => {
    const resultString = calculateMatchResult(matchData);
    if (!matchData) {
        return { resultString, winningTeamKey: null, winningTeamName: '', isTie: false };
    }

    const common = matchData.common || {};
    const firstBatKey = common.firstBat === 2 ? 'team2' : 'team1';
    const secondBatKey = firstBatKey === 'team1' ? 'team2' : 'team1';

    const firstBatTeam = matchData[firstBatKey] || {};
    const secondBatTeam = matchData[secondBatKey] || {};

    const firstBatScore = Number(firstBatTeam.totalRuns) || 0;
    const secondBatScore = Number(secondBatTeam.totalRuns) || 0;

    const isDls = Boolean(common.dls?.isApplied);
    const dlsTarget = Number(common.dls?.revisedTarget);

    if (isDls && dlsTarget > 0) {
        if (secondBatScore >= dlsTarget) {
            return {
                resultString,
                winningTeamKey: secondBatKey,
                winningTeamName: secondBatTeam.name,
                losingTeamKey: firstBatKey,
                losingTeamName: firstBatTeam.name,
                isTie: false,
                isDls: true
            };
        } else if (secondBatScore === dlsTarget - 1) {
            return {
                resultString,
                winningTeamKey: null,
                winningTeamName: '',
                isTie: true,
                isDls: true
            };
        } else {
            return {
                resultString,
                winningTeamKey: firstBatKey,
                winningTeamName: firstBatTeam.name,
                losingTeamKey: secondBatKey,
                losingTeamName: secondBatTeam.name,
                isTie: false,
                isDls: true
            };
        }
    }

    if (secondBatScore > firstBatScore) {
        return {
            resultString,
            winningTeamKey: secondBatKey,
            winningTeamName: secondBatTeam.name,
            losingTeamKey: firstBatKey,
            losingTeamName: firstBatTeam.name,
            isTie: false,
            isDls: false
        };
    }

    if (firstBatScore > secondBatScore) {
        return {
            resultString,
            winningTeamKey: firstBatKey,
            winningTeamName: firstBatTeam.name,
            losingTeamKey: secondBatKey,
            losingTeamName: secondBatTeam.name,
            isTie: false,
            isDls: false
        };
    }

    return {
        resultString,
        winningTeamKey: null,
        winningTeamName: '',
        isTie: true,
        isDls: false
    };
};
