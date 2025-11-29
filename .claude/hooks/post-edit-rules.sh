#!/bin/bash
# Remind Claude to validate after editing
cat << 'EOF'
{
  "additionalContext": "After editing, verify: Test with real data | Run typecheck before commit | Code is easy to delete"
}
EOF
