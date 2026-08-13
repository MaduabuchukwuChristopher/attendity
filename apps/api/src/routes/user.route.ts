import { Router } from 'express';
import {
  createStaffInvitation,
  listStaffInvitations,
  listUsers,
  revokeStaffInvitation,
  updateUserScope,
  updateUserStatus,
} from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateUserScopeSchema, updateUserStatusSchema } from '../validators/user.validator.js';
import {
  createInvitationSchema,
  invitationIdentifierSchema,
} from '../validators/invitation.validator.js';
export const userRouter = Router();
userRouter.get('/invitations', authenticate, authorize('users:write'), listStaffInvitations);
userRouter.post(
  '/invitations',
  authenticate,
  authorize('users:write'),
  validate(createInvitationSchema),
  createStaffInvitation,
);
userRouter.post(
  '/invitations/:invitationId/revoke',
  authenticate,
  authorize('users:write'),
  validate(invitationIdentifierSchema),
  revokeStaffInvitation,
);
userRouter.get('/', authenticate, authorize('users:read'), listUsers);
userRouter.patch(
  '/:userId/status',
  authenticate,
  authorize('users:write'),
  validate(updateUserStatusSchema),
  updateUserStatus,
);
userRouter.patch(
  '/:userId/scope',
  authenticate,
  authorize('users:write'),
  validate(updateUserScopeSchema),
  updateUserScope,
);
