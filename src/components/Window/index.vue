<template>
    <Transition appear :css="false" @enter="enterHandler" @leave="leaveHandler" @after-leave="afterLeaveHandler">
        <div v-if="isVisible" ref="windowRef" class="window" :style="style" @pointerdown.capture="pointerdownHandler">
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
import { storeToRefs } from 'pinia';

// Stores
import { useWindowsStore } from 'stores/windows';

// Vendor
import { gsap } from 'gsap';

// Utils
import randomFromRange from 'utils/randomFromRange';
import DragManager from 'utils/DragManager';

// Animations
import { enter, leave } from './animations';

const VIEWPORT_MARGIN = 100;
const VIEWPORT_PADDING = 5;
const REPOSITION_DURATION = 0.6;
const RESIZE_DEBOUNCE_DELAY = 150;
const FOCUSABLE_FIELDS = 'input:not([type="submit"]):not([type="button"]):not([disabled]), textarea:not([disabled])';

/**
 * Stores
 */
const windowsStore = useWindowsStore();

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
    zIndex: windowsStore.zIndex(id),
    width: `${props.width}px`,
    height: `${props.height}px`,
}));

/**
 * Refs DOM
 */
const windowRef = ref(null);
const navRef = ref(null);

/**
 * Setup
 */
const generatedId = useId();
const id = props.windowId ?? generatedId;

const position = {
    x: 0,
    y: 0,
};

let dragManager = null;
let repositionTween = null;
let transitionTimeline = null;
let resizeTimeout = null;

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
    repositionTween?.kill();
    transitionTimeline?.kill();
});

/**
 * Private
 */
// Hides the window, the close event is emitted once the leave animation is done
const close = () => {
    isVisible.value = false;
};

const initPosition = () => {
    const rangeX = getInitialRange(props.width, window.innerWidth);
    const rangeY = getInitialRange(props.height, window.innerHeight, getNavigationHeight());

    position.x = randomFromRange(rangeX.min, rangeX.max);
    position.y = randomFromRange(rangeY.min, rangeY.max);

    applyPosition();
};

const getInitialRange = (size, viewportSize, minPosition = 0) => {
    // Shrinks the margin when the window doesn't fit with the full one
    const margin = Math.min(VIEWPORT_MARGIN, Math.max((viewportSize - size) / 2, 0));
    const min = Math.max(margin, minPosition);

    return { min, max: Math.max(min, viewportSize - size - margin) };
};

const getNavigationHeight = () => {
    return document.querySelector('.navigation')?.offsetHeight ?? 0;
};

const applyPosition = () => {
    gsap.set(windowRef.value, { x: position.x, y: position.y });
};

const focusFirstField = () => {
    windowRef.value?.querySelector(FOCUSABLE_FIELDS)?.focus();
};

const bringBackIntoView = () => {
    const minX = VIEWPORT_PADDING;
    const minY = getNavigationHeight() + VIEWPORT_PADDING;
    const maxX = Math.max(window.innerWidth - props.width - VIEWPORT_PADDING, minX);
    const maxY = Math.max(window.innerHeight - props.height - VIEWPORT_PADDING, minY);
    const x = gsap.utils.clamp(minX, maxX, position.x);
    const y = gsap.utils.clamp(minY, maxY, position.y);

    repositionTween?.kill();

    if (x === position.x && y === position.y) return;

    repositionTween = gsap.to(position, {
        x,
        y,
        duration: REPOSITION_DURATION,
        ease: 'power3.out',
        onUpdate: applyPosition,
    });
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
    dragManager.addEventListener('dragstart', dragstartHandler);
    dragManager.addEventListener('drag', dragHandler);
    dragManager.addEventListener('touchup', dragendHandler);
    window.addEventListener('resize', resizeHandler);
};

const removeEventListeners = () => {
    dragManager.destroy();
    window.removeEventListener('resize', resizeHandler);
    clearTimeout(resizeTimeout);
};

const resizeHandler = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // The drag end brings it back into view, with the final position
        if (!isDragging.value) bringBackIntoView();
    }, RESIZE_DEBOUNCE_DELAY);
};

const pointerdownHandler = () => {
    windowsStore.bringToFront(id);
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
    repositionTween?.kill();
    isDragging.value = true;
};

const dragHandler = (e) => {
    position.x -= e.delta.x;
    position.y -= e.delta.y;

    applyPosition();
};

const dragendHandler = () => {
    // DragManager dispatches this on every mouseup, even outside of this window
    if (!isDragging.value) return;

    isDragging.value = false;
    bringBackIntoView();
};
</script>

<style src="./style.scss" lang="scss" scoped></style>
