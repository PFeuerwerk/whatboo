#!/usr/bin/env bash

set -euo pipefail

echo "🔎 Contract Integrity Check (STRICT MODE)"

WEB_FILE="apps/web/src/app/core/models/restaurant.interfaces.ts"
PRISMA_FILE="apps/api/prisma/schema.prisma"

if [ ! -f "$WEB_FILE" ]; then
  echo "❌ Missing WEB file"
  exit 1
fi

echo ""
echo "▶ Checking TS single source of truth..."

# SOLO archivo activo (NO backups, NO tmp, NO domain copies)
ACTIVE_FILES=(
  "$WEB_FILE"
)

for file in "${ACTIVE_FILES[@]}"; do
  echo "   → scanning $file"

  DUPES=$(grep -oE "export interface [A-Za-z0-9_]+" "$file" \
    | awk '{print $3}' \
    | sort \
    | uniq -c \
    | awk '$1 > 1')

  if [ -n "$DUPES" ]; then
    echo "❌ Duplicate interfaces inside ACTIVE FILE:"
    echo "$DUPES"
    exit 1
  fi
done

echo "✔ No duplicates inside active contract file"

echo ""
echo "▶ Checking Prisma ↔ TS contract alignment..."

for model in WhatsappAccount BlockedDate OpeningHour; do

  PRISMA_COUNT=$(grep -c "model $model" "$PRISMA_FILE" || true)
  TS_COUNT=$(grep -c "export interface $model" "$WEB_FILE" || true)

  if [ "$PRISMA_COUNT" -eq 0 ]; then
    echo "⚠ Missing Prisma model: $model"
  fi

  if [ "$TS_COUNT" -eq 0 ]; then
    echo "⚠ Missing TS interface: $model"
  fi

done

echo "✔ Contract check completed (strict scope)"
