import { Router } from 'express';
import { getGrades, getGradesByStudentAndPeriod, createOrUpdateGrade, calculateFinalAverage, getStudentReport } from '../controllers/grade.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getGrades);
router.get('/student/:student_id/period/:period_id', authenticate, getGradesByStudentAndPeriod);
router.post('/', authenticate, authorize('director', 'profesor'), createOrUpdateGrade);
router.post('/calculate/:student_id/:academic_year_id', authenticate, authorize('director'), calculateFinalAverage);
router.get('/report/:student_id', authenticate, getStudentReport);

export default router;
