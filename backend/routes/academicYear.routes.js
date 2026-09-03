import { Router } from 'express';
import { getAcademicYears, createAcademicYear, getPeriodsByYear } from '../controllers/academicYear.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getAcademicYears);
router.post('/', authenticate, authorize('director'), createAcademicYear);
router.get('/:year_id/periods', authenticate, getPeriodsByYear);

export default router;
