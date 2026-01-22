import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Force Vite to rebuild optimized deps. Our previous cache still had a React 19
  // compatible build of @react-leaflet/core (using Context as Provider), which
  // breaks on React 18 with: "render2 is not a function".
  cacheDir: "node_modules/.vite-geo-visor",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  optimizeDeps: {
    include: ["leaflet", "react-leaflet", "@react-leaflet/core"],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
