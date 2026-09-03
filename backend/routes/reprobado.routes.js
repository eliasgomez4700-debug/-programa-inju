import { Router } from 'express';
import { getReprobados, deleteReprobado } from '../controllers/reprobado.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, authorize('director', 'subdirector', 'secretaria'), getReprobados);
router.delete('/:id', authenticate, authorize('director', 'subdirector'), deleteReprobado);

export default router;
