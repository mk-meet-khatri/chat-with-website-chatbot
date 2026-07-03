import { z } from 'zod';

export const crawlRequestSchema = z.object({
  url: z.string({
    required_error: 'URL is required'
  }).url('Must be a valid URL (starting with http:// or https://)'),
  maxPages: z.number().int().min(1).max(200).optional(),
  maxDepth: z.number().int().min(0).max(10).optional()
});

export type CrawlRequest = z.infer<typeof crawlRequestSchema>;
