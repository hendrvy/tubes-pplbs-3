import { getHealthStatus } from "../services/health.service.js";

export async function healthCheck(_req, res, next) {
  try {
    const status = await getHealthStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
}
