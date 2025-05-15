import { OpenAI } from "openai";
import { secretEnvironmentVariables } from "./secretEnvironmentVariables.js";

const openAIClient = new OpenAI({
  apiKey: secretEnvironmentVariables.OPENAI_API_KEY,
});

export default openAIClient;
