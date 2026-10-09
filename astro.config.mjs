// @ts-check
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        '@product': fileURLToPath(new URL('../windows/product.config.json', import.meta.url))
      }
    }
  }
})
