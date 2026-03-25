import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import { getLicenseState, resolveIssueData, resolveOpenAI } from './service.mjs';
import { assertPlanAllowsAnalysis, getPlanState } from './plan-store.mjs';
import {
    assertWithinInstallationLimits,
    assertWithinUserDailyLimit,
    assertWithinUserHourlyLimit,
    getUserAccountId,
    getUsageSnapshot,
    prepareUsageSummary,
    prepareUserUsage,
    recordSuccessfulAnalysis,
    recordSuccessfulUserAnalysis
} from './usage-store.mjs';

const resolver = new Resolver();

resolver.define('getLicenseState', ({ context }) =>
    getLicenseState({
        context,
        licenseOverride: process.env.LICENSE_OVERRIDE
    })
);

resolver.define('getPlanState', async ({ context }) =>
    getPlanState({
        licenseState: getLicenseState({
            context,
            licenseOverride: process.env.LICENSE_OVERRIDE
        })
    })
);

resolver.define('getIssueData', ({ context }) => {
    return getPlanState({
        licenseState: getLicenseState({
            context,
            licenseOverride: process.env.LICENSE_OVERRIDE
        })
    }).then(planState => {
        assertPlanAllowsAnalysis(planState);
        return resolveIssueData({
            context,
            requestJira: api.asApp().requestJira,
            route
        });
    });
});

resolver.define('getUsageSnapshot', async ({ context }) => {
    const planState = await getPlanState({
        licenseState: getLicenseState({
            context,
            licenseOverride: process.env.LICENSE_OVERRIDE
        })
    });

    return getUsageSnapshot(getUserAccountId(context), undefined, new Date(), planState.limits);
});

resolver.define('callOpenAI', async ({ context, payload }) => {
    const planState = await getPlanState({
        licenseState: getLicenseState({
            context,
            licenseOverride: process.env.LICENSE_OVERRIDE
        })
    });
    assertPlanAllowsAnalysis(planState);

    const now = new Date();
    const accountId = getUserAccountId(context);
    const usageSummary = await prepareUsageSummary(undefined, now);
    const userUsage = await prepareUserUsage(accountId, undefined, now);
    assertWithinInstallationLimits(usageSummary, planState.limits.monthly);
    assertWithinUserDailyLimit(userUsage, planState.limits.dailyUser);
    assertWithinUserHourlyLimit(userUsage, planState.limits.hourlyUser);

    const result = await resolveOpenAI({
        prompt: payload.prompt,
        fetchImpl: globalThis.fetch,
        apiKey: getOpenAPIKey(),
        model: getOpenAPIModel()
    });

    try {
        await recordSuccessfulAnalysis(undefined, now, usageSummary);
    } catch (error) {
        console.error('Usage tracking write failed:', error);
    }

    try {
        await recordSuccessfulUserAnalysis(accountId, undefined, now, userUsage);
    } catch (error) {
        console.error('User usage tracking write failed:', error);
    }

    return result;
});

// Helpers
const getOpenAPIKey = () => process.env.OPEN_API_KEY;
const getOpenAPIModel = () => 'gpt-4o-mini';

// Export the resolver definitions
export const handler = resolver.getDefinitions();
