/**
 * Build script for the CLI
 *
 * This script bundles the CLI for distribution using esbuild or similar.
 * For now, we rely on tsx for development.
 *
 * Usage:
 *   npx tsx scripts/build-cli.ts
 *
 * For production builds, consider using:
 *   - esbuild for fast bundling
 *   - pkg for creating standalone executables
 *   - tsup for library bundling with dts
 */

import { execSync } from 'child_process';

console.log('Building CLI...');

// TypeScript compilation
execSync('npx tsc', { stdio: 'inherit' });

console.log('CLI built successfully!');
console.log('Run with: node dist/cli/index.js');
