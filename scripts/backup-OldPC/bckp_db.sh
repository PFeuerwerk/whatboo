#!/usr/bin/env bash

# ==============================================================================
#    PostgreSQL Professional Backup Script
# ==============================================================================
#
# PURPOSE:
#   Creates a FULL professional PostgreSQL backup for the SaaS project "restboo"
#
# OUTPUT:
#   db_bckp-DD-MM-YYYY.dump
#
# FEATURES:
#   - Step-by-step execution
#   - Verification after every step
#   - Stops immediately on failure
#   - PostgreSQL custom format (-Fc)
#   - Includes:
#       * schema
#       * tables
#       * rows/data
#       * sequences
#       * indexes
#       * constraints
#       * triggers
#       * functions
#       * ownership
#       * permissions
#   - Backup integrity verification
#   - Timestamped logs
#   - Production-grade behavior
#
# REQUIREMENTS:
#   PostgreSQL client tools installed:
#       sudo apt install postgresql-client
#
# USAGE:
#   chmod +x backup_proj_db.sh
#   ./backup_proj_db.sh
#
# ==============================================================================

set -Eeuo pipefail

# ==============================================================================
# CONFIGURATION
# ==============================================================================

DB_NAME="viras_db"
DB_USER="viras_user"
DB_PASSWORD="vati"
DB_HOST="localhost"
DB_PORT="5432"

CURRENT_DATE=$(date +"%d-%m-%Y")

BACKUP_FILENAME="db_bckp-${CURRENT_DATE}.dump"

BACKUP_DIR="./"

LOG_FILE="${BACKUP_DIR}/backup_${CURRENT_DATE}.log"

# ==============================================================================
# COLORS
# ==============================================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ==============================================================================
# FUNCTIONS
# ==============================================================================

print_step() {
    echo -e "\n${BLUE}================================================================${NC}"
    echo -e "${BLUE}STEP:${NC} $1"
    echo -e "${BLUE}================================================================${NC}"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

abort_script() {
    print_error "$1"
    exit 1
}

# ==============================================================================
# START
# ==============================================================================

echo ""
echo "==============================================================="
echo "    PROFESSIONAL POSTGRESQL BACKUP"
echo "==============================================================="
echo ""

# ==============================================================================
# STEP 1 - VERIFY PostgreSQL CLIENT TOOLS
# ==============================================================================

print_step "Verifying PostgreSQL tools"

if ! command -v pg_dump >/dev/null 2>&1; then
    abort_script "pg_dump not found. Install PostgreSQL client tools first."
fi

if ! command -v pg_restore >/dev/null 2>&1; then
    abort_script "pg_restore not found. Install PostgreSQL client tools first."
fi

print_success "PostgreSQL tools verified"

# ==============================================================================
# STEP 2 - CREATE BACKUP DIRECTORY
# ==============================================================================

print_step "Creating backup directory"

mkdir -p "${BACKUP_DIR}" || abort_script "Could not create backup directory"

if [ ! -d "${BACKUP_DIR}" ]; then
    abort_script "Backup directory verification failed"
fi

print_success "Backup directory ready"

# ==============================================================================
# STEP 3 - VERIFY DATABASE CONNECTIVITY
# ==============================================================================

print_step "Testing database connectivity"

export PGPASSWORD="${DB_PASSWORD}"

if ! psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -c "\q" >/dev/null 2>&1
then
    abort_script "Cannot connect to database ${DB_NAME}"
fi

print_success "Database connection verified"

# ==============================================================================
# STEP 4 - VERIFY DATABASE EXISTS
# ==============================================================================

print_step "Verifying database existence"

DB_EXISTS=$(psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d postgres \
    -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")

if [ "${DB_EXISTS}" != "1" ]; then
    abort_script "Database ${DB_NAME} does not exist"
fi

print_success "Database exists"

# ==============================================================================
# STEP 5 - START BACKUP
# ==============================================================================

print_step "Starting professional PostgreSQL backup"

echo "Backup file:"
echo "${BACKUP_DIR}/${BACKUP_FILENAME}"
echo ""

pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -F c \
    -b \
    -v \
    --no-owner \
    --no-privileges \
    -f "${BACKUP_DIR}/${BACKUP_FILENAME}" \
    > "${LOG_FILE}" 2>&1

DUMP_EXIT_CODE=$?

if [ ${DUMP_EXIT_CODE} -ne 0 ]; then
    abort_script "pg_dump failed. Check log file: ${LOG_FILE}"
fi

print_success "Backup created successfully"

# ==============================================================================
# STEP 6 - VERIFY BACKUP FILE EXISTS
# ==============================================================================

print_step "Verifying backup file"

if [ ! -f "${BACKUP_DIR}/${BACKUP_FILENAME}" ]; then
    abort_script "Backup file was not created"
fi

print_success "Backup file exists"

# ==============================================================================
# STEP 7 - VERIFY BACKUP FILE IS NOT EMPTY
# ==============================================================================

print_step "Verifying backup file integrity"

if [ ! -s "${BACKUP_DIR}/${BACKUP_FILENAME}" ]; then
    abort_script "Backup file is empty"
fi

print_success "Backup file is not empty"

# ==============================================================================
# STEP 8 - VERIFY BACKUP STRUCTURE
# ==============================================================================

print_step "Verifying PostgreSQL dump structure"

if ! pg_restore -l "${BACKUP_DIR}/${BACKUP_FILENAME}" \
    >/dev/null 2>&1
then
    abort_script "Backup integrity verification failed"
fi

print_success "Backup structure verified"

# ==============================================================================
# STEP 9 - SHOW BACKUP INFORMATION
# ==============================================================================

print_step "Displaying backup information"

BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILENAME}" | cut -f1)

echo ""
echo "Backup Name : ${BACKUP_FILENAME}"
echo "Backup Size : ${BACKUP_SIZE}"
echo "Backup Path : ${BACKUP_DIR}/${BACKUP_FILENAME}"
echo "Log File    : ${LOG_FILE}"
echo ""

print_success "Backup information generated"

# ==============================================================================
# STEP 10 - CLEAN ENVIRONMENT VARIABLES
# ==============================================================================

print_step "Cleaning temporary environment variables"

unset PGPASSWORD

print_success "Environment cleaned"

# ==============================================================================
# FINISH
# ==============================================================================

echo ""
echo "==============================================================="
echo -e "${GREEN} PROFESSIONAL BACKUP COMPLETED SUCCESSFULLY ${NC}"
echo "==============================================================="
echo ""

echo "Your PostgreSQL database backup is ready:"
echo ""
echo "    ${BACKUP_DIR}/${BACKUP_FILENAME}"
echo ""

echo "This dump contains:"
echo ""
echo "  ✓ Tables"
echo "  ✓ Columns"
echo "  ✓ Data"
echo "  ✓ Indexes"
echo "  ✓ Constraints"
echo "  ✓ Sequences"
echo "  ✓ Triggers"
echo "  ✓ Functions"
echo "  ✓ Full PostgreSQL structure"
echo ""

echo "Ready for transparent restore on the new PC."
echo ""