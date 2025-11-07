# Repository Guidelines

## Directory Overview
- `/README.md` – high-level pitch for BookBug.
- `/packages` – monorepo container (currently just `agents/`).
- `/packages/agents` – primary TypeScript workspace.
  - `package.json` – scripts (`build`, `dev`, `lint`, `format`, `typecheck`) plus deps.
  - `ARCHITECTURE.md`, `FEEDBACK.md`, `README.md` – narrative docs and retros.
  - `tsconfig.json` – shared ESM + strict TS compiler config.
  - `dist/` – TypeScript output; regenerate via `npm run build`.
  - `logs/` – CLI transcripts and debugging notes; delete as needed.
  - `src/` – authoring source tree:
    - `index.ts` – single export surface consumed by downstream apps.
    - `agents/` – role classes (`conciergeAgent.ts`, `artDirectorAgent.ts`, etc.) plus `agentSecrets.ts` for retrieving optional API keys.
    - `agents/providers/` – the `AgentProvider` base class plus `OpenAIAgentProvider` and `ClaudeAgentProvider`, each in their own file; agents instantiate these directly.
    - `workflows/` – orchestration (`mainWorkflow.ts`, `briefToBookWorkflow.ts`).
    - `interfaces/cli/` – terminal UI glue (`cliInterface.ts`, `chatCli.ts`).
    - `protocols/` – Zod schemas for `StoryBrief`, `StoryDraft`, etc.
    - `utils/` – shared helpers like `imageStore.ts` implementations.

## Build, Test, and Development Commands
Run from `packages/agents`.
- `npm install` – pull Agent SDK and local deps.
- `npm run dev` – watch `src/interfaces/cli/cliInterface.ts` with `tsx` for interactive flows.
- `npm run build` – emit production ESM to `dist/`.
- `npm run typecheck` – `tsc --noEmit` guardrail for schema drift.
- `npm run lint` / `npm run format` – enforce ESLint + Prettier prior to PRs.

## Coding Style & Naming Conventions
Use 2-space indentation, ESM imports, and strict TS. Classes stay PascalCase, functions/locals camelCase, constants SCREAMING_SNAKE_CASE, and exported types end with domain cues (`StoryDraft`, `MainWorkflowOptions`). Name files after their verb (`illustratorAgent.ts`, `imageStore.ts`) and keep utilities close to usage. Surface all public APIs through `src/index.ts`. Prettier and ESLint are the arbiters—run them before committing.

## Commit & Pull Request Guidelines
Write short imperative commits (“Add art director prompts”) that cover one change. Reference issue IDs when available. Every PR needs a summary, the commands you ran (`npm run dev`, `npm run lint`, etc.), screenshots or sample story output for UX-facing tweaks, and a note about new env vars or config switches. Call out directory or schema additions so reviewers can map them to the overview above.

## Security & Configuration Tips
`OPENAI_API_KEY` and `ANTHROPIC_API_KEY` stay optional until runtime; `src/agents/agentSecrets.ts` exposes helpers the adapters call right before hitting each API. Set whichever key you need in your shell, never commit secrets, and document any provider/model changes when you edit an agent constructor.
