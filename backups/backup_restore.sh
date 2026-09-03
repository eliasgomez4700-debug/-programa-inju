#!/bin/bash
# backup_restore.sh - Backup/Restore para pruebas del cierre del sistema INJU
# Uso:
#   ./backup_restore.sh backup                          → guarda estado actual
#   ./backup_restore.sh restore <archivo.sql>           → restaura desde backup

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../backend/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: No se encontró $ENV_FILE"
  exit 1
fi

DB_HOST=$(grep DB_HOST "$ENV_FILE" | cut -d= -f2 | tr -d '"' | tr -d "'")
DB_USER=$(grep DB_USER "$ENV_FILE" | cut -d= -f2 | tr -d '"' | tr -d "'")
DB_PASSWORD=$(grep DB_PASSWORD "$ENV_FILE" | cut -d= -f2 | tr -d '"' | tr -d "'")
DB_NAME=$(grep DB_NAME "$ENV_FILE" | cut -d= -f2 | tr -d '"' | tr -d "'")
DB_PORT=$(grep DB_PORT "$ENV_FILE" | cut -d= -f2 | tr -d '"' | tr -d "'")

TABLES="sections academic_years students academic_records"

do_backup() {
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE="$SCRIPT_DIR/backup_pre_cierre_${TIMESTAMP}.sql"

  echo "=== Backup pre-cierre ==="
  echo "Tablas: $TABLES"
  echo "Base de datos: $DB_NAME@$DB_HOST:$DB_PORT"
  echo ""

  mysqldump \
    --host="$DB_HOST" \
    --user="$DB_USER" \
    --password="$DB_PASSWORD" \
    --port="$DB_PORT" \
    --no-create-db \
    --routines \
    --triggers \
    --single-transaction \
    "$DB_NAME" $TABLES > "$BACKUP_FILE"

  echo "Backup creado: $BACKUP_FILE"
  echo "Tamaño: $(du -h "$BACKUP_FILE" | cut -f1)"
}

do_restore() {
  local RESTORE_FILE="$1"

  if [ ! -f "$RESTORE_FILE" ]; then
    echo "Error: No se encontró el archivo $RESTORE_FILE"
    exit 1
  fi

  echo "=== Restore pre-cierre ==="
  echo "Archivo: $RESTORE_FILE"
  echo "Base de datos: $DB_NAME@$DB_HOST:$DB_PORT"
  echo ""
  echo "Esto REVERTIRÁ todos los cambios del cierre."
  read -p "¿Continuar? (s/N): " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[sS]$ ]]; then
    echo "Cancelado."
    exit 0
  fi

  echo ""
  echo "Limpiando tablas dependientes..."

  mysql \
    --host="$DB_HOST" \
    --user="$DB_USER" \
    --password="$DB_PASSWORD" \
    --port="$DB_PORT" \
    "$DB_NAME" <<'EOSQL'
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE recovery_grades;
TRUNCATE TABLE attitude_reports;
TRUNCATE TABLE module_grades;
TRUNCATE TABLE section_subjects;
TRUNCATE TABLE teacher_assignments;
TRUNCATE TABLE merits_demerits;
TRUNCATE TABLE attendance;
TRUNCATE TABLE grades;
TRUNCATE TABLE academic_records;
TRUNCATE TABLE students;
TRUNCATE TABLE academic_years;
TRUNCATE TABLE sections;
SET FOREIGN_KEY_CHECKS = 1;
EOSQL

  echo "Restaurando datos..."

  mysql \
    --host="$DB_HOST" \
    --user="$DB_USER" \
    --password="$DB_PASSWORD" \
    --port="$DB_PORT" \
    "$DB_NAME" < "$RESTORE_FILE"

  echo ""
  echo "Restore completado exitosamente."
}

case "${1:-}" in
  backup)
    do_backup
    ;;
  restore)
    if [ -z "${2:-}" ]; then
      echo "Uso: $0 restore <archivo.sql>"
      echo ""
      echo "Backups disponibles:"
      ls -1 "$SCRIPT_DIR"/backup_pre_cierre_*.sql 2>/dev/null || echo "  No hay backups"
      exit 1
    fi
    do_restore "$2"
    ;;
  *)
    echo "Uso:"
    echo "  $0 backup                          → Crear backup pre-cierre"
    echo "  $0 restore <archivo.sql>           → Restaurar desde backup"
    echo ""
    echo "Backups disponibles:"
    ls -1 "$SCRIPT_DIR"/backup_pre_cierre_*.sql 2>/dev/null || echo "  No hay backups"
    exit 1
    ;;
esac
