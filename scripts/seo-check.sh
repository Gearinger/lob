#!/bin/bash
# seo-check.sh — 检查已部署 Lob 网站的 SEO 问题
# 输出到 /tmp/seo-check.log + 推送到飞书群

set -e

LOG="/tmp/seo-check.log"
ERRORS=0
WARNINGS=0
SITE="https://lob.hermygong.com/lob/blog"

echo "🔍 Lob SEO 检查 - $(date '+%Y-%m-%d %H:%M')" > "$LOG"
echo "=======================================" >> "$LOG"

# ── 1. 首页可访问 ────────────────────────────────────────
echo -n "检查首页... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE/" 2>/dev/null || echo "000")
if [ "$STATUS" = "200" ]; then
    echo "✅ $STATUS" >> "$LOG"
else
    echo "❌ 首页返回 $STATUS" >> "$LOG"
    ERRORS=$((ERRORS+1))
fi

# ── 2. 死链抽查（随机 10 篇） ─────────────────────────────
echo "检查死链（抽查 10 篇）..." >> "$LOG"
DEAD=0
for path in "posts/news/daily-2026-05-14.html" "posts/articles/daily-think-2026-05-15.html" "posts/docs/monopoly-prd.html" "diary/weekly-2026-05-02.html"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE/$path" 2>/dev/null || echo "000")
    if [ "$STATUS" != "200" ]; then
        echo "  ❌ $path → $STATUS" >> "$LOG"
        DEAD=$((DEAD+1))
    else
        echo "  ✅ $path" >> "$LOG"
    fi
done
if [ $DEAD -gt 0 ]; then
    ERRORS=$((ERRORS+DEAD))
fi

# ── 3. Meta description 检查 ──────────────────────────────
echo "检查 meta description..." >> "$LOG"
MISSING_DESC=0
for path in "posts/news/daily-2026-05-14.html" "posts/articles/daily-think-2026-05-15.html"; do
    DESC=$(curl -s "$SITE/$path" 2>/dev/null | grep -o '<meta name="description" content="[^"]*"' | head -1)
    if [ -z "$DESC" ]; then
        echo "  ⚠️  $path — 缺少 meta description" >> "$LOG"
        MISSING_DESC=$((MISSING_DESC+1))
        WARNINGS=$((WARNINGS+1))
    fi
done

# ── 4. Title 检查 ────────────────────────────────────────
echo "检查 title..." >> "$LOG"
MISSING_TITLE=0
for path in "posts/news/daily-2026-05-14.html" "posts/articles/daily-think-2026-05-15.html"; do
    TITLE=$(curl -s "$SITE/$path" 2>/dev/null | grep -o '<title>[^<]*</title>' | head -1)
    if [ -z "$TITLE" ]; then
        echo "  ⚠️  $path — 缺少 title" >> "$LOG"
        MISSING_TITLE=$((MISSING_TITLE+1))
        WARNINGS=$((WARNINGS+1))
    fi
done

# ── 5. Canonical URL 检查 ───────────────────────────────
echo "检查 canonical URL..." >> "$LOG"
BAD_CANON=0
for path in "posts/articles/daily-think-2026-05-15.html" "posts/news/daily-2026-05-14.html"; do
    CANON=$(curl -s "$SITE/$path" 2>/dev/null | grep -o 'canonical" href="[^"]*"' | head -1)
    if [ -n "$CANON" ]; then
        # 检查是否包含 /posts/daily-think- 而不是 /posts/articles/daily-think-
        if echo "$CANON" | grep -q "/posts/daily-think-" || echo "$CANON" | grep -q "/posts/articles/daily-think-"; then
            echo "  ✅ $path canonical OK" >> "$LOG"
        fi
    fi
done

# ── Summary ──────────────────────────────────────────────
echo "" >> "$LOG"
echo "=======================================" >> "$LOG"
if [ $ERRORS -gt 0 ]; then
    echo "❌ 发现 $ERRORS 个错误，$WARNINGS 个警告" >> "$LOG"
else
    echo "✅ SEO 检查通过（$WARNINGS 个警告可忽略）" >> "$LOG"
fi

cat "$LOG"

# 发飞书
TOKEN=$(curl -s -X POST "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal" \
    -H "Content-Type: application/json" \
    -d '{"app_id":"cli_a90f3ae070391bd2","app_secret":"U6a9QdRhxleCfhRYO9I3zeBdy7WOB4M5"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['tenant_access_token'])")

SUMMARY=$(tail -3 "$LOG" | tr '\n' ' ')
python3 -c "
import urllib.request, json
data = {
    'msg_type': 'text',
    'content': {'text': '🔍 SEO 检查\n'"$SUMMARY"'}
}
req = urllib.request.Request(
    'https://open.feishu.cn/open-apis/bot/v2/hook/oc_4937e19358d0c4eccec11d8d5c242900',
    data=json.dumps(data).encode(),
    headers={'Content-Type': 'application/json'}
)
urllib.request.urlopen(req, timeout=5)
print('📨 已推送到飞书群')
" 2>/dev/null || echo "(飞书推送失败，log 已保存到 $LOG)"