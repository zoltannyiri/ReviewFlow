import { createReviewRound, getReviewRounds, getReviewRoundById, updateReviewRound, deleteReviewRound } from '../services/reviewRoundService.js';

const VALID_STATUSES = [
  'DRAFT',
  'REVIEWING',
  'APPROVED',
  'CLOSED',
];

const isValidUrl = (value) => {
  try {
    const url = new URL(value);

    return (
      url.protocol === 'http:' ||
      url.protocol === 'https:'
    );
  } catch {
    return false;
  }
};

export const create = async (req, res) => {
  try {
    const {
      name,
      targetUrl,
    } = req.body;

    if (!name?.trim() || !targetUrl?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'name and targetUrl are required',
      });
    }

    if (!isValidUrl(targetUrl)) {
      return res.status(400).json({
        success: false,
        message: 'targetUrl must be a valid URL',
      });
    }

    const reviewRound = await createReviewRound({
      userId: req.user.id,
      projectId: req.params.projectId,
      name,
      targetUrl,
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
    const {
      name,
      targetUrl,
      status,
    } = req.body;

    if (
      name !== undefined &&
      !name?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'name cannot be empty',
      });
    }

    if (
      targetUrl !== undefined &&
      !isValidUrl(targetUrl)
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

    const reviewRound = await updateReviewRound({
      userId: req.user.id,
      reviewRoundId: req.params.id,
      name,
      targetUrl,
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