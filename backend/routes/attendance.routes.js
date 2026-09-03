import { Router } from 'express';
import { getAttendance, saveAttendanceBatch, getAttendanceSummary, generateAttendancePDF } from '../controllers/attendance.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/pdf', authenticate, generateAttendancePDF);
router.get('/', authenticate, getAttendance);
router.post('/batch', authenticate, saveAttendanceBatch);
router.get('/summary/:student_id/:academic_year_id', authenticate, getAttendanceSummary);

export default router;
