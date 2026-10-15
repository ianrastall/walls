import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ianrastall.github.io',
  base: '/walls',
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
