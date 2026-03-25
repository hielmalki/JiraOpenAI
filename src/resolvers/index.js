import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import { assertLicensed, getLicenseState, resolveIssueData, resolveOpenAI } from './service.mjs';
import {
    assertWithinInstallationLimits,
    prepareUsageSummary,
    recordSuccessfulAnalysis
} from './usage-store.mjs';

const resolver = new Resolver();

resolver.define('getLicenseState', ({ context }) =>
    getLicenseState({
        context,
        licenseOverride: process.env.LICENSE_OVERRIDE
    })
);

resolver.define('getIssueData', ({ context }) => {
    assertLicensed(
        getLicenseState({
            context,
            licenseOverride: process.env.LICENSE_OVERRIDE
        })
    );

    return resolveIssueData({
        context,
        requestJira: api.asApp().requestJira,
        route
    });
});

resolver.define('callOpenAI', async ({ context, payload }) => {
    assertLicensed(
        getLicenseState({
            context,
            licenseOverride: process.env.LICENSE_OVERRIDE
        })
    );

    const now = new Date();
    const usageSummary = await prepareUsageSummary(undefined, now);
    assertWithinInstallationLimits(usageSummary);

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

    return result;
});

// Helpers
const getOpenAPIKey = () => process.env.OPEN_API_KEY;
const getOpenAPIModel = () => 'gpt-4o-mini';

// Export the resolver definitions
export const handler = resolver.getDefinitions();
