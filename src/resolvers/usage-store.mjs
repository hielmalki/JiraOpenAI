import { kvs } from '@forge/kvs';

const USAGE_SUMMARY_KEY = 'usage.summary';
const USER_HOURLY_USAGE_PREFIX = 'usage.user';

export const DEFAULT_DAILY_LIMIT = 20;
export const DEFAULT_MONTHLY_LIMIT = 200;
export const DEFAULT_HOURLY_USER_LIMIT = 5;

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

export function getUserHourlyUsageKey(accountId) {
    return `${USER_HOURLY_USAGE_PREFIX}.${accountId}.hourly`;
}

export function createDefaultUsageSummary(now = new Date()) {
    return {
        version: 1,
        totalAnalyses: 0,
        lastAnalysisAt: null,
        updatedAt: now.toISOString(),
        daily: {
            bucket: formatDayBucket(now),
            count: 0,
            limit: DEFAULT_DAILY_LIMIT
        },
        monthly: {
            bucket: formatMonthBucket(now),
            count: 0,
            limit: DEFAULT_MONTHLY_LIMIT
        }
    };
}

export function createDefaultUserHourlyUsage(accountId, now = new Date()) {
    return {
        version: 1,
        accountId,
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
        daily: {
            ...baseSummary.daily,
            ...(usageSummary.daily || {}),
            count: Number(usageSummary?.daily?.count || 0),
            limit: Number(usageSummary?.daily?.limit || DEFAULT_DAILY_LIMIT)
        },
        monthly: {
            ...baseSummary.monthly,
            ...(usageSummary.monthly || {}),
            count: Number(usageSummary?.monthly?.count || 0),
            limit: Number(usageSummary?.monthly?.limit || DEFAULT_MONTHLY_LIMIT)
        }
    };
}

export function normalizeUserHourlyUsage(accountId, usage, now = new Date()) {
    const baseUsage = createDefaultUserHourlyUsage(accountId, now);
    if (!usage || typeof usage !== 'object') {
        return baseUsage;
    }

    return {
        ...baseUsage,
        ...usage,
        accountId,
        hourly: {
            ...baseUsage.hourly,
            ...(usage.hourly || {}),
            count: Number(usage?.hourly?.count || 0),
            limit: Number(usage?.hourly?.limit || DEFAULT_HOURLY_USER_LIMIT)
        }
    };
}

export function resetUsageBucketsIfNeeded(usageSummary, now = new Date()) {
    const normalizedSummary = normalizeUsageSummary(usageSummary, now);
    const currentDayBucket = formatDayBucket(now);
    const currentMonthBucket = formatMonthBucket(now);

    const nextSummary = {
        ...normalizedSummary
    };

    if (normalizedSummary.daily.bucket !== currentDayBucket) {
        nextSummary.daily = {
            ...normalizedSummary.daily,
            bucket: currentDayBucket,
            count: 0
        };
    }

    if (normalizedSummary.monthly.bucket !== currentMonthBucket) {
        nextSummary.monthly = {
            ...normalizedSummary.monthly,
            bucket: currentMonthBucket,
            count: 0
        };
    }

    return nextSummary;
}

export function resetUserHourlyBucketIfNeeded(accountId, usage, now = new Date()) {
    const normalizedUsage = normalizeUserHourlyUsage(accountId, usage, now);
    const currentHourBucket = formatHourBucket(now);

    if (normalizedUsage.hourly.bucket === currentHourBucket) {
        return normalizedUsage;
    }

    return {
        ...normalizedUsage,
        hourly: {
            ...normalizedUsage.hourly,
            bucket: currentHourBucket,
            count: 0
        }
    };
}

export async function getUsageSummary(store = kvs, now = new Date()) {
    const usageSummary = await store.get(USAGE_SUMMARY_KEY);
    return normalizeUsageSummary(usageSummary, now);
}

export async function getUserHourlyUsage(accountId, store = kvs, now = new Date()) {
    const usage = await store.get(getUserHourlyUsageKey(accountId));
    return normalizeUserHourlyUsage(accountId, usage, now);
}

export async function prepareUsageSummary(store = kvs, now = new Date()) {
    const existingSummary = await store.get(USAGE_SUMMARY_KEY);
    const preparedSummary = resetUsageBucketsIfNeeded(existingSummary, now);

    if (JSON.stringify(existingSummary || null) !== JSON.stringify(preparedSummary)) {
        await store.set(USAGE_SUMMARY_KEY, preparedSummary);
    }

    return preparedSummary;
}

export async function prepareUserHourlyUsage(accountId, store = kvs, now = new Date()) {
    const key = getUserHourlyUsageKey(accountId);
    const existingUsage = await store.get(key);
    const preparedUsage = resetUserHourlyBucketIfNeeded(accountId, existingUsage, now);

    if (JSON.stringify(existingUsage || null) !== JSON.stringify(preparedUsage)) {
        await store.set(key, preparedUsage);
    }

    return preparedUsage;
}

export function assertWithinInstallationLimits(usageSummary) {
    if (usageSummary.daily.count >= usageSummary.daily.limit) {
        const error = new Error('Tageslimit für diese Installation erreicht. Bitte morgen erneut versuchen.');
        error.code = 'DAILY_LIMIT_REACHED';
        throw error;
    }

    if (usageSummary.monthly.count >= usageSummary.monthly.limit) {
        const error = new Error(
            'Monatslimit für diese Installation erreicht. Bitte im nächsten Abrechnungszeitraum erneut versuchen.'
        );
        error.code = 'MONTHLY_LIMIT_REACHED';
        throw error;
    }
}

export function assertWithinUserHourlyLimit(userHourlyUsage) {
    if (userHourlyUsage.hourly.count >= userHourlyUsage.hourly.limit) {
        const error = new Error(
            'Zu viele Analysen in kurzer Zeit. Bitte warte kurz und versuche es in der nächsten Stunde erneut.'
        );
        error.code = 'USER_HOURLY_LIMIT_REACHED';
        throw error;
    }
}

export async function recordSuccessfulAnalysis(store = kvs, now = new Date(), usageSummary = null) {
    const currentSummary = usageSummary
        ? resetUsageBucketsIfNeeded(usageSummary, now)
        : await prepareUsageSummary(store, now);

    const timestamp = now.toISOString();
    const nextSummary = {
        ...currentSummary,
        version: 1,
        totalAnalyses: Number(currentSummary.totalAnalyses || 0) + 1,
        lastAnalysisAt: timestamp,
        updatedAt: timestamp,
        daily: {
            ...currentSummary.daily,
            count: Number(currentSummary.daily.count || 0) + 1
        },
        monthly: {
            ...currentSummary.monthly,
            count: Number(currentSummary.monthly.count || 0) + 1
        }
    };

    await store.set(USAGE_SUMMARY_KEY, nextSummary);
    return nextSummary;
}

export async function recordSuccessfulUserAnalysis(accountId, store = kvs, now = new Date(), usage = null) {
    const currentUsage = usage
        ? resetUserHourlyBucketIfNeeded(accountId, usage, now)
        : await prepareUserHourlyUsage(accountId, store, now);

    const nextUsage = {
        ...currentUsage,
        version: 1,
        accountId,
        hourly: {
            ...currentUsage.hourly,
            count: Number(currentUsage.hourly.count || 0) + 1
        },
        updatedAt: now.toISOString()
    };

    await store.set(getUserHourlyUsageKey(accountId), nextUsage);
    return nextUsage;
}
