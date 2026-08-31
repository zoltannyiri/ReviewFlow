import express from 'express';

import { create, list, getOne, update, remove } from '../controllers/projectController.js';

import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', list);
router.post('/', create);

router.get('/:id', getOne);
router.patch('/:id', update);
router.delete('/:id', remove);

export default router;