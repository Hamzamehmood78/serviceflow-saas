import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { loadTenant } from '../middleware/tenant.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import { listStaff, getStaff, createStaff, updateStaff } from '../controllers/staff.controller.js';
import { createStaffSchema, updateStaffSchema } from '../validators/staff.validators.js';

const router = Router();

router.use(authenticate, loadTenant);

router.get('/', requireRole(ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.STAFF), listStaff);
router.get('/:id', requireRole(ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.STAFF), getStaff);
router.post('/', requireRole(ROLES.OWNER), validate(createStaffSchema), createStaff);
router.patch('/:id', requireRole(ROLES.OWNER), validate(updateStaffSchema), updateStaff);

export default router;