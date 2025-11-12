import react from "@vitejs/plugin-react"
import {resolve} from "path"
import {defineConfig} from "vite"

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: ["**/*.xml"],
  base: "",
  build: {
    emptyOutDir: true,
    outDir: "dist",
  },
  css: {
    modules: {
      localsConvention: "camelCase",
    },
    transformer: "postcss",
  },
  plugins: [react()],
  resolve: {
    alias: {
      "~assets": resolve(__dirname, "./src/assets"),
      "~data": resolve(__dirname, "./src/data"),
      "~entities": resolve(__dirname, "./src/entities"),
      "~features": resolve(__dirname, "./src/features"),
      "~shared": resolve(__dirname, "./src/shared"),
      "~widgets": resolve(__dirname, "./src/widgets"),
    },
  },
  server: {
    sourcemapIgnoreList: () => false,
  },
})
