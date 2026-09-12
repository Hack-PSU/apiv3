# HackPSU frontend packages

Two published packages that keep every HackPSU frontend in sync with this API.

| Package | What it is | Hand-written? |
| --- | --- | --- |
| `@hackpsu/api-client` | Types, fetchers and React Query hooks for all 167 API operations | No: generated from `openapi.json` |
| `@hackpsu/react-sdk` | SSO session, Firebase, role-based `AuthGuard`, React Query wiring, and a re-export of the client | Yes |

Apps normally install **`@hackpsu/react-sdk`** only; it re-exports everything in
`@hackpsu/api-client`.

## Why this exists

`adminv2`, `finance-dashboard` and `inventory` each kept their own hand-written
copy of `src/common/api/{entity,provider,hook}.ts`, and the old SDK was a fourth
copy. They drifted: `EventEntity.fastPass` existed in `adminv2` and in the API
but not in the SDK; `location.capacity` existed in the SDK but not in `adminv2`.
Nothing could detect that, because nothing tied the copies to the API.

The API already describes itself completely: every controller uses `@ApiDoc`,
every entity uses `@ApiProperty`. That description is now the single source of
truth, and the client is derived from it.

## The pipeline

```
NestJS controllers + entities
  |  yarn openapi                      (repo root; no DB or credentials needed)
  v
openapi.json                           committed artifact, 115 paths / 117 schemas
  |  yarn generate                     (in packages/)
  v
packages/api-client/src/generated/     committed, never hand-edited
  |  yarn build
  v
@hackpsu/api-client -> @hackpsu/react-sdk -> npm
```

CI (`.github/workflows/sdk.yml`) runs this on every push to `main`, fails the
build if the committed client is stale, and publishes a patch release whenever
the spec changes.

## Working on the packages

```bash
# from the repo root: regenerate the spec from the running NestJS app definition
yarn openapi

cd packages
yarn install
yarn generate     # openapi.json -> src/generated
yarn typecheck
yarn test         # builds, then exercises the built bundle
yarn build
```

Never edit `packages/api-client/src/generated`: change the NestJS controller or
entity and regenerate. If a field is missing from the generated types, the fix is
almost always a missing `@ApiProperty()` or an `@ApiDoc({ response })` on the
controller method.

## Using it in an app

```tsx
// app/layout.tsx: a server component
import { HackPSUProvider, Role } from "@hackpsu/react-sdk";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <HackPSUProvider
          config={{
            firebase: {
              apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
              authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
              projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
              storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
              messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
              appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
            },
            apiBaseUrl: process.env.NEXT_PUBLIC_BASE_URL_V3!,
            minimumRole: Role.TEAM,
          }}
        >
          {children}
        </HackPSUProvider>
      </body>
    </html>
  );
}
```

```tsx
"use client";
import { useEventGetAll, useEventCreateOne } from "@hackpsu/react-sdk";

export function Events() {
  const { data: events, isLoading } = useEventGetAll({ hackathonId });
  const createEvent = useEventCreateOne();
  // events is EventEntityResponse[]: fastPass, wsUrls: string[], location.capacity all typed
}
```

### Config is passed in, not read from the environment

The package never reads `process.env`. Bundlers only inline `NEXT_PUBLIC_*` into
code they compile, and they do not compile `node_modules`: so an env read baked
into a published package resolves to `undefined` in the consumer's browser
bundle. That is why the previous release appeared to install fine and then
failed at runtime with an invalid Firebase API key. The app reads its own env and
passes the values to `HackPSUProvider`.

### Hook naming

Hooks are named from the API's `operationId`, which
`scripts/generate-openapi.ts` shapes as `<resource>_<method>`:

| Route | Hook |
| --- | --- |
| `GET /events` | `useEventGetAll` |
| `GET /events/{id}` | `useEventGetOne` |
| `POST /events` | `useEventCreateOne` |
| `PATCH /events/{id}` | `useEventPatchOne` |
| `GET /hackathons/active` | `useHackathonGetActive` |

GET operations generate queries; everything else generates mutations.

## Auth

`@hackpsu/react-sdk` preserves the existing HackPSU SSO flow:

1. `GET {authServiceUrl}/api/sessionUser` with `credentials: "include"`.
2. `401` redirects to `{authServiceUrl}/login?returnTo=<current url>`.
3. Otherwise exchange the returned `customToken` via `signInWithCustomToken`.
4. Identify the user in PostHog (optional, lazily imported).
5. `logout()` calls `POST {authServiceUrl}/api/sessionLogout`, then Firebase `signOut`.

`AuthGuard` enforces `minimumRole`, retries a stalled session check three times,
then redirects.

**API requests are authorized with the Firebase ID token**, not the custom token.
That matches what the API validates. `getRole()` accepts either token shape: ID
tokens carry custom claims at the top level, custom tokens nest them under
`claims`.

## Release setup

The packages are hosted in **Google Artifact Registry**, not npmjs.org, reusing
the project and CI service account already used to deploy the API.

```
registry: https://us-east4-npm.pkg.dev/hackpsu-408118/npm/
```

### One-time infrastructure

```bash
gcloud auth login              # an account with admin on hackpsu-408118
bash packages/scripts/setup-artifact-registry.sh
```

That creates the npm repository and grants `allUsers` the reader role so installs
need no credentials. It is idempotent.

CI needs no extra binding: `api-v3-github-action`, the identity behind
`GCP_DEPLOYER_SA_KEY`, already holds `roles/artifactregistry.writer` at the
project level.

### One-time first publish

Artifact Registry has nothing to publish against until a first version exists:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
cd packages
yarn install && yarn build
npx google-artifactregistry-auth --repo-config=./.npmrc --credential-config="$HOME/.npmrc"
(cd api-client && npm publish)
(cd react-sdk && npm publish)
```

After that, CI publishes a patch release on every spec change. No new repository
secret is needed: the publish job reuses `GCP_DEPLOYER_SA_KEY`.

### What consumers need

One line in each consuming repo's `.npmrc`, and no credentials:

```
@hackpsu:registry=https://us-east4-npm.pkg.dev/hackpsu-408118/npm/
```

Do not copy the `always-auth` line from `packages/.npmrc`. That one exists only
so CI can publish; adding it to a consumer would force authentication on install
and defeat the public read access.

### Why not npmjs.org

npm now requires an interactive 2FA challenge to publish and to change package
settings, with every bypass removed, and
[bypass-2FA tokens lose direct-publish ability in January 2027](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/).
That would have meant enabling 2FA on a shared account and keeping the seed
somewhere the whole team can reach. Artifact Registry reuses credentials the
project already has and adds no new secret.

`@hackpsu/react-sdk@0.2.1` still exists on npmjs.org from the earlier attempt. It
is abandoned; anything pointing at it should move to the registry above.

### SDK_RELEASE_TOKEN

Only needed if branch protection on `main` rejects the release commit pushed by
`github-actions[bot]`. If so, add a fine-grained PAT with `contents: write` as
`SDK_RELEASE_TOKEN`. Otherwise the built-in `GITHUB_TOKEN` is used.
