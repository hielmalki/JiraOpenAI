import Resolver from '@forge/resolver';
import api, { route, fetch } from '@forge/api'; 

const resolver = new Resolver();

resolver.define('getComments', async ({context}) => {
  // API call to get all comments of Jira issue with key
  const commentsData = await api.asApp().requestJira(route`/rest/api/3/issue/${context.extension.issue.key}/comment`, {
    headers: {
      'Accept': 'application/json'
    }
  });

  // API call to get all comments of Jira issue with key
  const responseData = await commentsData.json();
  const jsonData = await responseData.comments

  let extractedTexts = [];

  // Extracting all texts in the comments into extractedTexts array
  await jsonData.map(comment => {
    if (comment.body && comment.body.content) {
      comment.body.content.map(contentItem => {
        if (contentItem.type === "paragraph" && contentItem.content) {
          contentItem.content.map(textItem => {
            if (textItem.type === "text" && textItem.text) {
              extractedTexts.push(textItem.text);
            }
          });
        }
      });
    }
  });

  return extractedTexts.join(' ');
});

resolver.define('getDescription', async ({context}) => {
  // API call to get the Jira issue with key
  const issueData = await api.asApp().requestJira(route`/rest/api/3/issue/${context.extension.issue.key}`, {
    headers: {
      'Accept': 'application/json'
    }
  });

  // Parse the response data
  const responseData = await issueData.json();
  const description = responseData.fields.description;
  const customfield = responseData.fields.customfield_10047;

  // Create an object with both fields
  const result = {
    description: description,
    customfield: customfield
  };

  // Convert the result to a JSON string
  const jsonString = JSON.stringify(result);
  console.log("LOGGER - jsonString: ", jsonString);

  return jsonString;
});

resolver.define('callOpenAI', async ({payload, context}) => {

  const choiceCount = 1;
  // OpenAI API endpoint
  const url = `https://api.openai.com/v1/chat/completions`;

  // Body for API call
  const body = {
    model: getOpenAPIModel(),

    n: choiceCount,
    messages: [{
      role: 'user',
      content: payload.prompt
    }],
    response_format: gherkin_format, 
  };

  // API call options
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAPIKey()}`,
      'Content-Type': 'application/json',
    },
    redirect: 'follow',
    body: JSON.stringify(body)
  };

  // API call to OpenAI
  const response = await fetch(url, options);
  let result = ''

  if (response.status === 200) {
    const chatCompletion = await response.json();
    const firstChoice = chatCompletion.choices[0]

    if (firstChoice) {
      result = firstChoice.message.content;
    } else {
      console.warn(`Chat completion response did not include any assistance choices.`);
      result = `AI response did not include any choices.`;
    }
  } else {
    const text = await response.text();
    result = text;
  }

  return result;
});

const gherkin_format = {
    "type": "json_schema",
    "json_schema": {
      "name": "jira_evaluation",
      "schema": {
        "type": "object",
        "properties": {
          "confidence_score": {
            "type": "integer",
            "description": "Confidence score ranging from 0 to 10"
          },
          "evaluation_text": {
            "type": "string",
            "description": "Detailed evaluation of the current requirement"
          },
          "improvement_suggestions": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "List of bullet points with improvement suggestions"
          }
        },
        "required": [
          "confidence_score",
          "evaluation_text",
          "improvement_suggestions"
        ],
        "additionalProperties": false
      },
      "strict": true
    }
  }




// Get OpenAI API key
const getOpenAPIKey = () => {
  return process.env.OPEN_API_KEY;
}

// Get OpenAI model
const getOpenAPIModel = () => {
  return 'gpt-4o-mini'
  // return 'gpt-3.5-turbo';
  // return 'gpt-4';
}



// Export the resolver
export const handler = resolver.getDefinitions();