import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { RetrievedChunk } from './retrieval.service.js';

export interface ChatAnswer {
  answer: string;
  sources: { url: string; title: string }[];
}

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not defined in backend/.env');
    }
    aiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return aiClient;
}

/**
 * Generate a grounded answer using Gemini 2.5 Flash based strictly on retrieved chunks.
 */
export async function generateGroundedAnswer(
  question: string,
  chunks: RetrievedChunk[]
): Promise<ChatAnswer> {
  const client = getAIClient();

  // 1. Format the retrieved chunks as context
  const contextString = chunks
    .map((chunk, idx) => `[Source ${idx}] (Title: "${chunk.pageTitle}", URL: ${chunk.sourceUrl})\nContent: ${chunk.text}`)
    .join('\n\n---\n\n');

  const systemInstruction = `You are a professional grounding AI assistant.
Your task is to answer the user's question based ONLY on the CONTEXT provided below.

Rules:
1. Every claim you make must be directly traceable to a chunk in the CONTEXT.
2. Cite the sources you use by writing their index at the end of the sentence/claim, e.g. "Vite is a modern build tool [Source 0]." or "It supports ES modules [Source 1][Source 2]."
3. Do NOT cite sources that you did not use.
4. If the CONTEXT does not contain the answer, say exactly: "I couldn't find anything on this site about that." Do not use outside knowledge.
5. Maintain a concise, factual, and helpful tone.`;

  const userPrompt = `CONTEXT:\n${contextString}\n\nUSER QUESTION: ${question}`;

  logger.info('Calling Gemini 2.5 Flash to generate grounded response...');
  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.1 // Keep temperature low to prevent hallucination
      }
    });

    const answer = response.text || '';
    const trimmedAnswer = answer.trim();

    // Check if the LLM output explicitly fell back to the "not covered" response
    if (trimmedAnswer.toLowerCase().includes("couldn't find anything on this site")) {
      return {
        answer: "I couldn't find anything on this site about that.",
        sources: []
      };
    }

    // 2. Parse citations from the answer string server-side (e.g. "[Source 0]" or "[Source 1]")
    const citedUrls = new Set<string>();
    const sources: { url: string; title: string }[] = [];

    const citationRegex = /\[Source (\d+)\]/g;
    let match;
    while ((match = citationRegex.exec(answer)) !== null) {
      const index = parseInt(match[1], 10);
      if (index >= 0 && index < chunks.length) {
        const chunk = chunks[index];
        if (!citedUrls.has(chunk.sourceUrl)) {
          citedUrls.add(chunk.sourceUrl);
          sources.push({
            url: chunk.sourceUrl,
            title: chunk.pageTitle
          });
        }
      }
    }

    return {
      answer: trimmedAnswer,
      sources
    };
  } catch (error) {
    logger.error('Error generating grounded answer:', error);
    throw error;
  }
}

/**
 * Generate a grounded answer stream using Gemini 2.5 Flash based strictly on retrieved chunks.
 */
export async function generateGroundedAnswerStream(
  question: string,
  chunks: RetrievedChunk[],
  onChunk: (text: string) => void
): Promise<ChatAnswer> {
  const client = getAIClient();

  // 1. Format the retrieved chunks as context
  const contextString = chunks
    .map((chunk, idx) => `[Source ${idx}] (Title: "${chunk.pageTitle}", URL: ${chunk.sourceUrl})\nContent: ${chunk.text}`)
    .join('\n\n---\n\n');

  const systemInstruction = `You are a professional grounding AI assistant.
Your task is to answer the user's question based ONLY on the CONTEXT provided below.

Rules:
1. Every claim you make must be directly traceable to a chunk in the CONTEXT.
2. Cite the sources you use by writing their index at the end of the sentence/claim, e.g. "Vite is a modern build tool [Source 0]." or "It supports ES modules [Source 1][Source 2]."
3. Do NOT cite sources that you did not use.
4. If the CONTEXT does not contain the answer, say exactly: "I couldn't find anything on this site about that." Do not use outside knowledge.
5. Maintain a concise, factual, and helpful tone.`;

  const userPrompt = `CONTEXT:\n${contextString}\n\nUSER QUESTION: ${question}`;

  logger.info('Calling Gemini 2.5 Flash to generate grounded response stream...');
  try {
    const responseStream = await client.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.1 // Keep temperature low to prevent hallucination
      }
    });

    let fullText = '';
    for await (const chunk of responseStream) {
      const chunkText = chunk.text || '';
      fullText += chunkText;
      onChunk(chunkText);
    }

    const trimmedAnswer = fullText.trim();

    // Check if the LLM output explicitly fell back to the "not covered" response
    if (trimmedAnswer.toLowerCase().includes("couldn't find anything on this site")) {
      return {
        answer: "I couldn't find anything on this site about that.",
        sources: []
      };
    }

    // 2. Parse citations from the answer string server-side (e.g. "[Source 0]" or "[Source 1]")
    const citedUrls = new Set<string>();
    const sources: { url: string; title: string }[] = [];

    const citationRegex = /\[Source (\d+)\]/g;
    let match;
    while ((match = citationRegex.exec(fullText)) !== null) {
      const index = parseInt(match[1], 10);
      if (index >= 0 && index < chunks.length) {
        const chunk = chunks[index];
        if (!citedUrls.has(chunk.sourceUrl)) {
          citedUrls.add(chunk.sourceUrl);
          sources.push({
            url: chunk.sourceUrl,
            title: chunk.pageTitle
          });
        }
      }
    }

    return {
      answer: trimmedAnswer,
      sources
    };
  } catch (error) {
    logger.error('Error generating grounded answer stream:', error);
    throw error;
  }
}
