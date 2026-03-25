import { kvs } from '@forge/kvs';

const USAGE_SUMMARY_KEY = 'usage.summary';

export function createDefaultUsageSummary(now = new Date()) {
    return {
        version: 1,
        totalAnalyses: 0,
        lastAnalysisAt: null,
        updatedAt: now.toISOString()
    };
}

export async function getUsageSummary(store = kvs, now = new Date()) {
    const usageSummary = await store.get(USAGE_SUMMARY_KEY);
    return usageSummary || createDefaultUsageSummary(now);
}

export async function recordSuccessfulAnalysis(store = kvs, now = new Date()) {
    const currentSummary = await getUsageSummary(store, now);
    const timestamp = now.toISOString();
    const nextSummary = {
        ...currentSummary,
        version: 1,
        totalAnalyses: Number(currentSummary.totalAnalyses || 0) + 1,
        lastAnalysisAt: timestamp,
        updatedAt: timestamp
    };

    await store.set(USAGE_SUMMARY_KEY, nextSummary);
    return nextSummary;
}
