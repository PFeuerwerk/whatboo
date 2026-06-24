#!/usr/bin/env bash

# =========================================================
# FULL OLD PC MIGRATION BACKUP
#
# Executes:
#   1) Project backup
#   2) Database backup
#
# Creates:
#
# FULL_BACKUP_DD-MM-YYYY.tar.gz
#
# Contains:
#
#   backup_DD-MM-YYYY.tar.gz
#   db_bckp-DD-MM-YYYY.dump
#
# =========================================================

set -Eeuo pipefail


# =========================================================
# CONFIGURATION
# =========================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

BACKUP_DIR="${PROJECT_DIR}/backups"

TEMP_DIR="/tmp/full_backup_package"

DATE=$(date +"%d-%m-%Y")

FINAL_BACKUP="FULL_BACKUP_${DATE}.tar.gz"

FINAL_PATH="${BACKUP_DIR}/${FINAL_BACKUP}"


PROJECT_BACKUP_SCRIPT="${SCRIPT_DIR}/backup-project.sh"

DATABASE_BACKUP_SCRIPT="${SCRIPT_DIR}/backup-db.sh"


# =========================================================
# FUNCTIONS
# =========================================================

error_exit()
{
    echo ""
    echo "ERROR: $1"
    echo ""
    exit 1
}


success()
{
    echo ""
    echo "OK -> $1"
}


cleanup()
{
    rm -rf "$TEMP_DIR"
}

trap cleanup EXIT


# =========================================================
# START
# =========================================================

echo ""
echo "=================================================="
echo " FULL MIGRATION BACKUP"
echo "=================================================="
echo ""


# =========================================================
# STEP 1 - VERIFY ENVIRONMENT
# =========================================================

echo "[1/7] Verifying environment..."


if [ ! -d "$PROJECT_DIR" ]; then
    error_exit "Project directory not found: $PROJECT_DIR"
fi


if [ ! -f "$PROJECT_BACKUP_SCRIPT" ]; then
    error_exit "Project backup script not found"
fi


if [ ! -f "$DATABASE_BACKUP_SCRIPT" ]; then
    error_exit "Database backup script not found"
fi


mkdir -p "$BACKUP_DIR"


success "Environment verified"



# =========================================================
# STEP 2 - CREATE PROJECT BACKUP
# =========================================================

echo "[2/7] Executing project backup..."

bash "$PROJECT_BACKUP_SCRIPT"


success "Project backup completed"



# =========================================================
# STEP 3 - LOCATE PROJECT BACKUP
# =========================================================

echo "[3/7] Finding project backup file..."


PROJECT_FILE=$(find "$BACKUP_DIR" \
    -maxdepth 1 \
    -type f \
    -name "backup_*.tar.gz" \
    | sort \
    | tail -n 1)



if [ -z "$PROJECT_FILE" ]; then
    error_exit "Project backup file not found"
fi


echo "$PROJECT_FILE"


success "Project backup found"



# =========================================================
# STEP 4 - CREATE DATABASE BACKUP
# =========================================================

echo "[4/7] Executing database backup..."

bash "$DATABASE_BACKUP_SCRIPT"


success "Database backup completed"



# =========================================================
# STEP 5 - LOCATE DATABASE BACKUP
# =========================================================

echo "[5/7] Finding database backup file..."


DATABASE_FILE=$(find "$BACKUP_DIR" \
    -maxdepth 1 \
    -type f \
    -name "db_bckp-*.dump" \
    | sort \
    | tail -n 1)



if [ -z "$DATABASE_FILE" ]; then
    error_exit "Database backup file not found"
fi


echo "$DATABASE_FILE"


success "Database backup found"



# =========================================================
# STEP 6 - CREATE FINAL TAR PACKAGE
# =========================================================

echo "[6/7] Creating final migration package..."


rm -rf "$TEMP_DIR"

mkdir -p "$TEMP_DIR"


cp "$PROJECT_FILE" "$TEMP_DIR/"

cp "$DATABASE_FILE" "$TEMP_DIR/"



tar -czf \
    "$FINAL_PATH" \
    -C "$TEMP_DIR" \
    "$(basename "$PROJECT_FILE")" \
    "$(basename "$DATABASE_FILE")"



if [ ! -f "$FINAL_PATH" ]; then
    error_exit "Final package creation failed"
fi


success "Final package created"



# =========================================================
# STEP 7 - VERIFY FINAL PACKAGE
# =========================================================

echo "[7/7] Verifying final package..."


gzip -t "$FINAL_PATH"


tar -tzf "$FINAL_PATH" >/dev/null


success "Final package verified"



# =========================================================
# COMPLETE
# =========================================================

SIZE=$(du -h "$FINAL_PATH" | cut -f1)


echo ""
echo "=================================================="
echo " FULL BACKUP COMPLETED SUCCESSFULLY"
echo "=================================================="
echo ""
echo "Created file:"
echo ""
echo "$FINAL_PATH"
echo ""
echo "Size:"
echo "$SIZE"
echo ""
echo "Contains:"
echo ""
echo " - $(basename "$PROJECT_FILE")"
echo " - $(basename "$DATABASE_FILE")"
echo ""
echo "Ready for migration to the new PC."
echo ""
echo "=================================================="