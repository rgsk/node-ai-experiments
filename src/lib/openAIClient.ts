import { OpenAI } from "openai";
import { secretEnvironmentVariables } from "./secretEnvironmentVariables.js";
let openAIClient: OpenAI | null = null;
export const getOpenAIClient = () => {
  if (openAIClient) {
    return { openAIClient };
  }

  if (!secretEnvironmentVariables.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY not set. Make sure setupSecretEnvironmentVariables() has run."
    );
  }

  openAIClient = new OpenAI({
    apiKey: secretEnvironmentVariables.OPENAI_API_KEY,
  });

  return {
    openAIClient,
  };
};
