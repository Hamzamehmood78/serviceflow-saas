import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate.js';
import { getInvitation, acceptInvitation } from '../controllers/invitation.controller.js';
import { acceptSchema } from '../validators/team.validators.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.', errors: null },
});

router.use(limiter);

router.post('/accept', validate(acceptSchema), acceptInvitation);
router.get('/:token', getInvitation);

export default router;