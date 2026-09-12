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

Publishing uses `npm publish`. Yarn is only used to install and build; it is not
involved in publishing.

`@hackpsu/react-sdk` already exists on npm (last published 0.2.1 in December
2025). `@hackpsu/api-client` is new, so it needs one manual publish before CI can
take over.

### Bootstrap, once

```bash
npm login                      # a maintainer of the @hackpsu scope
cd packages && yarn install && yarn build
cd api-client && npm publish --access public
cd ../react-sdk && npm publish --access public
```

### Then pick how CI authenticates

**Option A: automation token.** Create a granular access token on npmjs.com with
read and write on the `@hackpsu` scope, then add it as the `NPM_TOKEN` repository
secret. Fewest steps, and the only option that works before a package exists.

**Option B: trusted publishing (OIDC).** No secret at all. On npmjs.com, open each
package's Settings, add a trusted publisher pointing at `Hack-PSU/apiv3` with
workflow filename `sdk.yml`, then delete the `NPM_TOKEN` secret. The workflow
already requests `id-token: write` and upgrades npm, so nothing else changes.
This requires the package to already exist, which is why the bootstrap above
comes first.

Option B is worth moving to once things are running, since it removes a
long-lived credential.

### SDK_RELEASE_TOKEN

Only needed if branch protection on `main` rejects the release commit pushed by
`github-actions[bot]`. If so, add a fine-grained PAT with `contents: write` as
`SDK_RELEASE_TOKEN`. Otherwise the built-in `GITHUB_TOKEN` is used and no secret
is required.

### Why not GitHub Packages

GitHub Packages would remove the publish credential, but its npm registry
requires authentication to *install*, even for public packages. Every frontend
repo and every Vercel deployment would need a PAT in `.npmrc`. That trades a
one-time setup cost for permanent friction on exactly the repos we want to adopt
this, so npmjs public is the better fit.
