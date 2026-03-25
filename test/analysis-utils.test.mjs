import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildAnalysisPrompt,
    extractCustomFieldText,
    extractTextFromDescription,
    getAverageScore,
    getScoreHint,
    MAX_ANALYSIS_INPUT_CHARS,
    normalizeAnalysisPayload,
    normalizeScore,
    normalizeSuggestions,
    parseJSON,
    truncateText
} from '../src/frontend/analysis-utils.mjs';

test('parseJSON parses valid JSON strings', () => {
    assert.deepEqual(parseJSON('{"value": 5}'), { value: 5 });
});

test('parseJSON extracts embedded JSON from mixed text', () => {
    assert.deepEqual(parseJSON('prefix {"value": 5} suffix'), { value: 5 });
});

test('parseJSON returns null for invalid input', () => {
    assert.equal(parseJSON('not-json'), null);
    assert.equal(parseJSON(undefined), null);
});

test('normalizeSuggestions trims values and removes empty entries', () => {
    assert.deepEqual(normalizeSuggestions(['  One  ', '', '   ', 'Two']), ['One', 'Two']);
    assert.deepEqual(normalizeSuggestions('wrong-type'), []);
});

test('normalizeScore clamps and rounds values into the 1-10 range', () => {
    assert.equal(normalizeScore('abc'), 0);
    assert.equal(normalizeScore(0), 1);
    assert.equal(normalizeScore(5.6), 6);
    assert.equal(normalizeScore(99), 10);
});

test('getAverageScore calculates a rounded average across scores', () => {
    assert.equal(getAverageScore([5, 6, 6]), 6);
    assert.equal(getAverageScore([]), 0);
});

test('getScoreHint returns the expected guidance per threshold', () => {
    assert.equal(getScoreHint(9), 'Die Qualität ist bereits überzeugend.');
    assert.equal(getScoreHint(6), 'Gute Basis mit kleineren Verbesserungsmöglichkeiten.');
    assert.equal(getScoreHint(5), 'Hier sollten Details präzisiert und schärfer formuliert werden.');
});

test('extractTextFromDescription supports paragraphs and bullet lists', () => {
    const description = {
        content: [
            {
                type: 'paragraph',
                content: [{ text: 'Erster Satz.' }]
            },
            {
                type: 'bulletList',
                content: [
                    {
                        content: [
                            {
                                content: [{ text: 'Punkt A' }]
                            }
                        ]
                    }
                ]
            }
        ]
    };

    assert.equal(extractTextFromDescription(description), 'Erster Satz. Punkt A');
});

test('extractCustomFieldText handles strings, arrays and ADF-like objects', () => {
    assert.equal(extractCustomFieldText('  Hallo  '), 'Hallo');
    assert.equal(extractCustomFieldText(['A', ' B ']), 'A, B');
    assert.equal(
        extractCustomFieldText({
            content: [
                {
                    type: 'paragraph',
                    content: [{ text: 'ADF Text' }]
                }
            ]
        }),
        'ADF Text'
    );
});

test('normalizeAnalysisPayload normalizes a valid model response', () => {
    const payload = JSON.stringify({
        consistency_score: 5.6,
        understandability_score: 6.1,
        value_score: 9,
        improvement_suggestions: ['  Klarer formulieren  ', 'Messbar machen']
    });

    assert.deepEqual(normalizeAnalysisPayload(payload), {
        consistency_score: 6,
        understandability_score: 6,
        value_score: 9,
        improvement_suggestions: ['Klarer formulieren', 'Messbar machen']
    });
});

test('normalizeAnalysisPayload rejects unusable responses', () => {
    assert.throws(
        () => normalizeAnalysisPayload('{}'),
        /keine verwertbaren Scores/i
    );
});

test('truncateText leaves short values untouched and truncates long values', () => {
    assert.deepEqual(truncateText('Kurz', 10), {
        text: 'Kurz',
        wasTruncated: false
    });

    assert.deepEqual(truncateText('ABCDEFGHIJ', 5), {
        text: 'ABCD…',
        wasTruncated: true
    });
});

test('buildAnalysisPrompt limits the combined Jira input length', () => {
    const longDescription = 'A'.repeat(MAX_ANALYSIS_INPUT_CHARS + 100);
    const result = buildAnalysisPrompt({
        title: 'Titel',
        descriptionText: longDescription,
        acceptanceCriteria: 'Kriterium'
    });

    assert.equal(result.wasTruncated, true);
    assert.ok(result.prompt.includes('Analysiere die folgenden Inhalte:'));
    assert.ok(result.truncatedInput.length <= MAX_ANALYSIS_INPUT_CHARS);
});

test('buildAnalysisPrompt keeps shorter inputs intact', () => {
    const result = buildAnalysisPrompt({
        title: 'Titel',
        descriptionText: 'Beschreibung',
        acceptanceCriteria: 'Kriterium'
    });

    assert.equal(result.wasTruncated, false);
    assert.ok(result.prompt.includes('Titel'));
    assert.ok(result.prompt.includes('Beschreibung'));
    assert.ok(result.prompt.includes('Kriterium'));
});
