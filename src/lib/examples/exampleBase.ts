import environmentVars from "../environmentVars.js";
import example from "./example.js";

const exampleBase = () => {
  if (environmentVars.NODE_ENV === "development") {
    example();
  }
};
export default exampleBase;
