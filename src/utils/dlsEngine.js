/**
 * Duckworth-Lewis-Stern (DLS) Standard Mathematical Engine
 *
 * Implements the standard ICC exponential resource decay model:
 * R(u, w) = Z0(w) * (1 - e^(-b(w) * u))
 *
 * Where:
 * - u = overs remaining (0 <= u <= 50)
 * - w = wickets lost (0 <= w <= 9)
 * - Z0(w) = asymptotic average score for unlimited overs with (10 - w) wickets in hand
 * - b(w) = exponential decay rate for w wickets lost
 */

// Standard ICC DLS Resource Parameters
const Z0 = [100.0, 93.4, 85.1, 74.9, 62.7, 49.0, 34.9, 22.0, 11.9, 4.7];
const B = [0.035, 0.034, 0.032, 0.030, 0.027, 0.024, 0.020, 0.016, 0.012, 0.008];

/**
 * Standard average score benchmark (G50) scaled by match format length.
 * For 50-over ODIs, G50 is typically 245-250.
 * For 20-over T20s, benchmark is ~160.
 * For 15-over matches, benchmark is ~120.
 * For 10-over matches, benchmark is ~80.
 */
export const getBenchmarkScore = (matchOvers = 20) => {
    const overs = Math.max(5, Math.min(50, Number(matchOvers) || 20));
    return Math.round((overs / 50) * 245);
};

/**
 * Calculates percentage of resources remaining given overs left and wickets lost.
 *
 * @param {number} oversRemaining - Number of overs remaining (can be fractional, e.g. 9.4)
 * @param {number} wicketsLost - Number of wickets fallen (0 - 10)
 * @returns {number} Percentage resource remaining (0 - 100)
 */
export const calculateResource = (oversRemaining, wicketsLost) => {
    const u = Math.max(0, Math.min(50, Number(oversRemaining) || 0));
    const w = Math.max(0, Math.min(10, Number(wicketsLost) || 0));

    // If 10 wickets down or 0 overs left, 0% resource remains
    if (w >= 10 || u <= 0) {
        return 0;
    }

    const z = Z0[w] !== undefined ? Z0[w] : 0;
    const b = B[w] !== undefined ? B[w] : 0.035;

    // R(u, w) = Z0(w) * (1 - e^(-b * u))
    const resource = z * (1 - Math.exp(-b * u));
    return Math.max(0, Math.min(100, resource));
};

/**
 * Calculates revised target when match is interrupted by rain or delays.
 *
 * Handles standard scenarios:
 * 1. Team 2's innings reduced (R2 < R1): Target = floor(S * R2 / R1) + 1
 * 2. Team 1's innings curtailed and Team 2 has more resource (R2 > R1):
 *    Target = S + floor((R2 - R1) * G50 / 100) + 1
 * 3. Equal resources: Target = S + 1
 *
 * @param {Object} params
 * @param {number} params.totalOvers - Scheduled match overs per side (e.g. 15, 20)
 * @param {number} params.firstInningsScore - Final runs scored by Team 1
 * @param {number} [params.secondInningsOvers] - Revised overs available to Team 2
 * @param {number} [params.firstInningsOversBowled] - Overs bowled in 1st innings if interrupted
 * @param {number} [params.firstInningsWickets] - Wickets lost in 1st innings if interrupted
 * @param {number} [params.customG50] - Optional custom G50 benchmark score
 * @returns {Object} Revised target calculation details
 */
export const calculateDlsTarget = ({
    totalOvers = 20,
    firstInningsScore = 0,
    secondInningsOvers = 20,
    firstInningsOversBowled = null,
    firstInningsWickets = 0,
    customG50 = null
}) => {
    const originalOvers = Math.max(5, Number(totalOvers) || 20);
    const score1 = Math.max(0, Number(firstInningsScore) || 0);
    const revOvers2 = Math.max(1, Math.min(originalOvers, Number(secondInningsOvers) || originalOvers));
    const g50 = customG50 ? Number(customG50) : getBenchmarkScore(originalOvers);

    // 1. Calculate Team 1's resource percentage (R1)
    let r1 = calculateResource(originalOvers, 0);

    // If Team 1's innings was interrupted and stopped early:
    if (firstInningsOversBowled !== null && firstInningsOversBowled < originalOvers) {
        const oversLostT1 = Math.max(0, originalOvers - Number(firstInningsOversBowled));
        const unconsumedT1 = calculateResource(oversLostT1, firstInningsWickets);
        r1 = Math.max(1, r1 - unconsumedT1);
    }

    // 2. Calculate Team 2's starting resource percentage (R2)
    const r2 = calculateResource(revOvers2, 0);

    // 3. Compute target
    let revisedTarget;
    let calculationType;

    if (Math.abs(r1 - r2) < 0.001) {
        // Equal resources (no reduction or identical resources)
        revisedTarget = score1 + 1;
        calculationType = 'standard';
    } else if (r2 < r1) {
        // Team 2 has less resource (e.g. overs reduced for Team 2)
        // Target = floor(S * (R2 / R1)) + 1
        revisedTarget = Math.floor((score1 * r2) / r1) + 1;
        calculationType = 'scaled_down';
    } else {
        // Team 2 has more resource (e.g. Team 1 was interrupted early)
        // Target = S + floor((R2 - R1) * G50 / 100) + 1
        revisedTarget = score1 + Math.floor(((r2 - r1) * g50) / 100) + 1;
        calculationType = 'scaled_up';
    }

    // Minimum target cannot be negative
    revisedTarget = Math.max(1, revisedTarget);

    const requiredRunRate = revOvers2 > 0 ? (revisedTarget / revOvers2).toFixed(2) : '0.00';

    return {
        isDls: revOvers2 !== originalOvers || (firstInningsOversBowled !== null && firstInningsOversBowled < originalOvers),
        originalOvers,
        revisedOvers: revOvers2,
        firstInningsScore: score1,
        revisedTarget,
        requiredRunRate: Number(requiredRunRate),
        resource1: Number(r1.toFixed(2)),
        resource2: Number(r2.toFixed(2)),
        g50Benchmark: g50,
        calculationType
    };
};

/**
 * Calculates current DLS Par Score ball-by-ball during 2nd innings.
 *
 * If rain permanently stops play during the chase, comparing actual score to Par Score
 * determines the match winner.
 *
 * @param {Object} params
 * @param {number} params.totalOvers - Match original overs per side
 * @param {number} params.firstInningsScore - Team 1's final score
 * @param {number} params.secondInningsOvers - Quota of overs allocated to Team 2
 * @param {number} params.secondInningsBallsBowled - Current balls bowled in 2nd innings
 * @param {number} params.secondInningsWickets - Wickets fallen so far in 2nd innings
 * @param {number} [params.customG50] - Optional benchmark score
 * @returns {Object} Par score analysis
 */
export const calculateDlsParScore = ({
    totalOvers = 20,
    firstInningsScore = 0,
    secondInningsOvers = 20,
    secondInningsBallsBowled = 0,
    secondInningsWickets = 0,
    customG50 = null
}) => {
    const originalOvers = Math.max(5, Number(totalOvers) || 20);
    const score1 = Math.max(0, Number(firstInningsScore) || 0);
    const allocatedOvers2 = Math.max(1, Number(secondInningsOvers) || originalOvers);
    const ballsBowled = Math.max(0, Number(secondInningsBallsBowled) || 0);
    const wickets = Math.max(0, Math.min(10, Number(secondInningsWickets) || 0));
    const g50 = customG50 ? Number(customG50) : getBenchmarkScore(originalOvers);

    const totalBallsAllocated = allocatedOvers2 * 6;
    const ballsRemaining = Math.max(0, totalBallsAllocated - ballsBowled);
    const oversRemaining = ballsRemaining / 6;

    // Resource available to Team 1
    const r1 = calculateResource(originalOvers, 0);

    // Total resource Team 2 had at start of innings
    const r2Total = calculateResource(allocatedOvers2, 0);

    // Resource Team 2 still has in hand at this exact ball
    const r2Remaining = calculateResource(oversRemaining, wickets);

    // Resource Team 2 has consumed so far
    const r2Consumed = Math.max(0, r2Total - r2Remaining);

    let parScore;
    if (r2Total <= r1) {
        // Standard chase scaling
        parScore = Math.floor((score1 * r2Consumed) / r1);
    } else {
        // Scaled with G50
        parScore = Math.floor(((r2Consumed / r2Total) * (score1 + ((r2Total - r1) * g50) / 100)));
    }

    return {
        parScore: Math.max(0, parScore),
        ballsBowled,
        oversBowled: `${Math.floor(ballsBowled / 6)}.${ballsBowled % 6}`,
        ballsRemaining,
        wickets,
        resourceConsumed: Number(r2Consumed.toFixed(2))
    };
};
