import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  weaviateUrl: process.env.WEAVIATE_URL || '',
  weaviateApiKey: process.env.WEAVIATE_API_KEY || '',
  port: parseInt(process.env.PORT || '4000', 10),
  crawler: {
    maxPagesDefault: parseInt(process.env.MAX_PAGES_DEFAULT || '50', 10),
    maxDepthDefault: parseInt(process.env.MAX_DEPTH_DEFAULT || '3', 10),
    maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '2', 10),
    maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '30', 10),
  }
};

// Validate key configuration and warn
export function validateConfig() {
  const missing: string[] = [];
  if (!config.geminiApiKey) missing.push('GEMINI_API_KEY');
  if (!config.weaviateUrl) missing.push('WEAVIATE_URL');
  if (!config.weaviateApiKey) missing.push('WEAVIATE_API_KEY');

  if (missing.length > 0) {
    console.warn(`[WARN] Config validation warning: Missing env variables: ${missing.join(', ')}`);
  }
}
