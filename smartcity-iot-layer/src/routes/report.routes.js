import { Router } from "express";

import { submitReport } from "../controllers/report.controller.js";

const router = Router();

router.post("/", submitReport);

export default router;
