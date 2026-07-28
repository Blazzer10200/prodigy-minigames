import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  // Project pages are served from /<repo>/, not the domain root, so the built
  // asset URLs have to carry that prefix. Dev still runs from /.
  base: process.env.GITHUB_ACTIONS ? '/minigame-sandbox/' : '/',
  server: { port: 5180, open: false }
})
