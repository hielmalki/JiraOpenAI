import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Heading, List, ListItem } from '@forge/react';
import { Em, Strong, Strike } from '@forge/react';
import { invoke, view } from '@forge/bridge';



const App = () => {
  const [gherkin, setGherkin] = useState({
    "confidence_score": 0,
    "evaluation_text": "Analyse wird vorbereitet...",
    "improvement_suggestions": []
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
Du bist professioneller Requirement engineer. Bewerte die gegebene Anforderung hinsichtlich, Konsistenz, logischer Lücken/Fehler, Verständlichkeit. Fasse deine Erkenntnisse im evaluation_text in bis zu 500 Zeichen und ohne ohne weitere markups oder Auflistungen zusammen. Gib dafür eine confidence_score von 0 bis 10. Wenn du es für sinnvoll hältst, gib in den improvement_suggestions Möglichkeiten, wie der Text verbessert werden kann.`
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

  const extractTextFromDescription = (description) => {
    let extractedText = '';

    if (description && description.content) {
      description.content.forEach(contentItem => {
        if (contentItem.type === 'paragraph' && contentItem.content) {
          contentItem.content.forEach(textItem => {
            if (textItem.type === 'text' && textItem.text) {
              extractedText += textItem.text + ' ';
            }
          });
        } else if (contentItem.type === 'bulletList' && contentItem.content) {
          contentItem.content.forEach(listItem => {
            if (listItem.type === 'listItem' && listItem.content) {
              listItem.content.forEach(paragraph => {
                if (paragraph.type === 'paragraph' && paragraph.content) {
                  paragraph.content.forEach(textItem => {
                    if (textItem.type === 'text' && textItem.text) {
                      extractedText += textItem.text + ' ';
                    }
                  });
                }
              });
            }
          });
        }
      });
    }

    return extractedText.trim();
  };
  return (
    <>
    <Text>{gherkin.evaluation_text}</Text>
    {gherkin.improvement_suggestions.length > 0 && (<Heading as="h4">Verbesserungsvorschläge</Heading>)}
 {    <List type="unordered">
      {gherkin.improvement_suggestions.map((suggestion, index) => (
        <ListItem key={index}>{suggestion}</ListItem>
      ))}
    </List>}
    </>
  );


};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);