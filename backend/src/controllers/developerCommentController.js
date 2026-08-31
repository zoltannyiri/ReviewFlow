import {
  getDeveloperComments,
  resolveComment,
} from '../services/commentService.js';

const isUuid = (value) => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const list = async (req, res) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid review round ID' });
  }

  try {
    const result = await getDeveloperComments({
      userId: req.user.id,
      reviewRoundId: req.params.id,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.message === 'REVIEW_ROUND_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Review round not found' });
    }
    console.error('List developer comments error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const update = async (req, res) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid comment ID' });
  }

  const body = req.body;
  // This milestone only supports resolving. Reject all other mutations,
  // including ownership fields and future reopening statuses.
  if (!body || Array.isArray(body) || typeof body !== 'object' ||
      Object.keys(body).length !== 1 || body.status !== 'RESOLVED') {
    return res.status(400).json({
      success: false,
      message: 'Only status RESOLVED is supported',
    });
  }

  try {
    const comment = await resolveComment({
      userId: req.user.id,
      commentId: req.params.id,
    });
    return res.status(200).json({ success: true, comment });
  } catch (error) {
    if (error.message === 'COMMENT_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    console.error('Resolve comment error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
