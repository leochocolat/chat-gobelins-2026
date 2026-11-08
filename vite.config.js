import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import shaderHotReload from './vite/shaderHotReload.js';
import debuggerServer from './vite/debuggerServer.js';

export default defineConfig({
    plugins: [vue(), shaderHotReload(), debuggerServer()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            'style': fileURLToPath(new URL('./src/style', import.meta.url)),
            'views': fileURLToPath(new URL('./src/views', import.meta.url)),
            'stores': fileURLToPath(new URL('./src/stores', import.meta.url)),
            'utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
            'components': fileURLToPath(new URL('./src/components', import.meta.url)),
            'webgl': fileURLToPath(new URL('./src/webgl', import.meta.url)),
            'windows': fileURLToPath(new URL('./src/windows', import.meta.url)),
            'composables': fileURLToPath(new URL('./src/composables', import.meta.url)),
        },
    },
});
