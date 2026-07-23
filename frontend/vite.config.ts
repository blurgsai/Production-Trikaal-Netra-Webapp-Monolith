import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
// @ts-expect-error plugin types use `export =` while the ESM build has a default export
import cesium from 'vite-plugin-cesium-build'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), cesium()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
