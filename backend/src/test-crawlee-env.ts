import { crawlSite } from './services/crawler.service.js';
import { createJob } from './store/jobStore.js';

async function run() {
  const jobId = 'test-job-env-crawl';
  createJob(jobId, 'http://books.toscrape.com', 'books.toscrape.com');

  console.log('Running crawlSite in isolation with CRAWLEE_STORAGE_DIR set...');
  try {
    const pages = await crawlSite(
      jobId,
      'http://books.toscrape.com',
      5,
      2,
      2,
      30
    );
    console.log(`✅ Success: Crawled ${pages.length} pages.`);
    if (pages.length > 0) {
      console.log(`   First page title: "${pages[0].title}"`);
    }
  } catch (error: any) {
    console.error('❌ Failed crawling:', error.stack || error);
  }
}

run().catch(console.error);
