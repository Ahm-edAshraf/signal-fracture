#!/usr/bin/env bash

set -euo pipefail
set +x

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "$script_dir/.." && pwd)"
cd "$project_root"

for required_command in bunx railway vercel; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    printf 'Required command is unavailable: %s\n' "$required_command" >&2
    exit 1
  fi
done

operator_secret=""
operator_secret_confirmation=""
cleanup() {
  unset operator_secret operator_secret_confirmation
}
trap cleanup EXIT INT TERM

printf 'Choose a new OPERATOR_SECRET (32+ characters) and save it in your password manager.\n' >/dev/tty
printf 'New operator secret: ' >/dev/tty
IFS= read -r -s operator_secret </dev/tty
printf '\nConfirm operator secret: ' >/dev/tty
IFS= read -r -s operator_secret_confirmation </dev/tty
printf '\n' >/dev/tty

if [[ ${#operator_secret} -lt 32 ]]; then
  printf 'The replacement must contain at least 32 characters. Nothing was changed.\n' >&2
  exit 1
fi

if [[ "$operator_secret" != "$operator_secret_confirmation" ]]; then
  printf 'The two entries did not match. Nothing was changed.\n' >&2
  exit 1
fi

printf 'Updating the future Vercel production environment...\n'
if ! printf '%s' "$operator_secret" |
  vercel env update OPERATOR_SECRET production --sensitive --yes >/dev/null; then
  printf 'Vercel update failed. No running deployment was changed.\n' >&2
  exit 1
fi

printf 'Updating the future Railway production environment...\n'
if ! printf '%s' "$operator_secret" |
  railway variable set OPERATOR_SECRET --stdin --skip-deploys >/dev/null; then
  printf 'Railway update failed. Existing deployments still use the previous value.\n' >&2
  exit 1
fi

printf 'Updating the Convex production environment...\n'
if ! printf '%s' "$operator_secret" |
  bunx convex env set OPERATOR_SECRET --prod >/dev/null; then
  printf 'Convex update failed. Existing deployments still use the previous value.\n' >&2
  exit 1
fi

cleanup

printf 'Redeploying the Railway worker...\n'
railway up --detach

printf 'Redeploying the Vercel web application...\n'
vercel deploy --prod --yes

printf '\nRotation submitted successfully.\n'
printf 'Wait for both deployments to become ready, then authenticate at:\n'
printf 'https://signal-fracture.vercel.app/operator\n'
