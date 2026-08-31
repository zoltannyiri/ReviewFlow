import {
  createPublicComment,
  getPublicComments,
} from '../services/commentService.js';

export const createComment = async (req, res) => {
  try {
    const {
      comment,
      pathname,
      tagName,
      reviewElementId,
      elementId,
      elementText,
      viewportWidth,
      viewportHeight,
      elementRect,
    } = req.body;

    if (!comment?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment is required',
      });
    }

    if (!pathname || !tagName) {
      return res.status(400).json({
        success: false,
        message: 'Element information is required',
      });
    }

    if (
      !Number.isInteger(viewportWidth) ||
      !Number.isInteger(viewportHeight)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid viewport information',
      });
    }

    if (
      !elementRect ||
      typeof elementRect.x !== 'number' ||
      typeof elementRect.y !== 'number' ||
      typeof elementRect.width !== 'number' ||
      typeof elementRect.height !== 'number'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid element position',
      });
    }

    const createdComment =
      await createPublicComment({
        token: req.params.token,
        comment,
        pathname,
        tagName,
        reviewElementId,
        elementId,
        elementText,
        viewportWidth,
        viewportHeight,
        elementRect,
      });

    return res.status(201).json({
      success: true,
      comment: createdComment,
    });
  } catch (error) {
    if (
      error.message === 'REVIEW_LINK_NOT_FOUND'
    ) {
      return res.status(404).json({
        success: false,
        message: 'Review link not found',
      });
    }

    if (
      error.message === 'REVIEW_LINK_INACTIVE'
    ) {
      return res.status(410).json({
        success: false,
        message: 'Review link is inactive',
      });
    }

    if (
      error.message === 'REVIEW_LINK_EXPIRED'
    ) {
      return res.status(410).json({
        success: false,
        message: 'Review link has expired',
      });
    }

    console.error('Create comment error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getComments = async (req, res) => {
  try {
    const comments = await getPublicComments({
      token: req.params.token,
      pathname: req.query.pathname,
    });

    return res.status(200).json({
      success: true,
      comments,
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

    console.error('Get comments error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};