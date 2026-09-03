import { Router } from 'express';
import { getSections, getSectionById, createSection, updateSection, deleteSection } from '../controllers/section.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getSections);
router.get('/:id', authenticate, getSectionById);
router.post('/', authenticate, authorize('director'), createSection);
router.put('/:id', authenticate, authorize('director'), updateSection);
router.delete('/:id', authenticate, authorize('director'), deleteSection);

export default router;
