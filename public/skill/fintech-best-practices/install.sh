#!/usr/bin/env bash
# Install the fintech-best-practices skill into the current project.
# Usage: curl -fsSL https://daaysorn.com/skill/fintech-best-practices/install.sh | bash
# Override the target for other tools, e.g. Cursor:
#   FINTECH_SKILL_TARGET_DIR=.cursor/skills/fintech-best-practices bash install.sh
set -euo pipefail

BASE_URL="${FINTECH_SKILL_BASE_URL:-https://daaysorn.com/skill/fintech-best-practices}"
TARGET_DIR="${FINTECH_SKILL_TARGET_DIR:-.claude/skills/fintech-best-practices}"

mkdir -p "$TARGET_DIR/references"
echo "Installing fintech-best-practices into $TARGET_DIR"
curl -fsSL "$BASE_URL/SKILL.md" -o "$TARGET_DIR/SKILL.md"
echo "  SKILL.md"

for chapter in security data-protection fraud compliance payments reliability ux-trust; do
  if curl -fsSL "$BASE_URL/references/$chapter.md" -o "$TARGET_DIR/references/$chapter.md" 2>/dev/null; then
    echo "  references/$chapter.md"
  else
    rm -f "$TARGET_DIR/references/$chapter.md"
    echo "  skipped $chapter (not published yet)"
  fi
done

echo "Done. Agents reading $TARGET_DIR now load this skill for fintech work."
