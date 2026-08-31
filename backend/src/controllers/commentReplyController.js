import { createDeveloperReply, createGuestReply } from '../services/commentReplyService.js';

const isValidRequest = (req, res) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)) {
    res.status(400).json({ success: false, message: 'Invalid comment ID' });
    return false;
  }
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).length !== 1 || typeof body.message !== 'string' ||
      !body.message.trim() || body.message.length > 5000 || body.message.includes('\0')) {
    res.status(400).json({
      success: false, message: 'Only a non-empty message of at most 5000 characters is accepted',
    });
    return false;
  }
  return true;
};

const handleError = (error, res) => {
  const errors = {
    COMMENT_NOT_FOUND: [404, 'Comment not found'],
    REVIEW_LINK_NOT_FOUND: [404, 'Review link not found'],
    REVIEW_LINK_INACTIVE: [410, 'Review link is inactive'],
    REVIEW_LINK_EXPIRED: [410, 'Review link has expired'],
  };
  const known = errors[error.message];
  if (known) return res.status(known[0]).json({ success: false, message: known[1] });
  console.error('Create comment reply error:', error.code || error.name);
  return res.status(500).json({ success: false, message: 'Internal server error' });
};

export const createDeveloper = async (req, res) => {
  if (!isValidRequest(req, res)) return;
  try {
    const reply = await createDeveloperReply({
      user: req.user, commentId: req.params.id, message: req.body.message,
    });
    return res.status(201).json({ success: true, reply });
  } catch (error) {
    return handleError(error, res);
  }
};

export const createGuest = async (req, res) => {
  if (!isValidRequest(req, res)) return;
  try {
    const reply = await createGuestReply({
      token: req.params.token, commentId: req.params.id, message: req.body.message,
    });
    return res.status(201).json({ success: true, reply });
  } catch (error) {
    return handleError(error, res);
  }
};
