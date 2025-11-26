# MCP instructions
Always use context7 when I need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tools to resolve library id and get library docs without me having to explicitly ask.

# Bash commands
- npm run dev: Run CLI in development mode
- npm run build: Compile TypeScript
- npm run typecheck: Type check without emitting
- npm run start: Run compiled CLI

# Workflow
- Make changes extremely small, contained, and atomic
- Tackle one thing at a time
- Prefer editing existing files over creating new ones
- Commit regularly after completing each small change

# Git workflow
For any new feature or change request:
1. Create a new branch from main (e.g., `feat/feature-name` or `fix/bug-name`)
2. Implement the changes with atomic commits
3. Create a PR when finished using `gh pr create`
4. Share the PR link with the user for review before merging

# Code style
- Follow functional principles: pure functions, immutability, no side effects
- Use standalone exported functions (modern TypeScript idiom, better tree-shaking)
- Organize related functions by file/module, not by class
- Data flows through function parameters, not global state
- Avoid unnecessary helper functions - prefer direct property access on data structures