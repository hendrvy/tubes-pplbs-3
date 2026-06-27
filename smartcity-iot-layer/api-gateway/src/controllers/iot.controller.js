import { createAnomalyAlert, createCommand, createCrowdEvent, createEnvironmentEvent, createSecurityEvent } from "../services/iot.service.js";

export async function storeCrowd(req, res, next) {
  try { const result = await createCrowdEvent(req); res.status(202).json(result); }
  catch (error) { next(error); }
}

export async function storeSecurity(req, res, next) {
  try { const result = await createSecurityEvent(req); res.status(202).json(result); }
  catch (error) { next(error); }
}

export async function storeEnvironment(req, res, next) {
  try { const result = await createEnvironmentEvent(req); res.status(202).json(result); }
  catch (error) { next(error); }
}

export async function storeAnomalyAlert(req, res, next) {
  try { const result = await createAnomalyAlert(req.body); res.status(202).json(result); }
  catch (error) { next(error); }
}

export async function sendCommand(req, res, next) {
  try { const result = await createCommand(req.body); res.status(202).json(result); }
  catch (error) { next(error); }
}
