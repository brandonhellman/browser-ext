# @browser-ext/core

A Vite-powered build system for browser extensions with automatic type inference and intelligent defaults.

## Features

- 🚀 **5-10x faster builds** with Vite instead of Webpack
- 🔥 **Hot reload without WebSocket ports** - uses Chrome runtime API
- 🧠 **Automatic type inference** - generates TypeScript types for messaging and storage
- 📦 **Zero configuration** - works out of the box
- 🎯 **Intelligent defaults** - auto-discovers entry points from manifest.json
- 🎨 **PostCSS support** - works with Tailwind CSS and other PostCSS plugins
- 📁 **Smart asset handling** - automatically processes all extension assets

## Installation

```bash
npm install --save-dev @browser-ext/core
# or
yarn add -D @browser-ext/core
# or
pnpm add -D @browser-ext/core
```

## Usage

### Zero Configuration

Just like `@browser-ext/scripts`, no configuration needed! Add to your `package.json`:

```json
{
  "scripts": {
    "dev": "browser-ext dev",
    "build": "browser-ext build",
    "zip": "browser-ext zip",
    "build-and-zip": "browser-ext build-and-zip"
  }
}
```

### Project Structure

```
my-extension/
├── manifest.json          # Extension manifest
├── package.json          # Project config
├── src/
│   ├── background/       # Background scripts
│   │   └── index.ts
│   ├── contents/         # Content scripts
│   │   ├── index.ts
│   │   └── styles.css
│   └── popup/           # Extension pages
│       ├── index.html
│       └── index.tsx
├── assets/              # Static assets
│   └── icon-128.png
├── _locales/           # Localization files
└── postcss.config.js   # Optional: PostCSS config
```

## Intelligent Features

### 1. Automatic Entry Discovery

The build system automatically finds all entry points:
- Background scripts from `manifest.json`
- Content scripts from `manifest.json`
- Scripts in HTML files by parsing `<script>` tags
- No manual configuration needed!

### 2. Smart Manifest Processing

- Auto-fills `name`, `version`, and `description` from `package.json`
- Converts `.ts`/`.tsx` extensions to `.js` automatically
- Adds development timestamp for hot reload

### 3. Asset Management

Automatically discovers and processes:
- **CSS files** - with PostCSS/Tailwind support
- **Icons** - from manifest `icons` field
- **HTML files** - with script src updates
- **Locales** - from `_locales` directory
- **Web accessible resources** - with glob support

### 4. Hot Reload (No Ports!)

Unlike traditional WebSocket-based hot reload:
- No port configuration needed
- Works behind corporate firewalls
- Uses Chrome's native runtime API
- Automatic reload on file changes

### 5. Automatic Type Inference

Generates TypeScript types automatically from your code:

```typescript
// Your code
chrome.runtime.sendMessage({ type: 'HELLO', data: 'world' });

// Auto-generated types
type MessageType = 'HELLO' | 'OTHER_TYPE';
interface MessageMap {
  'HELLO': { type: 'HELLO'; data: string; };
}
```

## Configuration (Optional)

For most projects, no configuration is needed. But if you need to customize:

### Create `vite.config.ts`:

```typescript
import { defineConfig } from '@browser-ext/core'

export default defineConfig({
  // Disable features
  typeInference: false,  // Disable automatic type generation
  hotReload: false,      // Disable hot reload
  
  // Add custom Vite config
  vite: {
    build: {
      outDir: 'custom-dist',
      sourcemap: true,
    },
    plugins: [
      // Your custom Vite plugins
    ],
  },
})
```

## CLI Commands

### `browser-ext dev`

Start development server with hot reload:
```bash
browser-ext dev
browser-ext dev --port 3000      # Custom port
browser-ext dev --no-reload      # Disable hot reload
```

### `browser-ext build`

Build for production:
```bash
browser-ext build
```

### `browser-ext zip`

Create distribution zip:
```bash
browser-ext zip
```

### `browser-ext build-and-zip`

Build and zip in one command:
```bash
browser-ext build-and-zip
```

## Environment Variables

Supports `.env` files with `BROWSER_EXT_` prefix:

```env
# .env
BROWSER_EXT_API_KEY=your-api-key
BROWSER_EXT_API_URL=https://api.example.com
```

Access in your code:
```typescript
console.log(process.env.BROWSER_EXT_API_KEY);
```

## PostCSS & Tailwind CSS

Add a `postcss.config.js` to your project root:

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

CSS files referenced in your manifest will be automatically processed.

## TypeScript

Full TypeScript support out of the box:
- Automatic `.ts` → `.js` conversion
- Type checking during build
- Source maps in development
- Works with `@types/chrome`

## Generated Type Definitions

After building, check `browser-ext.d.ts` for auto-generated types:
- Message types from `chrome.runtime.sendMessage`
- Storage types from `chrome.storage` usage
- Automatic type safety across your extension

## Migration from @browser-ext/scripts

1. Replace `@browser-ext/scripts` with `@browser-ext/core` in `package.json`
2. That's it! The same CLI commands work

### What's Different?

- **Faster builds** - Vite is significantly faster than Webpack
- **No WebSocket ports** - Hot reload works without configuration
- **Type inference** - Automatic TypeScript types for messaging
- **Better defaults** - Smarter asset discovery and handling

### What's the Same?

- Same CLI commands
- Same project structure
- Same intelligent defaults
- Same zero-configuration philosophy

## Troubleshooting

### CSS not updating?
- Make sure you have a `postcss.config.js` if using Tailwind
- CSS files must be referenced in `manifest.json` to be processed

### Hot reload not working?
- Check that your manifest has the correct permissions
- Background scripts need to be service workers (Manifest V3)
- Try running with `--no-reload` flag to diagnose

### Types not generating?
- Make sure you're using object literals in `sendMessage` calls
- Check `browser-ext.d.ts` after building
- Type inference only works with specific patterns

## License

MIT