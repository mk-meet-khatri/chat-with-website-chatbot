# WebMind — Chat with a Website (Crawl + RAG)

WebMind is a high-fidelity Web RAG application. Users submit a URL, which initiates an in-process, scoped, rate-limited crawl. The site's content is cleaned (boilerplate stripped), segmented into overlapping chunks, vectorized via Gemini embeddings (`gemini-embedding-001`), and indexed in Weaviate Cloud. Users can then chat with the website's content in a responsive, glassmorphism dashboard, receiving answers grounded in context with direct source hyperlinks.

### 🔗 Live Deployment
* **Frontend (Vercel)**: https://chat-with-website-chatbot-frontend.vercel.app/
* **Backend (Render)**: https://chat-with-website-chatbot.onrender.com/

---

## High-Level Architecture Overview

- **Frontend**: Single-Page App built on Next.js (App Router), React, and Lucide React icons. Styled using Vanilla CSS variables, custom animations, card borders, and glowing cues. Reverse proxies API requests under `/api` directly to the backend.
- **Backend**: Node.js + Express (written in TypeScript with modern ES Module resolution).
- **Crawler**: `CheerioCrawler` from Crawlee. Enforces `same-domain` link enqueueing, respects `robots.txt`, and runs in-process to minimize memory foot-print and ensure compatibility with resource-constrained environments like Render Free Tier.
- **Content Cleaning**: Primary stripping of boilerplate selectors (navigation, headers, footers, scripts) via Cheerio. If the extracted text is sparse, it falls back to `@mozilla/readability` + `jsdom`.
- **Chunking**: Custom Recursive Character Splitter (~800 tokens / 3200 characters chunk size, ~100 tokens / 400 characters overlap). Chunks under 50 characters are filtered out.
- **Embeddings**: Gemini `gemini-embedding-001` (called in batches of 20 elements).
- **Vector DB**: Managed Weaviate Cloud sandbox (WCS). Uses the `selfProvided` vectorizer configuration (Bring Your Own Vectors).
- **LLM Grounding**: Gemini 2.5 Flash model with low temperature (0.1) and a strict system instruction to prevent hallucination. Citations are verified server-side.
- **Validation**: Request body parameters are strictly verified at route level using Zod schemas.

---

## Setup & Prerequisites

### 1. External APIs Setup
1. **Google Gemini API**: Retrieve an API key from [Google AI Studio](https://aistudio.google.com/).
2. **Weaviate Cloud (WCS)**: Create a free cluster sandbox in [Weaviate Cloud Console](https://console.weaviate.cloud/). Retrieve your REST Endpoint URL (e.g. `https://your-cluster-name.weaviate.network`) and Admin API Key.

### 2. Environment Configuration
Copy `backend/.env.example` to `backend/.env` (which has already been generated for you) and insert your credentials:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
WEAVIATE_URL=https://your-cluster-name.weaviate.network
WEAVIATE_API_KEY=your_weaviate_api_key_here
```

---

## How to Run

Install all dependencies from the root monorepo folder:
```bash
npm install
```

### Run Locally (Dev Mode)
To run both services in parallel, open two terminal tabs:

**Terminal 1 (Backend Server)**:
```bash
npm run dev:backend
# Starts backend server on http://localhost:4000
```

**Terminal 2 (Frontend Dev)**:
```bash
npm run dev:frontend
# Starts Next.js application on http://localhost:5173
```

Navigate to `http://localhost:5173` in your browser.

---

## Suggested Websites for Testing

Here are 4 excellent sites you can crawl and use to chat:

#### 1. Books to Scrape (Mock Book Store)
* **Crawl URL:** `http://books.toscrape.com/`
* **Test Questions:**
  1. *"What is the price of A Light in the Attic?"*
  2. *"Is there a book called Tipping the Velvet?"*
  3. *"How much does the book Soumission cost?"*
  4. *"What is the price of Sharp Objects?"*

#### 2. Quotes to Scrape (Mock Quotes Site)
* **Crawl URL:** `http://quotes.toscrape.com/`
* **Test Questions:**
  1. *"Give me a quote by Albert Einstein."*
  2. *"Who said 'It is our choices, Harry, that show what we truly are, far more than our abilities'?"*
  3. *"Find a quote by Steve Martin about being a good person."*

#### 3. Simple English Wikipedia: Goldfish Page
* **Crawl URL:** `https://simple.wikipedia.org/wiki/Goldfish`
* **Test Questions:**
  1. *"What is the scientific name of the goldfish?"*
  2. *"In what country did the selective breeding of goldfish begin?"*
  3. *"How long can a goldfish grow to be?"*

#### 4. Scrape This Site (Simple Countries list)
* **Crawl URL:** `https://www.scrapethissite.com/pages/simple/`
* **Test Questions:**
  1. *"What is the capital of Andorra?"*
  2. *"What is the population and area of Andorra?"*
  3. *"Find the capital and currency of Afghanistan."*

---

## Evaluation Script

An automated evaluation script is provided under the `eval/` folder to measure search precision hit-rate metrics. It uses a static list of 5 test queries targeting `http://books.toscrape.com/`.

To run the evaluation:
1. Crawl `http://books.toscrape.com/` using the Web UI.
2. Copy the resulting `jobId` once completed.
3. Execute the evaluation script passing the `jobId` as an argument:
   ```bash
   npx tsx eval/run-eval.ts <jobId>
   ```

---

## Architecture Design Notes & Known Limitations

- **In-Memory Store & Cache**: Crawl job status and domain-to-job mappings are kept in-process via Node `Map` stores. If the server restarts, this state is cleared, which matches the v1 project scope. For a production pipeline, this should be moved to Redis or Weaviate metadata.
- **JavaScript Execution**: The crawler uses `CheerioCrawler` to minimize backend performance footprints and memory usage. Since it does not execute client-side JavaScript, websites that rely entirely on SPA frameworks (like heavy React/Angular apps without server-side rendering) may result in sparse text extraction. If client-side JavaScript execution is required, upgrading to `PuppeteerCrawler` or `PlaywrightCrawler` is recommended (which requires higher memory limits, i.e., > 512MB RAM).
- **Relevance Gate**: The system uses a strict threshold (cosine similarity certainty >= 0.65). Questions unrelated to the crawled website (e.g. "Who is Napoleon?" on a site about book stores) are automatically filtered out before requesting Gemini to ensure grounded compliance and reduce API costs.
