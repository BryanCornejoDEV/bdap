import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Tailwind v3 se ejecuta vía PostCSS (postcss.config.js). No usamos el plugin de v4.
export default defineConfig({
  plugins: [react()],
})