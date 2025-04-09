import OpenAI from "openai";
import environmentVars from "./environmentVars.js";

const openRouterClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: environmentVars.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://react-ai-experiments.vercel.app",
    "X-Title": "AI Experiments",
  },
});
export default openRouterClient;
