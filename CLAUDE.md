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
  1. Create a new branch from main
  2. Implement the changes with atomic commits
  3. Run `npm run test:run` to verify all tests pass
  4. Create a PR when finished using `gh pr create`
  5. Share the PR link with the user for review before merging

# Branch naming
- `feat/` - New features (e.g., `feat/output-folders`)
- `fix/` - Bug fixes (e.g., `fix/empty-string-validation`)
- `refactor/` - Code refactoring without behavior change
- `docs/` - Documentation updates
- `chore/` - Maintenance tasks (deps, configs, etc.)

# Code style
- Follow functional principles: pure functions, immutability, no side effects
- Use standalone exported functions (modern TypeScript idiom, better tree-shaking)
- Organize related functions by file/module, not by class
- Data flows through function parameters, not global state
- Avoid unnecessary helper functions - prefer direct property access on data structures

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