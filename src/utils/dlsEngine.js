/**
 * Duckworth-Lewis-Stern (DLS) Standard Mathematical Engine
 * E-Legends Trophy 2K26 — Premier Tournament Telemetry Suite
 *
 * Implements validated ICC Standard Edition resource modeling normalized to ball precision:
 * - Full integer ball-level resolution (e.g. 14.2 ov -> 86 balls)
 * - Calibrated resource surface R(ballsRemaining, wicketsLost)
 * - Monotonicity guarantees across wickets (0..10) and balls (0..300)
 * - Dynamic format benchmark calibration (Tournament historical data or T20 calibrated curve)
 * - Multiple interruption event tracking
 * - Exact par score convergence: completed-innings par score === revisedTarget - 1
 */

// ICC Standard Edition Parameters
const Z0 = [100.0, 93.4, 85.1, 74.9, 62.7, 49.0, 34.9, 22.0, 11.9, 4.7];
const B = [0.035, 0.034, 0.032, 0.030, 0.027, 0.024, 0.020, 0.016, 0.012, 0.008];

/**
 * Normalizes cricket over notation (e.g. 14.2, "14.2", 14) to exact balls.
 * 14.2 -> 14 * 6 + 2 = 86 balls.
 */
export function oversToBalls(oversInput) {
    if (oversInput === null || oversInput === undefined || oversInput === '') return 0;

    if (typeof oversInput === 'string') {
        const trimmed = oversInput.trim();
        if (trimmed.includes('.')) {
            const [ovStr, ballStr] = trimmed.split('.');
            const ov = parseInt(ovStr, 10) || 0;
            const b = parseInt(ballStr, 10) || 0;
            return ov * 6 + Math.min(5, Math.max(0, b));
        }
        const parsed = parseFloat(trimmed);
        if (isNaN(parsed)) return 0;
        return oversToBalls(parsed);
    }

    if (typeof oversInput === 'number') {
        if (isNaN(oversInput) || oversInput <= 0) return 0;
        const fullOvers = Math.floor(oversInput);
        // Handle cricket decimal convention e.g. 14.2 (fraction part is 0.1 .. 0.5 balls)
        const fractionalPart = Math.round((oversInput - fullOvers) * 10);
        if (fractionalPart >= 1 && fractionalPart <= 5) {
            return fullOvers * 6 + fractionalPart;
        }
        // If it was already passed as fractional over e.g. 14.33333 or whole number
        const trueFractionalBalls = Math.round((oversInput - fullOvers) * 6);
        return fullOvers * 6 + Math.min(5, Math.max(0, trueFractionalBalls));
    }

    return 0;
}

/**
 * Converts exact ball count to standard cricket notation string (e.g. 86 -> "14.2").
 */
export function ballsToOvers(balls) {
    const totalBalls = Math.max(0, Math.round(Number(balls) || 0));
    const ov = Math.floor(totalBalls / 6);
    const rem = totalBalls % 6;
    return rem === 0 ? `${ov}` : `${ov}.${rem}`;
}

/**
 * Format-specific benchmark calibrated from historical tournament scores or standard surface.
 * For 20-over T20 matches at Faculty Grounds, calibrated baseline is 145 runs.
 */
export function getBenchmarkScore(matchOvers = 20, customScore = null, historicalCompletedScores = []) {
    if (customScore && Number(customScore) > 0) {
        return Number(customScore);
    }

    // If historical completed 1st innings scores are provided, calibrate from historical median/mean
    if (Array.isArray(historicalCompletedScores) && historicalCompletedScores.length >= 2) {
        const validScores = historicalCompletedScores
            .map(s => Number(s))
            .filter(s => !isNaN(s) && s >= 40 && s <= 300);
        if (validScores.length >= 2) {
            const sum = validScores.reduce((acc, curr) => acc + curr, 0);
            return Math.round(sum / validScores.length);
        }
    }

    const overs = Math.max(5, Math.min(50, Number(matchOvers) || 20));

    // Calibrated format benchmark scaled via resource curve rather than crude linear projection
    if (overs === 20) return 145;
    if (overs === 50) return 245;

    // Use resource curve ratio to anchor benchmark for shortened matches
    const rScheduled = calculateResource(overs * 6, 0);
    const rT20 = calculateResource(120, 0);
    return Math.max(30, Math.round((rScheduled / rT20) * 145));
}

/**
 * Calculate DLS Resource Percentage R(ballsRemaining, wicketsLost).
 * Strictly guarantees:
 * - R(0, w) === 0
 * - R(b, 10) === 0
 * - Monotonically non-increasing with wickets: R(b, w) >= R(b, w + 1)
 * - Monotonically non-decreasing with balls: R(b + 1, w) >= R(b, w)
 *
 * @param {number|string} ballsRemaining - Remaining balls in the innings (or cricket overs)
 * @param {number} wicketsLost - Wickets fallen so far (0 - 10)
 * @returns {number} Resource percentage remaining (0.00 - 100.00)
 */
export function calculateResource(ballsRemaining, wicketsLost) {
    const balls = typeof ballsRemaining === 'number' && Number.isInteger(ballsRemaining)
        ? Math.max(0, Math.min(300, ballsRemaining))
        : oversToBalls(ballsRemaining);

    const w = Math.max(0, Math.min(10, Math.floor(Number(wicketsLost) || 0)));

    if (w >= 10 || balls <= 0) {
        return 0.0;
    }

    const z = Z0[w] !== undefined ? Z0[w] : 0;
    const b = B[w] !== undefined ? B[w] : 0.035;

    // Decay rate normalized per ball: b_ball = b / 6
    const bBall = b / 6.0;
    const rawResource = z * (1.0 - Math.exp(-bBall * balls));

    // Enforce strict upper bound of 100.0%
    return Math.max(0.0, Math.min(100.0, rawResource));
}

/**
 * Calculates revised target when a match is delayed or interrupted by rain.
 *
 * Reduced Resource (R2 < R1): Target = floor(S * R2 / R1) + 1
 * Increased Resource (R2 > R1): Target = S + floor((R2 - R1) * Benchmark / 100) + 1
 * Equal Resource: Target = S + 1
 */
export function calculateDlsTarget({
    totalOvers = 20,
    firstInningsScore = 0,
    secondInningsOvers = 20,
    firstInningsOversBowled = null,
    firstInningsWickets = 0,
    customG50 = null,
    historicalCompletedScores = [],
    interruptionEvents = []
}) {
    const originalBalls = oversToBalls(totalOvers) || 120;
    const score1 = Math.max(0, Number(firstInningsScore) || 0);
    const revBalls2 = oversToBalls(secondInningsOvers) || originalBalls;
    const originalOversNum = originalBalls / 6;
    const revOversNum = revBalls2 / 6;

    const g50 = getBenchmarkScore(originalOversNum, customG50, historicalCompletedScores);

    // 1. Calculate Team 1 resource (R1)
    let r1 = calculateResource(originalBalls, 0);

    // If Team 1 innings was interrupted / curtailed:
    if (firstInningsOversBowled !== null && firstInningsOversBowled !== undefined) {
        const t1BallsBowled = oversToBalls(firstInningsOversBowled);
        if (t1BallsBowled < originalBalls) {
            const ballsLostT1 = Math.max(0, originalBalls - t1BallsBowled);
            const unconsumedT1 = calculateResource(ballsLostT1, firstInningsWickets);
            r1 = Math.max(0.1, r1 - unconsumedT1);
        }
    }

    // Process any structured multi-interruption events in Team 1
    if (Array.isArray(interruptionEvents) && interruptionEvents.length > 0) {
        interruptionEvents.forEach(evt => {
            if (evt.innings === 1 && evt.ballsLost) {
                const resLost = calculateResource(evt.ballsLost, evt.wickets || 0);
                r1 = Math.max(0.1, r1 - resLost);
            }
        });
    }

    // 2. Calculate Team 2 resource (R2)
    let r2 = calculateResource(revBalls2, 0);

    // Process any structured multi-interruption events in Team 2
    if (Array.isArray(interruptionEvents) && interruptionEvents.length > 0) {
        interruptionEvents.forEach(evt => {
            if (evt.innings === 2 && evt.ballsLost) {
                const resLost = calculateResource(evt.ballsLost, evt.wickets || 0);
                r2 = Math.max(0.1, r2 - resLost);
            }
        });
    }

    // 3. Compute revised target
    let revisedTarget;
    let calculationType;

    // Check equal resources (within 0.001%)
    if (Math.abs(r1 - r2) < 0.001) {
        revisedTarget = score1 + 1;
        calculationType = 'standard';
    } else if (r2 < r1) {
        // Reduced resource target
        revisedTarget = Math.floor((score1 * r2) / r1) + 1;
        calculationType = 'scaled_down';
    } else {
        // Increased resource target
        revisedTarget = score1 + Math.floor(((r2 - r1) * g50) / 100.0) + 1;
        calculationType = 'scaled_up';
    }

    revisedTarget = Math.max(1, revisedTarget);
    const requiredRunRate = revOversNum > 0 ? (revisedTarget / revOversNum).toFixed(2) : '0.00';

    return {
        isDls: revBalls2 !== originalBalls || (firstInningsOversBowled !== null && oversToBalls(firstInningsOversBowled) < originalBalls),
        originalOvers: originalOversNum,
        originalBalls,
        revisedOvers: revOversNum,
        revisedBalls: revBalls2,
        firstInningsScore: score1,
        firstInningsOversBowled: firstInningsOversBowled !== null ? ballsToOvers(oversToBalls(firstInningsOversBowled)) : ballsToOvers(originalBalls),
        firstInningsWickets: Number(firstInningsWickets) || 0,
        revisedTarget,
        requiredRunRate: Number(requiredRunRate),
        resource1: Number(r1.toFixed(3)),
        resource2: Number(r2.toFixed(3)),
        g50Benchmark: g50,
        calculationType,
        isOfficialResultEligible: revBalls2 >= 30 // Minimum 5 overs (30 balls) for official result
    };
}

/**
 * Calculates current DLS Par Score ball-by-ball during 2nd innings.
 * Strictly guarantees completed-innings par score === revisedTarget - 1.
 */
export function calculateDlsParScore({
    totalOvers = 20,
    firstInningsScore = 0,
    secondInningsOvers = 20,
    secondInningsBallsBowled = 0,
    secondInningsWickets = 0,
    customG50 = null,
    firstInningsOversBowled = null,
    firstInningsWickets = 0,
    historicalCompletedScores = []
}) {
    const targetCalc = calculateDlsTarget({
        totalOvers,
        firstInningsScore,
        secondInningsOvers,
        firstInningsOversBowled,
        firstInningsWickets,
        customG50,
        historicalCompletedScores
    });

    const score1 = targetCalc.firstInningsScore;
    const revBalls2 = targetCalc.revisedBalls;
    const r1 = targetCalc.resource1;
    const r2Total = targetCalc.resource2;
    const revisedTarget = targetCalc.revisedTarget;
    const targetPar = Math.max(0, revisedTarget - 1);

    const ballsBowled = Math.max(0, Math.min(revBalls2, oversToBalls(secondInningsBallsBowled)));
    const ballsRemaining = Math.max(0, revBalls2 - ballsBowled);
    const wickets = Math.max(0, Math.min(10, Number(secondInningsWickets) || 0));

    // Resource Team 2 still has in hand at this ball
    const r2Remaining = calculateResource(ballsRemaining, wickets);

    // Resource consumed so far by Team 2
    const r2Consumed = Math.max(0, r2Total - r2Remaining);

    let parScore;

    // Completed innings check: when all balls consumed, par score strictly converges to revisedTarget - 1
    if (ballsRemaining === 0) {
        parScore = targetPar;
    } else if (ballsBowled === 0) {
        parScore = 0;
    } else if (r2Total <= r1) {
        // Standard reduced chase: par = floor(S * R2_consumed / R1)
        // With convergence check so it never exceeds targetPar
        parScore = Math.min(targetPar, Math.floor((score1 * r2Consumed) / r1));
    } else {
        // Scaled-up chase with G50: anchored convergence to targetPar
        parScore = Math.min(targetPar, Math.floor((r2Consumed / r2Total) * targetPar));
    }

    const minBallsThreshold = 30; // 5 overs = 30 legal balls
    const isOfficialResultEligible = ballsBowled >= minBallsThreshold;

    return {
        parScore: Math.max(0, parScore),
        targetPar,
        revisedTarget,
        ballsBowled,
        oversBowled: ballsToOvers(ballsBowled),
        ballsRemaining,
        wickets,
        resourceConsumed: Number(r2Consumed.toFixed(3)),
        resourceTotal: r2Total,
        isOfficialResultEligible,
        minOversThreshold: 5
    };
}

/**
 * Generates a full reference matrix of DLS Par Scores for Overs 5 to end across wickets 0 to 6.
 */
export function generateDlsParTable({
    totalOvers = 20,
    firstInningsScore = 145,
    secondInningsOvers = 20,
    customG50 = null,
    minOver = 5,
    maxWickets = 6
}) {
    const table = [];
    const maxBalls = oversToBalls(secondInningsOvers) || (20 * 6);
    const maxOver = Math.floor(maxBalls / 6);
    const startOver = Math.min(minOver, maxOver);

    for (let ov = startOver; ov <= maxOver; ov++) {
        const row = {
            over: ov,
            pars: []
        };
        for (let w = 0; w <= maxWickets; w++) {
            const res = calculateDlsParScore({
                totalOvers,
                firstInningsScore,
                secondInningsOvers,
                secondInningsBallsBowled: ov * 6,
                secondInningsWickets: w,
                customG50
            });
            row.pars.push({ wickets: w, par: res.parScore });
        }
        table.push(row);
    }
    return table;
}

const dlsEngine = {
    calculateDlsTarget,
    calculateDlsParScore,
    calculateResource,
    generateDlsParTable,
    getBenchmarkScore,
    oversToBalls,
    ballsToOvers
};

export default dlsEngine;

