import { crawlSite } from '../services/crawler.service.js';
import { createChunks, TextChunk } from '../services/chunker.service.js';
import { getEmbeddingsBatch } from '../services/embedding.service.js';
import { initCollection, insertChunks } from '../services/vectorstore.service.js';
import { updateJob } from '../store/jobStore.js';
import { setCachedJobId } from '../store/crawlCache.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

/**
 * Runs the crawl -> clean -> chunk -> embed -> index pipeline as a single async job.
 * Updates in-memory job store with progress metrics.
 */
export async function runCrawlAndIndexJob(
  jobId: string,
  startUrl: string,
  maxPages?: number,
  maxDepth?: number
): Promise<void> {
  const finalMaxPages = maxPages ?? config.crawler.maxPagesDefault;
  const finalMaxDepth = maxDepth ?? config.crawler.maxDepthDefault;
  let domain = '';

  try {
    domain = new URL(startUrl).hostname;
  } catch (urlError) {
    logger.error(`Invalid URL provided to job: ${startUrl}`);
    updateJob(jobId, {
      status: 'failed',
      error: 'Invalid start URL.'
    });
    return;
  }

  logger.info(`Running crawl & index job '${jobId}' for domain '${domain}'...`);

  try {
    // 1. Ensure Weaviate Collection exists
    await initCollection();

    // 2. Transition job state to crawling
    updateJob(jobId, { status: 'crawling' });

    // 3. Trigger Crawlee crawling
    const crawledPages = await crawlSite(
      jobId,
      startUrl,
      finalMaxPages,
      finalMaxDepth,
      config.crawler.maxConcurrency,
      config.crawler.maxRequestsPerMinute
    );

    if (crawledPages.length === 0) {
      throw new Error('No pages were successfully crawled. Check URL availability or robots.txt rules.');
    }

    // 4. Transition to indexing
    updateJob(jobId, { status: 'indexing' });

    // 5. Build chunks for all crawled pages
    const chunks: TextChunk[] = [];
    for (const page of crawledPages) {
      const pageChunks = createChunks(page.cleanText, {
        sourceUrl: page.url,
        pageTitle: page.title,
        domain,
        crawlJobId: jobId
      });
      chunks.push(...pageChunks);
    }

    logger.info(`Splitting complete. Created ${chunks.length} total text chunks.`);

    if (chunks.length === 0) {
      logger.warn('Zero usable text chunks created. Terminating job successfully with 0 chunks.');
      updateJob(jobId, { status: 'done', chunksIndexed: 0 });
      setCachedJobId(domain, jobId);
      return;
    }

    // 6. Generate embeddings in small batches with inter-batch delays to respect
    //    Gemini free-tier rate limits (100 RPD for embedding-001).
    const batchSize = 5;        // Small batches to stay under RPM
    const interBatchDelayMs = 2000; // 2s pause between batches
    const maxChunks = 100;      // Cap total chunks to protect free-tier quota
    const vectors: number[][] = [];

    const cappedChunks = chunks.slice(0, maxChunks);
    if (chunks.length > maxChunks) {
      logger.warn(`Chunk count (${chunks.length}) exceeds free-tier cap. Capping at ${maxChunks} chunks to avoid quota exhaustion.`);
    }

    const totalBatches = Math.ceil(cappedChunks.length / batchSize);
    for (let i = 0; i < cappedChunks.length; i += batchSize) {
      const currentBatch = cappedChunks.slice(i, i + batchSize);
      const batchTexts = currentBatch.map(c => c.text);
      const batchNum = Math.floor(i / batchSize) + 1;

      logger.info(`Generating embeddings: batch ${batchNum}/${totalBatches} (${batchTexts.length} chunks)...`);
      const batchVectors = await getEmbeddingsBatch(batchTexts);
      vectors.push(...batchVectors);

      // Update indexing progress count
      updateJob(jobId, { chunksIndexed: vectors.length });

      // Pause between batches to avoid rate limiting (skip after last batch)
      if (i + batchSize < cappedChunks.length) {
        await new Promise(resolve => setTimeout(resolve, interBatchDelayMs));
      }
    }

    // 7. Index in Weaviate Cloud
    await insertChunks(cappedChunks, vectors);

    // 8. Mark job as complete
    updateJob(jobId, { status: 'done', chunksIndexed: cappedChunks.length });

    // Cache the domain's successfully crawled jobId
    setCachedJobId(domain, jobId);
    logger.info(`Job '${jobId}' finished indexing successfully.`);
  } catch (error: any) {
    logger.error(`Job '${jobId}' failed during execution:`, error);
    updateJob(jobId, {
      status: 'failed',
      error: error.message || String(error)
    });
  }
}
