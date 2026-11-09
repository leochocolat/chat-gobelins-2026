<template>
    <div class="channel">
        <div ref="scrollContainer" class="messages-scroll-container" @scroll.passive="scrollHandler">
            <div class="messages">
                <Message v-for="(item, index) in messages" :key="index" :message="item" />
            </div>
        </div>
        <textarea
            :disabled="isSubmitting"
            @keydown="keydownHandler"
            v-model="currentMessage"
            name="message"
            id="message"
            :placeholder="`Blablabla...`"
        ></textarea>
    </div>
</template>

<script setup>
// Vue
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

// Components
import Message from '@/components/Message/index.vue';

// Stores
import { useChannelsStore } from 'stores/channels';
import { useWindowsStore } from 'stores/windows';

// Utils
import axiosClient from '@/axios.js';
import getChannelWindowId from 'utils/getChannelWindowId';

const BOTTOM_THRESHOLD = 2;

/**
 * Stores
 */
const channelsStore = useChannelsStore();
const windowsStore = useWindowsStore();

/**
 * Props
 */
const props = defineProps({
    name: {
        type: String,
        required: true,
    },
    id: {
        type: Number,
        required: true,
    },
});

/**
 * Refs
 */
const currentMessage = ref('');
const isSubmitting = ref(false);
const isPageVisible = ref(!document.hidden);

/**
 * Computed
 */
// Fetched by the Channels component
const messages = computed(() => channelsStore.messages(props.id));

const lastMessageDate = computed(() => messages.value.at(-1)?.creation_date);

// Messages are only read in the frontmost window, while the page is visible
const isActive = computed(() => isPageVisible.value && windowsStore.activeId === getChannelWindowId(props.id));

/**
 * Refs DOM
 */
const scrollContainer = ref(null);

/**
 * Setup
 */
let isAutoScrollEnabled = true;
let hasScrolled = false;
let previousScrollTop = 0;

/**
 * Watch
 */
watch(lastMessageDate, lastMessageDateChangeHandler, { immediate: true });
watch([lastMessageDate, isActive], readStateChangeHandler, { immediate: true });

/**
 * Lifecycle
 */
onMounted(() => {
    document.addEventListener('visibilitychange', visibilitychangeHandler);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', visibilitychangeHandler);
});

/**
 * Private
 */
const updateScroll = (behavior) => {
    if (!scrollContainer.value || !isAutoScrollEnabled) return;

    scrollContainer.value.scrollTo({ top: scrollContainer.value.scrollHeight, behavior });
};

const submitMessage = async () => {
    isSubmitting.value = true;
    const { data } = await axiosClient.post('/channel/message', {
        content: currentMessage.value,
        channel: props.id,
    });
    if (data) {
        currentMessage.value = '';
        isAutoScrollEnabled = true;
        channelsStore.addMessage(props.id, data);
    }
    isSubmitting.value = false;
};

/**
 * Events
 */
// The first messages show without scrolling animation
async function lastMessageDateChangeHandler(date) {
    if (!date) return;

    await nextTick();
    updateScroll(hasScrolled ? 'smooth' : 'instant');
    hasScrolled = true;
}

function readStateChangeHandler() {
    if (isActive.value) channelsStore.markAsRead(props.id);
}

const visibilitychangeHandler = () => {
    isPageVisible.value = !document.hidden;
};

const scrollHandler = () => {
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;

    // Only an upward scroll disables it, the smooth autoscroll itself always goes down
    if (scrollTop < previousScrollTop) isAutoScrollEnabled = false;
    if (scrollHeight - scrollTop - clientHeight <= BOTTOM_THRESHOLD) isAutoScrollEnabled = true;

    previousScrollTop = scrollTop;
};

const keydownHandler = (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    submitMessage();
};
</script>

<style src="./style.scss" lang="scss" scoped></style>
