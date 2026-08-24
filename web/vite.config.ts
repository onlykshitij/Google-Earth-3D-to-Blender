import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// The add-on serves the built files from its own folder over loopback, so the
// bundle is emitted straight into the add-on and uses relative asset paths.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  build: {
    outDir: "../google_map_export_bridge/web",
    emptyOutDir: true,
    assetsDir: "assets",
  },
  server: {
    // `npm run dev` talks to a running Blender instance instead of serving the
    // API itself.
    proxy: { "/api": "http://127.0.0.1:8777" },
  },
});
