# Editing CLAUDE.md
- One concept = one line (be concise, represent entire concept in a single line)
- Never remove lines without explicit instruction
- Add new lines, don't rewrite existing ones

# MCP instructions
Always use context7 when I need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tools to resolve library id and get library docs without me having to explicitly ask.

# Bash commands
- npm run dev: Run CLI in development mode
- npm run build: Compile TypeScript
- npm run typecheck: Type check without emitting
- npm run start: Run compiled CLI
- npm test: Run tests in watch mode (auto-rerun on changes)
- npm run test:run: Run all tests once
- npm run test:coverage: Generate coverage report

# Workflow
- Make changes extremely small, contained, and atomic
- Tackle one thing at a time
- Prefer editing existing files over creating new ones
- For any new feature or change request:
  1. **Create a plan first** - Write a plan to `/plans/plan-<feature-name>.md` and wait for user approval before implementing
  2. Create a new branch from main
  3. Implement the changes with atomic commits
  4. Run `npm run test:run` to verify all tests pass
  5. Create a PR when finished using `gh pr create`
  6. Share the PR link with the user for review before merging

# Planning
- Before implementing any feature, create a plan document in `/plans/`
- Use `EnterPlanMode` tool to explore the codebase and design the approach
- Write the plan to `/plans/plan-<feature-name>.md`
- **WAIT for explicit user approval** before starting implementation
- Plans should include: goals, approach, files to change, and test strategy

# Branch naming
- `feat/` - New features (e.g., `feat/output-folders`)
- `fix/` - Bug fixes (e.g., `fix/empty-string-validation`)
- `refactor/` - Code refactoring without behavior change
- `docs/` - Documentation updates
- `chore/` - Maintenance tasks (deps, configs, etc.)

# Programming philosophy (Carmack-inspired)
- **Make it as simple as possible, but not simpler** - Complexity is the enemy. Cut until it hurts, then stop.
- **Write code that is easy to delete** - Loose coupling, no tentacles. If removing a feature requires surgery across 10 files, you've failed.
- **Keep functions small enough to fit in your head** - If you can't hold the entire function's state in your mind, break it down.
- **Don't abstract until you see the pattern three times** - Premature abstraction is worse than duplication. Wait for the pattern to emerge.
- **Prefer explicit over implicit** - Magic is the enemy of debugging. Make data flow and dependencies obvious.

# Code style
- Follow functional principles: pure functions, immutability, no side effects
- Use standalone exported functions (modern TypeScript idiom, better tree-shaking)
- Organize related functions by file/module, not by class
- Data flows through function parameters, not global state
- Avoid unnecessary helper functions - prefer direct property access on data structures
- **Intuitive file organization** - If you have to explain where something lives, it's in the wrong place. `formats.ts` for formats, not buried in `schemas/index.ts`.

## Functional patterns
- Prefer functional chaining (map, filter, reduce, flatMap) over imperative loops
- Avoid nested loops - use flatMap to flatten nested iterations
- Use direct array indexing when index is known (e.g., `arr[i - 1]`) instead of `.find()`
- Extract complex conditionals into small helper functions for readability

## Function signatures
- Use direct arguments instead of options objects when there are 2-3 required parameters
- Options objects are appropriate for optional configuration or 4+ parameters
- Return explicitly typed values - use Zod schemas for complex types

## Single responsibility
- One function, one job. `renderPage()` renders one page, not `renderAllPages()`.
- Batch operations belong in the caller, not the callee. This gives control back to the user of the function.
- If a function name has "and" in it, split it.

## Dependency injection
- External services (APIs, databases) should be injectable via optional parameters
- Factory functions for client creation: `createReplicateClient()` not global `replicateClient`
- Default parameter provides production behavior, tests inject mocks
- No test-only exports (`_resetClient`, `_setClient`) - if you need these, your design is wrong

## Types and schemas
- Create explicit types for data structures that flow between functions
- Add Zod schemas for external API responses that have variable formats
- Extract complex type manipulation into separate helper functions when it aids clarity

# Agent design
- Never hardcode what an LLM can decide - use `generateObject` for intent detection, not `if (text.includes(...))`
- One agent, one job - `detectApproval()` returns `{ isApproval: boolean }`, nothing else
- Schema-first design - define Zod output schema before writing the prompt, schema IS the contract
- System prompt = role/rules, user prompt = input to process, let schema constrain outputs

# Testing
Tests are co-located with source files (`file.ts` → `file.test.ts`).

## Test-driven development
- For new features: write tests first, then implementation
- Confirm tests fail before implementing the solution
- This ensures tests validate behavior, not just that code runs

## When editing code
- Update or add tests for any code you change
- If you modify a function, update its corresponding test file
- Never leave tests stale - they must reflect current behavior
- Run tests after each significant change to catch regressions early

## Coverage requirements
- All new code must have test coverage
- All changed code must have updated tests
- Target meaningful assertions over high percentages
- Test behavior and contracts, not implementation details

## Before creating a PR
- Run `npm run test:run` to verify all tests pass
- Run `npm run typecheck` to verify no type errors
- Include test changes in the same commit as implementation
- If tests fail, fix them before committing

## PR review checklist
Before merging, review against these CLAUDE.md principles:
- [ ] No global mutable state - data flows through parameters
- [ ] Functions are single-responsibility and small enough to fit in your head
- [ ] External services use dependency injection (factory + optional parameter)
- [ ] Full test coverage for new/changed code
- [ ] File organization is intuitive - no hunting for where things live
- [ ] No premature abstractions - concrete code unless pattern appears 3+ times
- [ ] Code is easy to delete - loosely coupled, no tentacles across files
