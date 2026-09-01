import express from 'express';

import {
  create,
  createPreview,
  list,
  deactivate,
  publicReview,
} from '../controllers/reviewLinkController.js';

import {
  createComment,
  getComments,
} from '../controllers/commentController.js';

import { requireAuth } from '../middleware/authMiddleware.js';
import { createGuest } from '../controllers/commentReplyController.js';
import { connectSdk } from '../controllers/projectSetupController.js';

const router = express.Router();

router.post( '/rounds/:id/links', requireAuth, create );
router.post('/rounds/:id/preview', requireAuth, createPreview);

router.get( '/rounds/:id/links', requireAuth, list );

router.delete( '/links/:id', requireAuth, deactivate );

router.post('/review/:token/comments/:id/replies', createGuest);
router.post('/review/:token/connection', connectSdk);

router.get( '/review/:token', publicReview );

router.get( '/review/:token/comments', getComments );

router.post( '/review/:token/comments', createComment );

export default router;
