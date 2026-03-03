import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
    Badge,
    Box,
    Heading,
    Inline,
    Link,
    List,
    ListItem,
    Lozenge,
    ProgressBar,
    SectionMessage,
    Spinner,
    Stack,
    Text
} from '@forge/react';
import { invoke, requestJira, view } from '@forge/bridge';

const THRESHOLD = 6;
const UNKNOWN_TEXT = 'Nicht verfügbar';

const pageStyles = {
    padding: 'space.250'
};

const cardStyles = {
    backgroundColor: 'color.background.neutral',
    borderColor: 'color.border',
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderRadius: 'border.radius',
    padding: 'space.200'
};

const columnStyles = {
    minWidth: '260px',
    flexGrow: 1
};

const scoreRowStyles = {
    backgroundColor: 'color.background.input',
    borderColor: 'color.border',
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderRadius: 'border.radius',
    padding: 'space.150'
};

const helperStyles = {
    backgroundColor: 'color.background.accent.gray.subtlest',
    borderColor: 'color.border.discovery',
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderRadius: 'border.radius',
    padding: 'space.150'
};

const SCORE_CONFIG = [
    { key: 'consistency_score', label: 'Konsistenz' },
    { key: 'understandability_score', label: 'Verständlichkeit' },
    { key: 'value_score', label: 'Value' }
];

const App = () => {
    const [analysis, setAnalysis] = useState(null);
    const [meta, setMeta] = useState({
        title: '',
        acceptanceCriteria: ''
    });
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            try {
                setStatus('loading');
                setError('');

                const { description, customfield, title } = await fetchIssueData();
                const descriptionText = extractTextFromDescription(description);
                const acceptanceCriteria = extractCustomFieldText(customfield);

                const prompt = `
Dies ist die Anforderung eines Features mit dem Titel: "${title}", extrahiert aus einer Jira-Beschreibung: "${descriptionText}"
und den Akzeptanzkriterien: "${acceptanceCriteria}".
Du bist ein professioneller Requirement Engineer. Bewerte die Anforderung in 3 Kategorien (je 1–10):
• Verständlichkeit: Vollständigkeit der Eingaben, Detailtiefe und Klarheit der Informationen
• Konsistenz: keine Widersprüche, keine Logikfehler, inhaltliche Übereinstimmung der Jira-Felder zueinander
• Value: Validierbares (testbares) Ziel muss formuliert sein, ein messbarer Business Value erkennbar
Gib außerdem kurze Verbesserungsvorschläge als Array zurück.
`.trim();

                const result = await invoke('callOpenAI', { prompt });
                const parsedResult = normalizeAnalysisPayload(result);

                setMeta({
                    title: title || '',
                    acceptanceCriteria
                });
                setAnalysis(parsedResult);
                setStatus('ready');
            } catch (err) {
                console.error(err);
                setError(err instanceof Error ? err.message : 'Unbekannter Fehler bei der Analyse.');
                setStatus('error');
            }
        })();
    }, []);

    const { consistency_score, understandability_score, value_score, improvement_suggestions } = analysis || {
        consistency_score: 0,
        understandability_score: 0,
        value_score: 0,
        improvement_suggestions: []
    };

    const scores = [consistency_score, understandability_score, value_score].map(normalizeScore);
    const averageScore = getAverageScore(scores);
    const allAbove = scores.every(s => s >= THRESHOLD);

    return (
        <Box xcss={pageStyles}>
            <Stack space="space.250">
                <Box xcss={cardStyles}>
                    <Inline spread="space-between" alignBlock="start" shouldWrap rowSpace="space.100">
                        <Stack space="space.100">
                            <Inline alignBlock="center" space="space.100" shouldWrap>
                                <Heading as="h3">Reflection</Heading>
                                <Lozenge>{meta.acceptanceCriteria || UNKNOWN_TEXT}</Lozenge>
                            </Inline>
                            <Text>
                                Qualitäts-Check für Jira-Requirements mit Fokus auf Verständlichkeit,
                                Konsistenz und messbaren Business Value.
                            </Text>
                            <Text>Issue: {meta.title || UNKNOWN_TEXT}</Text>
                        </Stack>
                        <Stack alignInline="end" space="space.050">
                            <Text>Durchschnittsscore</Text>
                            <Badge>{status === 'ready' ? `${averageScore}/10` : '-'}</Badge>
                        </Stack>
                    </Inline>
                </Box>

                {status === 'loading' && (
                    <SectionMessage appearance="information" title="Analyse läuft">
                        <Inline space="space.100" alignBlock="center">
                            <Spinner size="medium" label="Analyse wird durchgeführt" />
                            <Text>Die Anforderung wird bewertet. Das dauert nur wenige Sekunden.</Text>
                        </Inline>
                    </SectionMessage>
                )}

                {status === 'error' && (
                    <SectionMessage appearance="error" title="Analyse konnte nicht abgeschlossen werden">
                        <Stack space="space.100">
                            <Text>{error || 'Bitte erneut versuchen.'}</Text>
                            <Text>
                                Prüfe `OPEN_API_KEY`, App-Berechtigungen und ob die Jira-Felder korrekt gesetzt sind.
                            </Text>
                        </Stack>
                    </SectionMessage>
                )}

                {status === 'ready' && (
                    <Stack space="space.200">
                        <SectionMessage
                            appearance={allAbove ? 'success' : 'warning'}
                            title={allAbove ? 'Starkes Ergebnis' : 'Verbesserungspotenzial gefunden'}
                        >
                            <Text>
                                {allAbove
                                    ? `Alle drei Kategorien liegen bei mindestens ${THRESHOLD}/10.`
                                    : `Mindestens eine Kategorie liegt unter ${THRESHOLD}/10 und sollte nachgeschärft werden.`}
                            </Text>
                        </SectionMessage>

                        <Inline space="space.200" rowSpace="space.200" shouldWrap alignBlock="start">
                            <Box xcss={{ ...cardStyles, ...columnStyles }}>
                                <Stack space="space.150">
                                    <Heading as="h4">Einzelscores</Heading>
                                    {SCORE_CONFIG.map(({ key, label }) => {
                                        const value = normalizeScore(analysis[key]);
                                        return (
                                            <Box key={key} xcss={scoreRowStyles}>
                                                <Stack space="space.100">
                                                    <Inline spread="space-between" alignBlock="center">
                                                        <Text>{label}</Text>
                                                        <Badge>{value}/10</Badge>
                                                    </Inline>
                                                    <ProgressBar
                                                        ariaLabel={`${label} ${value} von 10`}
                                                        value={value / 10}
                                                    />
                                                    <Text>{getScoreHint(value)}</Text>
                                                </Stack>
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            </Box>

                            <Box xcss={{ ...cardStyles, ...columnStyles }}>
                                <Stack space="space.150">
                                    <Heading as="h4">Verbesserungsvorschläge</Heading>
                                    {improvement_suggestions.length > 0 ? (
                                        <List type="unordered">
                                            {improvement_suggestions.map((suggestion, index) => (
                                                <ListItem key={`${suggestion}-${index}`}>{suggestion}</ListItem>
                                            ))}
                                        </List>
                                    ) : (
                                        <SectionMessage appearance="information" title="Keine Vorschläge notwendig">
                                            <Text>
                                                Die Analyse hat aktuell keine konkreten Verbesserungen zurückgegeben.
                                            </Text>
                                        </SectionMessage>
                                    )}
                                </Stack>
                            </Box>
                        </Inline>
                    </Stack>
                )}

                <Box xcss={helperStyles}>
                    <Stack space="space.050">
                        <Heading as="h5">Hinweis</Heading>
                        <Text>
                            Die Bewertung ist eine automatische Erstprüfung. Für Release-Entscheidungen immer zusätzlich
                            fachlich gegenprüfen.
                        </Text>
                        <Text>
                            Mehr zu Forge und App-Sicherheit:{' '}
                            <Link href="https://developer.atlassian.com/platform/forge/">Forge Dokumentation</Link>
                        </Text>
                    </Stack>
                </Box>
            </Stack>
        </Box>
    );
};

function normalizeAnalysisPayload(payload) {
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
        normalized.consistency_score === 0 ||
        normalized.understandability_score === 0 ||
        normalized.value_score === 0
    ) {
        throw new Error('OpenAI-Antwort enthält ungültige Scores.');
    }

    return normalized;
}

function parseJSON(text) {
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

function normalizeSuggestions(suggestions) {
    if (!Array.isArray(suggestions)) {
        return [];
    }

    return suggestions
        .map(item => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);
}

function normalizeScore(value) {
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

function getAverageScore(scores) {
    if (!Array.isArray(scores) || scores.length === 0) {
        return 0;
    }
    const total = scores.reduce((sum, score) => sum + normalizeScore(score), 0);
    return Math.round(total / scores.length);
}

function getScoreHint(score) {
    if (score >= 8) {
        return 'Sehr gut: Die Qualität ist bereits überzeugend.';
    }
    if (score >= THRESHOLD) {
        return 'Solide: Gute Basis mit kleineren Verbesserungsmöglichkeiten.';
    }
    return 'Kritisch: Hier sollten Details präzisiert und schärfer formuliert werden.';
}

function extractCustomFieldText(customfield) {
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

async function fetchIssueData() {
    const context = await view.getContext();
    const issueKey = context?.extension?.issue?.key;
    if (!issueKey) {
        throw new Error('Issue-Kontext konnte nicht ermittelt werden.');
    }

    const response = await requestJira(
        `/rest/api/3/issue/${issueKey}?fields=summary,description,customfield_10047`
    );
    if (!response.ok) {
        throw new Error(`Jira-Daten konnten nicht geladen werden (HTTP ${response.status}).`);
    }

    const data = await response.json();
    return {
        title: data?.fields?.summary || '',
        description: data?.fields?.description || null,
        customfield: data?.fields?.customfield_10047
    };
}

function extractTextFromDescription(description) {
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

ForgeReconciler.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
