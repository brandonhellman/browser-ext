/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production';
    // Add your environment variables here
    // Only variables prefixed with BROWSER_EXT_ will be available
    BROWSER_EXT_API_KEY?: string;
    BROWSER_EXT_APP_NAME?: string;
  }
}
