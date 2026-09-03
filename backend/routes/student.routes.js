import { Router } from 'express';
import { getStudents, getStudentById, createStudent, updateStudent, deleteStudent, transferStudent, promoteStudents, generateStudentsListPDF } from '../controllers/student.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getStudents);
router.get('/pdf', authenticate, generateStudentsListPDF);
router.get('/:id', authenticate, getStudentById);
router.post('/', authenticate, authorize('director', 'secretaria'), createStudent);
router.put('/:id', authenticate, authorize('director', 'secretaria'), updateStudent);
router.delete('/:id', authenticate, authorize('director'), deleteStudent);
router.post('/transfer', authenticate, authorize('director', 'secretaria'), transferStudent);
router.post('/promote', authenticate, authorize('director'), promoteStudents);

export default router;
