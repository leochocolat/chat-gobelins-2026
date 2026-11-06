import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            'style': fileURLToPath(new URL('./src/style', import.meta.url)),
            'views': fileURLToPath(new URL('./src/views', import.meta.url)),
            'stores': fileURLToPath(new URL('./src/stores', import.meta.url)),
            'utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
            'components': fileURLToPath(new URL('./src/components', import.meta.url)),
            'composables': fileURLToPath(new URL('./src/composables', import.meta.url)),
        },
    },
});
