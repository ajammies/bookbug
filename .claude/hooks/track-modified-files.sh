#!/bin/bash
# Track modified files for session context continuity
FILE_PATH=$(jq -r '.tool_input.file_path // empty')
if [ -n "$FILE_PATH" ]; then
    mkdir -p ~/.claude
    echo "$FILE_PATH" >> ~/.claude/modified-files.txt
fi
