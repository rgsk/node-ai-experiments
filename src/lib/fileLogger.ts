import environmentVars from "./environmentVars.js";
import { appendFile } from "./utils.js";

const fileLogger = {
  log: (data: any) => {
    if (environmentVars.NODE_ENV === "development") {
      appendFile(
        "logs.js",
        `const log_${new Date().getTime()} = ${JSON.stringify(data)}\n`
      );
    }
  },
};
export default fileLogger;
