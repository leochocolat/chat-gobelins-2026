<template>
    <div class="channels">
        <ul class="list">
            <li v-for="item in channels" :key="`channel-${item.id}`" class="list-item">
                <ButtonChannel
                    :channel="item"
                    :opened="isOpened(item)"
                    :unread="channelsStore.unreadCount(item.id)"
                    @click="channelClickHandler(item)"
                />
            </li>
        </ul>
        <div class="buttons">
            <button class="button-new-channel" @click="clickHandler">+ Create new channel</button>
            <button class="button-join-channel" @click="joinClickHandler">+ Join a channel</button>
        </div>
    </div>
</template>

<script setup>
// Vue
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

// Components
import ButtonChannel from '@/components/ButtonChannel/index.vue';

// Stores
import { useChannelsStore } from 'stores/channels';
import { useTypingStore } from 'stores/typing';
import { useUserStore } from 'stores/user';
import { useWindowsStore } from 'stores/windows';

// Utils
import axiosClient from '@/axios.js';
import socket from '@/socket.js';
import getChannelWindowId from 'utils/getChannelWindowId';

const REFRESH_DELAY = 2000;

/**
 * Stores
 */
const channelsStore = useChannelsStore();
const typingStore = useTypingStore();
const userStore = useUserStore();
const windowsStore = useWindowsStore();

/**
 * Emits
 */
const emit = defineEmits(['create', 'join', 'open']);

/**
 * Props
 */
const props = defineProps({
    openedChannels: {
        type: Array,
        required: false,
        default: () => [],
    },
});

/**
 * Refs
 */
const { channels } = storeToRefs(channelsStore);

/**
 * Computed
 */
const channelIds = computed(() => channels.value.map((channel) => channel.id));

/**
 * Setup
 */
let refreshInterval = null;
let isFetchingMessages = false;

/**
 * Watch
 */
watch(channelIds, channelIdsChangeHandler);

/**
 * Lifecycle
 */
onMounted(async () => {
    setupEventListeners();
    await fetchChannels();
    fetchAllMessages();
    refreshInterval = setInterval(fetchAllMessages, REFRESH_DELAY);
});

onUnmounted(() => {
    removeEventListeners();
    clearInterval(refreshInterval);
    socket.disconnect();
});

/**
 * Private
 */
const isOpened = (channel) => {
    return props.openedChannels.some((item) => item.id === channel.id);
};

const fetchChannels = async () => {
    const { data } = await axiosClient.get('/me');
    channelsStore.setChannels(data.channels ?? []);

    if (channels.value[0]) emit('open', channels.value[0]);
};

// Polls every channel, the server has no websocket yet
const fetchAllMessages = async () => {
    if (isFetchingMessages) return;

    isFetchingMessages = true;

    try {
        await Promise.all(channels.value.map(fetchMessages));
    } finally {
        isFetchingMessages = false;
    }
};

const fetchMessages = async (channel) => {
    const { data } = await axiosClient.get('/channel/message', {
        params: { channel: channel.id },
    });
    const newMessages = channelsStore.setMessages(channel.id, data ?? []);

    notify(channel, newMessages);
};

// Only for messages from other users that aren't being read
const notify = (channel, messages) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (windowsStore.activeId === getChannelWindowId(channel.id) && !document.hidden) return;

    const username = userStore.user?.user.username;

    for (const message of messages) {
        if (message.user === username) continue;

        const notification = new Notification(`#${channel.name}`, {
            body: `@${message.user}: ${message.content}`,
            tag: `channel-${channel.id}`,
        });

        notification.addEventListener('click', () => notificationClickHandler(channel));
    }
};

/**
 * Events
 */
const setupEventListeners = () => {
    socket.addEventListener('user.typing', typingHandler);

    // Browsers only show the permission prompt after a user gesture
    if ('Notification' in window && Notification.permission === 'default') {
        window.addEventListener('pointerdown', pointerdownHandler, { once: true });
    }
};

const removeEventListeners = () => {
    socket.removeEventListener('user.typing', typingHandler);
    window.removeEventListener('pointerdown', pointerdownHandler);
};

// A socket watches a fixed list of channels, so it reopens on join or creation
function channelIdsChangeHandler(ids) {
    socket.connect(ids);
}

const typingHandler = ({ channel_id, typing, user }) => {
    // The server also sends our own typing events back
    if (user.username === userStore.user?.user.username) return;

    typingStore.setTyping(channel_id, user.username, typing);
};

const pointerdownHandler = () => {
    Notification.requestPermission();
};

const clickHandler = () => {
    emit('create');
};

const joinClickHandler = () => {
    emit('join');
};

const channelClickHandler = (channel) => {
    emit('open', channel);
};

const notificationClickHandler = (channel) => {
    window.focus();
    emit('open', channel);
};
</script>

<style src="./style.scss" lang="scss" scoped></style>
