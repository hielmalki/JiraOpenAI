import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import { assertLicensed, getLicenseState, resolveIssueData, resolveOpenAI } from './service.mjs';

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

resolver.define('callOpenAI', ({ context, payload }) => {
    assertLicensed(
        getLicenseState({
            context,
            licenseOverride: process.env.LICENSE_OVERRIDE
        })
    );

    return resolveOpenAI({
        prompt: payload.prompt,
        fetchImpl: globalThis.fetch,
        apiKey: getOpenAPIKey(),
        model: getOpenAPIModel()
    });
});

// Helpers
const getOpenAPIKey = () => process.env.OPEN_API_KEY;
const getOpenAPIModel = () => 'gpt-4o-mini';

// Export the resolver definitions
export const handler = resolver.getDefinitions();
