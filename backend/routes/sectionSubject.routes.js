import { Router } from 'express';
import { getSectionSubjects, createSectionSubject, deleteSectionSubject } from '../controllers/sectionSubject.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getSectionSubjects);
router.post('/', authenticate, authorize('director'), createSectionSubject);
router.delete('/:id', authenticate, authorize('director'), deleteSectionSubject);

export default router;
