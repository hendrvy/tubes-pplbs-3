import { Router } from "express";
import healthRoutes from "./health.routes.js";
import iotRoutes from "./iot.routes.js";
import reportRoutes from "./report.routes.js";

const router = Router();
router.use(healthRoutes);
router.use("/iot", iotRoutes);
router.use("/reports", reportRoutes);
export default router;
