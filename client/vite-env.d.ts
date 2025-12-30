/// <reference types="vite/client" />

// Vite provides ImportMetaEnv and ImportMeta interfaces via vite/client
// Add custom env vars below by extending ImportMetaEnv interface
interface ImportMetaEnv {
  // No custom env vars currently
  readonly BASE_URL?: string
}
