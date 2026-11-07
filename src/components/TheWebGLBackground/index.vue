<template>
    <canvas ref="canvas" aria-hidden="true" class="the-webgl-background"></canvas>
</template>

<script setup>
// Vue
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

// Stores
import { useThemeStore } from 'stores/theme';

// WebGL Application
import WebGLApplication from 'webgl';

// Utils
import Debugger from 'utils/debugger';

/**
 * Stores
 */
const themeStore = useThemeStore();

/**
 * Refs
 */
const canvas = ref();
const { theme } = storeToRefs(themeStore);

/**
 * Watch
 */
watch(theme, (value) => {
    webglApplication?.setTheme(value);
});

/**
 * Setup
 */
let webglApplication;
let debugPanel;

/**
 * Lifecycle
 */
onMounted(() => {
    setupDebugger();
    setupWebGLApplication();
});

onBeforeUnmount(() => {
    debugPanel?.destroy();
    webglApplication?.destroy();
});

/**
 * Private
 */
function setupDebugger() {
    if (Debugger && import.meta.env.DEV) {
        debugPanel = new Debugger({
            title: 'WebGL Debugger',
            position: 'top-right',
        });
    }
}

function setupWebGLApplication() {
    webglApplication = new WebGLApplication({
        canvas: canvas.value,
        debugger: debugPanel,
        theme: theme.value,
    });

    webglApplication.start();
}
</script>

<style src="./style.scss" lang="scss" scoped></style>
