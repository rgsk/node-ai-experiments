import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import * as Sentry from "@sentry/node";
import { createAdapter } from "@socket.io/redis-adapter";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { createClient } from "redis";
import { Server as SocketServer } from "socket.io";
import tsconfigPaths from "tsconfig-paths";
import environmentVars from "./lib/environmentVars.js";
import exampleBase from "./lib/examples/exampleBase.js";
import mcpServer from "./lib/mcpServer.js";
import { secretEnvironmentVariables } from "./lib/secretEnvironmentVariables.js";
import { getSecret } from "./lib/secretsManager.js";
import authenticate from "./middlewares/authenticate.js";
import errorHandler from "./middlewares/errorHandler.js";
import experimentsRouter from "./routers/children/experimentsRouter.js";
import gcpRouter from "./routers/children/gcpRouter.js";
import sdCentralAcademyWebRouter from "./routers/children/sdCentralAcademyWebRouter.js";
import youtubeRouter from "./routers/children/youtubeRouter.js";
import rootRouter from "./routers/rootRouter.js";

Sentry.init({
  environment: environmentVars.NODE_ENV,
  dsn: environmentVars.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

tsconfigPaths.register({
  baseUrl: "dist", // or wherever your compiled files are located
  paths: [] as any,
});

const app = express();

let transport: SSEServerTransport | undefined = undefined;

app.get("/sse", async (req, res, next) => {
  try {
    transport = new SSEServerTransport("/messages", res);
    await mcpServer.connect(transport);
    // make new request from mcp-inspector after this log to see the updates
    console.log(`transport connection success`);
  } catch (err) {
    return next(err);
  }
});

app.post("/messages", async (req, res, next) => {
  try {
    // Note: to support multiple simultaneous connections, these messages will
    // need to be routed to a specific matching transport. (This logic isn't
    // implemented here, for simplicity.)
    if (transport) {
      await transport.handlePostMessage(req, res);
    }
  } catch (err) {
    return next(err);
  }
});

const httpServer = createServer(app);

export const io = new SocketServer(httpServer, {
  cors: {
    origin: "*",
  },
});
app.use(express.json());
app.use(cors());

// Define a route to render the EJS template
app.get("/pages/test", (req, res) => {
  res.render("test", {
    title: "My EJS Page",
    message: "Hello, EJS!",
  });
});
app.use("/youtube", youtubeRouter);
app.use("/experiments", experimentsRouter);
app.use("/sdCentralAcademyWeb", sdCentralAcademyWebRouter);
app.use("/gcp", gcpRouter);
app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});
app.use("/", authenticate, rootRouter);
Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

const PORT = environmentVars.PORT;
// Start the server

const setupSecretEnvironmentVariables = async () => {
  const secret = await getSecret(
    "NODE_AI_EXPERIMENTS_ENVIRONMENT_VARIABLES_59be3ac8-cd3c-4db9-b36d-730862454c46"
  );
  if (secret) {
    const parsedSecret = JSON.parse(secret) as {
      OPENAI_API_KEY: string;
    };
    secretEnvironmentVariables.OPENAI_API_KEY = parsedSecret.OPENAI_API_KEY;
  }
};

const setupSocketRedisAdapter = async () => {
  // 1. Create a Redis client for publishing...
  const pubClient = createClient({ url: environmentVars.REDIS_URL });
  // 2. ...and one for subscribing
  const subClient = pubClient.duplicate();

  // 3. Connect both clients
  await Promise.all([pubClient.connect(), subClient.connect()]);

  // 4. Tell Socket.IO to use the Redis adapter
  io.adapter(createAdapter(pubClient, subClient));
};

const initialSetupCode = async () => {
  await setupSecretEnvironmentVariables();
  await setupSocketRedisAdapter();
};
initialSetupCode()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("initialSetupCode error:");
    console.error(err);
  });

exampleBase();
