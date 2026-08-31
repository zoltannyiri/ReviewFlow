import prisma from '../config/prisma.js';
import { parseTargetUrl } from '../utils/projectUrl.js';
import { getReviewRoundById } from '../services/reviewRoundService.js';

export const organizations = (req, res) => res.json({ success: true,
  organizations: req.user.memberships.map(({ organization, role }) => ({ ...organization, role })),
});

export const onboard = async (req, res) => {
  const body = req.body;
  if (!body || Array.isArray(body) || Object.keys(body).some((key) => !['organizationId', 'name', 'targetUrl'].includes(key)) ||
      typeof body.organizationId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.organizationId) ||
      typeof body.name !== 'string' || !body.name.trim() || body.name.length > 160 || body.name.includes('\0')) {
    return res.status(400).json({ success: false, message: 'Invalid project details' });
  }
  let url;
  try { url = parseTargetUrl(body.targetUrl); } catch {
    return res.status(400).json({ success: false, message: 'Use an HTTPS URL (HTTP is allowed only on localhost)' });
  }
  try {
    // Atomic nested create, with membership enforced by the constrained connect.
    const created = await prisma.project.create({ data: {
      name: body.name.trim(), allowedDomains: [url.origin],
      createdBy: { connect: { id: req.user.id } },
      organization: { connect: { id: body.organizationId, members: { some: { userId: req.user.id } } } },
      reviewRounds: { create: { name: 'Első ügyfél review', version: 1, targetUrl: url.href } },
    }, include: { organization: { select: { id: true, name: true } }, reviewRounds: true } });
    const { reviewRounds, ...project } = created;
    return res.status(201).json({ success: true, project, reviewRound: reviewRounds[0] });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Organization not found' });
    console.error('Project setup failed:', error.code || error.name);
    return res.status(500).json({ success: false, message: 'Project could not be created' });
  }
};

export const connectionStatus = async (req, res) => {
  try {
    const round = await getReviewRoundById({ userId: req.user.id, reviewRoundId: req.params.id });
    return res.json({ success: true, lastConnectedAt: round.sdkLastSeenAt, origin: round.sdkLastOrigin });
  } catch (error) {
    return res.status(error.message === 'REVIEW_ROUND_NOT_FOUND' ? 404 : 500)
      .json({ success: false, message: 'Connection status unavailable' });
  }
};

export const connectSdk = async (req, res) => {
  const review = req.review;
  const body = req.body;
  if (!req.get('Origin') || !body || Object.keys(body).length !== 1 || body.projectKey !== review.project.publicKey) {
    return res.status(403).json({ success: false, message: 'SDK project or origin mismatch' });
  }
  try {
    await prisma.reviewRound.update({ where: { id: review.reviewRound.id, reviewLinks: { some: {
      id: review.link.id, isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    } } }, data: { sdkLastSeenAt: new Date(), sdkLastOrigin: req.get('Origin') } });
    return res.json({ success: true });
  } catch {
    return res.status(410).json({ success: false, message: 'Review link is no longer available' });
  }
};
