import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import reviewRoundRoutes from './routes/reviewRoundRoutes.js';
import reviewLinkRoutes from './routes/reviewLinkRoutes.js';
import commentRoutes from './routes/commentRoutes.js';

// Export the real application so HTTP integration tests use the same routes.
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', reviewRoundRoutes);
app.use('/api', reviewLinkRoutes);
app.use('/api', commentRoutes);
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'ReviewFlow API is running' });
});

export default app;
