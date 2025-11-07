# BookBug Agents Package Architecture

## Mission

This package delivers a local-first pipeline for generating illustrated children's storybooks using OpenAI's Agent SDK. It preserves the existing prompt research while organizing agents, schemas, and utils behind clean interfaces so the same codebase can later underpin an MCP server or web app.

## Flow Overview

1. **Chat Capture** – A conversational CLI session runs `ConciergeAgent`, captures the user's story requirements, and returns a validated `StoryBrief`.
2. **Story Drafting** – `AuthorAgent` transforms the brief into a structured multi-page story (`StoryDraft`) aligned with BookBug quality guidelines.
3. **Illustration Planning** – `ArtDirectorAgent` produces page-by-page illustration prompts (`IllustrationPlan`) that maintain visual consistency.
4. **Image Rendering** – `IllustratorAgent` calls a pluggable image provider (mock today, real API later) and returns `RenderedImage` metadata.
5. **Assembly & Persistence** – The `MainWorkflow` coordinates each handoff, stores artefacts, and returns a `CompleteBook` summary with file paths.

## Directory Structure

```
packages/agents/
├── ARCHITECTURE.md         # Source of truth for this package
├── package.json
├── tsconfig.json
└── src/
    ├── protocols/          # Zod schemas & shared types for agent handoffs
    ├── agents/             # OpenAI agents with co-located prompts & orchestration
    │   ├── concierge/      # Intake chat transport + prompts
    │   ├── author/         # Story drafting pipeline + quality prompt
    │   ├── artDirector/    # Illustration planning + style guidance
    │   └── illustrator/    # Rendering wrapper + provider prompt
    ├── interfaces/        # CLI/API/MCP adapters and chat plumbing
    ├── utils/             # Repository interfaces + local filesystem impls
    ├── workflows/          # Main workflow + CLI adapter (future interfaces live here)
    └── index.ts            # Public exports
```

## Agents & Contracts

| Agent               | Input Schema       | Output Schema        | Role |
|---------------------|--------------------|----------------------|------|
| `ConciergeAgent`    | –                  | `StoryBrief`        | Conversationally gathers requirements and confirms the title. |
| `AuthorAgent`       | `StoryBrief`      | `StoryDraft`         | Writes the complete narrative with structured pages. |
| `ArtDirectorAgent`  | `StoryDraft`       | `IllustrationPlan`   | Creates illustration prompts and style metadata per page. |
| `IllustratorAgent`  | `IllustrationPlan` | `RenderedImage`      | Generates or stubs images, capturing URLs and provenance. |

All protocols live in `src/protocols`. Every agent validates its output before returning so downstream consumers can rely on consistent shapes.

## Workflow Responsibilities

`src/workflows/mainWorkflow.ts` composes the package:

1. Run `runCliInterface` to engage the concierge.
2. Invoke author → art director → illustrator in sequence with schema validation.
3. Persist artefacts via the injected `ImageStore`.
4. Emit structured log events and return a `CompleteBook` summary.

`src/workflows/briefToBookWorkflow.ts` converts a provided `StoryBrief` directly into drafts/illustrations when you want to skip the concierge.

## Storage Strategy

`src/utils` currently exposes `ImageStore` implementations (filesystem today). Swapping to Postgres/blob storage later only requires replacing these implementations.

## Extensibility Path

- **MCP Server** – expose workflows as MCP tools; schemas already define request/response contracts.
- **Web App** – reuse `chatSession` over HTTP/WebSockets, replace stores with cloud-backed versions, add auth.
- **Observability** – structured logging today; add Langfuse/OTel tracing as the system scales.
- **TODO** – evaluate prompt snapshot testing for the co-located prompts once the OpenAI SDK migration stabilizes.

This architecture keeps today's CLI experience lightweight while enforcing modular seams for future automation and multi-channel delivery.
