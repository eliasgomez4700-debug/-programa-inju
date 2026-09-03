import { Router } from 'express';
import { login, getProfile, changePassword } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.put('/change-password', authenticate, changePassword);

export default router;
