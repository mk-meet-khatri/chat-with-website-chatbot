import weaviate, { WeaviateClient } from 'weaviate-client';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { TextChunk } from './chunker.service.js';

export interface WebChunkProperties {
  text: string;
  sourceUrl: string;
  pageTitle: string;
  chunkIndex: number;
  domain: string;
  crawlJobId: string;
  [key: string]: any;
}

let clientInstance: WeaviateClient | null = null;

/**
 * Get or establish the connection to Weaviate Cloud.
 */
export async function getWeaviateClient(): Promise<WeaviateClient> {
  if (!clientInstance) {
    if (!config.weaviateUrl || !config.weaviateApiKey) {
      throw new Error('WEAVIATE_URL and WEAVIATE_API_KEY must be provided in backend/.env');
    }

    const cleanUrl = config.weaviateUrl.trim().replace(/\/$/, '');
    logger.info(`Connecting to Weaviate Cloud at ${cleanUrl}...`);

    clientInstance = await weaviate.connectToWeaviateCloud(cleanUrl, {
      authCredentials: new weaviate.ApiKey(config.weaviateApiKey)
    });

    const isReady = await clientInstance.isReady();
    if (!isReady) {
      throw new Error('Weaviate Cloud connection is not ready.');
    }
    logger.info('Connected to Weaviate Cloud successfully.');
  }
  return clientInstance;
}

/**
 * Ensures the 'WebChunk' collection exists with the selfProvided vectorizer configuration.
 */
export async function initCollection(): Promise<void> {
  try {
    const client = await getWeaviateClient();
    const collectionName = 'WebChunk';
    const collection = client.collections.get<WebChunkProperties>(collectionName);
    const exists = await collection.exists();

    if (!exists) {
      logger.info(`Creating collection '${collectionName}'...`);
      await client.collections.create({
        name: collectionName,
        vectorizers: weaviate.configure.vectors.selfProvided({ name: 'default' }),
        properties: [
          { name: 'text', dataType: 'text' },
          { name: 'sourceUrl', dataType: 'text' },
          { name: 'pageTitle', dataType: 'text' },
          { name: 'chunkIndex', dataType: 'int' },
          { name: 'domain', dataType: 'text' },
          { name: 'crawlJobId', dataType: 'text' }
        ]
      });
      logger.info(`Collection '${collectionName}' created successfully.`);
    } else {
      logger.info(`Collection '${collectionName}' already exists.`);
    }
  } catch (error) {
    logger.error('Failed to initialize Weaviate collection:', error);
    throw error;
  }
}

/**
 * Batch insert text chunks and their pre-computed embeddings.
 */
export async function insertChunks(chunks: TextChunk[], vectors: number[][]): Promise<void> {
  if (chunks.length !== vectors.length) {
    throw new Error('The number of chunks and vectors must match.');
  }
  if (chunks.length === 0) return;

  const client = await getWeaviateClient();
  const collectionName = 'WebChunk';
  const collection = client.collections.get<WebChunkProperties>(collectionName);

  const objects = chunks.map((chunk, idx) => ({
    properties: {
      text: chunk.text,
      sourceUrl: chunk.sourceUrl,
      pageTitle: chunk.pageTitle,
      chunkIndex: chunk.chunkIndex,
      domain: chunk.domain,
      crawlJobId: chunk.crawlJobId
    },
    // Named vector: selfProvided() creates a named vector called 'default'
    vectors: { default: vectors[idx] }
  }));

  logger.info(`Batch inserting ${objects.length} chunks into Weaviate...`);
  const result = await collection.data.insertMany(objects);

  if (result.hasErrors) {
    logger.error('Errors occurred during batch insertion:', result.errors);
    throw new Error('Failed to index some chunks in Weaviate Cloud');
  }

  logger.info(`Successfully indexed ${objects.length} chunks.`);
}
