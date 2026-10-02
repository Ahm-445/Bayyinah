const express = require("express");
const cors = require("cors");

const env = require("./config/env");
const routes = require("./routes");
const {
  notFound,
  errorHandler,
} = require("./middleware/errorHandler");

// The app is created separately from index.js so tests can
// import it without opening a port or a database connection.
const app = express();

app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: "1mb" }));

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
