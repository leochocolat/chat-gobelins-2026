<template>
    <Transition appear :css="false" @enter="enterHandler" @leave="leaveHandler" @after-leave="afterLeaveHandler">
        <div v-if="isVisible" ref="windowRef" class="window" :style="style" @pointerdown.capture="pointerdownHandler">
            <canvas ref="backgroundRef" class="background" aria-hidden="true"></canvas>
            <div ref="navRef" class="nav" :class="{ 'is-dragging': isDragging }">
                <div class="name">
                    {{ name }}
                </div>
                <button
                    v-if="closable"
                    class="button-close"
                    type="button"
                    aria-label="Close window"
                    @mousedown.stop
                    @touchstart.stop
                    @click="clickHandler"
                >
                    ×
                </button>
            </div>
            <div class="container">
                <slot></slot>
            </div>
        </div>
    </Transition>
</template>

<script setup>
// Vue
import {
    computed,
    inject,
    nextTick,
    onBeforeUnmount,
    onMounted,
    onUnmounted,
    onUpdated,
    provide,
    ref,
    useId,
    watch,
} from 'vue';

// Windows
import WindowManager from 'windows';

// Animations
import { enter, leave } from './animations';

// WebGL
import windowBackgrounds from 'webgl/windowBackgrounds';

const FOCUSABLE_FIELDS = 'input:not([type="submit"]):not([type="button"]):not([disabled]), textarea:not([disabled])';

/**
 * Emits
 */
const emit = defineEmits(['close']);

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
    windowId: {
        type: String,
        required: false,
        default: null,
    },
    width: {
        type: Number,
        required: false,
        default: 500,
    },
    height: {
        type: Number,
        required: false,
        default: 500,
    },
});

/**
 * Refs
 */
const isDragging = ref(false);
const isVisible = ref(true);

/**
 * Computed
 */
const style = computed(() => ({
    width: `${props.width}px`,
    height: `${props.height}px`,
}));

/**
 * Refs DOM
 */
const windowRef = ref(null);
const navRef = ref(null);
const backgroundRef = ref(null);

/**
 * Setup
 */
const generatedId = useId();
const id = props.windowId ?? generatedId;

let managedWindow = null;
let transitionTimeline = null;

/**
 * Lifecycle
 */
onMounted(() => {
    // Position, drag, z-order and modes belong to the window manager
    managedWindow = WindowManager.add({
        id,
        el: windowRef.value,
        handle: navRef.value,
        width: props.width,
        height: props.height,
    });
    setupEventListeners();
    windowBackgrounds.add(backgroundRef.value);
});

// The template ref is already cleared in onUnmounted
onBeforeUnmount(() => {
    windowBackgrounds.remove(backgroundRef.value);
});

onUnmounted(() => {
    removeEventListeners();
    WindowManager.remove(id);
    transitionTimeline?.kill();
});

/**
 * Private
 */
// Hides the window, the close event is emitted once the leave animation is done
const close = () => {
    isVisible.value = false;
};

const focusFirstField = () => {
    windowRef.value?.querySelector(FOCUSABLE_FIELDS)?.focus();
};

/**
 * Provide
 */
// Lets the window content close it with the leave animation
provide('closeWindow', close);

/**
 * Events
 */
const setupEventListeners = () => {
    managedWindow.addEventListener('dragstart', dragstartHandler);
    managedWindow.addEventListener('dragend', dragendHandler);
};

const removeEventListeners = () => {
    managedWindow.removeEventListener('dragstart', dragstartHandler);
    managedWindow.removeEventListener('dragend', dragendHandler);
};

const pointerdownHandler = () => {
    WindowManager.focus(id);
};

const clickHandler = () => {
    close();
};

const enterHandler = (el, done) => {
    // Fields can only be focused once the content is visible
    transitionTimeline = enter(el, () => {
        done();
        focusFirstField();
    });
};

const leaveHandler = (el, done) => {
    transitionTimeline?.kill();
    transitionTimeline = leave(el, done);
};

const afterLeaveHandler = () => {
    emit('close');
};

const dragstartHandler = () => {
    isDragging.value = true;
};

const dragendHandler = () => {
    isDragging.value = false;
};
</script>

<style src="./style.scss" lang="scss" scoped></style>
