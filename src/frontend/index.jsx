import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Paragraph } from '@forge/react';
import { invoke, view } from '@forge/bridge';

const App = () => {
  const [gherkin, setGherkin] = useState();

  // Getting all the comments of the issue.
  useEffect(() => {
  
    const getDescription = async () => {
      try {
        const descriptionData = await invoke('getDescription');
        console.log("Description - " + descriptionData);
        if (descriptionData) {
          const prompt = `Generiere aus dem folgenden Anforderungstext ein exemplarisches Gherkin-Script: "${descriptionData}".
Erstelle genau ein einziges Gherkin-Script mit deutscher Gherkin-Syntax. Gebe ausschließlich den Inhalt der Sektion "Szenario:" ohne Überschrift, Einleitung, Zusammenfassung oder Erläuterung wieder. Verwende zur Darstellung reinen Text ohne Code-Formatierung. Erstelle das Script ohne "Feature:"- und "Hintergrund:"-Sektionen. Füge Zeilenumbrüche für eine bessere Lesbarkeit ein.`
          const gherkinFromApi = await invoke('callOpenAI', { prompt });
          console.log("Gherkin - " + gherkinFromApi);
          // const splitGherkin=splitIntoparagraph(gherkinFromApi)
          // console.log("GherkinSplit - " + JSON.stringify(splitGherkin));
          // console.log('Featuretitel: ',gherkinFromApi.feature);
          setGherkin(gherkinFromApi);
        }
      } catch (error) {
        console.error("Error invoking function: ", error);
      }
    };
    getDescription();
  }, []);
  
//   function splitIntoparagraph(gherkinString) {
//     // Create a regular expression from the array of words
//     return gherkinString.split('\n').map((paragraph, i) => (     <Paragraph key={i}>{paragraph}</Paragraph> ));
    
// }

   
  return (
      <>
        {gherkin}
      </>
  );


};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);