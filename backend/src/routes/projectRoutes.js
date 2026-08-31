import express from 'express';

import { create, list, getOne, update, updateOrigins, remove } from '../controllers/projectController.js';

import { requireAuth } from '../middleware/authMiddleware.js';
import { onboard } from '../controllers/projectSetupController.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', list);
router.post('/', create);
router.post('/onboard', onboard);

router.get('/:id', getOne);
router.patch('/:id/origins', updateOrigins);
router.patch('/:id', update);
router.delete('/:id', remove);

export default router;
