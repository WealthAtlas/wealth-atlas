# Wealth Atlas

A minimal React PWA built with Vite, TypeScript, and Material-UI.

## Quick Start

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Start development server**

   ```bash
   pnpm dev
   ```

   Opens [http://localhost:3000](http://localhost:3000)

3. **Build for production**
   ```bash
   pnpm build
   ```

## Configuration

### Sync API Configuration

The app supports configurable sync API endpoints via environment variables.

1. **Copy environment template**

   ```bash
   cp .env.example .env.local
   ```

2. **Configure sync API (optional)**

   ```bash
   # In .env.local
   VITE_SYNC_API_URL=https://your-api-endpoint.com
   ```

   If not set, defaults to: `https://qjtqi1soth.execute-api.us-east-1.amazonaws.com/dev`

## Tech Stack

- **React 18** - UI framework
- **TypeScript 5** - Type safety
- **Vite** - Fast build tool
- **Material-UI** - Component library
- **PWA** - Progressive Web App support

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm test` - Run tests
- `pnpm test:run` - Run tests once
- `pnpm quality` - Run type check, linting, and formatting

## Features

- ⚡ Lightning fast development with Vite
- 📱 PWA ready
- 🎨 Material-UI components
- 🔒 TypeScript support
- 📦 Zero configuration
- 🔄 Configurable sync API endpoints
