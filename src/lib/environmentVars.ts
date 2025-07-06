import { config } from "dotenv";
import { z } from "zod";
config({ override: true });

const AppEnvironmentEnum = z.enum([
  "development",
  "staging",
  "production",
  "test", // jest sets the environment as test so this is added
]);

export type AppEnvironment = z.infer<typeof AppEnvironmentEnum>;

const environmentVarsSchema = z.object({
  PORT: z.string(),
  DATABASE_URL: z.string(),
  NODE_ENV: AppEnvironmentEnum,
  DEEPSEEK_API_KEY: z.string(),
  AWS_ACCESS_KEY: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  COMPOSIO_API_KEY: z.string(),
  GOOGLE_API_KEY: z.string(),
  OPENROUTER_API_KEY: z.string(),
  SENTRY_DSN: z.string(),
  PYTHON_EXPERIMENTS_SERVER_URL: z.string(),
});

const fields: z.infer<typeof environmentVarsSchema> = {
  PORT: process.env.PORT!,
  DATABASE_URL: process.env.DATABASE_URL!,
  NODE_ENV: process.env.NODE_ENV! as AppEnvironment,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY!,
  AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY!,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY!,
  COMPOSIO_API_KEY: process.env.COMPOSIO_API_KEY!,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY!,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY!,
  SENTRY_DSN: process.env.SENTRY_DSN!,
  PYTHON_EXPERIMENTS_SERVER_URL: process.env.PYTHON_EXPERIMENTS_SERVER_URL!,
};

const environmentVars = environmentVarsSchema.parse(fields);
export default environmentVars;
