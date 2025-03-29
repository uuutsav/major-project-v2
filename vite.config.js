import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// import basicSsl from '@vitejs/plugin-basic-ssl' // Import the plugin

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    tailwindcss(),
    // basicSsl(),
  ],
  server: {
    host: true,
    allowedHosts: ['.ngrok-free.app',],
  }
})
