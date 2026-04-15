import { Router, type IRouter } from "express";
  import healthRouter from "./health.js";
  import authRouter from "./auth.js";
  import usersRouter from "./users.js";
  import investmentsRouter from "./investments.js";
  import transactionsRouter from "./transactions.js";
  import adminRouter from "./admin.js";
  import referralsRouter from "./referrals.js";
  import activityRouter from "./activity.js";
  import pay0Router from "./pay0.js";
  import settingsRouter from "./settings.js";
  import giftCodesRouter from "./giftcodes.js";

  const router: IRouter = Router();

  router.use(healthRouter);
  router.use("/auth", authRouter);
  router.use("/users", usersRouter);
  router.use(investmentsRouter);
  router.use(transactionsRouter);
  router.use(adminRouter);
  router.use(referralsRouter);
  router.use(activityRouter);
  router.use(pay0Router);
  router.use(settingsRouter);
  router.use(giftCodesRouter);

  export default router;
  