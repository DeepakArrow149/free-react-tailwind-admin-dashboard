import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { visualizer } from "rollup-plugin-visualizer";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
    // Writes dist/stats.html after `pnpm build:web` so we can audit chunk
    // sizes. Doesn't run during `pnpm dev`. Open the file in a browser
    // for a treemap view.
    visualizer({
      filename: "dist/stats.html",
      gzipSize: true,
      brotliSize: true,
      template: "treemap",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@erp/shared-types": path.resolve(__dirname, "../../packages/shared-types/src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        timeout: 120000, // 2 min — AI chat calls can take 30-90s
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core framework — small, almost every page needs it.
          vendor: ["react", "react-dom", "react-router"],
          ui: ["clsx", "tailwind-merge"],

          // Heavy deps used by only a few routes — splitting these keeps
          // the initial bundle small. Routes that need them load the chunk
          // on demand (assuming the consumer is dynamic-imported; for
          // statically-imported callers the chunk is fetched at app boot
          // but parallel to vendor, so still a win).
          charts: ["apexcharts", "react-apexcharts"],
          calendar: [
            "@fullcalendar/core",
            "@fullcalendar/daygrid",
            "@fullcalendar/interaction",
            "@fullcalendar/list",
            "@fullcalendar/react",
            "@fullcalendar/timegrid",
          ],
          dnd: ["react-dnd", "react-dnd-html5-backend"],
          sanitize: ["dompurify"],
          date: ["date-fns"],
        },
      },
    },
  },
});
