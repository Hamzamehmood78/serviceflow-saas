import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { loadTenant } from '../middleware/tenant.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../constants/roles.js';
import { getBusiness, updateBusiness } from '../controllers/business.controller.js';
import {
  updateOpeningHours,
  addClosure,
  removeClosure,
  completeOnboarding,
} from '../controllers/hours.controller.js';
import {
  updateBusinessSchema,
  openingHoursSchema,
  closureBodySchema,
} from '../validators/business.validators.js';

const router = Router();

router.use(authenticate, loadTenant);

router.get('/', requireRole(ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.STAFF), getBusiness);
router.patch('/', requireRole(ROLES.OWNER), validate(updateBusinessSchema), updateBusiness);

router.put('/opening-hours', requireRole(ROLES.OWNER), validate(openingHoursSchema), updateOpeningHours);
router.post('/closures', requireRole(ROLES.OWNER), validate(closureBodySchema), addClosure);
router.delete('/closures/:closureId', requireRole(ROLES.OWNER), removeClosure);
router.post('/complete-onboarding', requireRole(ROLES.OWNER), completeOnboarding);

export default router;