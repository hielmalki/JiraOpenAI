import Resolver from '@forge/resolver';
import api, { route, fetch } from '@forge/api';

const resolver = new Resolver();

// Get all comment texts from the Jira issue
resolver.define('getComments', async ({ context }) => {
    const commentsRes = await api.asApp().requestJira(
        route`/rest/api/3/issue/${context.extension.issue.key}/comment`,
        { headers: { Accept: 'application/json' } }
    );
    const { comments } = await commentsRes.json();

    const texts = [];
    for (const comment of comments) {
        if (comment.body?.content) {
            for (const block of comment.body.content) {
                if (block.type === 'paragraph' && block.content) {
                    for (const textItem of block.content) {
                        if (textItem.type === 'text' && textItem.text) {
                            texts.push(textItem.text);
                        }
                    }
                }
            }
        }
    }
    return texts.join(' ');
});

// Get description, custom field and summary from the Jira issue
resolver.define('getDescription', async ({ context }) => {
    const issueRes = await api.asApp().requestJira(
        route`/rest/api/3/issue/${context.extension.issue.key}`,
        { headers: { Accept: 'application/json' } }
    );
    const data = await issueRes.json();
    const description = data.fields.description;
    const customfield = data.fields.customfield_10047;
    const title = data.fields.summary;

    return JSON.stringify({ description, customfield, title });
});

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
    const url = `https://api.openai.com/v1/chat/completions`;
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

    const response = await fetch(url, options);
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
