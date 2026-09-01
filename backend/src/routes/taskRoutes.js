import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { listByRound, getOne, update } from '../controllers/taskController.js';

const router = express.Router();

router.get('/rounds/:id/tasks', requireAuth, listByRound);
router.get('/tasks/:id', requireAuth, getOne);
router.patch('/tasks/:id', requireAuth, update);

export default router;
