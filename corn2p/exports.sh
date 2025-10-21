#!/usr/bin/env bash

# Default data directory for Umbrel runtime
default_corn2p_data_dir="${APP_DATA_DIR:-$PWD/.umbrel-data}"

export APP_DATA_DIR="${APP_DATA_DIR:-$default_corn2p_data_dir}"
export CORN2P_DATA_DIR="${CORN2P_DATA_DIR:-/data}"
export CORN2P_UI_PORT="${CORN2P_UI_PORT:-2121}"
