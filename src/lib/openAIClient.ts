import { OpenAI } from "openai";
import environmentVars from "./environmentVars";

const openAIClient = new OpenAI({ apiKey: environmentVars.OPENAI_API_KEY });

export default openAIClient;
