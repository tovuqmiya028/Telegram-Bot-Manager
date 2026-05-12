import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// DEBUGGING ROUTE - START
app.get("/debug-auth", (req, res) => {
  const adminUser = process.env.ADMIN_PANEL_USERNAME ?? "default_admin";
  const adminPass = process.env.ADMIN_PANEL_PASSWORD ?? "default_admin123";
  
  logger.info({
    message: "DEBUGGING AUTH VALUES",
    source: "debug-route",
    username_from_env: process.env.ADMIN_PANEL_USERNAME,
    password_from_env: process.env.ADMIN_PANEL_PASSWORD,
    effective_username: adminUser,
    effective_password: adminPass,
  });

  res.json({
    message: "Debug info has been logged to the server. Check the logs.",
    username: adminUser,
    password: adminPass,
  });
});
// DEBUGGING ROUTE - END

app.use("/api", router);

export default app;
