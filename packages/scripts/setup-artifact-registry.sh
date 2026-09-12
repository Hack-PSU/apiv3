#!/usr/bin/env bash
#
# One-time setup for the Artifact Registry npm repository that hosts
# @hackpsu/api-client and @hackpsu/react-sdk.
#
# Creates the repository, opens it for public reads so consumers install with no
# credentials, and grants the CI deployer service account write access.
#
# Requires a gcloud login with admin rights on the project:
#   gcloud auth login
#   bash packages/scripts/setup-artifact-registry.sh
#
# Safe to re-run: every step checks first.

set -euo pipefail

PROJECT="${GCP_PROJECT:-hackpsu-408118}"
LOCATION="${GCP_LOCATION:-us-east4}"
REPO="${AR_REPO:-npm}"

info() { printf '\n\033[1m%s\033[0m\n' "$1"; }
skip() { printf '  already done: %s\n' "$1"; }

info "Project $PROJECT, location $LOCATION, repository $REPO"

if ! gcloud projects describe "$PROJECT" >/dev/null 2>&1; then
  echo "Cannot reach project $PROJECT. Run 'gcloud auth login' with an account that has access." >&2
  exit 1
fi

info "Enabling the Artifact Registry API"
gcloud services enable artifactregistry.googleapis.com --project="$PROJECT" --quiet

info "Creating the npm repository"
if gcloud artifacts repositories describe "$REPO" \
     --project="$PROJECT" --location="$LOCATION" >/dev/null 2>&1; then
  skip "repository $REPO exists"
else
  gcloud artifacts repositories create "$REPO" \
    --repository-format=npm \
    --project="$PROJECT" \
    --location="$LOCATION" \
    --description="HackPSU frontend packages (@hackpsu/api-client, @hackpsu/react-sdk)" \
    --quiet
fi

# Public reads keep adoption cheap: consumers need one .npmrc line and no
# credentials, so Vercel builds and local installs work untouched.
info "Granting public read access"
if gcloud artifacts repositories get-iam-policy "$REPO" \
     --project="$PROJECT" --location="$LOCATION" --format=json 2>/dev/null \
     | grep -q '"allUsers"'; then
  skip "allUsers already has artifactregistry.reader"
else
  gcloud artifacts repositories add-iam-policy-binding "$REPO" \
    --project="$PROJECT" \
    --location="$LOCATION" \
    --member=allUsers \
    --role=roles/artifactregistry.reader \
    --quiet
fi

# The CI deployer publishes. api-v3-github-action already holds
# roles/artifactregistry.writer at the project level, which covers every
# repository including this one, so normally nothing is needed here. Set
# DEPLOYER_SA only if publishing runs as some other identity.
info "Checking CI deployer write access"
if [ -n "${DEPLOYER_SA:-}" ]; then
  gcloud artifacts repositories add-iam-policy-binding "$REPO" \
    --project="$PROJECT" \
    --location="$LOCATION" \
    --member="serviceAccount:$DEPLOYER_SA" \
    --role=roles/artifactregistry.writer \
    --quiet
else
  writers=$(gcloud projects get-iam-policy "$PROJECT" \
    --flatten='bindings[].members' \
    --filter='bindings.role:roles/artifactregistry.writer' \
    --format='value(bindings.members)' 2>/dev/null | tr '\n' ' ')
  echo "  project-level artifactregistry.writer: ${writers:-none}"
  echo "  set DEPLOYER_SA to grant a specific service account instead"
fi

info "Result"
echo "  registry: https://${LOCATION}-npm.pkg.dev/${PROJECT}/${REPO}/"
gcloud artifacts repositories get-iam-policy "$REPO" \
  --project="$PROJECT" --location="$LOCATION" \
  --format='table(bindings.role,bindings.members)' 2>/dev/null | sed 's/^/  /'

cat <<EOF

Next: publish the first versions from your machine, once.

  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
  cd packages
  yarn install && yarn build
  npx google-artifactregistry-auth --repo-config=./.npmrc --credential-config="\$HOME/.npmrc"
  (cd api-client && npm publish)
  (cd react-sdk && npm publish)

After that CI publishes on every spec change, with no new secret.
EOF
