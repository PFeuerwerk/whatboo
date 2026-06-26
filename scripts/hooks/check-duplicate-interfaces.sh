#!/usr/bin/env bash

set -euo pipefail

FILE="apps/web/src/app/core/models/restaurant.interfaces.ts"

echo "🔎 Checking duplicate TypeScript interfaces..."

if [ ! -f "$FILE" ]; then
  echo "❌ File not found: $FILE"
  exit 1
fi

DUPES=$(grep -oE "export interface [A-Za-z0-9_]+" "$FILE" \
  | awk '{print $3}' \
  | sort \
  | uniq -c \
  | awk '$1 > 1')

if [ -n "$DUPES" ]; then
  echo "❌ Duplicate interfaces detected:"
  echo "$DUPES"
  exit 1
fi

echo "✅ No duplicate interfaces found."
