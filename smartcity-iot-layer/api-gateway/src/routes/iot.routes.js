import { Router } from "express";
import { sendCommand, storeAnomalyAlert, storeCrowd, storeEnvironment, storeSecurity } from "../controllers/iot.controller.js";

const router = Router();
router.post("/crowd", storeCrowd);
router.post("/security", storeSecurity);
router.post("/environment", storeEnvironment);
router.post("/anomaly-alert", storeAnomalyAlert);
router.post("/command", sendCommand);
export default router;
