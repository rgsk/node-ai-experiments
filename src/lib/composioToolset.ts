import { OpenAIToolSet } from "composio-core";
import environmentVars from "./environmentVars";

const composioToolset = new OpenAIToolSet({
  apiKey: environmentVars.COMPOSIO_API_KEY,
});
export default composioToolset;
