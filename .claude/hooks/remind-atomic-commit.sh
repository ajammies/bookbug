#!/bin/bash
# Reminds Claude to consider atomic commits after file edits

cat << 'EOF'
{
  "additionalContext": "You just edited a file. Consider: is this a good point for an atomic commit? Small, focused commits are easier to review and revert."
}
EOF
