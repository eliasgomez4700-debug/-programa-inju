import { Router } from 'express';
import { getTeachers, getAssignments, createAssignment, deleteAssignment, getTeacherStudents } from '../controllers/teacher.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, authorize('director'), getTeachers);
router.get('/:teacher_id/assignments', authenticate, authorize('director'), getAssignments);
router.post('/assignments', authenticate, authorize('director'), createAssignment);
router.delete('/assignments/:id', authenticate, authorize('director'), deleteAssignment);
router.get('/my-students', authenticate, getTeacherStudents);

export default router;
