import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { list, update } from '../controllers/developerCommentController.js';
import { createDeveloper } from '../controllers/commentReplyController.js';

const router = express.Router();

// Keep auth route-local: other routers mounted at /api serve public guest URLs.
router.get('/rounds/:id/comments', requireAuth, list);
router.patch('/comments/:id', requireAuth, update);
router.post('/comments/:id/replies', requireAuth, createDeveloper);

export default router;
