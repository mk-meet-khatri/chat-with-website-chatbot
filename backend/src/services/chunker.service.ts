export interface TextChunk {
  text: string;
  sourceUrl: string;
  pageTitle: string;
  chunkIndex: number;
  domain: string;
  crawlJobId: string;
}

/**
 * Splits text into overlapping segments based on separators (simulating LangChain's RecursiveCharacterTextSplitter).
 */
export function splitText(
  text: string,
  chunkSize: number = 3200, // ~800 tokens (4 chars/token avg)
  chunkOverlap: number = 400  // ~100 tokens (4 chars/token avg)
): string[] {
  const separators = ['\n\n', '\n', '. ', '? ', '! ', ' ', ''];

  function split(content: string, sepIndex: number): string[] {
    if (content.length <= chunkSize) {
      return [content];
    }

    if (sepIndex >= separators.length) {
      // Force split by character chunk size
      const chunks: string[] = [];
      let index = 0;
      while (index < content.length) {
        chunks.push(content.slice(index, index + chunkSize));
        index += chunkSize - chunkOverlap;
      }
      return chunks;
    }

    const separator = separators[sepIndex];
    const parts = content.split(separator);
    const result: string[] = [];
    let currentChunk = '';

    for (const part of parts) {
      const nextCandidate = currentChunk ? (currentChunk + separator + part) : part;

      if (nextCandidate.length <= chunkSize) {
        currentChunk = nextCandidate;
      } else {
        if (currentChunk) {
          result.push(currentChunk);
        }

        // Apply overlap for the next chunk
        if (chunkOverlap > 0 && currentChunk) {
          const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
          const overlapPart = currentChunk.slice(overlapStart);
          currentChunk = overlapPart ? (overlapPart + separator + part) : part;
        } else {
          currentChunk = part;
        }
      }
    }

    if (currentChunk) {
      result.push(currentChunk);
    }

    // Recursively split any chunks that exceed target size
    const finalChunks: string[] = [];
    for (const chunk of result) {
      if (chunk.length > chunkSize) {
        finalChunks.push(...split(chunk, sepIndex + 1));
      } else {
        finalChunks.push(chunk);
      }
    }

    return finalChunks;
  }

  return split(text, 0);
}

/**
 * Creates standard TextChunk objects from raw text, filtering out short crumbs.
 */
export function createChunks(
  text: string,
  metadata: {
    sourceUrl: string;
    pageTitle: string;
    domain: string;
    crawlJobId: string;
  },
  chunkSize: number = 3200,
  chunkOverlap: number = 400
): TextChunk[] {
  const rawSegments = splitText(text, chunkSize, chunkOverlap);

  return rawSegments
    .map((seg, idx) => ({
      text: seg.replace(/\s+/g, ' ').trim(),
      sourceUrl: metadata.sourceUrl,
      pageTitle: metadata.pageTitle,
      chunkIndex: idx,
      domain: metadata.domain,
      crawlJobId: metadata.crawlJobId
    }))
    .filter(chunk => chunk.text.length >= 50); // Strip tiny snippets (e.g. cookie notices, crumb menus)
}
