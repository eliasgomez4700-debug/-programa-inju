import { Router } from 'express';
import { getRecoveryGrades, createOrUpdateRecoveryGrade, deleteRecoveryGrade, getRecoveryGradesByStudent } from '../controllers/recovery.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getRecoveryGrades);
router.get('/student/:student_id/year/:academic_year_id', authenticate, getRecoveryGradesByStudent);
router.post('/', authenticate, authorize('director', 'profesor'), createOrUpdateRecoveryGrade);
router.delete('/:id', authenticate, authorize('director'), deleteRecoveryGrade);

export default router;
