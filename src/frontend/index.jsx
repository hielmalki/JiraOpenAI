import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
    Box,
    Heading,
    Inline,
    Link,
    ProgressBar,
    SectionMessage,
    Stack,
    Strong,
    Text
} from '@forge/react';
import { invoke } from '@forge/bridge';
import ReflectionHeader from './components/ReflectionHeader';
import ScoreRow from './components/ScoreRow';
import SuggestionsList from './components/SuggestionsList';
import {
    buildAnalysisPrompt,
    extractCustomFieldText,
    extractTextFromDescription,
    getAverageScore,
    getScoreHint,
    normalizeAnalysisPayload,
    normalizeScore
} from './analysis-utils.mjs';
import { getErrorPresentation } from './error-utils.mjs';

const THRESHOLD = 6;

const SCORE_CONFIG = [
    { key: 'consistency_score', label: 'Konsistenz' },
    { key: 'understandability_score', label: 'Verständlichkeit' },
    { key: 'value_score', label: 'Value' }
];

const STATUS = {
    loading: 'loading',
    ready: 'ready',
    blocked: 'blocked',
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

const sectionStyles = {
    paddingBlock: 'space.100'
};

const noteStyles = {
    padding: 'space.150',
    borderRadius: 'border.radius',
    backgroundColor: 'color.background.accent.gray.subtlest'
};

const dividerStyles = {
    borderTopWidth: 'border.width',
    borderTopStyle: 'solid',
    borderTopColor: 'color.border'
};

const App = () => {
    const [analysis, setAnalysis] = useState(null);
    const [usage, setUsage] = useState(null);
    const [meta, setMeta] = useState({
        title: '',
        acceptanceCriteria: ''
    });
    const [status, setStatus] = useState(STATUS.loading);
    const [error, setError] = useState(null);
    const [planState, setPlanState] = useState(null);
    const [analysisMeta, setAnalysisMeta] = useState({
        wasInputTruncated: false
    });

    useEffect(() => {
        (async () => {
            try {
                setStatus(STATUS.loading);
                setError(null);

                const currentPlanState = await invoke('getPlanState');
                setPlanState(currentPlanState);
                if (!currentPlanState?.canAnalyze) {
                    setAnalysis(null);
                    setUsage(null);
                    setStatus(STATUS.blocked);
                    return;
                }

                try {
                    const usageSnapshot = await invoke('getUsageSnapshot');
                    setUsage(usageSnapshot);
                } catch (usageError) {
                    console.error('Usage snapshot could not be loaded:', usageError);
                    setUsage(null);
                }

                const issueData = await invoke('getIssueData');
                const { description, customfield, title } = JSON.parse(issueData);
                const descriptionText = extractTextFromDescription(description);
                const acceptanceCriteria = extractCustomFieldText(customfield);
                const analysisPrompt = buildAnalysisPrompt({
                    title,
                    descriptionText,
                    acceptanceCriteria
                });

                setMeta({
                    title: title || '',
                    acceptanceCriteria
                });
                setAnalysisMeta({
                    wasInputTruncated: analysisPrompt.wasTruncated
                });

                if (!descriptionText && !acceptanceCriteria) {
                    setAnalysis(null);
                    setStatus(STATUS.empty);
                    return;
                }

                const result = await invoke('callOpenAI', { prompt: analysisPrompt.prompt });
                const parsedResult = normalizeAnalysisPayload(result);
                setAnalysis(parsedResult);
                setStatus(STATUS.ready);
            } catch (err) {
                console.error(err);
                setError(getErrorPresentation(err));
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
                    statusLabel={getHeaderStatusLabel(status, meta.acceptanceCriteria)}
                    isReady={status === STATUS.ready}
                    usage={usage}
                />

                <SummarySection />

                {status === STATUS.loading && <LoadingState />}
                {status === STATUS.blocked && <PlanBlockedState planState={planState} />}
                {status === STATUS.error && <ErrorState error={error} />}
                {status === STATUS.empty && <EmptyState />}

                {status === STATUS.ready && (
                    <Stack space="space.200">
                        {analysisMeta.wasInputTruncated && <TruncatedInputNotice />}
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

const SummarySection = () => (
    <Box xcss={summaryStyles}>
        <Stack space="space.100">
            <Heading as="h4">Summary</Heading>
            <Text>
                Qualitäts-Check für Jira-Requirements mit Fokus auf Verständlichkeit, Konsistenz und messbaren
                Business Value.
            </Text>
        </Stack>
    </Box>
);

const InsightBanner = () => (
    <SectionMessage appearance="warning" title="Verbesserungspotenzial gefunden">
        <Text>Mindestens eine Kategorie liegt unter 6/10 und sollte nachgeschärft werden.</Text>
    </SectionMessage>
);

const TruncatedInputNotice = () => (
    <SectionMessage appearance="information" title="Analyse mit gekürztem Textauszug">
        <Text>
            Der Jira-Inhalt war sehr lang. Für eine stabile und kosteneffiziente Analyse wurde ein gekürzter Auszug
            verwendet.
        </Text>
    </SectionMessage>
);

const ScoresSection = ({ analysis }) => (
    <Box xcss={sectionStyles}>
        <Stack space="space.100">
            <Heading as="h4">Einzelscores</Heading>
            <Box xcss={dividerStyles} />
            {SCORE_CONFIG.map(({ key, label }) => (
                <ScoreRow
                    key={key}
                    label={label}
                    score={analysis[key]}
                    feedback={getScoreHint(normalizeScore(analysis[key]))}
                />
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
            <ProgressBar ariaLabel="Reflection wird geladen" isIndeterminate />
        </Stack>
    </Box>
);

const ErrorState = ({ error }) => (
    <SectionMessage
        appearance={error?.appearance || 'error'}
        title={error?.title || 'Analyse konnte nicht abgeschlossen werden'}
    >
        <Stack space="space.100">
            <Text>{error?.description || 'Bitte erneut versuchen.'}</Text>
            {error?.recoveryHint && <Text>{`Recovery-Hinweis: ${error.recoveryHint}`}</Text>}
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

const PlanBlockedState = ({ planState }) => (
    <SectionMessage
        appearance="warning"
        title={planState?.planType === 'trial' ? 'Testzeitraum beendet' : 'Keine aktive Lizenz'}
    >
        <Stack space="space.100">
            {planState?.planType === 'trial' ? (
                <Text>Bitte aktiviere eine bezahlte Lizenz, um weitere Analysen zu starten.</Text>
            ) : (
                <Text>Für diese Installation ist aktuell keine aktive Lizenz vorhanden.</Text>
            )}
        </Stack>
    </SectionMessage>
);

function getHeaderStatusLabel(status, acceptanceCriteria) {
    if (status === STATUS.loading) {
        return 'LÄDT';
    }
    if (status === STATUS.blocked) {
        return 'GESPERRT';
    }
    if (status === STATUS.error) {
        return 'FEHLER';
    }
    if (status === STATUS.empty) {
        return 'KEINE DATEN';
    }
    if (acceptanceCriteria) {
        return 'KONTEXT OK';
    }
    return 'AKTIV';
}

ForgeReconciler.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
