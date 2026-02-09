import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // For GitHub Pages or subdirectory deployments, uncomment and set base path:
  // base: '/your-repo-name/',
  build: {
    rollupOptions: {
      output: {
        // Generate unique hash for each build to prevent caching issues
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  define: {
    // Fallback environment variables for production (use hosting platform env vars instead)
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://btsdfmfifqahijazssmy.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0c2RmbWZpZnFhaGlqYXpzc215Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODEyNTUsImV4cCI6MjA4NTk1NzI1NX0.803hPMoPAvmhLrbOdZFlbgOu1SshZcC3LGm3kLTCHhY'),
  },
});
