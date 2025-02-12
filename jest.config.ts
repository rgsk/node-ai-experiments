import dotenv from "dotenv";
dotenv.config(); // .env needs to be loaded otherwise validations in environmentVars.ts file will fail

import type { Config } from "@jest/types";

// Sync object
const config: Config.InitialOptions = {
  preset: "ts-jest",
  transform: {
    "ts-jest": [
      "ts-jest",
      {
        diagnostics: {
          warnOnly: true,
        },
      },
    ],
  },
  testEnvironment: "node",
  moduleDirectories: ["node_modules", "src"],
  testPathIgnorePatterns: ["tests", "dist"],
  // tests folder contains graphql related tests which are disabled for now
  // dist folder is ignored to ensure js equivalents of test files in dist folder don't run
};
export default config;
