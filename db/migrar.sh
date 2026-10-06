#!/bin/bash
# Aplica, en orden, las migraciones de db/migrations/ que todavía no se
# corrieron contra la base, y registra cada una en la tabla "migraciones".
# Lo llama el script de deploy del servidor antes de reiniciar el backend.
#
# Uso:
#   bash db/migrar.sh                 aplica las pendientes
#   bash db/migrar.sh --marcar-todas  las registra como aplicadas SIN correrlas
#                                     (para una base recién creada desde db/init,
#                                     que ya trae esos cambios en 01_schema.sql)
#
# Variables opcionales:
#   DB_NAME         base a migrar (default: biblioteca)
#   MYSQL           cliente mysql (default: mysql)
#   MYSQL_DEFAULTS  archivo con [client] user/password (default: ~/.my.cnf)
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)/migrations"
DB_NAME="${DB_NAME:-biblioteca}"
MYSQL="${MYSQL:-mysql}"
DEFAULTS="${MYSQL_DEFAULTS:-$HOME/.my.cnf}"
SOLO_MARCAR=false
[[ "${1:-}" == "--marcar-todas" ]] && SOLO_MARCAR=true

if [[ ! -f "$DEFAULTS" ]]; then
  echo "No existe $DEFAULTS con las credenciales de MySQL (ver README)." >&2
  exit 1
fi

sql() { "$MYSQL" --defaults-extra-file="$DEFAULTS" "$DB_NAME" "$@"; }

sql -e "CREATE TABLE IF NOT EXISTS migraciones (
  archivo     VARCHAR(255) PRIMARY KEY,
  aplicada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)"

aplicadas="$(sql -N -B -e 'SELECT archivo FROM migraciones')"

shopt -s nullglob
cantidad=0
for ruta in "$DIR"/*.sql; do
  archivo="$(basename "$ruta")"

  # El nombre se mete en un INSERT, así que solo se aceptan nombres simples.
  if [[ ! "$archivo" =~ ^[0-9]{3}_[a-z0-9_]+\.sql$ ]]; then
    echo "Nombre inválido: $archivo (formato: 001_descripcion.sql)" >&2
    exit 1
  fi

  grep -qxF "$archivo" <<< "$aplicadas" && continue

  if $SOLO_MARCAR; then
    echo "   marcando $archivo"
  else
    echo "   aplicando $archivo"
    # Si falla, set -e corta acá: no se registra y el deploy no reinicia.
    sql < "$ruta"
  fi
  sql -e "INSERT INTO migraciones (archivo) VALUES ('$archivo')"
  cantidad=$((cantidad + 1))
done

echo "   $cantidad migraciones $($SOLO_MARCAR && echo marcadas || echo aplicadas)"
