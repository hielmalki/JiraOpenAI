import test from 'node:test';
import assert from 'node:assert/strict';
import {
    assertLicensed,
    buildOpenAIRequest,
    getLicenseState,
    getIssueKeyFromContext,
    mapIssueData,
    normalizeLicenseOverride,
    OPENAI_RESPONSE_FORMAT,
    parseOpenAIResponse,
    resolveIssueData,
    resolveOpenAI
} from '../src/resolvers/service.mjs';

test('normalizeLicenseOverride accepts active and inactive override values', () => {
    assert.equal(normalizeLicenseOverride('active'), true);
    assert.equal(normalizeLicenseOverride('true'), true);
    assert.equal(normalizeLicenseOverride('inactive'), false);
    assert.equal(normalizeLicenseOverride('false'), false);
    assert.equal(normalizeLicenseOverride('unexpected'), null);
});

test('getLicenseState prefers explicit override values', () => {
    assert.deepEqual(getLicenseState({ context: {}, licenseOverride: 'inactive' }), {
        isLicensed: false,
        source: 'override'
    });
});

test('getLicenseState uses context license when available', () => {
    assert.deepEqual(
        getLicenseState({
            context: {
                license: {
                    isActive: true
                }
            }
        }),
        {
            isLicensed: true,
            source: 'context'
        }
    );
});

test('getLicenseState falls back to licensed for dev and unlisted environments', () => {
    assert.deepEqual(getLicenseState({ context: {} }), {
        isLicensed: true,
        source: 'implicit'
    });
});

test('assertLicensed rejects unlicensed access', () => {
    assert.throws(
        () => assertLicensed({ isLicensed: false }),
        /aktive Marketplace-Lizenz/i
    );
});

test('getIssueKeyFromContext returns the Jira issue key', () => {
    assert.equal(getIssueKeyFromContext({ extension: { issue: { key: 'KAN-42' } } }), 'KAN-42');
});

test('getIssueKeyFromContext rejects missing context', () => {
    assert.throws(() => getIssueKeyFromContext({}), /Issue key is missing/i);
});

test('mapIssueData normalizes Jira fields into the frontend payload', () => {
    assert.equal(
        mapIssueData({
            fields: {
                summary: 'Issue title',
                description: { type: 'doc' },
                customfield_10047: 'AC'
            }
        }),
        JSON.stringify({
            title: 'Issue title',
            description: { type: 'doc' },
            customfield: 'AC'
        })
    );
});

test('resolveIssueData requests the expected Jira path and returns mapped data', async () => {
    let receivedPath;
    let receivedOptions;

    const requestJira = async (path, options) => {
        receivedPath = path;
        receivedOptions = options;
        return {
            ok: true,
            json: async () => ({
                fields: {
                    summary: 'Demo',
                    description: null,
                    customfield_10047: 'AC text'
                }
            })
        };
    };

    const route = (strings, issueKey) => `${strings[0]}${issueKey}${strings[1]}`;
    const result = await resolveIssueData({
        context: { extension: { issue: { key: 'KAN-7' } } },
        requestJira,
        route
    });

    assert.equal(receivedPath, '/rest/api/3/issue/KAN-7?fields=summary,description,customfield_10047');
    assert.deepEqual(receivedOptions, { headers: { Accept: 'application/json' } });
    assert.equal(
        result,
        JSON.stringify({
            title: 'Demo',
            description: null,
            customfield: 'AC text'
        })
    );
});

test('resolveIssueData surfaces Jira API errors with status code and body', async () => {
    await assert.rejects(
        () =>
            resolveIssueData({
                context: { extension: { issue: { key: 'KAN-8' } } },
                requestJira: async () => ({
                    ok: false,
                    status: 403,
                    text: async () => 'Forbidden'
                }),
                route: (strings, issueKey) => `${strings[0]}${issueKey}${strings[1]}`
            }),
        /HTTP 403.*Forbidden/i
    );
});

test('buildOpenAIRequest creates the correct endpoint and payload', async () => {
    const { endpoint, options } = buildOpenAIRequest({
        prompt: 'Analyse this story',
        apiKey: 'secret',
        model: 'gpt-4o-mini'
    });

    assert.equal(endpoint.toString(), 'https://api.openai.com/v1/chat/completions');
    assert.deepEqual(options.headers, {
        Authorization: 'Bearer secret',
        'Content-Type': 'application/json'
    });

    const parsedBody = JSON.parse(options.body);
    assert.equal(parsedBody.model, 'gpt-4o-mini');
    assert.equal(parsedBody.messages[0].content, 'Analyse this story');
    assert.deepEqual(parsedBody.response_format, OPENAI_RESPONSE_FORMAT);
});

test('parseOpenAIResponse returns the content on success', async () => {
    const result = await parseOpenAIResponse({
        status: 200,
        json: async () => ({
            choices: [{ message: { content: '{"ok":true}' } }]
        })
    });

    assert.equal(result, '{"ok":true}');
});

test('parseOpenAIResponse rejects non-200 responses', async () => {
    await assert.rejects(
        () =>
            parseOpenAIResponse({
                status: 500,
                text: async () => 'Upstream error'
            }),
        /Upstream error/
    );
});

test('parseOpenAIResponse rejects missing content', async () => {
    await assert.rejects(
        () =>
            parseOpenAIResponse({
                status: 200,
                json: async () => ({ choices: [{ message: {} }] })
            }),
        /Keine gültige Antwort/i
    );
});

test('resolveOpenAI requires a fetch implementation', async () => {
    await assert.rejects(
        () =>
            resolveOpenAI({
                prompt: 'Hallo',
                fetchImpl: undefined,
                apiKey: 'secret'
            }),
        /Global fetch is not available/i
    );
});

test('resolveOpenAI calls fetch and returns the parsed OpenAI content', async () => {
    let receivedEndpoint;
    let receivedOptions;

    const result = await resolveOpenAI({
        prompt: 'Hallo',
        apiKey: 'secret',
        model: 'gpt-4o-mini',
        fetchImpl: async (endpoint, options) => {
            receivedEndpoint = endpoint;
            receivedOptions = options;
            return {
                status: 200,
                json: async () => ({
                    choices: [{ message: { content: '{"consistency_score":7}' } }]
                })
            };
        }
    });

    assert.equal(receivedEndpoint.toString(), 'https://api.openai.com/v1/chat/completions');
    assert.equal(JSON.parse(receivedOptions.body).messages[0].content, 'Hallo');
    assert.equal(result, '{"consistency_score":7}');
});
