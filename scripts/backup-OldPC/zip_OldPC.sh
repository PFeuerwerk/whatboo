#!/bin/bash

# =========================================================
# ZIP ALL .dump AND .tar.gz FILES (CURRENT FOLDER ONLY)
# =========================================================

set -e

echo "=================================================="
echo "   CREATING ZIP FILE"
echo "=================================================="

DATE=$(date +"%d-%m-%Y")
ZIP_NAME="zip_files_OldPC_${DATE}.zip"

echo "[1/4] Searching files..."

FILES=$(find . -maxdepth 1 -type f \( -name "*.dump" -o -name "*.tar.gz" \))

if [ -z "$FILES" ]; then
    echo "ERROR: No .dump or .tar.gz files found"
    exit 1
fi

echo "OK -> Files found"

echo "[2/4] Creating ZIP archive..."

zip -j "$ZIP_NAME" $FILES

if [ ! -f "$ZIP_NAME" ]; then
    echo "ERROR: ZIP creation failed"
    exit 1
fi

echo "OK -> ZIP archive created"

echo "[3/4] Verifying ZIP integrity..."

unzip -t "$ZIP_NAME" >/dev/null

echo "OK -> ZIP integrity verified"

echo "[4/4] Completed"

echo ""
echo "=================================================="
echo "ZIP COMPLETED SUCCESSFULLY"
echo "=================================================="
echo "Created file:"
echo "   $ZIP_NAME"
echo "=================================================="