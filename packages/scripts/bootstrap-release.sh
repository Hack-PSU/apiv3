#!/usr/bin/env bash
#
# One-time release bootstrap for @hackpsu/api-client and @hackpsu/react-sdk.
#
# Publishes both packages, then configures npm trusted publishing so GitHub
# Actions can publish later without any stored credential. Every npm write here
# requires a fresh 2FA code, which npm does not allow any automation to supply,
# so the script prompts for one before each operation.
#
# Safe to re-run: it skips whatever is already done.
#
# Usage:  bash packages/scripts/bootstrap-release.sh

set -euo pipefail

REPO="Hack-PSU/apiv3"
WORKFLOW="sdk.yml"
PACKAGES=("api-client" "react-sdk")

cd "$(dirname "$0")/.."

info() { printf '\n\033[1m%s\033[0m\n' "$1"; }
skip() { printf '  already done: %s\n' "$1"; }

prompt_otp() {
  local purpose="$1" otp=""
  while [ -z "$otp" ]; do
    printf '\n  2FA code for %s: ' "$purpose" >&2
    read -r otp
  done
  printf '%s' "$otp"
}

require_login() {
  if ! npm whoami >/dev/null 2>&1; then
    echo "Not logged in to npm. Run 'npm login' first." >&2
    exit 1
  fi
  info "Publishing as $(npm whoami)"
}

published_version() {
  npm view "@hackpsu/$1" version 2>/dev/null || true
}

local_version() {
  node -p "require('./$1/package.json').version"
}

has_trust() {
  npm trust list "@hackpsu/$1" 2>/dev/null | grep -q "$WORKFLOW"
}

require_login

info "Building both packages"
yarn install --frozen-lockfile
yarn build

# Step 1: publish. Trusted publishing cannot be configured for a package that
# does not exist yet, so this has to come first.
for pkg in "${PACKAGES[@]}"; do
  want="$(local_version "$pkg")"
  have="$(published_version "$pkg")"

  info "Publishing @hackpsu/$pkg@$want"
  if [ "$have" = "$want" ]; then
    skip "@hackpsu/$pkg@$want is already on npm"
    continue
  fi

  otp="$(prompt_otp "publishing @hackpsu/$pkg")"
  (cd "$pkg" && npm publish --access public --otp="$otp")
done

# Step 2: hand publishing rights to the workflow itself. After this, no token is
# stored anywhere; npm mints a short-lived credential per workflow run.
for pkg in "${PACKAGES[@]}"; do
  info "Configuring trusted publishing for @hackpsu/$pkg"
  if has_trust "$pkg"; then
    skip "trusted publisher already points at $WORKFLOW"
    continue
  fi

  otp="$(prompt_otp "trusting @hackpsu/$pkg")"
  npm trust github "@hackpsu/$pkg" \
    --repo "$REPO" \
    --file "$WORKFLOW" \
    --allow-publish \
    --otp="$otp" \
    --yes
done

info "Result"
for pkg in "${PACKAGES[@]}"; do
  printf '  @hackpsu/%s@%s\n' "$pkg" "$(published_version "$pkg")"
  npm trust list "@hackpsu/$pkg" 2>/dev/null | sed 's/^/    /' || true
done

cat <<'EOF'

Done. CI can now publish with no stored secret.

If you had added an NPM_TOKEN secret earlier, delete it:
  gh secret delete NPM_TOKEN
EOF
