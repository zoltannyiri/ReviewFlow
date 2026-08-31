import cors from 'cors';
import { getPublicReviewByToken } from '../services/reviewLinkService.js';
import { frontendOrigin, isAllowedOrigin } from '../utils/projectUrl.js';

export const reviewOrigin = async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  try {
    const review = await getPublicReviewByToken(req.params.token);
    const origin = req.get('Origin');
    const method = req.method === 'OPTIONS' ? req.get('Access-Control-Request-Method') : req.method;
    const landing = req.path === '/' && method === 'GET' && origin === frontendOrigin();
    if (origin && !landing && !isAllowedOrigin(origin, review.project, review.reviewRound.targetUrl)) {
      return res.status(403).json({ success: false, message: 'Origin is not allowed for this project' });
    }
    req.review = review;
    return cors({ origin: origin || false, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] })(req, res, next);
  } catch (error) {
    const expired = ['REVIEW_LINK_EXPIRED', 'REVIEW_LINK_INACTIVE'].includes(error.message);
    const missing = error.message === 'REVIEW_LINK_NOT_FOUND';
    return cors({ origin: req.get('Origin') || false })(req, res, () =>
      res.status(expired ? 410 : missing ? 404 : 500).json({ success: false,
        message: expired ? 'Review link has expired or was revoked' : 'Review unavailable' }));
  }
};
