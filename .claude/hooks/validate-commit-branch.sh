#!/bin/bash
set -e

input_json=$(cat)
command=$(echo "$input_json" | jq -r '.tool_input.command // ""')
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# Extract commit message from -m flag
msg=$(echo "$command" | grep -oP '(?<=-m\s")[^"]*' | head -1)

# Skip if no message or main branch
if [[ -z "$msg" || "$branch" == "main" || "$branch" == "master" ]]; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
  exit 0
fi

# Get recent commits on this branch for context
recent=$(git log --oneline -5 2>/dev/null | head -5)

# Call LLM agent to check relevance
result=$(node .claude/hooks/check-relevance.js "$branch" "$msg" "$recent" 2>/dev/null || echo "allow")

if [[ "$result" == "allow" ]]; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
else
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"$result\"}}"
fi
