import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate", // Actualiza la app automáticamente cuando subas cambios
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "Tracking",
        short_name: "Tracking",
        description: "App para monitorear piezas en tiempo real",
        theme_color: "#ffffff",
        icons: [
          {
            src: "gear.svg",
            sizes: "any", // Esto le dice al navegador que el SVG sirve para cualquier tamaño
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "icon-512.png", // El "respaldo" obligatorio para Windows/Android
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable", // Optimiza cómo se ve el icono en móviles
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
