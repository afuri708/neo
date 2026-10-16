import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
    plugins: [svelte({ compilerOptions: { css: 'injected' } })],
    build: {
        outDir: 'assistant-ui-build',
        emptyOutDir: true,
        lib: {
            entry: 'assistant-ui/mount.js',
            name: 'Unnamed_Assistant',
            formats: ['iife'],
            fileName: () => 'assistant-ui.js'
        }
    }
})