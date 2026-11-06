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

// Utils
import axiosClient from '@/axios.js';

const REFRESH_DELAY = 2000;
const BOTTOM_THRESHOLD = 2;

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
const messages = ref([]);
const currentMessage = ref('');
const isRefreshing = ref(false);
const isSubmitting = ref(false);

/**
 * Refs DOM
 */
const scrollContainer = ref(null);

/**
 * Setup
 */
let refreshInterval;
let isAutoScrollEnabled = true;
let previousScrollTop = 0;

/**
 * Lifecycle
 */
onMounted(() => {
    fetchMessages(true);
    refreshInterval = setInterval(() => {
        fetchMessages();
    }, REFRESH_DELAY);
});

onUnmounted(() => {
    clearInterval(refreshInterval);
});

/**
 * Private
 */
const fetchMessages = async (isFirstFetch) => {
    isRefreshing.value = true;
    const { data } = await axiosClient.get('/channel/message', {
        params: { channel: props.id },
    });
    messages.value = data;
    isRefreshing.value = false;

    await nextTick();
    updateScroll(isFirstFetch ? 'instant' : 'smooth');
};

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
        fetchMessages();
    }
    isSubmitting.value = false;
};

/**
 * Events
 */
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
