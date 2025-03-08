import environmentVars from "../environmentVars.js";
import exampleComposio from "./exampleComposio.js";

const exampleBase = () => {
  if (environmentVars.NODE_ENV === "development") {
    exampleComposio();
  }
};
export default exampleBase;
