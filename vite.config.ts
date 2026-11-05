import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue2"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      // The app decides when to reload (see src/main.ts), so don't auto-update.
      registerType: "prompt",
      // Keep the filename used by the previous Vue CLI build, so that existing
      // installs pick up the new service worker instead of keeping the old one.
      filename: "service-worker.js",
      includeAssets: ["favicon.ico", "oauth-callback.html"],
      workbox: {
        // Keep oauth-callback.html out of the SPA navigation fallback.
        navigateFallbackDenylist: [/^\/oauth-callback\.html$/]
      },
      manifest: {
        name: "Loopover",
        short_name: "Loopover",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          { src: "img/icons/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "img/icons/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "img/icons/android-chrome-maskable-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "img/icons/android-chrome-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
})
