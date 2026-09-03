import { Router } from 'express';
import { closeSystem } from '../controllers/systemClosure.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/close', authenticate, authorize('director'), closeSystem);

export default router;
