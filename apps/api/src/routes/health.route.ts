import { API_PREFIX } from '@qr/shared';
import type { HealthStatus } from '@qr/types';
import { Router } from 'express';
import mongoose from 'mongoose';
export const healthRouter = Router();
const healthResponse = () => {
  const data: HealthStatus = {
    status: 'ok',
    service: 'attendity-api',
    timestamp: new Date().toISOString(),
  };
  return data;
};
healthRouter.get(`${API_PREFIX}/health`, (_request, response) => {
  const data = healthResponse();
  response
    .status(200)
    .json({ success: true, message: 'Service is healthy.', data, timestamp: data.timestamp });
});
healthRouter.get(`${API_PREFIX}/health/live`, (_request, response) => {
  const data = healthResponse();
  response
    .status(200)
    .json({ success: true, message: 'Service is live.', data, timestamp: data.timestamp });
});
healthRouter.get(`${API_PREFIX}/health/ready`, (_request, response) => {
  const ready = mongoose.connection.readyState === mongoose.ConnectionStates.connected;
  const timestamp = new Date().toISOString();
  response.status(ready ? 200 : 503).json({
    success: ready,
    message: ready ? 'Service is ready.' : 'Database connection is not ready.',
    data: { status: ready ? 'ready' : 'unavailable', service: 'attendity-api', timestamp },
    timestamp,
  });
});
