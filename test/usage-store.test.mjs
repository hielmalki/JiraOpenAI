import test from 'node:test';
import assert from 'node:assert/strict';
import {
    assertWithinInstallationLimits,
    createDefaultUsageSummary,
    DEFAULT_DAILY_LIMIT,
    DEFAULT_MONTHLY_LIMIT,
    formatDayBucket,
    formatMonthBucket,
    getUsageSummary,
    prepareUsageSummary,
    recordSuccessfulAnalysis,
    resetUsageBucketsIfNeeded
} from '../src/resolvers/usage-store.mjs';

test('createDefaultUsageSummary creates an empty usage state with default limits', () => {
    const now = new Date('2026-03-25T10:00:00.000Z');

    assert.deepEqual(createDefaultUsageSummary(now), {
        version: 1,
        totalAnalyses: 0,
        lastAnalysisAt: null,
        updatedAt: '2026-03-25T10:00:00.000Z',
        daily: {
            bucket: '2026-03-25',
            count: 0,
            limit: DEFAULT_DAILY_LIMIT
        },
        monthly: {
            bucket: '2026-03',
            count: 0,
            limit: DEFAULT_MONTHLY_LIMIT
        }
    });
});

test('formatDayBucket and formatMonthBucket create stable bucket keys', () => {
    const now = new Date('2026-03-25T10:00:00.000Z');

    assert.equal(formatDayBucket(now), '2026-03-25');
    assert.equal(formatMonthBucket(now), '2026-03');
});

test('getUsageSummary normalizes legacy summaries to include daily and monthly limits', async () => {
    const now = new Date('2026-03-25T10:00:00.000Z');
    const store = {
        async get(key) {
            assert.equal(key, 'usage.summary');
            return {
                version: 1,
                totalAnalyses: 4,
                lastAnalysisAt: '2026-03-24T10:00:00.000Z',
                updatedAt: '2026-03-24T10:00:00.000Z'
            };
        }
    };

    assert.deepEqual(await getUsageSummary(store, now), {
        version: 1,
        totalAnalyses: 4,
        lastAnalysisAt: '2026-03-24T10:00:00.000Z',
        updatedAt: '2026-03-24T10:00:00.000Z',
        daily: {
            bucket: '2026-03-25',
            count: 0,
            limit: DEFAULT_DAILY_LIMIT
        },
        monthly: {
            bucket: '2026-03',
            count: 0,
            limit: DEFAULT_MONTHLY_LIMIT
        }
    });
});

test('prepareUsageSummary lazily resets outdated daily and monthly buckets', async () => {
    const now = new Date('2026-03-25T10:00:00.000Z');
    let persistedValue;

    const store = {
        async get() {
            return {
                version: 1,
                totalAnalyses: 8,
                lastAnalysisAt: '2026-02-28T22:00:00.000Z',
                updatedAt: '2026-02-28T22:00:00.000Z',
                daily: {
                    bucket: '2026-02-28',
                    count: 7,
                    limit: DEFAULT_DAILY_LIMIT
                },
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

    assert.deepEqual(result, {
        version: 1,
        totalAnalyses: 8,
        lastAnalysisAt: '2026-02-28T22:00:00.000Z',
        updatedAt: '2026-02-28T22:00:00.000Z',
        daily: {
            bucket: '2026-03-25',
            count: 0,
            limit: DEFAULT_DAILY_LIMIT
        },
        monthly: {
            bucket: '2026-03',
            count: 0,
            limit: DEFAULT_MONTHLY_LIMIT
        }
    });
    assert.deepEqual(persistedValue, result);
});

test('resetUsageBucketsIfNeeded keeps current buckets unchanged', () => {
    const now = new Date('2026-03-25T10:00:00.000Z');
    const summary = {
        version: 1,
        totalAnalyses: 3,
        lastAnalysisAt: '2026-03-25T09:00:00.000Z',
        updatedAt: '2026-03-25T09:00:00.000Z',
        daily: {
            bucket: '2026-03-25',
            count: 2,
            limit: DEFAULT_DAILY_LIMIT
        },
        monthly: {
            bucket: '2026-03',
            count: 5,
            limit: DEFAULT_MONTHLY_LIMIT
        }
    };

    assert.deepEqual(resetUsageBucketsIfNeeded(summary, now), summary);
});

test('assertWithinInstallationLimits rejects when the daily limit is reached', () => {
    assert.throws(
        () =>
            assertWithinInstallationLimits({
                daily: { bucket: '2026-03-25', count: DEFAULT_DAILY_LIMIT, limit: DEFAULT_DAILY_LIMIT },
                monthly: { bucket: '2026-03', count: 10, limit: DEFAULT_MONTHLY_LIMIT }
            }),
        error => error.code === 'DAILY_LIMIT_REACHED'
    );
});

test('assertWithinInstallationLimits rejects when the monthly limit is reached', () => {
    assert.throws(
        () =>
            assertWithinInstallationLimits({
                daily: { bucket: '2026-03-25', count: 3, limit: DEFAULT_DAILY_LIMIT },
                monthly: { bucket: '2026-03', count: DEFAULT_MONTHLY_LIMIT, limit: DEFAULT_MONTHLY_LIMIT }
            }),
        error => error.code === 'MONTHLY_LIMIT_REACHED'
    );
});

test('recordSuccessfulAnalysis increments total, daily and monthly counters', async () => {
    const now = new Date('2026-03-25T11:30:00.000Z');
    let persistedValue;

    const store = {
        async set(key, value) {
            assert.equal(key, 'usage.summary');
            persistedValue = value;
        }
    };

    const result = await recordSuccessfulAnalysis(
        store,
        now,
        {
            version: 1,
            totalAnalyses: 2,
            lastAnalysisAt: '2026-03-24T08:00:00.000Z',
            updatedAt: '2026-03-24T08:00:00.000Z',
            daily: {
                bucket: '2026-03-25',
                count: 4,
                limit: DEFAULT_DAILY_LIMIT
            },
            monthly: {
                bucket: '2026-03',
                count: 9,
                limit: DEFAULT_MONTHLY_LIMIT
            }
        }
    );

    assert.deepEqual(result, {
        version: 1,
        totalAnalyses: 3,
        lastAnalysisAt: '2026-03-25T11:30:00.000Z',
        updatedAt: '2026-03-25T11:30:00.000Z',
        daily: {
            bucket: '2026-03-25',
            count: 5,
            limit: DEFAULT_DAILY_LIMIT
        },
        monthly: {
            bucket: '2026-03',
            count: 10,
            limit: DEFAULT_MONTHLY_LIMIT
        }
    });
    assert.deepEqual(persistedValue, result);
});
