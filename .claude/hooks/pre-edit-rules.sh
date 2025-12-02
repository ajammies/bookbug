#!/bin/bash
# Remind Claude to invoke code-rules skill before complex edits
cat << 'EOF'
{
  "additionalContext": "REMINDER: For complex edits, invoke code-rules skill. For new files (agents, schemas, commands), invoke find-pattern skill first."
}
EOF
