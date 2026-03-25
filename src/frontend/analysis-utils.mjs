const SCORE_THRESHOLD = 6;
export const MAX_ANALYSIS_INPUT_CHARS = 8000;

export function normalizeAnalysisPayload(payload) {
    const raw = parseJSON(payload);
    if (!raw || typeof raw !== 'object') {
        throw new Error('OpenAI-Antwort konnte nicht als JSON verarbeitet werden.');
    }

    const normalized = {
        consistency_score: normalizeScore(raw.consistency_score),
        understandability_score: normalizeScore(raw.understandability_score),
        value_score: normalizeScore(raw.value_score),
        improvement_suggestions: normalizeSuggestions(raw.improvement_suggestions)
    };

    if (
        normalized.consistency_score === 0 &&
        normalized.understandability_score === 0 &&
        normalized.value_score === 0
    ) {
        throw new Error('OpenAI-Antwort enthält keine verwertbaren Scores.');
    }

    return normalized;
}

export function parseJSON(text) {
    if (typeof text !== 'string') {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) {
            return null;
        }

        try {
            return JSON.parse(match[0]);
        } catch {
            return null;
        }
    }
}

export function normalizeSuggestions(suggestions) {
    if (!Array.isArray(suggestions)) {
        return [];
    }

    return suggestions
        .map(item => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);
}

export function normalizeScore(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 0;
    }
    if (numeric < 1) {
        return 1;
    }
    if (numeric > 10) {
        return 10;
    }
    return Math.round(numeric);
}

export function getAverageScore(scores) {
    if (!Array.isArray(scores) || scores.length === 0) {
        return 0;
    }

    const total = scores.reduce((sum, score) => sum + normalizeScore(score), 0);
    return Math.round(total / scores.length);
}

export function getScoreHint(score) {
    if (score >= 8) {
        return 'Die Qualität ist bereits überzeugend.';
    }
    if (score >= SCORE_THRESHOLD) {
        return 'Gute Basis mit kleineren Verbesserungsmöglichkeiten.';
    }
    return 'Hier sollten Details präzisiert und schärfer formuliert werden.';
}

export function extractCustomFieldText(customfield) {
    if (typeof customfield === 'string') {
        return customfield.trim();
    }

    if (Array.isArray(customfield)) {
        return customfield
            .map(item => extractCustomFieldText(item))
            .filter(Boolean)
            .join(', ');
    }

    if (customfield && typeof customfield === 'object') {
        if (customfield.content) {
            return extractTextFromDescription(customfield);
        }
        if (customfield.value && typeof customfield.value === 'string') {
            return customfield.value.trim();
        }
        return JSON.stringify(customfield);
    }

    return '';
}

export function extractTextFromDescription(description) {
    let text = '';

    description?.content?.forEach(item => {
        if (item.type === 'paragraph') {
            item.content?.forEach(t => t.text && (text += `${t.text} `));
        }
        if (item.type === 'bulletList') {
            item.content?.forEach(li =>
                li.content?.forEach(p =>
                    p.content?.forEach(t => t.text && (text += `${t.text} `))
                )
            );
        }
    });

    return text.trim();
}

export function truncateText(value, maxChars) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text || text.length <= maxChars) {
        return {
            text,
            wasTruncated: false
        };
    }

    return {
        text: `${text.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`,
        wasTruncated: true
    };
}

export function buildAnalysisPrompt({
    title = '',
    descriptionText = '',
    acceptanceCriteria = '',
    maxChars = MAX_ANALYSIS_INPUT_CHARS
}) {
    const rawInput = [title, descriptionText, acceptanceCriteria].filter(Boolean).join('\n\n');
    const truncatedInput = truncateText(rawInput, maxChars);
    const instructionBlock = `
Dies ist die Anforderung eines Features aus Jira.

Analysiere die folgenden Inhalte:
${truncatedInput.text}

Du bist ein professioneller Requirement Engineer. Bewerte die Anforderung in 3 Kategorien (je 1-10):
- Verständlichkeit: Vollständigkeit der Eingaben, Detailtiefe und Klarheit der Informationen
- Konsistenz: keine Widersprüche, keine Logikfehler, inhaltliche Übereinstimmung der Jira-Felder zueinander
- Value: Validierbares (testbares) Ziel muss formuliert sein, ein messbarer Business Value erkennbar

Gib außerdem kurze Verbesserungsvorschläge als Array zurück.
`.trim();

    return {
        prompt: instructionBlock,
        rawInput,
        truncatedInput: truncatedInput.text,
        wasTruncated: truncatedInput.wasTruncated
    };
}
