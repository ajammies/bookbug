#!/bin/bash
# Remind Claude to invoke pr-workflow skill before creating feature branches
cat << 'EOF'
{
  "systemMessage": "⚠️ BEFORE BRANCHING: Have you invoked the pr-workflow skill? If starting new feature work, STOP and invoke it now to follow the standard workflow."
}
EOF
