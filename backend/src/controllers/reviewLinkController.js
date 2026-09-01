import { createReviewLink, getReviewLinks, deactivateReviewLink, getPublicReviewByToken } from '../services/reviewLinkService.js';

export const create = async (req, res) => {
  try {
    const { expiresAt } = req.body;

    let parsedExpiresAt = null;

    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);

      if (Number.isNaN(parsedExpiresAt.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'expiresAt must be a valid date',
        });
      }

      if (parsedExpiresAt <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'expiresAt must be in the future',
        });
      }
    }

    const reviewLink = await createReviewLink({
      userId: req.user.id,
      reviewRoundId: req.params.id,
      expiresAt: parsedExpiresAt,
    });

    return res.status(201).json({
      success: true,
      reviewLink,
    });
  } catch (error) {
    if (['INVALID_TARGET_URL', 'TARGET_DOMAIN_NOT_ALLOWED'].includes(error.message)) {
      return res.status(400).json({ success: false, message: 'Check target domain and FRONTEND_URL configuration' });
    }
    if (error.message === 'REVIEW_ROUND_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Review round not found',
      });
    }

    console.error('Create review link error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const list = async (req, res) => {
  try {
    const reviewLinks = await getReviewLinks({
      userId: req.user.id,
      reviewRoundId: req.params.id,
    });

    return res.status(200).json({
      success: true,
      reviewLinks,
    });
  } catch (error) {
    if (error.message === 'REVIEW_ROUND_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Review round not found',
      });
    }

    console.error('Get review links error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const deactivate = async (req, res) => {
  try {
    const reviewLink = await deactivateReviewLink({
      userId: req.user.id,
      reviewLinkId: req.params.id,
    });

    return res.status(200).json({
      success: true,
      reviewLink,
    });
  } catch (error) {
    if (error.message === 'REVIEW_LINK_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Review link not found',
      });
    }

    console.error('Deactivate review link error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const publicReview = async (req, res) => {
  try {
    const review = await getPublicReviewByToken(
      req.params.token
    );

    return res.status(200).json({
      success: true,
      review,
    });
  } catch (error) {
    if (error.message === 'REVIEW_LINK_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Review link not found',
      });
    }

    if (error.message === 'REVIEW_LINK_INACTIVE') {
      return res.status(410).json({
        success: false,
        message: 'Review link is inactive',
      });
    }

    if (error.message === 'REVIEW_LINK_EXPIRED') {
      return res.status(410).json({
        success: false,
        message: 'Review link has expired',
      });
    }

    console.error('Public review error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const createPreview = async (req, res) => {
  try {
    if (req.body && (Array.isArray(req.body) || Object.keys(req.body).length > 0)) {
      return res.status(400).json({ success: false, message: 'Preview options are not supported' });
    }
    const reviewLink = await createReviewLink({
      userId: req.user.id,
      reviewRoundId: req.params.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    return res.status(201).json({
      success: true,
      preview: {
        id: reviewLink.id,
        token: reviewLink.token,
        targetUrl: reviewLink.targetUrl,
        expiresAt: reviewLink.expiresAt,
        createdAt: reviewLink.createdAt,
      },
    });
  } catch (error) {
    if (['INVALID_TARGET_URL', 'TARGET_DOMAIN_NOT_ALLOWED'].includes(error.message)) {
      return res.status(400).json({ success: false, message: 'Check the review target domain' });
    }
    if (error.message === 'REVIEW_ROUND_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Review round not found' });
    }
    console.error('Create developer preview error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
