import { Router } from 'express';
import { getSummary } from '../controllers/portal.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
export const portalRouter = Router();
portalRouter.get('/summary', authenticate, getSummary);
