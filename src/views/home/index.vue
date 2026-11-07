<template>
    <div class="page home">
        <Window name="// All channels" :closable="false" :width="350" :height="500">
            <Channels
                :channels="channels"
                :opened-channels="openedChannels"
                @create="createHandler"
                @join="joinHandler"
                @open="openHandler"
            />
        </Window>

        <Window
            v-for="channel in openedChannels"
            :key="channel.id"
            :name="`#${channel.name}`"
            :window-id="`channel-${channel.id}`"
            @close="closeHandler(channel)"
        >
            <Channel :name="channel.name" :id="channel.id" />
        </Window>

        <Window
            v-if="isCreatingChannel"
            name="// New channel"
            :window-id="CREATE_WINDOW_ID"
            @close="createCloseHandler"
            :height="200"
        >
            <CreateChannel @created="createdHandler" @cancel="cancelHandler" />
        </Window>

        <Window
            v-if="isJoiningChannel"
            name="// Join channel"
            :window-id="JOIN_WINDOW_ID"
            @close="joinCloseHandler"
            :height="200"
        >
            <JoinChannel :channels="channels" @joined="joinedHandler" @cancel="joinCancelHandler" />
        </Window>
    </div>
</template>

<script setup>
// Vue
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

// Components
import Window from '@/components/Window/index.vue';
import Channels from '@/components/Channels/index.vue';
import Channel from '@/components/Channel/index.vue';
import CreateChannel from '@/components/CreateChannel/index.vue';
import JoinChannel from '@/components/JoinChannel/index.vue';

// Stores
import { useWindowsStore } from 'stores/windows';

// Utils
import axiosClient from '@/axios.js';

const CREATE_WINDOW_ID = 'create-channel';
const JOIN_WINDOW_ID = 'join-channel';

/**
 * Stores
 */
const windowsStore = useWindowsStore();

/**
 * Refs
 */
const channels = ref([]);
const openedChannels = ref([]);
const isCreatingChannel = ref(false);
const isJoiningChannel = ref(false);

/**
 * Lifecycle
 */
onMounted(() => {
    fetchChannels();
});

/**
 * Private
 */
const fetchChannels = async () => {
    const { data } = await axiosClient.get('/me');
    channels.value = data.channels ?? [];

    if (channels.value[0]) openChannel(channels.value[0]);
};

const openChannel = (channel) => {
    const isOpened = openedChannels.value.some((item) => item.id === channel.id);

    if (isOpened) windowsStore.bringToFront(`channel-${channel.id}`);
    else openedChannels.value.push(channel);
};

/**
 * Events
 */
const openHandler = (channel) => {
    openChannel(channel);
};

const closeHandler = (channel) => {
    openedChannels.value = openedChannels.value.filter((item) => item.id !== channel.id);
};

const createCloseHandler = () => {
    isCreatingChannel.value = false;
};

const cancelHandler = () => {
    isCreatingChannel.value = false;
};

const createHandler = () => {
    if (isCreatingChannel.value) windowsStore.bringToFront(CREATE_WINDOW_ID);
    else isCreatingChannel.value = true;
};

const createdHandler = (channel) => {
    channels.value.push(channel);
    openChannel(channel);
    isCreatingChannel.value = false;
};

const joinCloseHandler = () => {
    isJoiningChannel.value = false;
};

const joinCancelHandler = () => {
    isJoiningChannel.value = false;
};

const joinHandler = () => {
    if (isJoiningChannel.value) windowsStore.bringToFront(JOIN_WINDOW_ID);
    else isJoiningChannel.value = true;
};

const joinedHandler = (channel) => {
    const isMember = channels.value.some((item) => item.id === channel.id);

    if (!isMember) channels.value.push(channel);

    openChannel(channel);
    isJoiningChannel.value = false;
};
</script>

<style src="./style.scss" lang="scss" scoped></style>
