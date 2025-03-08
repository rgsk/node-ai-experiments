import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import tsconfigPaths from "tsconfig-paths";
import environmentVars from "./lib/environmentVars.js";
import authenticate from "./middlewares/authenticate.js";
import errorHandler from "./middlewares/errorHandler.js";
import experimentsRouter from "./routers/children/experimentsRouter.js";
import gcpRouter from "./routers/children/gcpRouter.js";
import youtubeRouter from "./routers/children/youtubeRouter.js";
import rootRouter from "./routers/rootRouter.js";
tsconfigPaths.register({
  baseUrl: "dist", // or wherever your compiled files are located
  paths: [] as any,
});

const app = express();

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
app.use("/gcp", gcpRouter);
app.use("/", authenticate, rootRouter);
app.use(errorHandler);

const PORT = environmentVars.PORT;
// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// exampleBase();
