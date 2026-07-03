# WebMind — Chat with a Website (Crawl + RAG)

WebMind is a high-fidelity Web RAG application. Users submit a URL, which initiates an in-process, scoped, rate-limited crawl. The site's content is cleaned (boilerplate stripped), segmented into overlapping chunks, vectorized via Gemini embeddings (`gemini-embedding-001`), and indexed in Weaviate Cloud. Users can then chat with the website's content in a responsive, glassmorphism dashboard, receiving answers grounded in context with direct source hyperlinks.

---

## High-Level Architecture Overview

- **Frontend**: Single-Page App built on Next.js (App Router), React, and Lucide React icons. Styled using Vanilla CSS variables, custom animations, card borders, and glowing cues. Reverse proxies API requests under `/api` directly to the backend.
- **Backend**: Node.js + Express (written in TypeScript with modern ES Module resolution).
- **Crawler**: `PuppeteerCrawler` from Crawlee. Enforces `same-domain` link enqueueing, respects `robots.txt`, and runs in-process with a headless browser in non-persisted storage mode to allow client-side JavaScript execution and support parallel crawl jobs.
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
- **JavaScript Execution**: The crawler uses `PuppeteerCrawler` to launch headless Chromium and run page scripts. Since it fully executes JavaScript, modern SPA pages (e.g. React, Angular) are successfully rendered and indexed out of the box.
- **Relevance Gate**: The system uses a strict threshold (cosine similarity certainty >= 0.65). Questions unrelated to the crawled website (e.g. "Who is Napoleon?" on a site about book stores) are automatically filtered out before requesting Gemini to ensure grounded compliance and reduce API costs.
