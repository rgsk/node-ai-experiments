import cors from "cors";
import express from "express";
import environmentVars from "lib/environmentVars";
import errorHandler from "middlewares/errorHandler";
import rootRouter from "routers/rootRouter";

const app = express();
app.use(express.json());
app.use(cors());
app.use("/", rootRouter);

app.use(errorHandler);

const PORT = environmentVars.PORT;
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
