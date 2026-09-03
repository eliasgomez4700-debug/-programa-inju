import { Router } from 'express';
import { getMerits, getMeritSummary, createMerit, deleteMerit, generateMeritsPDF } from '../controllers/merit.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getMerits);
router.get('/pdf', authenticate, generateMeritsPDF);
router.get('/summary/:student_id', authenticate, getMeritSummary);
router.post('/', authenticate, createMerit);
router.delete('/:id', authenticate, deleteMerit);

export default router;
