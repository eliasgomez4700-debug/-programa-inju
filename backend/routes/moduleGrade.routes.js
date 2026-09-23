import { Router } from 'express';
import { getModuleGrades, createOrUpdateModuleGrade, createOrUpdateModuleGradesBatch, getModuleGradeByStudentAndSubject } from '../controllers/moduleGrade.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getModuleGrades);
router.get('/student/:student_id/subject/:subject_id', authenticate, getModuleGradeByStudentAndSubject);
router.post('/', authenticate, authorize('director', 'profesor'), createOrUpdateModuleGrade);
router.post('/batch', authenticate, authorize('director', 'profesor'), createOrUpdateModuleGradesBatch);

export default router;
