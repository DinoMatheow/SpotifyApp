// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  devToolbar: {
      enabled: false
    },
  experimental: {
    // viewTransitions: true
  },
  vite: {
    plugins: [tailwindcss()]
  },
  output:'server'
});