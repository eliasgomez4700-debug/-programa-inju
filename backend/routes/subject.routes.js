import { Router } from 'express';
import { getSubjects, createSubject, updateSubject, deleteSubject } from '../controllers/subject.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getSubjects);
router.post('/', authenticate, authorize('director'), createSubject);
router.put('/:id', authenticate, authorize('director'), updateSubject);
router.delete('/:id', authenticate, authorize('director'), deleteSubject);

export default router;
