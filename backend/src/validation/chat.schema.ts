import { z } from 'zod';

export const chatRequestSchema = z.object({
  jobId: z.string({
    required_error: 'jobId is required'
  }).min(1, 'jobId cannot be empty'),
  question: z.string({
    required_error: 'Question is required'
  }).min(1, 'Question cannot be empty')
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
