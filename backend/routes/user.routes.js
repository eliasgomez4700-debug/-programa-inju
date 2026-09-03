import { Router } from 'express';
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getUsers);
router.get('/:id', authenticate, getUserById);
router.post('/', authenticate, authorize('director'), createUser);
router.put('/:id', authenticate, authorize('director'), updateUser);
router.delete('/:id', authenticate, authorize('director'), deleteUser);

export default router;
