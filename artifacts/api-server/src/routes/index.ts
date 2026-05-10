import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import dashboardRouter from "./dashboard.js";
import usersRouter from "./users.js";
import sessionsRouter from "./sessions.js";
import tasksRouter from "./tasks.js";
import logsRouter from "./logs.js";
import broadcastRouter from "./broadcast.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(usersRouter);
router.use(sessionsRouter);
router.use(tasksRouter);
router.use(logsRouter);
router.use(broadcastRouter);

export default router;
