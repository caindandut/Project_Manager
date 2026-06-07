import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import routes from './routes';
import { errorMiddleware, notFoundMiddleware } from './common/middlewares/error.middleware';
import { logger } from './common/utils/logger';
import { verifyEmailTransport } from './common/utils/email.service';
import { seedOwnerAccounts } from './common/utils/seed-owner';
import { prisma } from './config';

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://project-manager-lake-eight.vercel.app',
];

if (config.CLIENT_URL) {
  config.CLIENT_URL.split(',').forEach((url) => {
    const trimmed = url.trim().replace(/\/$/, '');
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
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
  verifyEmailTransport().catch((error) => {
    logger.error('Email transport startup verification failed', error);
  });
  seedOwnerAccounts().catch((error) => {
    logger.error('Owner account seeding failed', error);
  });
});

export default app;
