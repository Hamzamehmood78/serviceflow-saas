import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { loadTenant } from '../middleware/tenant.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import {
  getSchedule,
  saveHours,
  resetHours,
  addLeave,
  removeLeave,
} from '../controllers/schedule.controller.js';
import { openingHoursSchema } from '../validators/business.validators.js';
import { leaveBodySchema } from '../validators/schedule.validators.js';

const router = Router();

router.use(authenticate, loadTenant);

router.get('/:id/schedule', requireRole(ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.STAFF), getSchedule);
router.put('/:id/schedule/hours', requireRole(ROLES.OWNER), validate(openingHoursSchema), saveHours);
router.post('/:id/schedule/reset-hours', requireRole(ROLES.OWNER), resetHours);
router.post('/:id/schedule/leaves', requireRole(ROLES.OWNER), validate(leaveBodySchema), addLeave);
router.delete('/:id/schedule/leaves/:leaveId', requireRole(ROLES.OWNER), removeLeave);

export default router;