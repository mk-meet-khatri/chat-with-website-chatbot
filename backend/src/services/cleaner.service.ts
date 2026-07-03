import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';

export interface CleanedPage {
  title: string;
  cleanText: string;
}

/**
 * Clean raw HTML content by removing boilerplate text or using Readability fallback.
 */
export function cleanHtml(rawHtml: string): CleanedPage {
  const $ = cheerio.load(rawHtml);

  // Extract title
  const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';

  // Primary pass: remove common boilerplate elements
  const boilerplateSelectors = [
    'nav', 'footer', 'header', 'script', 'style', 'iframe', 'noscript',
    '[role="banner"]', '[role="navigation"]', '[role="contentinfo"]',
    '.cookie-banner', '.cookie-consent', '.nav', '.footer', '.header',
    '.sidebar', '.menu', '#menu', '.ad', '.ads', '.advertisement', '.social-share'
  ];

  boilerplateSelectors.forEach(selector => {
    $(selector).remove();
  });

  // Extract clean text from body
  const bodyText = $('body').text();
  const primaryText = bodyText.replace(/\s+/g, ' ').trim();

  // If text is too short, we fall back to Mozilla Readability for better content extraction
  if (primaryText.length < 200) {
    logger.debug(`Cleaned text too short (${primaryText.length} chars). Falling back to Readability...`);
    try {
      // JSDOM needs the full HTML
      const dom = new JSDOM(rawHtml);
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (article && article.textContent && article.textContent.trim().length > 0) {
        return {
          title: article.title || title,
          cleanText: article.textContent.replace(/\s+/g, ' ').trim()
        };
      }
    } catch (error) {
      logger.error('Failed to parse HTML using readability fallback:', error);
    }
  }

  return {
    title,
    cleanText: primaryText
  };
}
