#!/bin/bash
# Remind Claude to invoke code-rules skill before edits
cat << 'EOF'
{
  "systemMessage": "⚠️ BEFORE EDITING: Have you invoked the code-rules skill this session? If not, STOP and invoke it now. For new files, also invoke find-pattern skill first."
}
EOF
