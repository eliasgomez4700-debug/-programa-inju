import { Router } from 'express';
import { getModuleGrades, createOrUpdateModuleGrade, getModuleGradeByStudentAndSubject } from '../controllers/moduleGrade.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getModuleGrades);
router.get('/student/:student_id/subject/:subject_id', authenticate, getModuleGradeByStudentAndSubject);
router.post('/', authenticate, authorize('director', 'profesor'), createOrUpdateModuleGrade);

export default router;
