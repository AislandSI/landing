// @ts-check
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'

// The desktop app owns the shared file. The landing repo deployed on its own
// only has the copy next to this config.
const sharedProduct = fileURLToPath(new URL('../windows/product.config.json', import.meta.url))
const localProduct = fileURLToPath(new URL('./product.config.json', import.meta.url))

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        '@product': existsSync(sharedProduct) ? sharedProduct : localProduct
      }
    }
  }
})
