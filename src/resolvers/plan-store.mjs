import { kvs } from '@forge/kvs';
import { APP_ERROR_CODES, createAppError } from '../shared/app-errors.mjs';

const PLAN_STATE_KEY = 'plan.state';
export const TRIAL_DURATION_DAYS = 30;
export const PLAN_TYPES = {
    TRIAL: 'trial',
    PAID: 'paid'
};

export const PLAN_LIMITS = {
    [PLAN_TYPES.TRIAL]: {
        monthly: 60,
        dailyUser: 8,
        hourlyUser: 3
    },
    [PLAN_TYPES.PAID]: {
        monthly: 120,
        dailyUser: 10,
        hourlyUser: 4
    }
};

export function addDays(now, days) {
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export function createTrialPlanState(now = new Date()) {
    return {
        version: 1,
        installedAt: now.toISOString(),
        trialEndsAt: addDays(now, TRIAL_DURATION_DAYS).toISOString(),
        updatedAt: now.toISOString()
    };
}

export function normalizePlanState(planState, now = new Date()) {
    const baseState = createTrialPlanState(now);
    if (!planState || typeof planState !== 'object') {
        return baseState;
    }

    return {
        ...baseState,
        ...planState,
        installedAt: typeof planState.installedAt === 'string' ? planState.installedAt : baseState.installedAt,
        trialEndsAt: typeof planState.trialEndsAt === 'string' ? planState.trialEndsAt : baseState.trialEndsAt,
        updatedAt: typeof planState.updatedAt === 'string' ? planState.updatedAt : baseState.updatedAt
    };
}

export async function preparePlanState(store = kvs, now = new Date()) {
    const existingPlanState = await store.get(PLAN_STATE_KEY);
    const preparedPlanState = normalizePlanState(existingPlanState, now);

    if (JSON.stringify(existingPlanState || null) !== JSON.stringify(preparedPlanState)) {
        await store.set(PLAN_STATE_KEY, preparedPlanState);
    }

    return preparedPlanState;
}

export function resolvePlanState({ licenseState, storedPlanState, now = new Date() }) {
    const normalizedPlanState = normalizePlanState(storedPlanState, now);
    const hasPaidLicense =
        licenseState?.isLicensed === true &&
        (licenseState?.source === 'context' || licenseState?.source === 'override');

    if (hasPaidLicense) {
        return {
            ...normalizedPlanState,
            planType: PLAN_TYPES.PAID,
            status: 'active',
            canAnalyze: true,
            limits: PLAN_LIMITS[PLAN_TYPES.PAID]
        };
    }

    const isExpired = new Date(normalizedPlanState.trialEndsAt).getTime() <= now.getTime();

    return {
        ...normalizedPlanState,
        planType: PLAN_TYPES.TRIAL,
        status: isExpired ? 'expired' : 'active',
        canAnalyze: !isExpired,
        limits: PLAN_LIMITS[PLAN_TYPES.TRIAL]
    };
}

export async function getPlanState({ licenseState, store = kvs, now = new Date() }) {
    const storedPlanState = await preparePlanState(store, now);
    return resolvePlanState({ licenseState, storedPlanState, now });
}

export function assertPlanAllowsAnalysis(planState) {
    if (planState?.canAnalyze) {
        return;
    }

    if (planState?.planType === PLAN_TYPES.TRIAL && planState?.status === 'expired') {
        throw createAppError(
            APP_ERROR_CODES.TRIAL_EXPIRED,
            'Der Testzeitraum ist beendet. Bitte aktiviere eine bezahlte Lizenz, um weitere Analysen zu starten.'
        );
    }

    throw createAppError(
        APP_ERROR_CODES.LICENSE_REQUIRED,
        'Für diese Funktion ist eine aktive Lizenz erforderlich.'
    );
}
