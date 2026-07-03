export type CrawlJob = {
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
};

const jobStore = new Map<string, CrawlJob>();

export function getJob(jobId: string): CrawlJob | undefined {
  return jobStore.get(jobId);
}

export function createJob(jobId: string, url: string, domain: string): CrawlJob {
  const job: CrawlJob = {
    jobId,
    url,
    domain,
    status: 'pending',
    pagesFound: 0,
    pagesCrawled: 0,
    chunksIndexed: 0,
    startedAt: new Date().toISOString()
  };
  jobStore.set(jobId, job);
  return job;
}

export function updateJob(jobId: string, updates: Partial<CrawlJob>): CrawlJob | undefined {
  const job = jobStore.get(jobId);
  if (!job) return undefined;

  const updatedJob = { ...job, ...updates };
  if (updates.status === 'done' || updates.status === 'failed') {
    updatedJob.completedAt = new Date().toISOString();
  }
  jobStore.set(jobId, updatedJob);
  return updatedJob;
}
