# npm Deployment Guide

This document provides instructions for deploying the application using npm instead of pnpm.

## Key Changes

We've migrated from pnpm to standard npm for simplicity and wider compatibility. This change was made because:
- npm is more widely used and understood
- It reduces complexity in CI/CD pipelines
- It's more compatible with third-party tools

## Local Development

### Setup

1. Install dependencies:
```bash
npm install
```

2. Run the backend:
```bash
npm run dev:backend
```

3. Run the frontend:
```bash
npm run dev:frontend
```

### Common Commands

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Build backend | `npm run build:backend` |
| Build frontend | `npm run build:frontend` |
| Run both services | `npm run dev` |
| Add dependency to backend | `npm install -w apps/backend express` |
| Add dev dependency to frontend | `npm install -w apps/frontend --save-dev @types/react` |

## Docker Build

The Dockerfile has been updated to use npm. Build with:

```bash
docker build -t wealth-atlas-backend:latest -f Dockerfile.backend .
```

## CI/CD

The GitHub Actions workflows have been updated to use npm's native workspace capabilities. No changes are needed to your deployment process.

## AWS Deployment

The AWS deployment process remains the same - only the underlying tool has changed from pnpm to npm.

## Notes for Contributors

If you're used to pnpm commands, here's how they map to npm:

| pnpm command | npm command |
|-------------|-------------|
| `pnpm install` | `npm install` |
| `pnpm --filter backend add package` | `npm install -w apps/backend package` |
| `pnpm -r build` | `npm run --workspaces build` |
| `pnpm --filter backend build` | `npm run -w apps/backend build` |

## Troubleshooting

If you encounter issues after migrating:

1. Delete `node_modules` and the lock file:
```bash
rm -rf node_modules apps/*/node_modules package-lock.json
```

2. Reinstall dependencies:
```bash
npm install
```
