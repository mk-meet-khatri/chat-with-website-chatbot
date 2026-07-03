import { getWeaviateClient } from './services/vectorstore.service.js';
import { validateConfig } from './config/env.js';

validateConfig();

async function run() {
  console.log('Fetching objects with vectors from Weaviate Cloud...');
  try {
    const client = await getWeaviateClient();
    const collection = client.collections.get('WebChunk');
    const exists = await collection.exists();

    if (!exists) {
      console.log('WebChunk collection does not exist.');
      process.exit(0);
    }

    const result = await collection.query.fetchObjects({
      limit: 10,
      includeVector: true
    });

    console.log(`Fetched ${result.objects.length} objects.`);
    for (let i = 0; i < result.objects.length; i++) {
      const obj = result.objects[i];
      const vector = obj.vectors?.default;
      const text = obj.properties.text as string;
      const crawlJobId = obj.properties.crawlJobId;
      console.log(`Object ${i}:`);
      console.log(`  Crawl Job ID: ${crawlJobId}`);
      console.log(`  Text preview: ${text ? text.substring(0, 50) : 'none'}`);
      console.log(`  Vector type: ${typeof vector}`);
      if (vector) {
        if (Array.isArray(vector)) {
          console.log(`  Vector array length: ${vector.length}`);
        } else {
          console.log(`  Vector keys: ${Object.keys(vector)}`);
        }
      } else {
        console.log(`  Vector is null/undefined.`);
      }
    }
  } catch (error: any) {
    console.error('Error during query:', error.message || error);
  }
  process.exit(0);
}

run().catch(console.error);
