import { checkHealth } from "../services/health.service.js";

export async function getHealth(req, res, next) {
  try {
    const result = await checkHealth();
    res.json(result);
  } catch (error) {
    next(error);
  }
}
