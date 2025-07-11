import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Heading, List, ListItem } from '@forge/react';
import { invoke } from '@forge/bridge';

const THRESHOLD = 6;

const App = () => {
    const [gherkin, setGherkin] = useState({
        consistency_score: 0,
        understandability_score: 0,
        value_score: 0,
        improvement_suggestions: []
    });

    useEffect(() => {
        (async () => {
            try {
                const descriptionData = await invoke('getDescription');
                const { description, customfield, title } = JSON.parse(descriptionData);
                const descriptionText = extractTextFromDescription(description);

                const prompt = `
Dies ist die Anforderung eines Features mit dem Titel: "${title}", extrahiert aus einer Jira-Beschreibung: "${descriptionText}"
und den Akzeptanzkriterien: "${customfield}".
Du bist ein professioneller Requirement Engineer. Bewerte die Anforderung in 3 Kategorien (je 1–10):
• Verständlichkeit: Vollständigkeit der Eingaben, Detailtiefe und Klarheit der Informationen
• Konsistenz: keine Widersprüche, keine Logikfehler, inhaltliche Übereinstimmung der Jira-Felder zueinander
• Value: Validierbares (testbares) Ziel muss formuliert sein, ein messbarer Business Value erkennbar
Gib außerdem kurze Verbesserungsvorschläge als Array zurück.
`.trim();

                const result = await invoke('callOpenAI', { prompt });
                setGherkin(JSON.parse(result));
            } catch (err) {
                console.error(err);
            }
        })();
    }, []);

    const { consistency_score, understandability_score, value_score, improvement_suggestions } = gherkin;
    const scores = [consistency_score, understandability_score, value_score];
    const averageScore = Math.round((scores[0] + scores[1] + scores[2]) / 3);
    const allAbove = scores.every(s => s >= THRESHOLD);

    if (allAbove) {
        return (
            <>
                <Text>🎉 Alles sieht gut aus! (Durchschnittsscore: {averageScore}/10)</Text>
                <Heading as="h4">Einzelscores</Heading>
                <List type="unordered">
                    <ListItem>Konsistenz: {consistency_score}/10</ListItem>
                    <ListItem>Verständlichkeit: {understandability_score}/10</ListItem>
                    <ListItem>Value: {value_score}/10</ListItem>
                </List>
            </>
        );
    }

    return (
        <>
            <Text>Durchschnittsscore: {averageScore}/10</Text>

            {improvement_suggestions.length > 0 && (
                <>
                    <Heading as="h4">Verbesserungsvorschläge</Heading>
                    <List type="unordered">
                        {improvement_suggestions.map((s, i) => (
                            <ListItem key={i}>{s}</ListItem>
                        ))}
                    </List>
                </>
            )}

            <Heading as="h4">Einzelscores</Heading>
            <List type="unordered">
                <ListItem>Konsistenz: {consistency_score}/10</ListItem>
                <ListItem>Verständlichkeit: {understandability_score}/10</ListItem>
                <ListItem>Value: {value_score}/10</ListItem>
            </List>
        </>
    );
};

function extractTextFromDescription(description) {
    let text = '';
    description?.content?.forEach(item => {
        if (item.type === 'paragraph') {
            item.content?.forEach(t => t.text && (text += t.text + ' '));
        }
        if (item.type === 'bulletList') {
            item.content?.forEach(li =>
                li.content?.forEach(p =>
                    p.content?.forEach(t => t.text && (text += t.text + ' '))
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
