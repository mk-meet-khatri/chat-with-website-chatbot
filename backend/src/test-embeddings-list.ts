import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY is not defined in env.');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const candidateModels = [
  'text-embedding-004',
  'models/text-embedding-004',
  'gemini-embedding-001',
  'models/gemini-embedding-001',
  'embedding-001',
  'models/embedding-001'
];

async function runTests() {
  console.log('Testing embedding models with your API key...\n');

  for (const model of candidateModels) {
    try {
      console.log(`Testing model: "${model}"...`);
      const res = await ai.models.embedContent({
        model,
        contents: 'Test string for embedding.'
      });

      console.log(`✅ Success for "${model}"!`);
      if (res.embeddings && res.embeddings.length > 0) {
        console.log(`   Dimensions: ${res.embeddings[0].values?.length || 0}`);
      }
    } catch (err: any) {
      console.log(`❌ Failed for "${model}": ${err.message || err}`);
    }
    console.log('--------------------------------------------------');
  }
}

runTests().catch(console.error);
