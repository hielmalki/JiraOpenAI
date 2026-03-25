import { APP_ERROR_CODES, createAppError } from '../shared/app-errors.mjs';

export const OPENAI_RESPONSE_FORMAT = {
    type: 'json_schema',
    json_schema: {
        name: 'jira_evaluation_three_categories',
        schema: {
            type: 'object',
            properties: {
                consistency_score: { type: 'integer', minimum: 1, maximum: 10 },
                understandability_score: { type: 'integer', minimum: 1, maximum: 10 },
                value_score: { type: 'integer', minimum: 1, maximum: 10 },
                improvement_suggestions: {
                    type: 'array',
                    items: { type: 'string' }
                }
            },
            required: [
                'consistency_score',
                'understandability_score',
                'value_score',
                'improvement_suggestions'
            ],
            additionalProperties: false
        },
        strict: true
    }
};

export function normalizeLicenseOverride(licenseOverride) {
    if (typeof licenseOverride !== 'string') {
        return null;
    }

    const normalized = licenseOverride.trim().toLowerCase();
    if (normalized === 'active' || normalized === 'true') {
        return true;
    }
    if (normalized === 'inactive' || normalized === 'false') {
        return false;
    }

    return null;
}

export function getLicenseState({ context, licenseOverride }) {
    const overrideState = normalizeLicenseOverride(licenseOverride);
    if (overrideState !== null) {
        return {
            isLicensed: overrideState,
            source: 'override'
        };
    }

    if (typeof context?.license?.isActive === 'boolean') {
        return {
            isLicensed: context.license.isActive,
            source: 'context'
        };
    }

    // In development, staging and unlisted installations the Forge license object
    // is undefined. Treat those environments as licensed so the app remains testable.
    return {
        isLicensed: true,
        source: 'implicit'
    };
}

export function assertLicensed(licenseState) {
    if (licenseState?.isLicensed !== true) {
        throw createAppError(
            APP_ERROR_CODES.LICENSE_REQUIRED,
            'Diese Funktion erfordert eine aktive Marketplace-Lizenz.'
        );
    }
}

export function getIssueKeyFromContext(context) {
    const issueKey = context?.extension?.issue?.key;
    if (!issueKey) {
        throw new Error('Issue key is missing from extension context.');
    }
    return issueKey;
}

export function mapIssueData(data) {
    return JSON.stringify({
        title: data?.fields?.summary || '',
        description: data?.fields?.description || null,
        customfield: data?.fields?.customfield_10047
    });
}

export async function resolveIssueData({ context, requestJira, route }) {
    const issueKey = getIssueKeyFromContext(context);
    const response = await requestJira(
        route`/rest/api/3/issue/${issueKey}?fields=summary,description,customfield_10047`,
        {
            headers: { Accept: 'application/json' }
        }
    );

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Jira-Daten konnten nicht geladen werden (HTTP ${response.status}): ${text}`);
    }

    return mapIssueData(await response.json());
}

export function buildOpenAIRequest({ prompt, apiKey, model }) {
    return {
        endpoint: new URL('/v1/chat/completions', 'https://api.openai.com'),
        options: {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                n: 1,
                messages: [{ role: 'user', content: prompt }],
                response_format: OPENAI_RESPONSE_FORMAT
            })
        }
    };
}

export async function parseOpenAIResponse(response) {
    if (response.status !== 200) {
        const errText = await response.text();
        console.error('OpenAI API Error:', errText);
        throw new Error(errText);
    }

    const { choices } = await response.json();
    const content = choices[0]?.message?.content;
    if (!content) {
        throw new Error('Keine gültige Antwort von OpenAI erhalten');
    }

    return content;
}

export async function resolveOpenAI({
    prompt,
    fetchImpl,
    apiKey,
    model = 'gpt-4o-mini'
}) {
    if (typeof fetchImpl !== 'function') {
        throw new Error('Global fetch is not available in this runtime.');
    }

    const { endpoint, options } = buildOpenAIRequest({ prompt, apiKey, model });
    const response = await fetchImpl(endpoint, options);
    return parseOpenAIResponse(response);
}
