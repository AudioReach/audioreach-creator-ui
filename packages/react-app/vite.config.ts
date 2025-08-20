import generouted from "@generouted/react-router/plugin"
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
  plugins: [react(), generouted()],
  resolve: {
    alias: {
      "~assets": resolve(__dirname, "./src/assets"),
      "~data": resolve(__dirname, "./src/data"),
      "~entities": resolve(__dirname, "./src/entities"),
      "~features": resolve(__dirname, "./src/features"),
      "~pages": resolve(__dirname, "./src/pages"),
      "~shared": resolve(__dirname, "./src/shared"),
      "~widgets": resolve(__dirname, "./src/widgets"),
    },
  },
})
