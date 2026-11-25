import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { loadTenant } from '../middleware/tenant.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import {
  listTeam,
  createInvitation,
  resendInvitation,
  revokeInvitation,
  updateMemberStatus,
} from '../controllers/team.controller.js';
import { inviteSchema, memberStatusSchema } from '../validators/team.validators.js';

const router = Router();

// Poori team ka kaam sirf owner kar sakta hai
router.use(authenticate, loadTenant, requireRole(ROLES.OWNER));

router.get('/', listTeam);
router.post('/invitations', validate(inviteSchema), createInvitation);
router.post('/invitations/:id/resend', resendInvitation);
router.post('/invitations/:id/revoke', revokeInvitation);
router.patch('/members/:memberId', validate(memberStatusSchema), updateMemberStatus);

export default router;