import cors from "cors";
import express from "express";
import { createServer } from "http";
import environmentVars from "lib/environmentVars";
import authenticate from "middlewares/authenticate";
import errorHandler from "middlewares/errorHandler";
import path from "path";
import experimentsRouter from "routers/children/experimentsRouter";
import youtubeRouter from "routers/children/youtubeRouter";
import rootRouter from "routers/rootRouter";
import { Server as SocketServer } from "socket.io";
const app = express();

const httpServer = createServer(app);

export const io = new SocketServer(httpServer, {
  cors: {
    origin: "*",
  },
});
app.use(express.json());
app.use(cors());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));
app.use(express.static(path.join(__dirname, "../public")));

// Define a route to render the EJS template
app.get("/pages/test", (req, res) => {
  res.render("test", {
    title: "My EJS Page",
    message: "Hello, EJS!",
  });
});
app.use("/youtube", youtubeRouter);
app.use("/experiments", experimentsRouter);
app.use("/", authenticate, rootRouter);
app.use(errorHandler);

const PORT = environmentVars.PORT;
// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
