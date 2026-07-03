import { Router } from 'express';
import { chatRequestSchema } from '../validation/chat.schema.js';
import { getJob } from '../store/jobStore.js';
import { retrieveRelevantChunks } from '../services/retrieval.service.js';
import { generateGroundedAnswerStream } from '../services/llm.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /api/chat
 * Scopes search to the specified jobId and answers grounded in crawled contents.
 */
router.post('/', async (req, res) => {
  const parseResult = chatRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.flatten()
    });
  }

  const { jobId, question } = parseResult.data;

  // 1. Ensure the job exists and is complete
  const job = getJob(jobId);
  if (!job) {
    return res.status(404).json({
      error: `Crawl job with ID '${jobId}' not found.`
    });
  }

  if (job.status !== 'done') {
    return res.status(400).json({
      error: `Chat is disabled. Job status is '${job.status}'. Wait until it completes.`
    });
  }

  try {
    // 2. Perform vector search in Weaviate Cloud
    const retrieval = await retrieveRelevantChunks(question, jobId);

    // Set headers for SSE Event Streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 3. If relevance threshold (gate) is not met, short-circuit immediately
    if (!retrieval.matchesRelevanceGate) {
      logger.info('Vector search results failed to clear relevance gate. Returning fallback.');
      res.write(`data: ${JSON.stringify({ type: 'text', content: "I couldn't find anything on this site about that." })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
      return;
    }

    // 4. Send chunks to client in real-time
    const answerResult = await generateGroundedAnswerStream(
      question,
      retrieval.chunks,
      (textChunk) => {
        res.write(`data: ${JSON.stringify({ type: 'text', content: textChunk })}\n\n`);
      }
    );

    // 5. Send sources metadata at completion
    res.write(`data: ${JSON.stringify({ type: 'sources', content: answerResult.sources })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error: any) {
    logger.error('Error during chat processing:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', content: error.message || String(error) })}\n\n`);
    res.end();
  }
});

export { router as chatRouter };
