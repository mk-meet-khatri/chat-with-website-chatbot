const crawlCache = new Map<string, string>();

/**
 * Normalizes a domain/hostname string to check standard caching.
 */
export function normalizeDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function getCachedJobId(domain: string): string | undefined {
  const norm = normalizeDomain(domain);
  return crawlCache.get(norm);
}

export function setCachedJobId(domain: string, jobId: string): void {
  const norm = normalizeDomain(domain);
  crawlCache.set(norm, jobId);
}

export function clearCache(): void {
  crawlCache.clear();
}
