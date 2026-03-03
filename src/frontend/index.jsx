import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
    Box,
    Heading,
    Inline,
    Link,
    SectionMessage,
    Stack,
    Text
} from '@forge/react';
import { invoke } from '@forge/bridge';
import ReflectionHeader from './components/ReflectionHeader';
import ScoreRow from './components/ScoreRow';
import SuggestionsList from './components/SuggestionsList';

const THRESHOLD = 6;
const UNKNOWN_TEXT = 'Nicht verfügbar';

const SCORE_CONFIG = [
    { key: 'consistency_score', label: 'Konsistenz' },
    { key: 'understandability_score', label: 'Verständlichkeit' },
    { key: 'value_score', label: 'Value' }
];

const STATUS = {
    loading: 'loading',
    ready: 'ready',
    empty: 'empty',
    error: 'error'
};

const pageStyles = {
    padding: 'space.250',
    backgroundColor: 'color.background.neutral.subtle'
};

const summaryStyles = {
    paddingBlock: 'space.150'
};

const issueCalloutStyles = {
    padding: 'space.150',
    borderRadius: 'border.radius',
    backgroundColor: 'color.background.neutral'
};

const sectionStyles = {
    paddingBlock: 'space.100'
};

const noteStyles = {
    padding: 'space.150',
    borderRadius: 'border.radius',
    backgroundColor: 'color.background.accent.gray.subtlest'
};

const loadingLineStyles = {
    padding: 'space.125',
    borderRadius: 'border.radius',
    backgroundColor: 'color.background.neutral'
};

const dividerStyles = {
    borderTopWidth: 'border.width',
    borderTopStyle: 'solid',
    borderTopColor: 'color.border'
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
    const hasWarning = scores.some(score => score > 0 && score < THRESHOLD);

    return (
        <Box xcss={pageStyles}>
            <Stack space="space.250">
                <ReflectionHeader
                    averageScore={averageScore}
                    statusLabel={meta.acceptanceCriteria}
                    isReady={status === STATUS.ready}
                />

                <SummarySection issueText={meta.title} />

                {status === STATUS.loading && <LoadingState />}
                {status === STATUS.error && <ErrorState message={error} />}
                {status === STATUS.empty && <EmptyState />}

                {status === STATUS.ready && (
                    <Stack space="space.200">
                        {hasWarning && <InsightBanner />}

                        <ScoresSection analysis={result} />

                        <SuggestionsSection suggestions={result.improvement_suggestions} />
                    </Stack>
                )}

                <FooterNote />
            </Stack>
        </Box>
    );
};

const SummarySection = ({ issueText }) => (
    <Box xcss={summaryStyles}>
        <Stack space="space.100">
            <Heading as="h4">Summary</Heading>
            <Text>
                Qualitäts-Check für Jira-Requirements mit Fokus auf Verständlichkeit, Konsistenz und messbaren
                Business Value.
            </Text>
            <Text>Issue</Text>
            <Box xcss={issueCalloutStyles}>
                <Text>{issueText || UNKNOWN_TEXT}</Text>
            </Box>
        </Stack>
    </Box>
);

const InsightBanner = () => (
    <SectionMessage appearance="warning" title="Verbesserungspotenzial gefunden">
        <Text>Mindestens eine Kategorie liegt unter 6/10 und sollte nachgeschärft werden.</Text>
    </SectionMessage>
);

const ScoresSection = ({ analysis }) => (
    <Box xcss={sectionStyles}>
        <Stack space="space.100">
            <Heading as="h4">Einzelscores</Heading>
            <Box xcss={dividerStyles} />
            {SCORE_CONFIG.map(({ key, label }) => (
                <ScoreRow key={key} label={label} score={analysis[key]} feedback={getScoreHint(normalizeScore(analysis[key]))} />
            ))}
        </Stack>
    </Box>
);

const SuggestionsSection = ({ suggestions }) => (
    <Box xcss={sectionStyles}>
        <Stack space="space.100">
            <Heading as="h4">Verbesserungsvorschläge</Heading>
            <Box xcss={dividerStyles} />
            <SuggestionsList suggestions={suggestions} />
        </Stack>
    </Box>
);

const FooterNote = () => (
    <Box xcss={noteStyles}>
        <Stack space="space.050">
            <Heading as="h5">Hinweis</Heading>
            <Text>
                Die Bewertung ist eine automatische Erstprüfung. Für Release-Entscheidungen immer zusätzlich fachlich
                gegenprüfen.
            </Text>
            <Inline space="space.050" shouldWrap>
                <Text>Mehr zu Forge und App-Sicherheit:</Text>
                <Link href="https://developer.atlassian.com/platform/forge/">Forge Dokumentation</Link>
            </Inline>
        </Stack>
    </Box>
);

const LoadingState = () => (
    <Box xcss={sectionStyles}>
        <Stack space="space.100">
            <Heading as="h4">Reflection wird geladen</Heading>
            <Box xcss={loadingLineStyles}>
                <Text>Summary wird vorbereitet…</Text>
            </Box>
            <Box xcss={loadingLineStyles}>
                <Text>Scores werden berechnet…</Text>
            </Box>
            <Box xcss={loadingLineStyles}>
                <Text>Vorschläge werden geladen…</Text>
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
    <SectionMessage appearance="information" title="Noch keine Reflection verfügbar">
        <Stack space="space.100">
            <Text>
                Füge eine aussagekräftige Beschreibung und Akzeptanzkriterien hinzu und öffne anschließend die
                Reflection erneut.
            </Text>
            <Text>Nächster Schritt: Jira-Ticket ergänzen und das Panel neu laden.</Text>
        </Stack>
    </SectionMessage>
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
        return 'Die Qualität ist bereits überzeugend.';
    }
    if (score >= THRESHOLD) {
        return 'Gute Basis mit kleineren Verbesserungsmöglichkeiten.';
    }
    return 'Hier sollten Details präzisiert und schärfer formuliert werden.';
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
