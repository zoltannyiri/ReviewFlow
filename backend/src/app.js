import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import reviewRoundRoutes from './routes/reviewRoundRoutes.js';
import reviewLinkRoutes from './routes/reviewLinkRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import { fileURLToPath } from 'node:url';
import { reviewOrigin } from './middleware/reviewOrigin.js';
import { frontendOrigin } from './utils/projectUrl.js';
import { requireAuth } from './middleware/authMiddleware.js';
import { organizations, connectionStatus } from './controllers/projectSetupController.js';

// Export the real application so HTTP integration tests use the same routes.
const app = express();
// Only public SDK modules are served, never the repository or backend files.
app.use('/sdk', cors(), express.static(fileURLToPath(new URL('../../packages/client/src/', import.meta.url)), {
  dotfiles: 'deny', index: false, maxAge: 0,
}));
app.use(express.json({ limit: '32kb' }));
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use('/api/review/:token', reviewOrigin);
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/review/')) return next();
  return cors({ origin: (origin, done) => done(null, origin === frontendOrigin()) })(req, res, next);
});
app.get('/api/organizations', requireAuth, organizations);
app.get('/api/rounds/:id/connection', requireAuth, connectionStatus);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', reviewRoundRoutes);
app.use('/api', reviewLinkRoutes);
app.use('/api', commentRoutes);
app.use('/api', taskRoutes);
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'ReviewFlow API is running' });
});

export default app;
