import express from 'express';

import {
  create,
  list,
  deactivate,
  publicReview,
} from '../controllers/reviewLinkController.js';

import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post( '/rounds/:id/links', requireAuth, create );

router.get( '/rounds/:id/links', requireAuth, list );

router.delete( '/links/:id', requireAuth, deactivate );

router.get( '/review/:token', publicReview );

export default router;