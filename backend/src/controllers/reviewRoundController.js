import { createReviewRound, getReviewRounds, getReviewRoundById, updateReviewRound, deleteReviewRound } from '../services/reviewRoundService.js';
import { parseTargetUrl } from '../utils/projectUrl.js';

const VALID_STATUSES = [
  'DRAFT',
  'REVIEWING',
  'APPROVED',
  'CLOSED',
];

export const create = async (req, res) => {
  try {
    if (!req.body || Array.isArray(req.body) || Object.keys(req.body).some((key) => !['name', 'targetUrl'].includes(key))) {
      return res.status(400).json({ success: false, message: 'Invalid review round details' });
    }
    const {
      name,
      targetUrl,
    } = req.body;

    if (typeof name !== 'string' || !name.trim() || name.length > 160 || name.includes('\0') || typeof targetUrl !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'name and targetUrl are required',
      });
    }

    const normalizedTargetUrl = parseTargetUrl(targetUrl).href;

    const reviewRound = await createReviewRound({
      userId: req.user.id,
      projectId: req.params.projectId,
      name,
      targetUrl: normalizedTargetUrl,
    });

    return res.status(201).json({
      success: true,
      reviewRound,
    });
  } catch (error) {
    if (error.message === 'PROJECT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    if (['INVALID_TARGET_URL', 'TARGET_DOMAIN_NOT_ALLOWED'].includes(error.message)) {
      return res.status(400).json({ success: false, message: 'Use a URL from the project allowed origins' });
    }

    console.error(
      'Create review round error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const list = async (req, res) => {
  try {
    const reviewRounds = await getReviewRounds({
      userId: req.user.id,
      projectId: req.params.projectId,
    });

    return res.status(200).json({
      success: true,
      reviewRounds,
    });
  } catch (error) {
    if (error.message === 'PROJECT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    console.error(
      'Get review rounds error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getOne = async (req, res) => {
  try {
    const reviewRound = await getReviewRoundById({
      userId: req.user.id,
      reviewRoundId: req.params.id,
    });

    return res.status(200).json({
      success: true,
      reviewRound,
    });
  } catch (error) {
    if (
      error.message === 'REVIEW_ROUND_NOT_FOUND'
    ) {
      return res.status(404).json({
        success: false,
        message: 'Review round not found',
      });
    }

    console.error(
      'Get review round error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const update = async (req, res) => {
  try {
    if (!req.body || Array.isArray(req.body) || Object.keys(req.body).length === 0 ||
        Object.keys(req.body).some((key) => !['name', 'targetUrl', 'status'].includes(key))) {
      return res.status(400).json({ success: false, message: 'Invalid review round update' });
    }
    const {
      name,
      targetUrl,
      status,
    } = req.body;

    if (
      name !== undefined &&
      (typeof name !== 'string' || !name.trim() || name.length > 160 || name.includes('\0'))
    ) {
      return res.status(400).json({
        success: false,
        message: 'name cannot be empty',
      });
    }

    if (
      targetUrl !== undefined &&
      typeof targetUrl !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'targetUrl must be a valid URL',
      });
    }

    if (
      status !== undefined &&
      !VALID_STATUSES.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review round status',
      });
    }

    const normalizedTargetUrl = targetUrl === undefined ? undefined : parseTargetUrl(targetUrl).href;
    const reviewRound = await updateReviewRound({
      userId: req.user.id,
      reviewRoundId: req.params.id,
      name,
      targetUrl: normalizedTargetUrl,
      status,
    });

    return res.status(200).json({
      success: true,
      reviewRound,
    });
  } catch (error) {
    if (
      error.message === 'REVIEW_ROUND_NOT_FOUND'
    ) {
      return res.status(404).json({
        success: false,
        message: 'Review round not found',
      });
    }

    if (['INVALID_TARGET_URL', 'TARGET_DOMAIN_NOT_ALLOWED'].includes(error.message)) {
      return res.status(400).json({ success: false, message: 'Use a URL from the project allowed origins' });
    }

    console.error(
      'Update review round error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const remove = async (req, res) => {
  try {
    await deleteReviewRound({
      userId: req.user.id,
      reviewRoundId: req.params.id,
    });

    return res.status(204).send();
  } catch (error) {
    if (
      error.message === 'REVIEW_ROUND_NOT_FOUND'
    ) {
      return res.status(404).json({
        success: false,
        message: 'Review round not found',
      });
    }

    console.error(
      'Delete review round error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
