import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  base: '/',
  server: {
    host: true,
    port: 3000,
  },
  resolve: {
    alias: {
      'leafer-ui': path.resolve(__dirname, 'node_modules/leafer-ui/dist/web.module.js'),
    },
  },
})
