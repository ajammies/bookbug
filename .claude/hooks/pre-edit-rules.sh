#!/bin/bash
# Remind Claude to follow code-rules before editing
cat << 'EOF'
{
  "additionalContext": "Before editing, follow code-rules skill: 🔴 Read file first | 🔴 Pure functions, no side effects | Simple > clever | Check data shapes"
}
EOF
