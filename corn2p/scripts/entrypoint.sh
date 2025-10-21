#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="${CORN2P_DATA_DIR:-/data}"
CONFIG_JSON="${DATA_DIR}/config.json"
ENV_FILE="${DATA_DIR}/.env"
DB_FILE="${DATA_DIR}/db.json"

mkdir -p "${DATA_DIR}"

# Initialize the database file if it does not exist yet
if [ ! -f "${DB_FILE}" ] && [ -f "/app/db-sample.json" ]; then
  cp /app/db-sample.json "${DB_FILE}"
fi

# Ensure the env file exists so dotenv can read it
if [ ! -f "${ENV_FILE}" ]; then
  touch "${ENV_FILE}"
fi

# Convert Umbrel config.json (if present) into dotenv format
if [ -f "${CONFIG_JSON}" ]; then
  node <<'NODE' "${CONFIG_JSON}" "${ENV_FILE}"
const [configPath, envPath] = process.argv.slice(1)
const { readFileSync, writeFileSync } = require('fs')

try {
  const config = JSON.parse(readFileSync(configPath, 'utf8'))
  const lines = Object.entries(config)
    .filter(([, value]) => typeof value === 'string' && value.length > 0)
    .map(([key, value]) => `${key}=${value.replace(/\n/g, '\\n')}`)

  writeFileSync(envPath, lines.join('\n') + (lines.length ? '\n' : ''))
} catch (error) {
  console.error('[corn2p] Failed to parse config.json:', error)
}
NODE
fi

export dotenv_config_path="${ENV_FILE}"
exec node -r dotenv/config dist/index.js
