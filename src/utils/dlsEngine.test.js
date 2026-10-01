/**
 * Automated Unit & Regression Tests for DLS Engine
 * Validates all Acceptance Criteria specified in tournament telemetry standards:
 * - Ball normalization ("14.2" -> 86 balls)
 * - Monotonicity across wickets and balls
 * - No-interruption target === firstInningsScore + 1
 * - Monotonic target reduction (20 -> 14 -> 10 overs)
 * - Calibrated format benchmark scaling
 * - Exact par score convergence to (revisedTarget - 1) on completed innings
 * - Known match examples
 */

import {
    oversToBalls,
    ballsToOvers,
    calculateResource,
    getBenchmarkScore,
    calculateDlsTarget,
    calculateDlsParScore
} from './dlsEngine';

describe('DLS Engine — Ball Normalization', () => {
    test('resolves cricket over notation to exact balls', () => {
        expect(oversToBalls('14.2')).toBe(86);
        expect(oversToBalls(14.2)).toBe(86);
        expect(oversToBalls('14.5')).toBe(89);
        expect(oversToBalls('15.0')).toBe(90);
        expect(oversToBalls('20')).toBe(120);
        expect(oversToBalls(20)).toBe(120);
        expect(oversToBalls('0.1')).toBe(1);
        expect(oversToBalls('0.0')).toBe(0);
        expect(oversToBalls(0)).toBe(0);
    });

    test('converts exact balls back to cricket over string', () => {
        expect(ballsToOvers(86)).toBe('14.2');
        expect(ballsToOvers(89)).toBe('14.5');
        expect(ballsToOvers(90)).toBe('15');
        expect(ballsToOvers(120)).toBe('20');
        expect(ballsToOvers(0)).toBe('0');
    });
});

describe('DLS Engine — Resource Surface Monotonicity', () => {
    test('resource value never increases as wickets lost increases (R(b, w) >= R(b, w+1))', () => {
        const testBalls = [6, 30, 60, 84, 120, 300];
        testBalls.forEach(balls => {
            for (let w = 0; w < 10; w++) {
                const resCurrent = calculateResource(balls, w);
                const resNextWicket = calculateResource(balls, w + 1);
                expect(resCurrent).toBeGreaterThanOrEqual(resNextWicket);
            }
        });
    });

    test('resource value never decreases as remaining balls increase (R(b+1, w) >= R(b, w))', () => {
        for (let w = 0; w <= 9; w++) {
            for (let b = 0; b < 120; b += 6) {
                const resCurrent = calculateResource(b, w);
                const resMoreBalls = calculateResource(b + 6, w);
                expect(resMoreBalls).toBeGreaterThanOrEqual(resCurrent);
            }
        }
    });

    test('10 wickets lost or 0 balls remaining always yields exactly 0.0% resource', () => {
        expect(calculateResource(120, 10)).toBe(0);
        expect(calculateResource(0, 0)).toBe(0);
        expect(calculateResource(0, 5)).toBe(0);
    });
});

describe('DLS Engine — Target Calculations & Acceptance Criteria', () => {
    test('AC-1: No-interruption target is exactly firstInningsScore + 1', () => {
        const calc = calculateDlsTarget({
            totalOvers: 20,
            firstInningsScore: 165,
            secondInningsOvers: 20
        });
        expect(calc.revisedTarget).toBe(166);
        expect(calc.isDls).toBe(false);
        expect(calc.calculationType).toBe('standard');
    });

    test('AC-2: Reduced Team 2 resources lower revised target monotonically (20 -> 14 -> 10 overs)', () => {
        const t20 = calculateDlsTarget({ totalOvers: 20, firstInningsScore: 170, secondInningsOvers: 20 });
        const t16 = calculateDlsTarget({ totalOvers: 20, firstInningsScore: 170, secondInningsOvers: 16 });
        const t14 = calculateDlsTarget({ totalOvers: 20, firstInningsScore: 170, secondInningsOvers: 14 });
        const t12 = calculateDlsTarget({ totalOvers: 20, firstInningsScore: 170, secondInningsOvers: 12 });
        const t10 = calculateDlsTarget({ totalOvers: 20, firstInningsScore: 170, secondInningsOvers: 10 });
        const t5 = calculateDlsTarget({ totalOvers: 20, firstInningsScore: 170, secondInningsOvers: 5 });

        expect(t20.revisedTarget).toBe(171);
        expect(t16.revisedTarget).toBeLessThan(t20.revisedTarget);
        expect(t14.revisedTarget).toBeLessThan(t16.revisedTarget);
        expect(t12.revisedTarget).toBeLessThan(t14.revisedTarget);
        expect(t10.revisedTarget).toBeLessThan(t12.revisedTarget);
        expect(t5.revisedTarget).toBeLessThan(t10.revisedTarget);
    });

    test('AC-3: Increased Team 2 resources (interrupted Team 1) scales up using calibrated format benchmark', () => {
        // Team 1 scores 110 in only 12 overs with 3 wickets down before rain stops their innings
        // Team 2 has full 20 overs available
        const calc = calculateDlsTarget({
            totalOvers: 20,
            firstInningsScore: 110,
            secondInningsOvers: 20,
            firstInningsOversBowled: '12.0',
            firstInningsWickets: 3,
            customG50: 145
        });

        expect(calc.calculationType).toBe('scaled_up');
        expect(calc.resource2).toBeGreaterThan(calc.resource1);
        // Target must be higher than 110 + 1 because Team 2 has more resource than Team 1 had
        expect(calc.revisedTarget).toBeGreaterThan(111);
    });

    test('AC-4: Par score reaches exactly revisedTarget - 1 when all revised balls have been consumed', () => {
        const scenarios = [
            { totalOvers: 20, firstInningsScore: 160, secondInningsOvers: 20 },
            { totalOvers: 20, firstInningsScore: 155, secondInningsOvers: 14 },
            { totalOvers: 20, firstInningsScore: 140, secondInningsOvers: 10 },
            { totalOvers: 20, firstInningsScore: 120, secondInningsOvers: 20, firstInningsOversBowled: 15, firstInningsWickets: 4 }
        ];

        scenarios.forEach(scen => {
            const target = calculateDlsTarget(scen).revisedTarget;
            const revBalls = oversToBalls(scen.secondInningsOvers);

            // Test across different wickets (0, 1, 3, 5, 8 wickets down at end of innings)
            [0, 1, 3, 5, 8].forEach(w => {
                const par = calculateDlsParScore({
                    ...scen,
                    secondInningsBallsBowled: revBalls, // 100% of balls bowled
                    secondInningsWickets: w
                });

                expect(par.parScore).toBe(target - 1);
            });
        });
    });

    test('AC-5: Validated historical benchmark calibration from tournament scores', () => {
        const historicalScores = [148, 152, 138, 160, 142];
        const benchmark = getBenchmarkScore(20, null, historicalScores);
        expect(benchmark).toBe(148); // Mean of 148, 152, 138, 160, 142 = 148
    });
});
