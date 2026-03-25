import test from 'node:test';
import assert from 'node:assert/strict';
import { getLicenseState } from '../src/resolvers/service.mjs';
import {
    addDays,
    assertPlanAllowsAnalysis,
    createTrialPlanState,
    getPlanState,
    PLAN_LIMITS,
    PLAN_TYPES,
    resolvePlanState,
    TRIAL_DURATION_DAYS
} from '../src/resolvers/plan-store.mjs';

test('createTrialPlanState initializes install and expiry timestamps', () => {
    const now = new Date('2026-03-25T10:00:00.000Z');
    const planState = createTrialPlanState(now);

    assert.equal(planState.installedAt, '2026-03-25T10:00:00.000Z');
    assert.equal(planState.trialEndsAt, addDays(now, TRIAL_DURATION_DAYS).toISOString());
});

test('resolvePlanState returns paid when a paid license is active', () => {
    const now = new Date('2026-03-25T10:00:00.000Z');
    const planState = resolvePlanState({
        licenseState: { isLicensed: true, source: 'context' },
        storedPlanState: createTrialPlanState(now),
        now
    });

    assert.equal(planState.planType, PLAN_TYPES.PAID);
    assert.equal(planState.status, 'active');
    assert.deepEqual(planState.limits, PLAN_LIMITS[PLAN_TYPES.PAID]);
});

test('resolvePlanState returns active trial without paid license before expiry', () => {
    const now = new Date('2026-03-25T10:00:00.000Z');
    const planState = resolvePlanState({
        licenseState: { isLicensed: true, source: 'implicit' },
        storedPlanState: createTrialPlanState(now),
        now
    });

    assert.equal(planState.planType, PLAN_TYPES.TRIAL);
    assert.equal(planState.status, 'active');
    assert.equal(planState.canAnalyze, true);
    assert.deepEqual(planState.limits, PLAN_LIMITS[PLAN_TYPES.TRIAL]);
});

test('resolvePlanState returns expired trial after the trial window', () => {
    const installedAt = new Date('2026-03-01T10:00:00.000Z');
    const now = new Date('2026-04-05T10:00:00.000Z');
    const planState = resolvePlanState({
        licenseState: { isLicensed: false, source: 'override' },
        storedPlanState: createTrialPlanState(installedAt),
        now
    });

    assert.equal(planState.planType, PLAN_TYPES.TRIAL);
    assert.equal(planState.status, 'expired');
    assert.equal(planState.canAnalyze, false);
});

test('getPlanState persists a trial state when none exists', async () => {
    const now = new Date('2026-03-25T10:00:00.000Z');
    let persistedValue;
    const store = {
        async get() {
            return null;
        },
        async set(key, value) {
            assert.equal(key, 'plan.state');
            persistedValue = value;
        }
    };

    const planState = await getPlanState({
        licenseState: getLicenseState({ context: {} }),
        store,
        now
    });

    assert.equal(planState.planType, PLAN_TYPES.TRIAL);
    assert.deepEqual(persistedValue, createTrialPlanState(now));
});

test('assertPlanAllowsAnalysis rejects expired trial access', () => {
    assert.throws(
        () => assertPlanAllowsAnalysis({ planType: PLAN_TYPES.TRIAL, status: 'expired', canAnalyze: false }),
        error => error.code === 'TRIAL_EXPIRED'
    );
});
