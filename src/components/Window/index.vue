<template>
    <div ref="windowRef" class="window" :style="{ zIndex }" @pointerdown.capture="windowsStore.bringToFront(id)">
        <div ref="navRef" class="nav" :class="{ 'is-dragging': isDragging }">
            <div class="name">
                {{ name }}
            </div>
        </div>
        <div class="container">
            <slot></slot>
        </div>
    </div>
</template>

<script setup>
// Vue
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUnmounted, onUpdated, ref, useId, watch } from 'vue';
import { storeToRefs } from 'pinia';

// Stores
import { useWindowsStore } from 'stores/windows';

// Vendor
import { gsap } from 'gsap';

// Utils
import randomFromRange from 'utils/randomFromRange';
import DragManager from 'utils/DragManager';

/**
 * Stores
 */
const windowsStore = useWindowsStore();

/**
 * Props
 */
const props = defineProps({
    name: {
        type: String,
        required: true,
    },
    closable: {
        type: Boolean,
        required: false,
        default: true,
    },
});

/**
 * Refs
 */
const isDragging = ref(false);

/**
 * Computed
 */
const zIndex = computed(() => windowsStore.zIndex(id));

/**
 * Refs DOM
 */
const windowRef = ref(null);
const navRef = ref(null);

/**
 * Setup
 */
const id = useId();

const position = {
    x: 0,
    y: 0,
};

const width = 500;
const height = 500;

let dragManager = null;

/**
 * Lifecycle
 */
onMounted(() => {
    windowsStore.register(id);

    dragManager = new DragManager({
        el: navRef.value,
    });
    initPosition();
    setupEventListeners();
});

onUnmounted(() => {
    windowsStore.unregister(id);
    removeEventListeners();
});

/**
 * Private
 */
const initPosition = () => {
    position.x = randomFromRange(100, window.innerWidth - 100 - width);
    position.y = randomFromRange(50, window.innerHeight - 100 - height);

    gsap.set(windowRef.value, { x: position.x, y: position.y });
};

/**
 * Events
 */
const setupEventListeners = () => {
    dragManager.addEventListener('dragstart', dragstartHandler);
    dragManager.addEventListener('drag', dragHandler);
    dragManager.addEventListener('touchup', dragendHandler);
};

const removeEventListeners = () => {
    dragManager.destroy();
};

const dragstartHandler = () => {
    isDragging.value = true;
};

const dragHandler = (e) => {
    position.x -= e.delta.x;
    position.y -= e.delta.y;

    gsap.set(windowRef.value, { x: position.x, y: position.y });
};

const dragendHandler = () => {
    isDragging.value = false;
};
</script>

<style src="./style.scss" lang="scss" scoped></style>
