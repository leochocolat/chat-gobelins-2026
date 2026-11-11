<template>
    <div class="channel">
        <div ref="scrollContainer" class="messages-scroll-container" @scroll.passive="scrollHandler">
            <div class="messages">
                <Message v-for="item in messages" :key="item.id" :message="item" />
            </div>
        </div>
        <div class="composer">
            <div v-if="typingText" class="typing">{{ typingText }}</div>
            <textarea
                :disabled="isSubmitting"
                @keydown="keydownHandler"
                @input="inputHandler"
                v-model="currentMessage"
                name="message"
                id="message"
                :placeholder="`Blablabla...`"
            ></textarea>
        </div>
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
import { useTypingStore } from 'stores/typing';
import { useWindowsStore } from 'stores/windows';

// Utils
import axiosClient from '@/axios.js';
import socket from '@/socket.js';
import getChannelWindowId from 'utils/getChannelWindowId';

const BOTTOM_THRESHOLD = 2;

// Below the typing store timeout, so the indicator of other users stays while typing
const TYPING_REFRESH_DELAY = 2000;

/**
 * Stores
 */
const channelsStore = useChannelsStore();
const typingStore = useTypingStore();
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

const lastMessageId = computed(() => messages.value.at(-1)?.id);

// Messages are only read in the frontmost window, while the page is visible
const isActive = computed(() => isPageVisible.value && windowsStore.activeId === getChannelWindowId(props.id));

// Received by the Channels component
const typingText = computed(() => {
    const usernames = typingStore.usernames(props.id);

    if (usernames.length === 0) return '';
    if (usernames.length === 1) return `${usernames[0]} is typing...`;

    return 'Multiple users are typing...';
});

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
let lastTypingTime = 0; // 0 when not typing

/**
 * Watch
 */
watch(lastMessageId, lastMessageIdChangeHandler, { immediate: true });
watch([lastMessageId, isActive], readStateChangeHandler, { immediate: true });

/**
 * Lifecycle
 */
onMounted(() => {
    document.addEventListener('visibilitychange', visibilitychangeHandler);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', visibilitychangeHandler);
    stopTyping();
});

/**
 * Private
 */
const updateScroll = (behavior) => {
    if (!scrollContainer.value || !isAutoScrollEnabled) return;

    scrollContainer.value.scrollTo({ top: scrollContainer.value.scrollHeight, behavior });
};

// Sent again while typing, other users stop showing it after a while without one
const sendTyping = () => {
    const now = Date.now();

    if (now - lastTypingTime < TYPING_REFRESH_DELAY) return;

    lastTypingTime = now;
    socket.send('typing', { channel_id: props.id, typing: true });
};

const stopTyping = () => {
    if (!lastTypingTime) return;

    lastTypingTime = 0;
    socket.send('typing', { channel_id: props.id, typing: false });
};

const submitMessage = async () => {
    stopTyping();
    isSubmitting.value = true;
    const { data } = await axiosClient.post('/channel/message', {
        content: currentMessage.value,
        channel: props.id,
        // The server fails to store a message without metadata
        metadata: {},
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
async function lastMessageIdChangeHandler(id) {
    if (!id) return;

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

// Read from the textarea, v-model may not have updated currentMessage yet
const inputHandler = (e) => {
    if (e.target.value.trim()) sendTyping();
    else stopTyping();
};

const keydownHandler = (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    submitMessage();
};
</script>

<style src="./style.scss" lang="scss" scoped></style>
