// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import analogjsangular from '@analogjs/astro-angular';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  devToolbar: {
      enabled: false
    },

  experimental: {
    // Viewtransition: true
  },

  vite: {
    plugins: [tailwindcss()]
  },

  output:'server',
  integrations: [analogjsangular(), react()]
});