import { createReport } from "../services/report.service.js";

export async function submitReport(req, res, next) {
  try { const result = await createReport(req.body); res.status(202).json(result); }
  catch (error) { next(error); }
}
