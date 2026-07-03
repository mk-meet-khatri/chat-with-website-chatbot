import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is missing. Please set it in backend/.env');
    }
    aiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return aiClient;
}

/**
 * Sleep helper for rate-limit backoff.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff — handles 429 / RESOURCE_EXHAUSTED from Gemini.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelayMs: number = 5000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit =
        error?.status === 429 ||
        error?.message?.includes('429') ||
        error?.message?.includes('RESOURCE_EXHAUSTED') ||
        error?.message?.includes('Too Many Requests');

      if (isRateLimit && attempt < maxRetries) {
        attempt++;
        const delay = baseDelayMs * Math.pow(2, attempt - 1); // 5s, 10s, 20s, 40s, 80s
        logger.warn(
          `Gemini rate limit hit (429). Attempt ${attempt}/${maxRetries}. Retrying in ${delay / 1000}s...`
        );
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
}

/**
 * Generate embedding vector for a single string.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const client = getAIClient();
  return withRetry(async () => {
    const res = await client.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text
    });

    if (res.embeddings && res.embeddings.length > 0 && res.embeddings[0].values) {
      return res.embeddings[0].values;
    }
    throw new Error('Gemini API returned no embedding values');
  });
}

/**
 * Generate embedding vectors for a batch of strings.
 */
export async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const client = getAIClient();

  return withRetry(async () => {
    const res = await client.models.embedContent({
      model: 'gemini-embedding-001',
      contents: texts
    });

    if (res.embeddings && res.embeddings.length > 0) {
      return res.embeddings.map(emb => {
        if (!emb.values) {
          throw new Error('Gemini API returned empty embedding item values in batch');
        }
        return emb.values;
      });
    }

    throw new Error('Gemini API returned no embedding array');
  });
}
