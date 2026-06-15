import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // 💡 On importe le module de gestion des chemins de Node

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173
  },
  resolve: {
    alias: {
      // 🔒 LA SOLUTION ULTIME : On force TOUT le projet (y compris Apollo) 
      // à utiliser la seule et unique copie physique de React du projet.
      'react': path.resolve('node_modules/react'),
      'react-dom': path.resolve('node_modules/react-dom')
    }
  }
})