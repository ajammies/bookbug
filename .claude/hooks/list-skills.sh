#!/bin/bash
# Lists available skills with clear usage descriptions

cat << 'EOF'
{
  "additionalContext": "Available skills - use when applicable:\n\n• commit: Use when committing changes. Validates branch, ensures atomic commits.\n• create-issue: Use when creating/viewing/resolving GitHub issues, tracking bugs/features, or when you discover a problem that should be solved later.\n• pr-workflow: Use for full PR lifecycle: branch → implement → test → PR → merge.\n• design-agent: Use when creating/modifying LLM agents with generateObject and Zod schemas.\n• create-skill: Use when creating or updating skills that extend Claude's capabilities.\n• reflect: Use at session end, after merging PRs, or when user asks to reflect.\n• code-rules: Reference before complex edits for code style and philosophy."
}
EOF
