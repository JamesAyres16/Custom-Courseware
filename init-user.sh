#!/usr/bin/env bash

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER "$DB_USER" WITH PASSWORD '$DB_USER_PASS';
    GRANT ALL ON SCHEMA public TO "$DB_USER";
EOSQL
