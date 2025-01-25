import OpenAI from "openai";
import environmentVars from "./environmentVars";

export const deepSeekClient = new OpenAI({
  apiKey: environmentVars.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});
