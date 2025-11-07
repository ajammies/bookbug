# BookBug Agents – Narrative Studio

Welcome to the BookBug agent package. Think of this codebase as a tiny animation studio staffed entirely by specialist AI coworkers. Each teammate has a single job, they pass structured dossiers to each other, and the `MainWorkflow` keeps the handoffs smooth.

## Org Chart (Nodes & Relationships)

| Node | Role in the Studio | Relies On | Hands Off To |
| --- | --- | --- | --- |
| `ConciergeAgent` | Friendly receptionist who interviews the author and captures every requirement as a `StoryBrief`. | Human conversation | `AuthorAgent` |
| `AuthorAgent` | Resident novelist who turns the story brief into a validated `StoryDraft`. | `StoryBrief` | `ArtDirectorAgent` |
| `ArtDirectorAgent` | Art director translating each story page into illustration briefs, forming an `IllustrationPlan`. | `StoryDraft` | `IllustratorAgent` |
| `IllustratorAgent` | Production floor that renders actual images (metadata) and files them via the `ImageStore`. | `IllustrationPlan`, `ImageStore` | File system / downstream apps |
| `MainWorkflow` | Studio manager who routes work between the four agents and exposes a single `generate` method. | All nodes above | Calling app (CLI, API, etc.) |

## Data Contracts (What Moves Where)

- **`StoryBrief`** – Authored by the receptionist; consumed by the novelist. Contains theme, characters, age range, page count, plot beats, and creative liberty flag.
- **`StoryDraft`** – Written by the novelist; trusted by the art director. Includes the logline, enriched characters, per-page summaries, text, and rough image concepts.
- **`IllustrationPlan`** – Designed by the art director; executed by the production floor. Holds per-page prompts, stylistic presets, and a global style.
- **`RenderedImage`** – Produced by the production floor; archived by the `ImageStore`. Captures the prompt, URL/path, style, provider, and timestamp for each page.

Each protocol (schema) lives in `src/protocols/storyProtocols.ts` so the entire studio literally shares the same source of truth.

## How Work Flows

1. **Author chat** – `MainWorkflow` spins up a `ConciergeAgent` chat (via CLI or API). Once the agent replies with `[READY_TO_EXTRACT]`, we get a validated `StoryBrief`.
2. **Drafting** – The workflow hands the brief to `AuthorAgent`. If validation passes, we get a `StoryDraft` with perfectly numbered pages and image concepts.
3. **Planning** – `ArtDirectorAgent` visits every page, layering on detailed prompts and a consistent style to form the `IllustrationPlan`.
4. **Rendering** – `IllustratorAgent` iterates through the plan, calling the OpenAI image model, then saving each `RenderedImage` through the injected `ImageStore` (filesystem by default).
5. **Result** – `MainWorkflow.run()` returns `{ brief, draft, plan, renders }`, giving callers one tidy object no matter how many agents were involved.

## Running the Studio Locally

```bash
cd packages/agents
npm install
npm run dev   # launches src/interfaces/cli/cliInterface.ts via tsx watch (see package.json script)
```

During the CLI session you’ll chat with the receptionist directly in your terminal. After you confirm the title, the rest of the studio runs automatically and drops rendered metadata under `data/renders/<story-slug>/`.

## Customizing the Crew

- Swap models: pass custom `OPENAI_MODELS` entries into each agent’s constructor.
- Replace utils: implement the `ImageStore` interface (e.g., S3, database) and inject it into `MainWorkflow`.
- Provide your own brief: instantiate `BriefToBookWorkflow` with a validated `StoryBrief` to skip the concierge entirely.

Because every agent is a tiny class with a single verb (`createChat`, `draft`, `plan`, `render`), you can test or replace them independently without touching the others. The studio stays understandable, friendly, and easy to reconfigure.
