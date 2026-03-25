import test from 'node:test';
import assert from 'node:assert/strict';
import {
    applyUsageLimits,
    assertWithinInstallationLimits,
    assertWithinUserDailyLimit,
    assertWithinUserHourlyLimit,
    createDefaultUsageSummary,
    createDefaultUserUsage,
    DEFAULT_DAILY_LIMIT,
    DEFAULT_HOURLY_USER_LIMIT,
    DEFAULT_MONTHLY_LIMIT,
    formatDayBucket,
    formatHourBucket,
    formatMonthBucket,
    getUserAccountId,
    getUsageSnapshot,
    getUserUsage,
    getUserUsageKey,
    getUsageSummary,
    prepareUsageSummary,
    prepareUserUsage,
    recordSuccessfulAnalysis,
    recordSuccessfulUserAnalysis,
    resetUsageBucketsIfNeeded,
    resetUserUsageBucketsIfNeeded
} from '../src/resolvers/usage-store.mjs';

test('createDefaultUsageSummary creates an empty monthly usage state', () => {
    const now = new Date('2026-03-25T10:00:00.000Z');

    assert.deepEqual(createDefaultUsageSummary(now), {
        version: 1,
        totalAnalyses: 0,
        lastAnalysisAt: null,
        updatedAt: '2026-03-25T10:00:00.000Z',
        monthly: {
            bucket: '2026-03',
            count: 0,
            limit: DEFAULT_MONTHLY_LIMIT
        }
    });
});

test('format bucket helpers create stable keys', () => {
    const now = new Date('2026-03-25T10:00:00.000Z');
    assert.equal(formatDayBucket(now), '2026-03-25');
    assert.equal(formatMonthBucket(now), '2026-03');
    assert.equal(formatHourBucket(now), '2026-03-25T10');
});

test('getUserAccountId resolves the best available account id', () => {
    assert.equal(getUserAccountId({ accountId: 'user-1' }), 'user-1');
    assert.equal(getUserAccountId({ principal: { accountId: 'user-2' } }), 'user-2');
    assert.equal(getUserAccountId({ extension: { user: { accountId: 'user-3' } } }), 'user-3');
    assert.equal(getUserAccountId({}), 'anonymous');
});

test('createDefaultUserUsage creates daily and hourly counters', () => {
    const now = new Date('2026-03-25T10:00:00.000Z');

    assert.deepEqual(createDefaultUserUsage('user-1', now), {
        version: 1,
        accountId: 'user-1',
        daily: {
            bucket: '2026-03-25',
            count: 0,
            limit: DEFAULT_DAILY_LIMIT
        },
        hourly: {
            bucket: '2026-03-25T10',
            count: 0,
            limit: DEFAULT_HOURLY_USER_LIMIT
        },
        updatedAt: '2026-03-25T10:00:00.000Z'
    });
});

test('getUserUsageKey creates a stable namespaced key', () => {
    assert.equal(getUserUsageKey('user-1'), 'usage.user.user-1.usage');
});

test('prepareUsageSummary resets outdated monthly bucket', async () => {
    const now = new Date('2026-03-25T10:00:00.000Z');
    let persistedValue;

    const store = {
        async get() {
            return {
                version: 1,
                totalAnalyses: 8,
                lastAnalysisAt: '2026-02-28T22:00:00.000Z',
                updatedAt: '2026-02-28T22:00:00.000Z',
                monthly: {
                    bucket: '2026-02',
                    count: 30,
                    limit: DEFAULT_MONTHLY_LIMIT
                }
            };
        },
        async set(key, value) {
            assert.equal(key, 'usage.summary');
            persistedValue = value;
        }
    };

    const result = await prepareUsageSummary(store, now);
    assert.deepEqual(result.monthly, {
        bucket: '2026-03',
        count: 0,
        limit: DEFAULT_MONTHLY_LIMIT
    });
    assert.deepEqual(persistedValue, result);
});

test('prepareUserUsage resets outdated daily and hourly buckets', async () => {
    const now = new Date('2026-03-25T10:00:00.000Z');
    let persistedValue;

    const store = {
        async get(key) {
            assert.equal(key, 'usage.user.user-1.usage');
            return {
                version: 1,
                accountId: 'user-1',
                daily: {
                    bucket: '2026-03-24',
                    count: 4,
                    limit: DEFAULT_DAILY_LIMIT
                },
                hourly: {
                    bucket: '2026-03-25T09',
                    count: 2,
                    limit: DEFAULT_HOURLY_USER_LIMIT
                },
                updatedAt: '2026-03-25T09:30:00.000Z'
            };
        },
        async set(key, value) {
            assert.equal(key, 'usage.user.user-1.usage');
            persistedValue = value;
        }
    };

    const result = await prepareUserUsage('user-1', store, now);
    assert.deepEqual(result.daily, {
        bucket: '2026-03-25',
        count: 0,
        limit: DEFAULT_DAILY_LIMIT
    });
    assert.deepEqual(result.hourly, {
        bucket: '2026-03-25T10',
        count: 0,
        limit: DEFAULT_HOURLY_USER_LIMIT
    });
    assert.deepEqual(persistedValue, result);
});

test('getUsageSummary and getUserUsage return defaults when nothing is stored', async () => {
    const now = new Date('2026-03-25T10:00:00.000Z');
    const store = { async get() { return null; } };

    assert.deepEqual(await getUsageSummary(store, now), createDefaultUsageSummary(now));
    assert.deepEqual(await getUserUsage('user-1', store, now), createDefaultUserUsage('user-1', now));
});

test('getUsageSnapshot applies plan limits to installation and current-user usage', async () => {
    const now = new Date('2026-03-25T10:00:00.000Z');
    const store = {
        async get(key) {
            if (key === 'usage.summary') {
                return {
                    version: 1,
                    totalAnalyses: 9,
                    lastAnalysisAt: '2026-03-25T09:30:00.000Z',
                    updatedAt: '2026-03-25T09:30:00.000Z',
                    monthly: {
                        bucket: '2026-03',
                        count: 9,
                        limit: DEFAULT_MONTHLY_LIMIT
                    }
                };
            }

            return {
                version: 1,
                accountId: 'user-1',
                daily: {
                    bucket: '2026-03-25',
                    count: 3,
                    limit: DEFAULT_DAILY_LIMIT
                },
                hourly: {
                    bucket: '2026-03-25T10',
                    count: 2,
                    limit: DEFAULT_HOURLY_USER_LIMIT
                },
                updatedAt: '2026-03-25T09:30:00.000Z'
            };
        }
    };

    const result = await getUsageSnapshot('user-1', store, now, {
        monthly: 60,
        dailyUser: 8,
        hourlyUser: 3
    });

    assert.equal(result.installation.monthly.limit, 60);
    assert.equal(result.currentUser.daily.limit, 8);
    assert.equal(result.currentUser.hourly.limit, 3);
});

test('reset helpers keep current buckets unchanged', () => {
    const now = new Date('2026-03-25T10:00:00.000Z');
    const usageSummary = {
        version: 1,
        totalAnalyses: 3,
        lastAnalysisAt: '2026-03-25T09:00:00.000Z',
        updatedAt: '2026-03-25T09:00:00.000Z',
        monthly: {
            bucket: '2026-03',
            count: 3,
            limit: DEFAULT_MONTHLY_LIMIT
        }
    };
    const userUsage = {
        version: 1,
        accountId: 'user-1',
        daily: {
            bucket: '2026-03-25',
            count: 2,
            limit: DEFAULT_DAILY_LIMIT
        },
        hourly: {
            bucket: '2026-03-25T10',
            count: 1,
            limit: DEFAULT_HOURLY_USER_LIMIT
        },
        updatedAt: '2026-03-25T10:00:00.000Z'
    };

    assert.deepEqual(resetUsageBucketsIfNeeded(usageSummary, now), usageSummary);
    assert.deepEqual(resetUserUsageBucketsIfNeeded('user-1', userUsage, now), userUsage);
});

test('assert limit helpers reject when monthly, daily or hourly limits are reached', () => {
    assert.throws(
        () => assertWithinInstallationLimits({ monthly: { count: 60, limit: 60 } }),
        error => error.code === 'MONTHLY_LIMIT_REACHED'
    );
    assert.throws(
        () => assertWithinUserDailyLimit({ daily: { count: 8, limit: 8 } }),
        error => error.code === 'DAILY_LIMIT_REACHED'
    );
    assert.throws(
        () => assertWithinUserHourlyLimit({ hourly: { count: 3, limit: 3 } }),
        error => error.code === 'USER_HOURLY_LIMIT_REACHED'
    );
});

test('recordSuccessfulAnalysis increments monthly totals', async () => {
    const now = new Date('2026-03-25T11:30:00.000Z');
    let persistedValue;
    const store = {
        async set(key, value) {
            assert.equal(key, 'usage.summary');
            persistedValue = value;
        }
    };

    const result = await recordSuccessfulAnalysis(store, now, {
        version: 1,
        totalAnalyses: 2,
        lastAnalysisAt: '2026-03-24T08:00:00.000Z',
        updatedAt: '2026-03-24T08:00:00.000Z',
        monthly: {
            bucket: '2026-03',
            count: 9,
            limit: DEFAULT_MONTHLY_LIMIT
        }
    });

    assert.equal(result.totalAnalyses, 3);
    assert.equal(result.monthly.count, 10);
    assert.deepEqual(persistedValue, result);
});

test('recordSuccessfulUserAnalysis increments daily and hourly counters', async () => {
    const now = new Date('2026-03-25T11:30:00.000Z');
    let persistedValue;
    const store = {
        async set(key, value) {
            assert.equal(key, 'usage.user.user-1.usage');
            persistedValue = value;
        }
    };

    const result = await recordSuccessfulUserAnalysis('user-1', store, now, {
        version: 1,
        accountId: 'user-1',
        daily: {
            bucket: '2026-03-25',
            count: 4,
            limit: DEFAULT_DAILY_LIMIT
        },
        hourly: {
            bucket: '2026-03-25T11',
            count: 2,
            limit: DEFAULT_HOURLY_USER_LIMIT
        },
        updatedAt: '2026-03-25T11:00:00.000Z'
    });

    assert.equal(result.daily.count, 5);
    assert.equal(result.hourly.count, 3);
    assert.deepEqual(persistedValue, result);
});

// keep one small sanity check for direct limit application

test('applyUsageLimits overrides displayed limits without touching counts', () => {
    const result = applyUsageLimits(
        { monthly: { count: 11, limit: DEFAULT_MONTHLY_LIMIT } },
        { daily: { count: 2, limit: DEFAULT_DAILY_LIMIT }, hourly: { count: 1, limit: DEFAULT_HOURLY_USER_LIMIT } },
        { monthly: 60, dailyUser: 8, hourlyUser: 3 }
    );

    assert.equal(result.installation.monthly.count, 11);
    assert.equal(result.installation.monthly.limit, 60);
    assert.equal(result.currentUser.daily.limit, 8);
    assert.equal(result.currentUser.hourly.limit, 3);
});
