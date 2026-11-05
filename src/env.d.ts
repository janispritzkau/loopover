/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_TITLE: string
  readonly VITE_API: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_DISCORD_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
