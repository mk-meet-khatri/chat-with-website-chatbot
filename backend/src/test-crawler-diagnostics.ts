import { CheerioCrawler } from 'crawlee';

async function runDiagnostics() {
  console.log('Running CheerioCrawler diagnostics for http://books.toscrape.com ...\n');

  const crawler = new CheerioCrawler({
    maxRequestsPerCrawl: 5,
    respectRobotsTxtFile: true,
    async requestHandler({ request, $, enqueueLinks }) {
      console.log(`✅ Success: Loaded ${request.url}`);
      console.log(`   Title: "${$('title').text().trim()}"`);
    },
    failedRequestHandler({ request, error }) {
      console.error(`❌ Request Failed: ${request.url}`);
      console.error('   Error Details:', error);
    }
  });

  try {
    await crawler.run(['https://books.toscrape.com']);
    console.log('\nCrawler run finished.');
  } catch (err: any) {
    console.error('\n❌ Crawler execution error:', err);
  }
}

runDiagnostics().catch(console.error);
