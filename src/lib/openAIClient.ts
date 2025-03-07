import { OpenAI } from "openai";
import environmentVars from "./environmentVars.js";

const openAIClient = new OpenAI({ apiKey: environmentVars.OPENAI_API_KEY });

export default openAIClient;
