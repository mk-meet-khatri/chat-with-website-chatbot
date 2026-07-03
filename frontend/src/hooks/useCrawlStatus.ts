"use client";

import { useState, useEffect } from 'react';
import { fetchCrawlStatus, CrawlJobStatus } from '../api/client';

/**
 * React hook that polls the crawl status endpoint every 1.5 seconds until completion or failure.
 */
export function useCrawlStatus(jobId: string | null) {
  const [jobStatus, setJobStatus] = useState<CrawlJobStatus | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJobStatus(null);
      setPollError(null);
      return;
    }

    let timer: number | undefined;

    const fetchProgress = async () => {
      try {
        const data = await fetchCrawlStatus(jobId);
        setJobStatus(data);
        setPollError(null);

        // Stop polling on terminal states
        if (data.status === 'done' || data.status === 'failed') {
          if (timer) window.clearInterval(timer);
        }
      } catch (error: any) {
        setPollError(error.message || 'Failed to poll crawler status.');
        if (timer) window.clearInterval(timer);
      }
    };

    // Execute immediately on startup
    fetchProgress();

    // Set polling interval
    timer = window.setInterval(fetchProgress, 1500);

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [jobId]);

  return { jobStatus, pollError };
}
