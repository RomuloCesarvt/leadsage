// Sobe o app real com login e API simulados, so para medir layout.
// Uso: npx vite --config vite.qa.config.ts --port 5198
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'firebase/auth': path.resolve(__dirname, './qa/stubs/firebase-auth.ts'),
      'firebase/firestore': path.resolve(__dirname, './qa/stubs/firebase-firestore.ts'),
      'firebase/app': path.resolve(__dirname, './qa/stubs/firebase-app.ts'),
    },
  },
  server: { port: 5198 },
})
