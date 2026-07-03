import { getWeaviateClient } from './services/vectorstore.service.js';
import { validateConfig } from './config/env.js';

validateConfig();

async function run() {
  console.log('Wiping WebChunk collection from Weaviate Cloud...');
  try {
    const client = await getWeaviateClient();
    const collection = client.collections.get('WebChunk');
    const exists = await collection.exists();

    if (exists) {
      console.log('Found WebChunk collection. Deleting it now...');
      await client.collections.delete('WebChunk');
      console.log('✅ WebChunk collection deleted successfully.');
    } else {
      console.log('WebChunk collection does not exist in Weaviate Cloud.');
    }
  } catch (error: any) {
    console.error('❌ Failed to wipe collection:', error.message || error);
  }
  process.exit(0);
}

run().catch(console.error);
