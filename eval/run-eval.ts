import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { retrieveRelevantChunks } from '../backend/src/services/retrieval.service.js';
import { validateConfig } from '../backend/src/config/env.js';
import { logger } from '../backend/src/utils/logger.js';

// Initialize and warn if any config items are missing
validateConfig();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runEval() {
  const jobId = process.argv[2];
  if (!jobId) {
    console.error('Error: Please provide an active, completed jobId. Example: npx tsx eval/run-eval.ts <jobId>');
    process.exit(1);
  }

  const qaPath = path.resolve(__dirname, './qa-pairs.json');
  if (!fs.existsSync(qaPath)) {
    console.error(`Error: qa-pairs.json not found at ${qaPath}`);
    process.exit(1);
  }

  const qaPairs = JSON.parse(fs.readFileSync(qaPath, 'utf-8'));
  console.log(`\nEvaluating retrieval hit-rate for job ID: ${jobId}`);
  console.log(`Loaded ${qaPairs.length} Q&A pairs for evaluation...\n`);

  let hits = 0;

  for (let i = 0; i < qaPairs.length; i++) {
    const { question, expectedSourceUrl } = qaPairs[i];
    console.log(`[${i + 1}/${qaPairs.length}] Question: "${question}"`);
    console.log(`Expected URL substring: "${expectedSourceUrl}"`);

    try {
      // Fetch top 5 chunks without applying the strict relevance threshold gate (0.0 similarity limit)
      const res = await retrieveRelevantChunks(question, jobId, 5, 0.0);
      const matchedUrls = res.chunks.map(chunk => chunk.sourceUrl);

      const isHit = matchedUrls.some(url => url.toLowerCase().includes(expectedSourceUrl.toLowerCase()));

      if (isHit) {
        hits++;
        console.log('Result: HIT ✅\n');
      } else {
        console.log('Result: MISS ❌');
        console.log('Top retrieved source links:');
        if (matchedUrls.length === 0) {
          console.log('  (No chunks retrieved)');
        } else {
          matchedUrls.forEach((url, index) => {
            console.log(`  [${index}] ${url}`);
          });
        }
        console.log('');
      }
    } catch (err: any) {
      console.error(`Error processing question "${question}":`, err.message || err);
      console.log('');
    }
  }

  const hitRate = (hits / qaPairs.length) * 100;
  console.log('==================================================');
  console.log('Evaluation Summary:');
  console.log(`Total Q&A Pairs Evaluated: ${qaPairs.length}`);
  console.log(`Hits: ${hits}`);
  console.log(`Misses: ${qaPairs.length - hits}`);
  console.log(`Hit-Rate (Top-5 precision): ${hitRate.toFixed(2)}%`);
  console.log('==================================================\n');
}

runEval().catch(err => {
  console.error('Failed to run evaluation script:', err);
});
