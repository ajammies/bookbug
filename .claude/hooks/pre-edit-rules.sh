#!/bin/bash
# Remind Claude to invoke code-rules skill before complex edits
cat << 'EOF'
{
  "additionalContext": "REMINDER: For complex edits (new agents, multi-file changes, refactoring), invoke the code-rules skill first to review guidelines."
}
EOF
