import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import analogjsangular from '@analogjs/astro-angular';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

export default defineConfig({
  devToolbar: { enabled: false },
  vite: { plugins: [tailwindcss()] },
  output: 'static',
  adapter: vercel(),
  integrations: [analogjsangular(), react()]
});
