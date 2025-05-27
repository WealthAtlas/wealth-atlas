# WealthAtlas Monorepo Development Guide

This project is set up as an npm workspace monorepo, which allows us to manage multiple packages/applications in a single repository with shared dependencies.

## Setup

### Prerequisites
- Node.js 18 or later

### Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd wealth-atlas
npm install
```

## Project Structure

```
wealth-atlas/
├── apps/
│   ├── backend/  # NestJS backend
│   └── frontend/ # NextJS frontend
└── package.json  # Root package.json
```

## Development Commands

### Running the Backend

```bash
# Development mode
npm run dev:backend

# Production build
npm run build:backend
npm run -w apps/backend start
```

### Running the Frontend

```bash
# Development mode
npm run dev:frontend

# Generate GraphQL types
npm run -w apps/frontend codegen

# Production build
npm run build:frontend
```

### Running Both Services

You can run both services in parallel using:

```bash
npm run dev
```

## Deployment

When deploying, we use npm throughout the CI/CD pipeline to ensure consistent builds. The deployment scripts and Docker configurations are all set up to use npm workspaces.

### Building Docker Images

```bash
docker build -t wealth-atlas-backend:latest -f Dockerfile.backend .
```

## Adding Dependencies

### Adding a dependency to a specific app

```bash
# Adding a production dependency to backend
npm install -w apps/backend @nestjs/graphql

# Adding a dev dependency to frontend
npm install -w apps/frontend --save-dev @types/react
```

### Adding a dependency to the root

```bash
npm install typescript
```

## Using Shared Packages

If you want to create shared libraries/packages between apps, you can add them to a `packages/` directory and reference them in your apps.

## Troubleshooting

### Common Issues

1. **Missing dependencies**: Make sure you've run `npm install` after pulling new changes
2. **Build errors**: Clear the build cache with `npm run -w apps/frontend -- rm -rf .next` or `npm run -w apps/backend -- rm -rf dist`
3. **Node version**: Ensure your Node.js version matches the one specified in the engines field of package.json
