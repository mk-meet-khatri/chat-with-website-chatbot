import { getWeaviateClient } from './services/vectorstore.service.js';
import { retrieveRelevantChunks } from './services/retrieval.service.js';
import { generateGroundedAnswer } from './services/llm.service.js';
import { validateConfig } from './config/env.js';

validateConfig();

async function runTest() {
  console.log('Starting chat query diagnostics...\n');
  try {
    const client = await getWeaviateClient();
    const collection = client.collections.get('WebChunk');

    // 1. Fetch some objects to see what jobs exist in the DB
    console.log('Fetching sample indexed chunks from Weaviate Cloud...');
    const fetchResult = await collection.query.fetchObjects({
      limit: 5
    });

    if (fetchResult.objects.length === 0) {
      console.error('❌ Error: No chunks found in Weaviate Cloud WebChunk collection. Index is empty.');
      process.exit(1);
    }

    const firstObj = fetchResult.objects[0];
    const crawlJobId = firstObj.properties.crawlJobId as string;
    const domain = firstObj.properties.domain as string;
    console.log(`✅ Success: Found indexed data for domain "${domain}" with job ID: ${crawlJobId}\n`);

    // 2. Run retrieval
    const question = 'tell me about the books';
    console.log(`Testing vector retrieval for question: "${question}"...`);
    const retrieval = await retrieveRelevantChunks(question, crawlJobId);

    console.log(`✅ Retrieval status:`);
    console.log(`   - Chunks returned: ${retrieval.chunks.length}`);
    console.log(`   - cleared relevance gate (threshold 0.65): ${retrieval.matchesRelevanceGate}`);

    if (retrieval.chunks.length > 0) {
      console.log(`   - Top chunk title: "${retrieval.chunks[0].pageTitle}"`);
      console.log(`   - Top chunk preview: "${retrieval.chunks[0].text.substring(0, 100)}..."`);
    }

    // 3. Test LLM generation
    console.log('\nTesting grounded LLM generation via Gemini 2.5 Flash...');
    const answer = await generateGroundedAnswer(question, retrieval.chunks);

    console.log('✅ LLM Response successfully generated:');
    console.log('--------------------------------------------------');
    console.log(answer.answer);
    console.log('--------------------------------------------------');
    console.log('Sources cited:', JSON.stringify(answer.sources, null, 2));

  } catch (error: any) {
    console.error('\n❌ DIAGNOSTICS FAILURE:');
    console.error(error.stack || error);
    process.exit(1);
  }
}

runTest().catch(console.error);
