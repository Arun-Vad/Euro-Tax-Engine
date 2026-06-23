import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jurisdictionsRouter from "./jurisdictions";
import categoriesRouter from "./categories";
import transactionsRouter from "./transactions";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(jurisdictionsRouter);
router.use(categoriesRouter);
router.use(transactionsRouter);
router.use(dashboardRouter);

export default router;
