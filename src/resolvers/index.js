import Resolver from '@forge/resolver';

const resolver = new Resolver();

// Define the JSON schema for three-category evaluation
const gherkin_format = {
    type: 'json_schema',
    json_schema: {
        name: 'jira_evaluation_three_categories',
        schema: {
            type: 'object',
            properties: {
                consistency_score:       { type: 'integer', minimum: 1, maximum: 10 },
                understandability_score: { type: 'integer', minimum: 1, maximum: 10 },
                value_score:             { type: 'integer', minimum: 1, maximum: 10 },
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

// Call OpenAI with our prompt and schema
resolver.define('callOpenAI', async ({ payload }) => {
    const endpoint = new URL('/v1/chat/completions', 'https://api.openai.com');
    const fetchImpl = globalThis.fetch;
    if (typeof fetchImpl !== 'function') {
        throw new Error('Global fetch is not available in this runtime.');
    }

    const body = {
        model: getOpenAPIModel(),
        n: 1,
        messages: [{ role: 'user', content: payload.prompt }],
        response_format: gherkin_format
    };
    const options = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${getOpenAPIKey()}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };

    const response = await fetchImpl(endpoint, options);
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
});

// Helpers
const getOpenAPIKey = () => process.env.OPEN_API_KEY;
const getOpenAPIModel = () => 'gpt-4o-mini';

// Export the resolver definitions
export const handler = resolver.getDefinitions();
