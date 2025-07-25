import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,       // Enables access on your local network (e.g., 192.168.x.x)
    port: 5173,       // Optional: specify a port (default is 5173)
  },
})
