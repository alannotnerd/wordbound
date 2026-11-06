import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  base: "/wordbound/",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon-192.png", "icon-512.png", "city.svg"],
      manifest: {
        name: "Wordbound · 言契之城",
        short_name: "Wordbound",
        lang: "zh-CN",
        description: "以语言修复契约的离线冒险",
        start_url: "/wordbound/",
        scope: "/wordbound/",
        display: "standalone",
        background_color: "#102d35",
        theme_color: "#102d35",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallback: "index.html",
      },
    }),
  ],
});
