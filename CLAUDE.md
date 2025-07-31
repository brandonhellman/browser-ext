# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo for `@browser-ext`, a framework for building browser extensions with modern tooling. It provides a zero-configuration setup with TypeScript, React, and hot reload support for Chrome extension development (Manifest V3).

## Repository Structure

```
browser-ext/
├── apps/web/          # Documentation website (Next.js + Nextra)
├── examples/          # Example browser extensions
├── packages/
│   ├── create/        # NPX create tool for scaffolding new extensions
│   ├── scripts/       # Core CLI tool and build system
│   ├── storage/       # Browser storage utilities
│   └── utils/         # Shared utilities
```

## Essential Commands

### Development

```bash
# Install dependencies (use Yarn, not npm)
yarn install

# Start development mode for all packages
yarn dev

# Start dev mode for a specific extension
cd examples/with-all && yarn dev

# The browser-ext CLI provides these commands:
browser-ext dev              # Start with hot reload (port 9876 by default)
browser-ext dev --port 3000  # Custom port
browser-ext dev --reload false # Disable hot reload
```

### Building

```bash
# Build all packages in monorepo
yarn build

# Build a specific extension
cd examples/with-all && yarn build

# Build and create zip for distribution
browser-ext build-and-zip

# Just create zip from existing build
browser-ext zip
```

### Code Quality

```bash
# Format all code with Prettier
yarn format

# No ESLint or test commands are configured at root level
```

## Architecture

### Browser Extension Structure

Extensions built with this framework follow this pattern:

```
extension/
├── manifest.json       # Chrome extension manifest V3
├── src/
│   ├── background/    # Service worker scripts
│   ├── contents/      # Content scripts and styles
│   └── popup/         # Popup UI (supports React)
```

### Build System

- **Webpack 5** with custom configuration for browser extensions
- Automatic entry point detection from manifest.json
- Built-in support for:
  - React 18 and TypeScript
  - Hot reload via WebSocket connection
  - CSS/PostCSS/Tailwind CSS
  - Static asset handling
  - Locale file management

### Key Packages

1. **@browser-ext/scripts**: Core CLI and Webpack configuration
   - Contains all build logic in `src/webpack/`
   - Custom plugins for manifest handling, HTML processing, and hot reload
2. **@browser-ext/storage**: Browser storage API utilities
   - Wraps chrome.storage APIs with better TypeScript support
3. **@browser-ext/create**: Scaffolding tool for new extensions
   - Used via `npx @browser-ext/create`

## Development Workflow

1. **Creating a new extension**:

   ```bash
   npx @browser-ext/create my-extension
   cd my-extension
   yarn install
   yarn dev
   ```

2. **Modifying the build system**:
   - Core Webpack config: `packages/scripts/src/webpack/webpack.config.ts`
   - CLI commands: `packages/scripts/src/index.ts`

3. **Adding features to an extension**:
   - Background script: Add to `src/background/index.ts`
   - Content script: Add to `src/contents/` and reference in manifest.json
   - Popup: Modify `src/popup/`

4. **Publishing updates**:
   - Update version in relevant package.json
   - Run `yarn build` at root to ensure all packages build
   - The scripts package is published to npm as `@browser-ext/scripts`

## Working on @browser-ext/core Package

The core package has a special development setup for testing in external projects:

1. **Development mode with auto-linking**:
   ```bash
   cd packages/core
   yarn dev  # Automatically builds, links, and watches
   ```

2. **Testing in external projects**:
   ```bash
   # In your test project (one-time)
   yarn link "@browser-ext/core"
   ```

The `yarn dev` command in the core package:
- Performs a clean build
- Creates a global yarn link automatically
- Watches for changes with hot rebuild
- Ensures the package is always ready for external testing

## Important Notes

- Always use Yarn, not npm (the project uses Yarn workspaces)
- Node.js >=18 is required
- The framework handles all Webpack complexity - avoid manual Webpack configuration
- Hot reload works by injecting a WebSocket client that connects to the dev server
- Build outputs go to `dist/` directory in each package/example
- When working on the CLI tool, changes require rebuilding the scripts package first
