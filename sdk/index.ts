/**
 * @hackpsu/react-sdk
 * Shared React hooks, providers, and API clients for HackPSU projects
 *
 * @example
 * // Import providers and context
 * import { LayoutProvider, useFirebase } from '@hackpsu/react-sdk';
 *
 * // Import specific API modules
 * import { useAllRegistrations } from '@hackpsu/react-sdk/api/registration';
 * import { useAllEvents } from '@hackpsu/react-sdk/api/event';
 */

// Config exports
export * from './config';

// Context exports (Providers and hooks)
export * from './context';

// Note: API modules are NOT exported from the main entry point to avoid naming conflicts
// (e.g., many modules export getAllX, getX, etc.)
//
// Instead, import API modules directly:
// import { useAllRegistrations } from '@hackpsu/react-sdk/api/registration';
// import { useAllEvents } from '@hackpsu/react-sdk/api/event';
// ... and so on
