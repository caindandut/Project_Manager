import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import routes from './routes';
import { errorMiddleware, notFoundMiddleware } from './common/middlewares/error.middleware';
import { logger } from './common/utils/logger';
import { prisma } from './config';

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.CLIENT_URL,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/uploads', express.static(config.UPLOAD_DIR));

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

// API routes
app.use(`/api/${config.NODE_ENV === 'production' ? 'v1' : 'v1'}`, routes);

// 404 handler
app.use(notFoundMiddleware);

// Error handler
app.use(errorMiddleware);

// Start server
const PORT = config.PORT;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info(`API: http://localhost:${PORT}/api/v1`);
});

export default app;
