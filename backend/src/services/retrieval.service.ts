import { getWeaviateClient, WebChunkProperties } from './vectorstore.service.js';
import { getEmbedding } from './embedding.service.js';
import { logger } from '../utils/logger.js';

export interface RetrievedChunk {
  text: string;
  sourceUrl: string;
  pageTitle: string;
  chunkIndex: number;
  domain: string;
  crawlJobId: string;
  certainty?: number;
  distance?: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  matchesRelevanceGate: boolean;
}

/**
 * Retrieve chunks from Weaviate Cloud matching the query vector and crawlJobId filter.
 */
export async function retrieveRelevantChunks(
  question: string,
  crawlJobId: string,
  limit: number = 5,
  relevanceThreshold: number = 0.65
): Promise<RetrievalResult> {
  try {
    const client = await getWeaviateClient();
    const collection = client.collections.get<WebChunkProperties>('WebChunk');

    // 1. Compute embedding of user question
    const queryVector = await getEmbedding(question);

    // 2. Build the filter to scope to this specific crawl job
    const filter = collection.filter.byProperty('crawlJobId').equal(crawlJobId);

    // 3. Query Weaviate
    logger.info(`Querying Weaviate Cloud for job '${crawlJobId}', limit: ${limit}...`);
    const queryResult = await collection.query.nearVector(queryVector, {
      targetVector: 'default', // Named vector created by selfProvided({ name: 'default' })
      filters: filter,
      limit,
      returnProperties: ['text', 'sourceUrl', 'pageTitle', 'chunkIndex', 'domain', 'crawlJobId'],
      returnMetadata: ['certainty', 'distance']
    });

    if (queryResult.objects.length === 0) {
      logger.info('No matching objects found in vector search.');
      return {
        chunks: [],
        matchesRelevanceGate: false
      };
    }

    const chunks: RetrievedChunk[] = queryResult.objects.map(obj => {
      const props = obj.properties;
      return {
        text: props.text,
        sourceUrl: props.sourceUrl,
        pageTitle: props.pageTitle,
        chunkIndex: props.chunkIndex,
        domain: props.domain,
        crawlJobId: props.crawlJobId,
        certainty: obj.metadata?.certainty,
        distance: obj.metadata?.distance
      };
    });

    // 4. Determine if the top-1 hit matches the relevance threshold
    const topChunk = chunks[0];
    let score = 0;

    if (topChunk.certainty !== undefined) {
      score = topChunk.certainty;
    } else if (topChunk.distance !== undefined) {
      // In Weaviate, for cosine metric: certainty = 1 - distance/2
      score = 1 - (topChunk.distance / 2);
    } else {
      // If no score metadata is returned, assume it matches to be safe or set default
      score = 1.0;
    }

    logger.info(`Top chunk similarity score: ${score.toFixed(4)} (Threshold: ${relevanceThreshold})`);
    const matchesRelevanceGate = score >= relevanceThreshold;

    return {
      chunks,
      matchesRelevanceGate
    };
  } catch (error) {
    logger.error('Error during vector retrieval:', error);
    throw error;
  }
}
