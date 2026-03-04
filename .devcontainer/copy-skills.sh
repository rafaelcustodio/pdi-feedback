#!/bin/bash
# Copy Claude skills from host to devcontainer shared dir
cp -r ~/.claude/skills "${1}/.devcontainer/_skills" 2>/dev/null || true
