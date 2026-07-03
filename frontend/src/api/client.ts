export interface CrawlResponse {
  jobId: string;
  cached: boolean;
}

export interface CrawlJobStatus {
  jobId: string;
  url: string;
  domain: string;
  status: 'pending' | 'crawling' | 'indexing' | 'done' | 'failed';
  pagesFound: number;
  pagesCrawled: number;
  chunksIndexed: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface ChatResponse {
  answer: string;
  sources: { url: string; title: string }[];
}

/**
 * Initiate crawling for a website.
 */
export async function initiateCrawl(
  url: string,
  maxPages?: number,
  maxDepth?: number
): Promise<CrawlResponse> {
  const response = await fetch('/api/crawl', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url, maxPages, maxDepth })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to start crawling.');
  }

  return response.json();
}

/**
 * Fetch status of an active crawl job.
 */
export async function fetchCrawlStatus(jobId: string): Promise<CrawlJobStatus> {
  const response = await fetch(`/api/crawl/${jobId}/status`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to retrieve job status.');
  }

  return response.json();
}

/**
 * Query the crawled contents using grounded vector search.
 */
export async function sendChatMessage(jobId: string, question: string): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ jobId, question })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const detail = errorData.details ? ` — ${errorData.details}` : '';
    throw new Error((errorData.error || 'Failed to get a response.') + detail);
  }

  return response.json();
}

/**
 * Query the crawled contents using grounded vector search and stream chunks.
 */
export async function sendChatMessageStream(
  jobId: string,
  question: string,
  onChunk: (text: string) => void,
  onSources: (sources: { url: string; title: string }[]) => void
): Promise<void> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ jobId, question })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const detail = errorData.details ? ` — ${errorData.details}` : '';
    throw new Error((errorData.error || 'Failed to get a response.') + detail);
  }

  if (!response.body) {
    throw new Error('Response body is empty');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    
    // Parse SSE lines from buffer (split by double newlines)
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || ''; // Keep the last incomplete chunk in the buffer

    for (const part of parts) {
      const line = part.trim();
      if (!line) continue;

      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6);
        try {
          const payload = JSON.parse(jsonStr);
          if (payload.type === 'text') {
            onChunk(payload.content);
          } else if (payload.type === 'sources') {
            onSources(payload.content);
          } else if (payload.type === 'error') {
            throw new Error(payload.content);
          } else if (payload.type === 'done') {
            // End of stream
          }
        } catch (e) {
          console.error('Error parsing SSE event:', e);
        }
      }
    }
  }
}

