import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
    Badge,
    Box,
    Heading,
    Inline,
    Link,
    Lozenge,
    ProgressBar,
    SectionMessage,
    Stack,
    Text
} from '@forge/react';
import { invoke } from '@forge/bridge';

const THRESHOLD = 6;
const UNKNOWN_TEXT = 'Nicht verfügbar';
const PURPOSE_TEXT =
    'Qualitäts-Check für Jira-Requirements mit Fokus auf Verständlichkeit, Konsistenz und messbaren Business Value.';

const SCORE_CONFIG = [
    { key: 'consistency_score', label: 'Konsistenz' },
    { key: 'understandability_score', label: 'Verständlichkeit' },
    { key: 'value_score', label: 'Value' }
];

const pageStyles = {
    padding: 'space.250',
    backgroundColor: 'color.background.neutral.subtle'
};

const surfaceCardStyles = {
    backgroundColor: 'color.background.neutral',
    borderColor: 'color.border',
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderRadius: 'border.radius',
    padding: 'space.250'
};

const compactCardStyles = {
    backgroundColor: 'color.background.neutral',
    borderColor: 'color.border',
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderRadius: 'border.radius',
    padding: 'space.200'
};

const sectionShellStyles = {
    backgroundColor: 'color.background.neutral',
    borderColor: 'color.border',
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderRadius: 'border.radius',
    padding: 'space.200'
};

const summaryIssueStyles = {
    backgroundColor: 'color.background.input',
    borderColor: 'color.border',
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderRadius: 'border.radius',
    padding: 'space.150'
};

const scoreRowStyles = {
    backgroundColor: 'color.background.input',
    borderColor: 'color.border',
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderRadius: 'border.radius',
    padding: 'space.150'
};

const columnStyles = {
    minWidth: '300px',
    flexGrow: 1
};

const hintCardStyles = {
    backgroundColor: 'color.background.accent.gray.subtlest',
    borderColor: 'color.border.discovery',
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderRadius: 'border.radius',
    padding: 'space.150'
};

const placeholderStyles = {
    backgroundColor: 'color.background.input',
    borderRadius: 'border.radius',
    padding: 'space.150'
};

const STATUS = {
    loading: 'loading',
    ready: 'ready',
    empty: 'empty',
    error: 'error'
};

const App = () => {
    const [analysis, setAnalysis] = useState(null);
    const [meta, setMeta] = useState({
        title: '',
        acceptanceCriteria: ''
    });
    const [status, setStatus] = useState(STATUS.loading);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            try {
                setStatus(STATUS.loading);
                setError('');

                const issueData = await invoke('getIssueData');
                const { description, customfield, title } = JSON.parse(issueData);
                const descriptionText = extractTextFromDescription(description);
                const acceptanceCriteria = extractCustomFieldText(customfield);

                setMeta({
                    title: title || '',
                    acceptanceCriteria
                });

                if (!descriptionText && !acceptanceCriteria) {
                    setAnalysis(null);
                    setStatus(STATUS.empty);
                    return;
                }

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

                setAnalysis(parsedResult);
                setStatus(STATUS.ready);
            } catch (err) {
                console.error(err);
                setError(err instanceof Error ? err.message : 'Unbekannter Fehler bei der Analyse.');
                setStatus(STATUS.error);
            }
        })();
    }, []);

    const fallbackAnalysis = {
        consistency_score: 0,
        understandability_score: 0,
        value_score: 0,
        improvement_suggestions: []
    };
    const result = analysis || fallbackAnalysis;
    const scores = [result.consistency_score, result.understandability_score, result.value_score].map(normalizeScore);
    const averageScore = getAverageScore(scores);
    const allAbove = scores.every(score => score >= THRESHOLD);
    const hasWarning = scores.some(score => score > 0 && score < THRESHOLD);

    return (
        <Box xcss={pageStyles}>
            <Stack space="space.250">
                <HeaderBar
                    status={status}
                    averageScore={averageScore}
                    acceptanceCriteria={meta.acceptanceCriteria}
                />

                <SummaryCard issueTitle={meta.title} />

                {status === STATUS.loading && <LoadingState />}

                {status === STATUS.error && <ErrorState message={error} />}

                {status === STATUS.empty && <EmptyState />}

                {status === STATUS.ready && (
                    <Stack space="space.200">
                        <InsightBanner hasWarning={hasWarning} allAbove={allAbove} />

                        <Inline shouldWrap space="space.200" rowSpace="space.200" alignBlock="start">
                            <ScoresSection analysis={result} />
                            <SuggestionsSection suggestions={result.improvement_suggestions} />
                        </Inline>
                    </Stack>
                )}

                <NoteSection />
            </Stack>
        </Box>
    );
};

const HeaderBar = ({ status, averageScore, acceptanceCriteria }) => (
    <Box xcss={surfaceCardStyles}>
        <Inline spread="space-between" alignBlock="center" shouldWrap rowSpace="space.150">
            <Inline space="space.100" shouldWrap alignBlock="center">
                <Heading as="h3">Reflection</Heading>
                <Lozenge>{acceptanceCriteria || 'NICHT VERFÜGBAR'}</Lozenge>
            </Inline>
            <Stack alignInline="end" space="space.050">
                <Text>Durchschnittsscore</Text>
                <Badge>{status === STATUS.ready ? `${averageScore}/10` : '-'}</Badge>
            </Stack>
        </Inline>
    </Box>
);

const SummaryCard = ({ issueTitle }) => (
    <Box xcss={sectionShellStyles}>
        <Stack space="space.150">
            <Heading as="h4">Summary</Heading>
            <Text>{PURPOSE_TEXT}</Text>
            <Box xcss={summaryIssueStyles}>
                <Stack space="space.050">
                    <Text>Issue</Text>
                    <Text>{issueTitle || UNKNOWN_TEXT}</Text>
                </Stack>
            </Box>
        </Stack>
    </Box>
);

const InsightBanner = ({ hasWarning, allAbove }) => {
    if (hasWarning) {
        return (
            <SectionMessage appearance="warning" title="Verbesserungspotenzial gefunden">
                <Text>Mindestens eine Kategorie liegt unter 6/10 und sollte nachgeschärft werden.</Text>
            </SectionMessage>
        );
    }

    return (
        <SectionMessage appearance={allAbove ? 'success' : 'information'} title="Reflexion abgeschlossen">
            <Text>
                {allAbove
                    ? 'Die Anforderung ist konsistent und gut verständlich. Nur Feinschliff nötig.'
                    : 'Analyse wurde erstellt. Prüfe die Hinweise und priorisiere die nächsten Schritte.'}
            </Text>
        </SectionMessage>
    );
};

const ScoresSection = ({ analysis }) => (
    <Box xcss={{ ...sectionShellStyles, ...columnStyles }}>
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
                            <ProgressBar ariaLabel={`${label} Score ${value} von 10`} value={value / 10} />
                            <Text>{getScoreHint(value)}</Text>
                        </Stack>
                    </Box>
                );
            })}
        </Stack>
    </Box>
);

const SuggestionsSection = ({ suggestions }) => (
    <Box xcss={{ ...sectionShellStyles, ...columnStyles }}>
        <Stack space="space.150">
            <Heading as="h4">Verbesserungsvorschläge</Heading>
            {suggestions.length > 0 ? (
                <Stack space="space.100">
                    {suggestions.map((suggestion, index) => (
                        <Box key={`${suggestion}-${index}`} xcss={scoreRowStyles}>
                            <Inline space="space.100" alignBlock="start">
                                <Text>↳</Text>
                                <Text>{suggestion}</Text>
                            </Inline>
                        </Box>
                    ))}
                </Stack>
            ) : (
                <SectionMessage appearance="information" title="Keine konkreten Vorschläge vorhanden">
                    <Text>Die aktuelle Analyse meldet kein akutes Verbesserungsthema.</Text>
                </SectionMessage>
            )}
        </Stack>
    </Box>
);

const LoadingState = () => (
    <Box xcss={sectionShellStyles}>
        <Stack space="space.150">
            <Heading as="h4">Analyse wird vorbereitet</Heading>
            <Text>Wir prüfen gerade die Anforderung und bauen die Reflexion auf.</Text>
            <Box xcss={placeholderStyles}>
                <Stack space="space.100">
                    <Text>Score-Übersicht wird geladen …</Text>
                    <ProgressBar ariaLabel="Ladevorgang" isIndeterminate />
                </Stack>
            </Box>
            <Box xcss={placeholderStyles}>
                <Text>Verbesserungsvorschläge werden geladen …</Text>
            </Box>
        </Stack>
    </Box>
);

const ErrorState = ({ message }) => (
    <SectionMessage appearance="error" title="Analyse konnte nicht abgeschlossen werden">
        <Stack space="space.100">
            <Text>{message || 'Bitte erneut versuchen.'}</Text>
            <Text>
                Recovery-Hinweis: Prüfe `OPEN_API_KEY`, Jira-Berechtigungen und ob Beschreibung oder
                Akzeptanzkriterien vorhanden sind.
            </Text>
        </Stack>
    </SectionMessage>
);

const EmptyState = () => (
    <Box xcss={compactCardStyles}>
        <Stack space="space.100">
            <Heading as="h4">Noch keine Reflection verfügbar</Heading>
            <Text>
                Füge eine aussagekräftige Beschreibung und Akzeptanzkriterien zur Jira-Anforderung hinzu, dann
                öffne die Reflection erneut.
            </Text>
            <SectionMessage appearance="information" title="Nächster Schritt">
                <Text>
                    Ergänze das Ticket und lade das Panel neu, damit die Analyse mit vollständigem Kontext erstellt
                    werden kann.
                </Text>
            </SectionMessage>
        </Stack>
    </Box>
);

const NoteSection = () => (
    <Box xcss={hintCardStyles}>
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
);

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
        normalized.consistency_score === 0 &&
        normalized.understandability_score === 0 &&
        normalized.value_score === 0
    ) {
        throw new Error('OpenAI-Antwort enthält keine verwertbaren Scores.');
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
