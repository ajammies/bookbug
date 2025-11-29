#!/bin/bash
# Lists available skills and reminds Claude to consider using them

SKILLS_DIR="${CLAUDE_PROJECT_DIR}/.claude/skills"

if [ -d "$SKILLS_DIR" ]; then
  skills=$(ls -1 "$SKILLS_DIR" 2>/dev/null | tr '\n' ', ' | sed 's/,$//')

  cat << EOF
{
  "additionalContext": "Consider if any skills would help with this task. Available skills: ${skills}"
}
EOF
fi
