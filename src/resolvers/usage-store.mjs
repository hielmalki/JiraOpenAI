import { kvs } from '@forge/kvs';
import { APP_ERROR_CODES, createAppError } from '../shared/app-errors.mjs';

const USAGE_SUMMARY_KEY = 'usage.summary';
const USER_USAGE_PREFIX = 'usage.user';

export const DEFAULT_DAILY_LIMIT = 200;
export const DEFAULT_MONTHLY_LIMIT = 200;
export const DEFAULT_HOURLY_USER_LIMIT = 200;

export function formatDayBucket(now = new Date()) {
    return now.toISOString().slice(0, 10);
}

export function formatMonthBucket(now = new Date()) {
    return now.toISOString().slice(0, 7);
}

export function formatHourBucket(now = new Date()) {
    return now.toISOString().slice(0, 13);
}

export function getUserAccountId(context) {
    return context?.accountId || context?.principal?.accountId || context?.extension?.user?.accountId || 'anonymous';
}

export function getUserUsageKey(accountId) {
    return `${USER_USAGE_PREFIX}.${accountId}.usage`;
}

export function createDefaultUsageSummary(now = new Date()) {
    return {
        version: 1,
        totalAnalyses: 0,
        lastAnalysisAt: null,
        updatedAt: now.toISOString(),
        monthly: {
            bucket: formatMonthBucket(now),
            count: 0,
            limit: DEFAULT_MONTHLY_LIMIT
        }
    };
}

export function createDefaultUserUsage(accountId, now = new Date()) {
    return {
        version: 1,
        accountId,
        daily: {
            bucket: formatDayBucket(now),
            count: 0,
            limit: DEFAULT_DAILY_LIMIT
        },
        hourly: {
            bucket: formatHourBucket(now),
            count: 0,
            limit: DEFAULT_HOURLY_USER_LIMIT
        },
        updatedAt: now.toISOString()
    };
}

export function normalizeUsageSummary(usageSummary, now = new Date()) {
    const baseSummary = createDefaultUsageSummary(now);
    if (!usageSummary || typeof usageSummary !== 'object') {
        return baseSummary;
    }

    return {
        ...baseSummary,
        ...usageSummary,
        totalAnalyses: Number(usageSummary.totalAnalyses || 0),
        monthly: {
            ...baseSummary.monthly,
            ...(usageSummary.monthly || {}),
            count: Number(usageSummary?.monthly?.count || 0),
            limit: Math.max(DEFAULT_MONTHLY_LIMIT, Number(usageSummary?.monthly?.limit || DEFAULT_MONTHLY_LIMIT))
        }
    };
}

export function normalizeUserUsage(accountId, usage, now = new Date()) {
    const baseUsage = createDefaultUserUsage(accountId, now);
    if (!usage || typeof usage !== 'object') {
        return baseUsage;
    }

    return {
        ...baseUsage,
        ...usage,
        accountId,
        daily: {
            ...baseUsage.daily,
            ...(usage.daily || {}),
            count: Number(usage?.daily?.count || 0),
            limit: Math.max(DEFAULT_DAILY_LIMIT, Number(usage?.daily?.limit || DEFAULT_DAILY_LIMIT))
        },
        hourly: {
            ...baseUsage.hourly,
            ...(usage.hourly || {}),
            count: Number(usage?.hourly?.count || 0),
            limit: Math.max(DEFAULT_HOURLY_USER_LIMIT, Number(usage?.hourly?.limit || DEFAULT_HOURLY_USER_LIMIT))
        }
    };
}

export function resetUsageBucketsIfNeeded(usageSummary, now = new Date()) {
    const normalizedSummary = normalizeUsageSummary(usageSummary, now);
    const currentMonthBucket = formatMonthBucket(now);

    if (normalizedSummary.monthly.bucket === currentMonthBucket) {
        return normalizedSummary;
    }

    return {
        ...normalizedSummary,
        monthly: {
            ...normalizedSummary.monthly,
            bucket: currentMonthBucket,
            count: 0
        }
    };
}

export function resetUserUsageBucketsIfNeeded(accountId, usage, now = new Date()) {
    const normalizedUsage = normalizeUserUsage(accountId, usage, now);
    const currentDayBucket = formatDayBucket(now);
    const currentHourBucket = formatHourBucket(now);

    const nextUsage = {
        ...normalizedUsage
    };

    if (normalizedUsage.daily.bucket !== currentDayBucket) {
        nextUsage.daily = {
            ...normalizedUsage.daily,
            bucket: currentDayBucket,
            count: 0
        };
    }

    if (normalizedUsage.hourly.bucket !== currentHourBucket) {
        nextUsage.hourly = {
            ...normalizedUsage.hourly,
            bucket: currentHourBucket,
            count: 0
        };
    }

    return nextUsage;
}

export function applyUsageLimits(usageSummary, userUsage, limits) {
    return {
        installation: {
            ...usageSummary,
            monthly: {
                ...usageSummary.monthly,
                limit: limits?.monthly || usageSummary.monthly.limit
            }
        },
        currentUser: {
            ...userUsage,
            daily: {
                ...userUsage.daily,
                limit: limits?.dailyUser || userUsage.daily.limit
            },
            hourly: {
                ...userUsage.hourly,
                limit: limits?.hourlyUser || userUsage.hourly.limit
            }
        }
    };
}

export async function getUsageSummary(store = kvs, now = new Date()) {
    const usageSummary = await store.get(USAGE_SUMMARY_KEY);
    return normalizeUsageSummary(usageSummary, now);
}

export async function getUserUsage(accountId, store = kvs, now = new Date()) {
    const usage = await store.get(getUserUsageKey(accountId));
    return normalizeUserUsage(accountId, usage, now);
}

export async function getUsageSnapshot(accountId, store = kvs, now = new Date(), limits = null) {
    const usageSummary = await prepareUsageSummary(store, now);
    const userUsage = await prepareUserUsage(accountId, store, now);
    return applyUsageLimits(usageSummary, userUsage, limits);
}

export async function prepareUsageSummary(store = kvs, now = new Date()) {
    const existingSummary = await store.get(USAGE_SUMMARY_KEY);
    const preparedSummary = resetUsageBucketsIfNeeded(existingSummary, now);

    if (JSON.stringify(existingSummary || null) !== JSON.stringify(preparedSummary)) {
        await store.set(USAGE_SUMMARY_KEY, preparedSummary);
    }

    return preparedSummary;
}

export async function prepareUserUsage(accountId, store = kvs, now = new Date()) {
    const key = getUserUsageKey(accountId);
    const existingUsage = await store.get(key);
    const preparedUsage = resetUserUsageBucketsIfNeeded(accountId, existingUsage, now);

    if (JSON.stringify(existingUsage || null) !== JSON.stringify(preparedUsage)) {
        await store.set(key, preparedUsage);
    }

    return preparedUsage;
}

export function assertWithinInstallationLimits(usageSummary, monthlyLimit = usageSummary.monthly.limit) {
    if (usageSummary.monthly.count >= monthlyLimit) {
        throw createAppError(
            APP_ERROR_CODES.MONTHLY_LIMIT_REACHED,
            'Monatslimit für diese Installation erreicht. Bitte im nächsten Abrechnungszeitraum erneut versuchen.'
        );
    }
}

export function assertWithinUserDailyLimit(userUsage, dailyLimit = userUsage.daily.limit) {
    if (userUsage.daily.count >= dailyLimit) {
        throw createAppError(
            APP_ERROR_CODES.DAILY_LIMIT_REACHED,
            'Tageslimit für diesen Benutzer erreicht. Bitte morgen erneut versuchen.'
        );
    }
}

export function assertWithinUserHourlyLimit(userUsage, hourlyLimit = userUsage.hourly.limit) {
    if (userUsage.hourly.count >= hourlyLimit) {
        throw createAppError(
            APP_ERROR_CODES.USER_HOURLY_LIMIT_REACHED,
            'Zu viele Analysen in kurzer Zeit. Bitte warte kurz und versuche es in der nächsten Stunde erneut.'
        );
    }
}

export async function recordSuccessfulAnalysis(store = kvs, now = new Date(), usageSummary = null) {
    const currentSummary = usageSummary ? resetUsageBucketsIfNeeded(usageSummary, now) : await prepareUsageSummary(store, now);
    const timestamp = now.toISOString();
    const nextSummary = {
        ...currentSummary,
        version: 1,
        totalAnalyses: Number(currentSummary.totalAnalyses || 0) + 1,
        lastAnalysisAt: timestamp,
        updatedAt: timestamp,
        monthly: {
            ...currentSummary.monthly,
            count: Number(currentSummary.monthly.count || 0) + 1
        }
    };

    await store.set(USAGE_SUMMARY_KEY, nextSummary);
    return nextSummary;
}

export async function recordSuccessfulUserAnalysis(accountId, store = kvs, now = new Date(), usage = null) {
    const currentUsage = usage ? resetUserUsageBucketsIfNeeded(accountId, usage, now) : await prepareUserUsage(accountId, store, now);
    const nextUsage = {
        ...currentUsage,
        version: 1,
        accountId,
        daily: {
            ...currentUsage.daily,
            count: Number(currentUsage.daily.count || 0) + 1
        },
        hourly: {
            ...currentUsage.hourly,
            count: Number(currentUsage.hourly.count || 0) + 1
        },
        updatedAt: now.toISOString()
    };

    await store.set(getUserUsageKey(accountId), nextUsage);
    return nextUsage;
}
