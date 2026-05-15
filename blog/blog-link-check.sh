#!/bin/bash
# blog-link-check.sh - 校验 blog/index.html 索引与实际文件一致性
cd "$(dirname "$0")"

echo "🔍 检查 blog 链接完整性..."

MISSING=0
while IFS= read -r line; do
  # 匹配 fname:"xxx" 模式
  FNAME=$(echo "$line" | sed 's/.*"fname":"\([^"]*\)".*/\1/')
  if [ -n "$FNAME" ] && [ "$FNAME" != "https://"* ]; then
    if [ ! -f "$FNAME" ]; then
      echo "❌ 404: $FNAME"
      MISSING=$((MISSING + 1))
    fi
  fi
done < <(grep -oE '"fname":"[^"]*"' index.html)

echo ""
if [ $MISSING -eq 0 ]; then
  echo "✅ 全部链接正常！"
else
  echo "⚠️  共 $MISSING 个 404 链接"
  exit 1
fi