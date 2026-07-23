import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: '../backend', // Manda el index.html compilado a la carpeta backend
    emptyOutDir: false,   // Evita que borre tu Code.js al compilar
  },
})