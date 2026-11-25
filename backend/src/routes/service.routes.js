import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { loadTenant } from '../middleware/tenant.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import {
  listServices,
  getService,
  createService,
  updateService,
} from '../controllers/service.controller.js';
import { createServiceSchema, updateServiceSchema } from '../validators/service.validators.js';

const router = Router();

router.use(authenticate, loadTenant);

router.get('/', requireRole(ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.STAFF), listServices);
router.get('/:id', requireRole(ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.STAFF), getService);
router.post('/', requireRole(ROLES.OWNER), validate(createServiceSchema), createService);
router.patch('/:id', requireRole(ROLES.OWNER), validate(updateServiceSchema), updateService);

export default router;