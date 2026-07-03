import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config, validateConfig } from './config/env.js';
import { logger } from './utils/logger.js';
import { crawlRouter } from './routes/crawl.route.js';
import { chatRouter } from './routes/chat.route.js';

// Validate the core environment variables on startup
validateConfig();

const app = express();
const port = config.port;

// Standard middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/crawl', crawlRouter);
app.use('/api/chat', chatRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Global catch-all error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Global unhandled error caught:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred.'
  });
});

app.listen(port, () => {
  logger.info(`Express RAG backend listening at http://localhost:${port}`);
});
export default app;
