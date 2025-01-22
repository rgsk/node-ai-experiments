import cors from "cors";
import express from "express";
import environmentVars from "lib/environmentVars";
import errorHandler from "middlewares/errorHandler";
import path from "path";
import rootRouter from "routers/rootRouter";
const app = express();
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

app.use("/", rootRouter);

app.use(errorHandler);

const PORT = environmentVars.PORT;
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
