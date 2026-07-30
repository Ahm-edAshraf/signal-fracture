#!/usr/bin/env bash
set -euo pipefail

set -a
source "$HOME/.config/signal-fracture/secrets.env"
set +a

exec codex
