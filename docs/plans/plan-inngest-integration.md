# Inngest Integration Plan for Bookbug at Scale

## Overview

This plan outlines integrating Inngest as the orchestration backbone for bookbug, enabling thousands of concurrent users with durable, fault-tolerant book generation.

**User Requirements:**
- Timeline: Months away (incremental build)
- Infrastructure: Managed services (Inngest Cloud, Vercel, Neon)
- CLI: Becomes thin API client
- Web: Full chat UI with conversational intake

---

## Target Architecture

```
                            BOOKBUG PLATFORM ARCHITECTURE
                            ============================

    ┌─────────────────────────────────────────────────────────────────────────┐
    │                              CLIENTS                                     │
    │  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐   │
    │  │  Web App     │    │    CLI       │    │  Third-party APIs        │   │
    │  │  (Next.js)   │    │  (thin)      │    │  (webhooks)              │   │
    │  └──────┬───────┘    └──────┬───────┘    └───────────┬──────────────┘   │
    └─────────┼────────────────────┼───────────────────────┼──────────────────┘
              │ SSE/REST           │ REST                  │ REST
              ▼                    ▼                       ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                    WEB API (Next.js API Routes on Vercel)               │
    │                                                                          │
    │  /api/books/*      /api/chat/*       /api/jobs/*     /api/inngest       │
    │  - POST create     - POST message    - GET status    - Inngest serve()  │
    │  - GET list        - GET history     - GET stream    - Function calls   │
    │  - GET :id         - POST approve    - POST cancel                      │
    └────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                    INNGEST CLOUD (Orchestration)                        │
    │                                                                          │
    │  Events:                        Functions:                               │
    │  - book/create.started    ───▶  createBookWorkflow                      │
    │  - chat/message.sent      ───▶    ├─ step: interpret-message            │
    │  - chat/approved          ───▶    ├─ step.waitForEvent: approval        │
    │  - plot/approved          ───▶    ├─ step: generate-plot                │
    │  - page/render.complete   ───▶    └─ step.invoke: generatePages         │
    │                                                                          │
    │  Features:                                                               │
    │  - Automatic retries with exponential backoff                           │
    │  - Step memoization (no re-work on resume)                              │
    │  - Per-user concurrency limits                                          │
    │  - Rate limiting for external APIs                                      │
    └────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                           DATA LAYER                                     │
    │                                                                          │
    │  ┌────────────────────────┐    ┌────────────────────────────────────┐   │
    │  │   PostgreSQL (Neon)    │    │    Object Storage (R2/S3)          │   │
    │  │                        │    │                                    │   │
    │  │  - users               │    │  - /books/{id}/page-1.png          │   │
    │  │  - books (JSONB)       │    │  - /books/{id}/page-2.png          │   │
    │  │  - book_jobs           │    │  - /books/{id}/book.pdf            │   │
    │  │  - chat_messages       │    │                                    │   │
    │  │  - rendered_pages      │    │                                    │   │
    │  └────────────────────────┘    └────────────────────────────────────┘   │
    └─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                        EXTERNAL SERVICES                                 │
    │  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐   │
    │  │  Anthropic   │    │  Replicate   │    │  Auth (Clerk)            │   │
    │  │  (Claude)    │    │  (Imagen 3)  │    │                          │   │
    │  └──────────────┘    └──────────────┘    └──────────────────────────┘   │
    └─────────────────────────────────────────────────────────────────────────┘
```

---

## Phased Implementation

### Phase 1: Resilient Core (Foundation)
**Goal:** Add retry/rate-limiting before infrastructure complexity

**Deliverables:**
1. Retry wrapper for API calls (`src/core/utils/retry.ts`)
   - Exponential backoff
   - Rate limit detection (429 → read retry-after header)
   - Configurable per-service limits

2. Enhanced error categorization
   - Retryable: rate limits, timeouts, 5xx
   - Fatal: auth errors, invalid schema, 4xx (except 429)

**Files to create/modify:**
- `src/core/utils/retry.ts` (NEW)
- `src/core/services/image-generation.ts` - wrap Replicate calls
- `src/core/agents/*.ts` - wrap generateObject calls

---

### Phase 2: Server Foundation
**Goal:** Create API server with Inngest integration

**Deliverables:**
1. Next.js API routes on Vercel
2. Inngest client and serve endpoint
3. Database schema with Drizzle ORM

**Database Schema:**
```sql
-- Core tables
CREATE TABLE users (
  id UUID PRIMARY KEY,
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE books (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT,
  status VARCHAR(50) DEFAULT 'draft',  -- draft, intake, plot, generating, complete, failed
  brief JSONB,
  plot JSONB,
  prose JSONB,
  visuals JSONB,
  page_count INTEGER,
  format VARCHAR(50) DEFAULT 'square-large',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE book_jobs (
  id UUID PRIMARY KEY,
  book_id UUID REFERENCES books(id),
  inngest_run_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  current_stage VARCHAR(50),
  current_page INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  book_id UUID REFERENCES books(id),
  role VARCHAR(20) NOT NULL,  -- user, assistant
  content TEXT NOT NULL,
  chips JSONB,  -- suggested quick replies
  phase VARCHAR(50),  -- story_intake, plot_review
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rendered_pages (
  id UUID PRIMARY KEY,
  book_id UUID REFERENCES books(id),
  page_number INTEGER NOT NULL,
  storage_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, page_number)
);
```

**Project Structure:**
```
src/
  core/           # Existing - agents, schemas, services (unchanged)
  server/         # NEW - server-specific code
    api/
      books.ts
      chat.ts
      jobs.ts
    inngest/
      client.ts
      functions/
        create-book.ts
        generate-page.ts
    db/
      schema.ts
      index.ts
  cli/            # Existing - will become thin client later
```

---

### Phase 3: Conversational Intake via Inngest
**Goal:** Full chat UI with durable conversation flow

**How it works:**
1. User sends message via `POST /api/chat/:bookId/message`
2. API fires `inngest.send('chat/message.sent', { bookId, content })`
3. Inngest workflow uses `step.waitForEvent` to pause until message arrives
4. Workflow processes message, generates response, saves to DB
5. Client receives response via SSE stream

**Key Inngest Pattern:**
```typescript
// Conversational intake with waitForEvent
export const createBookWorkflow = inngest.createFunction(
  { id: 'create-book', throttle: { limit: 3, period: '1m', key: 'event.data.userId' } },
  { event: 'book/create.started' },
  async ({ event, step }) => {
    const { bookId, userId } = event.data;
    let currentBrief: Partial<StoryBrief> = {};

    // Conversation loop
    while (true) {
      // Generate next question
      const response = await step.run('generate-question', () =>
        conversationAgent(currentBrief, chatHistory)
      );

      if (response.isComplete) break;

      // Save assistant message
      await step.run('save-response', () =>
        db.chatMessages.create({ bookId, role: 'assistant', content: response.question })
      );

      // Wait for user (up to 24h)
      const userMessage = await step.waitForEvent('wait-for-user', {
        event: 'chat/message.sent',
        timeout: '24h',
        if: `async.data.bookId == "${bookId}"`,
      });

      // Interpret and update brief
      currentBrief = await step.run('interpret', () =>
        interpreterAgent(userMessage.data.content, currentBrief)
      );
    }

    // Continue to plot generation...
  }
);
```

---

### Phase 4: Page Generation Pipeline
**Goal:** Durable per-page generation with progress tracking

**Inngest Function Structure:**
```typescript
export const generateBookPages = inngest.createFunction(
  { id: 'generate-pages', concurrency: { key: 'event.data.bookId', limit: 2 } },
  { event: 'book/pages.generate' },
  async ({ event, step }) => {
    const { bookId, storyWithPlot, styleGuide, proseSetup } = event.data;

    for (let pageNum = 1; pageNum <= storyWithPlot.pageCount; pageNum++) {
      // Each page is a durable step
      await step.run(`page-${pageNum}`, async () => {
        // 1. Generate prose
        const prosePage = await prosePageAgent({...});

        // 2. Generate visuals
        const illustratedPage = await pageVisualsAgent({...});

        // 3. Render image (with built-in retry)
        const image = await generatePageImage({...});

        // 4. Upload to R2
        const url = await uploadToStorage(bookId, pageNum, image);

        // 5. Save to DB
        await db.renderedPages.create({ bookId, pageNumber: pageNum, storageUrl: url });

        return { pageNum, url };
      });
    }
  }
);
```

---

### Phase 5: CLI as Thin Client
**Goal:** Refactor CLI to use API

**CLI Architecture:**
```typescript
// src/cli/api-client.ts
export class BookbugApiClient {
  constructor(private baseUrl: string, private authToken: string) {}

  async createBook(): Promise<{ bookId: string }> {
    return this.post('/api/books', {});
  }

  async sendMessage(bookId: string, content: string): Promise<void> {
    return this.post(`/api/chat/${bookId}/message`, { content });
  }

  connectJobStream(bookId: string): EventSource {
    return new EventSource(`${this.baseUrl}/api/jobs/${bookId}/stream`);
  }
}

// src/cli/commands/create.ts
export const createCommand = new Command('create')
  .action(async () => {
    const api = new BookbugApiClient(API_URL, await getAuthToken());
    const { bookId } = await api.createBook();

    const stream = api.connectJobStream(bookId);

    stream.on('chat', async (data) => {
      const answer = await select({ message: data.question, choices: data.chips });
      await api.sendMessage(bookId, answer);
    });

    stream.on('progress', (data) => updateSpinner(data.stage, data.percent));
    stream.on('complete', () => console.log(`Done! View at ${WEB_URL}/books/${bookId}`));
  });
```

---

### Phase 6: Web UI
**Goal:** Browser-based book creation

**Pages:**
- `/` - Landing page
- `/create` - New book wizard with chat UI
- `/books` - User's book library
- `/books/[id]` - Book detail with progress/preview
- `/books/[id]/download` - PDF download

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/books` | Create new book, start workflow |
| GET | `/api/books` | List user's books |
| GET | `/api/books/:id` | Get book details |
| DELETE | `/api/books/:id` | Delete book |
| POST | `/api/chat/:bookId/message` | Send chat message |
| GET | `/api/chat/:bookId/history` | Get conversation history |
| POST | `/api/chat/:bookId/approve` | Approve current phase |
| GET | `/api/jobs/:bookId` | Get job status |
| GET | `/api/jobs/:bookId/stream` | SSE progress stream |
| POST | `/api/inngest` | Inngest serve endpoint |

---

## Infrastructure (Managed Services)

| Service | Provider | Purpose | Est. Cost |
|---------|----------|---------|-----------|
| API/Web | Vercel | Hosting | $20/mo |
| Orchestration | Inngest Cloud | Durable workflows | $50/mo |
| Database | Neon | PostgreSQL | $25/mo |
| Storage | Cloudflare R2 | Images | $10/mo |
| Auth | Clerk | User management | $25/mo |
| **Total** | | | ~$130/mo + API costs |

---

## Use Cases Enabled

1. **Concurrent Users**: Inngest queues and rate-limits across all users
2. **Fault Tolerance**: If server crashes mid-generation, Inngest resumes automatically
3. **Progress Tracking**: Real-time updates via SSE to any client
4. **Conversation Persistence**: Users can close browser, return later, conversation continues
5. **Multi-Client**: Same API serves web, CLI, and third-party integrations
6. **Observability**: Inngest dashboard shows all jobs, retries, failures

---

## Key Files to Modify/Create

**Existing files to modify:**
- `src/core/services/image-generation.ts` - Add retry wrapper
- `src/core/agents/*.ts` - Add retry wrapper to generateObject calls

**New files to create:**
```
src/
  server/
    api/
      books.ts
      chat.ts
      jobs.ts
    inngest/
      client.ts
      functions/
        create-book.ts
        generate-page.ts
        index.ts
    db/
      schema.ts
      migrations/
      index.ts
  cli/
    api-client.ts
```

---

## Sequencing

```
Phase 1: Resilient Core        ──▶ Can ship: More reliable CLI
    │
    ▼
Phase 2: Server Foundation     ──▶ Can ship: API for programmatic access
    │
    ▼
Phase 3: Conversational Intake ──▶ Can ship: Web intake prototype
    │
    ▼
Phase 4: Page Generation       ──▶ Can ship: Full server-based generation
    │
    ▼
Phase 5: CLI as Thin Client    ──▶ Can ship: CLI uses API
    │
    ▼
Phase 6: Web UI                ──▶ Can ship: Public platform
```

Each phase is independently deployable and testable.
