import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- Import the new plugin

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- Add it to your plugins array
  ],
  server: {
    // This allows Vite to listen on all local IPs
    host: true, 
    port: 5173,
    // This explicitly configures the Hot Module Replacement websocket
    hmr: {
      host: 'localhost',
      protocol: 'ws',
  },
},
});