import {
  getRoundTasks,
  getTaskById,
  updateTask,
  VALID_TASK_STATUSES,
} from '../services/taskService.js';

const isUuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const listByRound = async (req, res) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid review round ID' });
  }

  try {
    const result = await getRoundTasks({
      userId: req.user.id,
      reviewRoundId: req.params.id,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.message === 'REVIEW_ROUND_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Review round not found' });
    }
    console.error('List tasks error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getOne = async (req, res) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid task ID' });
  }

  try {
    const task = await getTaskById({
      userId: req.user.id,
      taskId: req.params.id,
    });
    return res.status(200).json({ success: true, task });
  } catch (error) {
    if (error.message === 'TASK_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    console.error('Get task error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const update = async (req, res) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid task ID' });
  }

  const { status, position, title, description } = req.body || {};

  if (status !== undefined && !VALID_TASK_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid task status. Allowed: ${VALID_TASK_STATUSES.join(', ')}`,
    });
  }

  if (position !== undefined && (typeof position !== 'number' || Number.isNaN(position))) {
    return res.status(400).json({
      success: false,
      message: 'Position must be a valid number',
    });
  }

  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Title must be a non-empty string',
    });
  }

  try {
    const task = await updateTask({
      userId: req.user.id,
      taskId: req.params.id,
      status,
      position,
      title,
      description,
    });
    return res.status(200).json({ success: true, task });
  } catch (error) {
    if (error.message === 'TASK_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (error.message === 'INVALID_TASK_STATUS') {
      return res.status(400).json({ success: false, message: 'Invalid task status' });
    }
    console.error('Update task error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
