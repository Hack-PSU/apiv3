import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    // Main entry
    index: 'index.ts',
    // Config
    'config/index': 'config/index.ts',
    // Context
    'context/index': 'context/index.ts',
    // API modules
    'api/analytics/index': 'api/analytics/index.ts',
    'api/apple/index': 'api/apple/index.ts',
    'api/event/index': 'api/event/index.ts',
    'api/extra-credit/index': 'api/extra-credit/index.ts',
    'api/finance/index': 'api/finance/index.ts',
    'api/flag/index': 'api/flag/index.ts',
    'api/hackathon/index': 'api/hackathon/index.ts',
    'api/judging/index': 'api/judging/index.ts',
    'api/location/index': 'api/location/index.ts',
    'api/organizer/index': 'api/organizer/index.ts',
    'api/photos/index': 'api/photos/index.ts',
    'api/registration/index': 'api/registration/index.ts',
    'api/reservation/index': 'api/reservation/index.ts',
    'api/scan/index': 'api/scan/index.ts',
    'api/sponsor/index': 'api/sponsor/index.ts',
    'api/team/index': 'api/team/index.ts',
    'api/user/index': 'api/user/index.ts',
    'api/wallet/index': 'api/wallet/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'next'],
  treeshake: true,
});
