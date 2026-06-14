#!/bin/bash

# =========================================================
#  PROJECT BACKUP SCRIPT
# Creates a clean migration package for a new PC
# Output:
#   viras_backup_DD-MM-YYYY.tar.gz
# =========================================================

set -e

echo "=================================================="
echo " PROJECT CLEAN BACKUP"
echo "=================================================="

# ---------------------------------------------------------
# STEP 1 - VERIFY PROJECT STRUCTURE
# ---------------------------------------------------------

echo "[1/8] Verifying project structure..."

REQUIRED_DIRS=("apps/api" "apps/web" "packages" "docs" "infrastructure")
REQUIRED_FILES=("apps/api/package.json" "apps/web/package.json" "package.json" "pnpm-workspace.yaml")

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "ERROR: Missing directory -> $dir"
        exit 1
    fi
done

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "ERROR: Missing file -> $file"
        exit 1
    fi
done

echo "OK -> Project structure verified"

# ---------------------------------------------------------
# STEP 2 - VERIFY REQUIRED TOOLS
# ---------------------------------------------------------

echo "[2/8] Verifying required system tools..."

TOOLS=("tar" "gzip" "find" "rsync")

for tool in "${TOOLS[@]}"; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        echo "ERROR: Required tool not found -> $tool"
        exit 1
    fi
done

echo "OK -> Required tools verified"

# ---------------------------------------------------------
# STEP 3 - CREATE TEMPORARY CLEAN DIRECTORY
# ---------------------------------------------------------

echo "[3/8] Creating temporary clean workspace..."

DATE=$(date +"%d-%m-%Y")
BACKUP_NAME="backup_${DATE}.tar.gz"

TEMP_DIR="/tmp/clean_backup"

rm -rf "$TEMP_DIR"

mkdir -p "$TEMP_DIR"

echo "OK -> Temporary workspace created"

# ---------------------------------------------------------
# STEP 4 - COPY ONLY NEEDED FILES
# ---------------------------------------------------------

echo "[4/8] Copying required project files..."

# Aseguramos que la carpeta destino exista antes del rsync
mkdir -p "$TEMP_DIR/restaurant-booking-saas"

# Eliminamos el punto y la barra (./) y usamos la ruta absoluta del directorio actual ($PWD)
rsync -av \
    --progress \
    --exclude="node_modules" \
    --exclude="dist" \
    --exclude=".git" \
    --exclude=".angular" \
    --exclude=".cache" \
    --exclude=".turbo" \
    --exclude="*.tsbuildinfo" \
    --exclude="coverage" \
    --exclude="tmp" \
    --exclude="temp" \
    --exclude="logs" \
    --exclude="*.log" \
    --exclude="*.tar.gz" \
    --exclude="*.zip" \
    --exclude=".DS_Store" \
    --exclude="Thumbs.db" \
    --exclude=".vscode" \
    --exclude=".idea" \
    "$PWD/" "$TEMP_DIR/restaurant-booking-saas/"

echo "OK -> Clean project copied"

# ---------------------------------------------------------
# STEP 5 - VERIFY IMPORTANT FILES EXIST
# ---------------------------------------------------------

echo "[5/8] Verifying important project files..."

VERIFY_FILES=(
    "$TEMP_DIR/restaurant-booking-saas/apps/api/package.json"
    "$TEMP_DIR/restaurant-booking-saas/apps/web/package.json"
    "$TEMP_DIR/restaurant-booking-saas/apps/api/prisma/schema.prisma"
    "$TEMP_DIR/restaurant-booking-saas/apps/web/src/main.ts"
    "$TEMP_DIR/restaurant-booking-saas/packages"
    "$TEMP_DIR/restaurant-booking-saas/docs"
)

for item in "${VERIFY_FILES[@]}"; do
    if [ ! -e "$item" ]; then
        echo "ERROR: Required backup item missing -> $item"
        exit 1
    fi
done

echo "OK -> Backup contents verified"

# ---------------------------------------------------------
# STEP 6 - CREATE BACKUP ARCHIVE
# ---------------------------------------------------------

echo "[6/8] Creating compressed archive..."

# Corregido: Se cambia 'viras' por 'restaurant-booking-saas'
tar -czf "$BACKUP_NAME" -C "$TEMP_DIR" restaurant-booking-saas

if [ ! -f "$BACKUP_NAME" ]; then
    echo "ERROR: Backup archive creation failed"
    exit 1
fi

echo "OK -> Archive created: $BACKUP_NAME"


# ---------------------------------------------------------
# STEP 7 - VERIFY ARCHIVE INTEGRITY
# ---------------------------------------------------------

echo "[7/8] Verifying archive integrity..."

gzip -t "$BACKUP_NAME"

echo "OK -> Archive integrity verified"

# ---------------------------------------------------------
# STEP 8 - CLEAN TEMP FILES
# ---------------------------------------------------------

echo "[8/8] Cleaning temporary files..."

rm -rf "$TEMP_DIR"

echo "OK -> Temporary files removed"

# ---------------------------------------------------------
# COMPLETED
# ---------------------------------------------------------

echo ""
echo "=================================================="
echo "BACKUP COMPLETED SUCCESSFULLY"
echo "=================================================="
echo "Backup file:"
echo "   $BACKUP_NAME"
echo ""
echo "Transfer this file to the new PC."
echo ""
echo "On the new PC:"
echo "--------------------------------------------------"
echo "sudo mkdir -p /home/viras"
echo "sudo tar -xzf $BACKUP_NAME -C /home/"
echo "--------------------------------------------------"
echo ""
echo "Final restored location:"
echo "   /home/viras"
echo "=================================================="