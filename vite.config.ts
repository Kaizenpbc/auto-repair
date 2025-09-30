import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@supabase/supabase-js']
  },
  build: {
    commonjsOptions: {
      include: [/@supabase/, /node_modules/]
    }
  }
});