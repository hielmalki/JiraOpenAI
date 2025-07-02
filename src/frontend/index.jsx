import React, { useEffect, useState, useMemo } from 'react';
import ForgeReconciler, { Text, Heading, List, ListItem } from '@forge/react';
import { invoke } from '@forge/bridge';

const THRESHOLD = 6; // Schwellenwert: 60 % auf 1–10 Skala



const App = () => {
  const [gherkin, setGherkin] = useState({
    consistency_score: 0,
    heading_score: 0,
    understandability_score: 0,
    completeness_score: 0,
    evaluation_text: 'Analyse wird vorbereitet…',
    improvement_suggestions: []
  });

  useEffect(() => {

    const getDescription = async () => {
      try {
        const descriptionData = await invoke('getDescription');
        console.log("Description - " + descriptionData);
        const { description, customfield, title } = JSON.parse(descriptionData);
        const descriptionText = extractTextFromDescription(description);
        if (descriptionData) {
          const prompt = `Dies ist die Anforderung eines Features mit dem Titel: "${title}", extrahiert aus einer Jira-Beschreibung: "${descriptionText}" und den Akzeptanzkriterien: "${customfield}".
                                Du bist professioneller Requirement engineer. Bewerte die Anforderung in 4 Kategorien (je 1–10):
                                Konsistenz: keine Widersprüche, keine Logikfehler, inhaltliche Übereinstimmung 
                                Überschrift: passt der Titel zur Anforderung?
                                Verständlichkeit: Detailtiefe und Klarheit der Informationen
                                Vollständigkeit: alle nötigen Infos vorhanden.
                                `
          const gherkinFromApi = await invoke('callOpenAI', { prompt });
          console.log("Prompt - ", prompt);
          const parsedGherkin = JSON.parse(gherkinFromApi)

          setGherkin(parsedGherkin);
          if (gherkinFromApi) {
            console.log("Gherkin - ", parsedGherkin);
            console.log("StringOutput- ", JSON.stringify(parsedGherkin));
            console.log("Improvement ", parsedGherkin.improvement_suggestions || "undefined");
            console.log("ConfidenceOutput- ", parsedGherkin.confidence_score || "undefined");
        } else {
            console.log("gherkinFromApi is undefined");
        }

          setGherkin(parsedGherkin);
        }
      } catch (error) {
        console.error("Error invoking function: ", error);
      }

    };
    getDescription();
  }, []);
  // Schritt 4: Durchschnitts-Scores berechnen und Schwellenwert prüfen
  const averageScore = useMemo(() => {
    const { consistency_score, heading_score, understandability_score, completeness_score } = gherkin;
    return Math.round((consistency_score + heading_score + understandability_score + completeness_score) / 4);
  }, [gherkin]);

  const allAboveThreshold = averageScore >= THRESHOLD &&
      [gherkin.consistency_score, gherkin.heading_score, gherkin.understandability_score, gherkin.completeness_score]
          .every(score => score >= THRESHOLD);

  // Anzeige
  if (allAboveThreshold) {
    return (
        <>
          <Text>🎉 Alles sieht gut aus! (Durchschnittsscore: {averageScore}/10)</Text>
          <Text>{gherkin.evaluation_text}</Text>
        </>
    );
  }

  return (
      <>
        <Text>Durchschnittsscore: {averageScore}/10</Text>
        <Text>{gherkin.evaluation_text}</Text>

        {gherkin.improvement_suggestions.length > 0 && (
            <>
              <Heading as="h4">Verbesserungsvorschläge</Heading>
              <List type="unordered">
                {gherkin.improvement_suggestions.slice(0, 2).map((s, i) => (
                    <ListItem key={i}>{s}</ListItem>
                ))}
              </List>
            </>
        )}

        <Heading as="h4">Einzelscores</Heading>
        <List type="unordered">
          <ListItem>Konsistenz: {gherkin.consistency_score}/10</ListItem>
          <ListItem>Überschrift: {gherkin.heading_score}/10</ListItem>
          <ListItem>Verständlichkeit: {gherkin.understandability_score}/10</ListItem>
          <ListItem>Vollständigkeit: {gherkin.completeness_score}/10</ListItem>
        </List>
      </>
  );
};


// Hilfsfunktion zur Extraktion des Texts aus Jira-Description
const extractTextFromDescription = (description) => {
  let text = '';
  if (description?.content) {
    description.content.forEach(item => {
      if (item.type === 'paragraph') {
        item.content?.forEach(t => { if (t.text) text += t.text + ' '; });
      }
      if (item.type === 'bulletList') {
        item.content?.forEach(li =>
            li.content?.forEach(p =>
                p.content?.forEach(t => { if (t.text) text += t.text + ' '; })
            )
        );
      }
    });
  }
  return text.trim();
};

ForgeReconciler.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
);