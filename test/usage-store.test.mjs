import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createDefaultUsageSummary,
    getUsageSummary,
    recordSuccessfulAnalysis
} from '../src/resolvers/usage-store.mjs';

test('createDefaultUsageSummary creates an empty usage state', () => {
    const now = new Date('2026-03-25T10:00:00.000Z');

    assert.deepEqual(createDefaultUsageSummary(now), {
        version: 1,
        totalAnalyses: 0,
        lastAnalysisAt: null,
        updatedAt: '2026-03-25T10:00:00.000Z'
    });
});

test('getUsageSummary returns persisted usage data when present', async () => {
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

    assert.deepEqual(await getUsageSummary(store), {
        version: 1,
        totalAnalyses: 4,
        lastAnalysisAt: '2026-03-24T10:00:00.000Z',
        updatedAt: '2026-03-24T10:00:00.000Z'
    });
});

test('getUsageSummary falls back to an empty usage state', async () => {
    const now = new Date('2026-03-25T10:00:00.000Z');
    const store = {
        async get() {
            return null;
        }
    };

    assert.deepEqual(await getUsageSummary(store, now), {
        version: 1,
        totalAnalyses: 0,
        lastAnalysisAt: null,
        updatedAt: '2026-03-25T10:00:00.000Z'
    });
});

test('recordSuccessfulAnalysis increments the stored usage summary', async () => {
    const now = new Date('2026-03-25T11:30:00.000Z');
    let persistedValue;

    const store = {
        async get() {
            return {
                version: 1,
                totalAnalyses: 2,
                lastAnalysisAt: '2026-03-24T08:00:00.000Z',
                updatedAt: '2026-03-24T08:00:00.000Z'
            };
        },
        async set(key, value) {
            assert.equal(key, 'usage.summary');
            persistedValue = value;
        }
    };

    const result = await recordSuccessfulAnalysis(store, now);

    assert.deepEqual(result, {
        version: 1,
        totalAnalyses: 3,
        lastAnalysisAt: '2026-03-25T11:30:00.000Z',
        updatedAt: '2026-03-25T11:30:00.000Z'
    });
    assert.deepEqual(persistedValue, result);
});
