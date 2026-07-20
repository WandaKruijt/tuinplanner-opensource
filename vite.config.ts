import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// In demomodus (--mode demo) worden de firebase-modules vervangen door
// in-memory shims, zodat de app zonder Firebase-project draait met
// voorbeelddata. Zie src/demo/README.md voor uitleg.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      ...(mode === 'demo'
        ? {
            'firebase/app': path.resolve(__dirname, './src/demo/firebaseAppShim.ts'),
            'firebase/database': path.resolve(__dirname, './src/demo/firebaseDatabaseShim.ts'),
            'firebase/auth': path.resolve(__dirname, './src/demo/firebaseAuthShim.ts'),
            'firebase/storage': path.resolve(__dirname, './src/demo/firebaseStorageShim.ts'),
          }
        : {}),
    },
  },
}))
