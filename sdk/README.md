# @hackpsu/react-sdk

Shared React hooks, providers, and API clients for HackPSU projects. This package provides a consistent way to interact with the HackPSU API, manage authentication with Firebase, and share common UI patterns across all HackPSU web applications.

## Installation

```bash
npm install @hackpsu/react-sdk
```

## Required Environment Variables

All projects using this SDK need these environment variables in your `.env.local` or `.env` file:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_database_url
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# API Configuration
NEXT_PUBLIC_BASE_URL_V3=https://api.hackpsu.org/v3
NEXT_PUBLIC_AUTH_SERVICE_URL=https://auth.hackpsu.org
```

## Usage

### 1. Setup Providers

Wrap your application with the `LayoutProvider` to get Firebase authentication, React Query, and auth guards:

```tsx
// app/layout.tsx or pages/_app.tsx
import { LayoutProvider } from '@hackpsu/react-sdk/context';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <LayoutProvider>{children}</LayoutProvider>
      </body>
    </html>
  );
}
```

### 2. Use Authentication

Access Firebase auth state using the `useFirebase` hook:

```tsx
import { useFirebase } from '@hackpsu/react-sdk/context';

export default function ProfilePage() {
  const { user, isLoading, logout } = useFirebase();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  return (
    <div>
      <h1>Welcome, {user.email}</h1>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

### 3. Use API Hooks

The SDK provides React Query hooks for all API endpoints:

```tsx
import { useAllRegistrations, useCreateRegistration } from '@hackpsu/react-sdk/api/registration';

export default function RegistrationsPage() {
  const { data: registrations, isLoading } = useAllRegistrations();
  const createMutation = useCreateRegistration();

  const handleCreate = async () => {
    await createMutation.mutateAsync({
      // registration data
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {registrations?.map(reg => (
        <div key={reg.id}>{reg.name}</div>
      ))}
      <button onClick={handleCreate}>Create Registration</button>
    </div>
  );
}
```

### 4. Custom Auth Guard

You can also use the `AuthGuard` component directly with custom role requirements:

```tsx
import { AuthGuard, Role } from '@hackpsu/react-sdk/context';

export default function AdminPage() {
  return (
    <AuthGuard config={{ minimumRole: Role.EXEC }}>
      <div>Admin content - only visible to executives</div>
    </AuthGuard>
  );
}
```

## Available Modules

### Context

- `FirebaseProvider` - Firebase authentication context
- `useFirebase` - Hook to access Firebase auth state
- `LayoutProvider` - Complete layout setup with Firebase, React Query, and auth
- `AuthGuard` - Component to protect routes with role-based access
- `Role` - Enum for role levels

### Config

- `auth` - Initialized Firebase auth instance
- `getEnvironment` - Function to get environment configuration

### API Modules

Each API module exports:
- Entity types (TypeScript interfaces)
- Provider functions (raw API calls)
- React Query hooks (useQuery/useMutation)

Available modules:
- `api/analytics`
- `api/event`
- `api/extra-credit`
- `api/finance`
- `api/flag`
- `api/hackathon`
- `api/judging`
- `api/location`
- `api/organizer`
- `api/photos`
- `api/registration`
- `api/reservation`
- `api/scan`
- `api/sponsor`
- `api/team`
- `api/user`
- `api/wallet`

## Examples

### Import specific modules

```tsx
// Import from specific subpaths
import { useFirebase } from '@hackpsu/react-sdk/context';
import { auth } from '@hackpsu/react-sdk/config';
import { useAllEvents } from '@hackpsu/react-sdk/api/event';
```

### Import everything (not recommended for production)

```tsx
// Import everything at once (larger bundle size)
import { useFirebase, useAllEvents, auth } from '@hackpsu/react-sdk';
```

## Development

To build the package:

```bash
cd lib
npm install
npm run build
```

## Publishing

This package is published to npm under the `@hackpsu` organization:

```bash
cd lib
npm version patch  # or minor, or major
npm publish
```

## License

MIT
