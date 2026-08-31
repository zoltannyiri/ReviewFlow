import express from 'express';

import {
  create,
  list,
  getOne,
  update,
  remove,
} from '../controllers/reviewRoundController.js';

import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post(
  '/projects/:projectId/rounds',
  requireAuth,
  create
);

router.get(
  '/projects/:projectId/rounds',
  requireAuth,
  list
);

router.get(
  '/rounds/:id',
  requireAuth,
  getOne
);

router.patch(
  '/rounds/:id',
  requireAuth,
  update
);

router.delete(
  '/rounds/:id',
  requireAuth,
  remove
);

export default router;