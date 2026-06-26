import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import routes from "./routes/index.js";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "128kb" }));
  app.use(morgan("combined"));
  app.use(routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
