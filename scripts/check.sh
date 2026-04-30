#!/bin/bash
# Pre-commit check script for Lob site
# Usage: ./scripts/check.sh
# Auto-install hook: ln -sf ../../scripts/check.sh .git/hooks/pre-commit

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

echo "🔍 Running pre-commit checks..."

# Get staged files
STAGED=$(git diff --cached --name-only 2>/dev/null || echo "")

# ── 1. Warm colors check ──────────────────────────────────────
echo -n "Checking warm colors in staged HTML/CSS... "
STAGED_HTML=$(echo "$STAGED" | grep -E "\.(html|css)$" | grep -v "/node_modules/\|/dist/\|/assets/index\|bundle\|\.min\." || true)
if [ -n "$STAGED_HTML" ]; then
  WARM=$(grep -lE "#FFF5EE|#E88A3D|#FF8FA3|#A8D8FF|#FFB07A|#FFB3C6|#C46A2A|#9A8090|#8A7080|#7A6A55|#6A5A45|#5A4A45" $STAGED_HTML 2>/dev/null | grep -v "lob-design-language" | head -5 || true)
  if [ -n "$WARM" ]; then
    echo -e "${RED}FAIL${NC}"
    echo "  Warm colors found:"
    echo "$WARM" | head -5
    ERRORS=$((ERRORS+1))
  else
    echo -e "${GREEN}OK${NC}"
  fi
else
  echo -e "${GREEN}OK (no HTML/CSS staged)${NC}"
fi

# ── 2. Old accent color check ─────────────────────────────────
echo -n "Checking accent color (#60a5fa vs #67e8f9)... "
STAGED_CSS=$(echo "$STAGED" | grep -E "\.(html|css)$" | grep -v "/node_modules/" || true)
OLD_ACCENT=""
for f in $STAGED_CSS; do
  if [ -f "$f" ] && grep -q "#60a5fa" "$f" 2>/dev/null; then
    OLD_ACCENT="$OLD_ACCENT $f"
  fi
done
if [ -n "$OLD_ACCENT" ]; then
  echo -e "${RED}FAIL${NC}"
  echo "  Old accent #60a5fa found in:$OLD_ACCENT"
  ERRORS=$((ERRORS+1))
else
  echo -e "${GREEN}OK${NC}"
fi

# ── 3. JS syntax check ────────────────────────────────────────
echo -n "Checking JS syntax in staged HTML files... "
JS_FAIL=""
for f in $(echo "$STAGED" | grep "\.html$" | grep -v "/node_modules/"); do
  if [ -f "$f" ]; then
    JS_ERROR=$(node -e "
      const fs = require('fs');
      const html = fs.readFileSync('$f', 'utf8');
      const m = html.match(/<script>([\s\S]*?)<\/script>/g);
      if (!m) { process.exit(0); }
      m.forEach(block => {
        const js = block.replace(/<\/?script>/g, '');
        try { new Function(js); } catch(e) { console.log('$f: ' + e.message); process.exit(1); }
      });
    " 2>&1) || true
    if [ -n "$JS_ERROR" ]; then
      JS_FAIL="$JS_FAIL$JS_ERROR\n"
    fi
  fi
done
if [ -n "$JS_FAIL" ]; then
  echo -e "${RED}FAIL${NC}$JS_FAIL"
  ERRORS=$((ERRORS+1))
else
  echo -e "${GREEN}OK${NC}"
fi

# ── 4. Daily post file size sanity check ─────────────────────
echo -n "Checking daily post file sizes... "
SMALL=$(find blog/posts -name "daily-*.html" -size -500c 2>/dev/null | head -5 || true)
if [ -n "$SMALL" ]; then
  echo -e "${YELLOW}WARN${NC} suspicious files (<500 bytes):"
  echo "$SMALL" | head -5
  WARNINGS=$((WARNINGS+1))
else
  echo -e "${GREEN}OK${NC}"
fi

# ── 5. Daily post count ────────────────────────────────────────
echo -n "Checking daily post count... "
COUNT=$(find blog/posts -name "daily-*.html" | wc -l | tr -d ' ')
if [ "$COUNT" -lt 45 ]; then
  echo -e "${YELLOW}WARN${NC} only $COUNT daily posts (expected ~48)"
  WARNINGS=$((WARNINGS+1))
else
  echo -e "${GREEN}OK ($COUNT files)${NC}"
fi

# ── 6. Escaped template literals ──────────────────────────────
echo -n "Checking for escaped template literals... "
ESCAPED=""
for f in $(echo "$STAGED" | grep "\.html$" | grep -v "/node_modules/"); do
  if [ -f "$f" ] && grep -q "\\\\\`" "$f" 2>/dev/null; then
    ESCAPED="$ESCAPED $f"
  fi
done
if [ -n "$ESCAPED" ]; then
  echo -e "${RED}FAIL${NC} escaped backticks in:$ESCAPED"
  ERRORS=$((ERRORS+1))
else
  echo -e "${GREEN}OK${NC}"
fi

# ── 7. Missing shared CSS links ────────────────────────────────
echo -n "Checking daily posts have shared CSS... "
MISSING=""
for f in blog/posts/daily-*.html; do
  if [ -f "$f" ] && ! grep -q "posts.css" "$f" 2>/dev/null; then
    MISSING="$MISSING $(basename $f)"
  fi
done
if [ -n "$MISSING" ]; then
  echo -e "${RED}FAIL${NC} missing posts.css:$MISSING"
  ERRORS=$((ERRORS+1))
else
  echo -e "${GREEN}OK${NC}"
fi

# ── 8. Dynamic theme JS warning (non-blocking) ────────────────
echo -n "Checking for dynamic theme JS... "
DYNAMIC=$(echo "$STAGED" | xargs grep -l "getTimeTheme" 2>/dev/null | grep -v "/node_modules/\|/dist/\|bundle\|\.min\." | head -3 || true)
if [ -n "$DYNAMIC" ]; then
  echo -e "${YELLOW}WARN${NC} dynamic theme JS found:"
  echo "$DYNAMIC" | head -3
  WARNINGS=$((WARNINGS+1))
else
  echo -e "${GREEN}OK${NC}"
fi

# ── Summary ───────────────────────────────────────────────────
echo ""
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}✖ $ERRORS check(s) failed. Commit aborted.${NC}"
  echo "  Fix the issues above before committing."
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠ $WARNINGS warning(s). Review carefully.${NC}"
  echo "  Commit allowed but review warnings."
  exit 0
else
  echo -e "${GREEN}✔ All checks passed. Ready to commit.${NC}"
  exit 0
fi
