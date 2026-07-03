import { CheerioCrawler, Configuration } from 'crawlee';
import { cleanHtml, CleanedPage } from './cleaner.service.js';
import { updateJob, getJob } from '../store/jobStore.js';
import { logger } from '../utils/logger.js';

export interface CrawledPage extends CleanedPage {
  url: string;
}

/**
 * Executes a scoped, polite crawl of a single domain starting from seed URL.
 * Uses in-memory storage (persistStorage: false) to avoid filesystem race
 * conditions and the SDK_SESSION_POOL_STATE.json missing-file error.
 */
export async function crawlSite(
  jobId: string,
  startUrl: string,
  maxPages: number,
  maxDepth: number,
  concurrency: number,
  reqsPerMin: number
): Promise<CrawledPage[]> {
  const pages: CrawledPage[] = [];

  // Track discovered URLs to report realistic pagesFound values
  const seenUrls = new Set<string>([startUrl]);

  // Use a per-crawler Configuration with persistStorage: false so Crawlee
  // never writes to disk.
  const crawlerConfig = new Configuration({
    persistStorage: false,
    purgeOnStart: false
  });

  const crawler = new CheerioCrawler(
    {
      maxRequestsPerCrawl: maxPages,
      maxConcurrency: concurrency,
      maxRequestsPerMinute: reqsPerMin,

      async requestHandler({ request, $, enqueueLinks }) {
        const url = request.url;
        const currentDepth = (request.userData?.depth as number) || 0;

        logger.info(`Crawling URL: ${url} at depth ${currentDepth} using Cheerio`);

        // Increment pagesCrawled count in job state
        const currentJob = getJob(jobId);
        if (currentJob) {
          updateJob(jobId, {
            pagesCrawled: currentJob.pagesCrawled + 1,
            pagesFound: seenUrls.size
          });
        }

        // Clean the raw HTML and extract text
        const html = $.html();
        const cleaned = cleanHtml(html);
        pages.push({
          url,
          ...cleaned
        });

        // Enqueue links found on the current page, if within maxDepth
        if (currentDepth < maxDepth) {
          await enqueueLinks({
            strategy: 'same-domain',
            userData: { depth: currentDepth + 1 },
            transformRequestFunction(req) {
              if (!seenUrls.has(req.url)) {
                seenUrls.add(req.url);

                // Update the pagesFound count dynamically
                const liveJob = getJob(jobId);
                if (liveJob) {
                  updateJob(jobId, {
                    pagesFound: seenUrls.size
                  });
                }
              }
              return req;
            }
          });
        }
      },

      failedRequestHandler({ request, error }) {
        logger.error(`Crawl request failed for URL ${request.url}:`, error);
      }
    },
    crawlerConfig // Inject per-instance config — no global env mutation
  );

  logger.info(`Starting crawler for job '${jobId}' targeting: ${startUrl}`);
  await crawler.run([
    {
      url: startUrl,
      userData: { depth: 0 }
    }
  ]);
  logger.info(`Finished crawling for job '${jobId}'. Crawled: ${pages.length} pages.`);

  return pages;
}
