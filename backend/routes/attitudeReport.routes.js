import { Router } from 'express';
import { getAttitudeReports, getAttitudeReportByStudent, getStudentAttitudeHistory, createOrUpdateAttitudeReport, deleteAttitudeReport } from '../controllers/attitudeReport.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getAttitudeReports);
router.get('/student/:student_id/period/:period_id', authenticate, getAttitudeReportByStudent);
router.get('/student/:student_id/history', authenticate, getStudentAttitudeHistory);
router.post('/', authenticate, createOrUpdateAttitudeReport);
router.delete('/:id', authenticate, deleteAttitudeReport);

export default router;
