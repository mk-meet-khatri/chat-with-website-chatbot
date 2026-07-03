import { Router } from 'express';
import { randomUUID } from 'crypto';
import { crawlRequestSchema } from '../validation/crawl.schema.js';
import { createJob, getJob } from '../store/jobStore.js';
import { getCachedJobId, normalizeDomain } from '../store/crawlCache.js';
import { runCrawlAndIndexJob } from '../jobs/crawlJob.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /api/crawl
 * Triggers a crawl for a URL or returns cached jobId.
 */
router.post('/', async (req, res) => {
  const parseResult = crawlRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.flatten()
    });
  }

  const { url, maxPages, maxDepth } = parseResult.data;
  const domain = normalizeDomain(url);

  // Check cache for this domain
  const cachedJobId = getCachedJobId(domain);
  if (cachedJobId) {
    const job = getJob(cachedJobId);
    if (job && job.status === 'done') {
      logger.info(`Crawl cache hit for domain '${domain}'. Reusing jobId: ${cachedJobId}`);
      return res.status(200).json({ jobId: cachedJobId, cached: true });
    }
  }

  // Create a new background job
  const jobId = randomUUID();
  createJob(jobId, url, domain);

  // Run the crawler asynchronously (fire and forget)
  runCrawlAndIndexJob(jobId, url, maxPages, maxDepth).catch(error => {
    logger.error(`Error in background crawl execution for job ${jobId}:`, error);
  });

  return res.status(202).json({ jobId, cached: false });
});

/**
 * GET /api/crawl/:jobId/status
 * Fetches status of crawl/indexing.
 */
router.get('/:jobId/status', (req, res) => {
  const { jobId } = req.params;
  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({
      error: `Crawl job with ID '${jobId}' not found.`
    });
  }

  return res.status(200).json(job);
});

export { router as crawlRouter };
