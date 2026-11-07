<template>
    <canvas ref="canvas" aria-hidden="true" class="the-webgl-background"></canvas>
</template>

<script setup>
// Vue
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

// Vendor
import { gsap } from 'gsap';

// Stores
import { useThemeStore } from 'stores/theme';
import { useAsciiStore } from 'stores/ascii';

// WebGL Application
import WebGLApplication from 'webgl';

// Utils
import Debugger from 'utils/debugger';

// Text fields of the windows, the debug panel fields are left out
const TEXT_FIELDS = '.window textarea, .window input:is(:not([type]), [type="text"], [type="password"])';

/**
 * Stores
 */
const themeStore = useThemeStore();
const asciiStore = useAsciiStore();

/**
 * Refs
 */
const canvas = ref();
const { theme } = storeToRefs(themeStore);
const { charset } = storeToRefs(asciiStore);

/**
 * Watch
 */
watch(theme, (value) => {
    webglApplication?.setTheme(value);
});

watch(charset, (value) => {
    webglApplication?.setCharset(value);
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
    gsap.ticker.add(tickHandler);
});

onBeforeUnmount(() => {
    gsap.ticker.remove(tickHandler);
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

// Passwords only show as '*'
function getFocusedFieldText() {
    const field = document.activeElement;

    if (!field?.matches(TEXT_FIELDS)) return '';
    if (field.type === 'password') return field.value ? '*' : '';

    return field.value;
}

/**
 * Events
 */
// Read every frame, value changes made from code, autofill and removed fields don't all dispatch events
function tickHandler() {
    asciiStore.setText(getFocusedFieldText());
}
</script>

<style src="./style.scss" lang="scss" scoped></style>
