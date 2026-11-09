<template>
    <div class="page home">
        <Window name="// All channels" :closable="false" :width="350" :height="500">
            <Channels
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
            :window-id="getChannelWindowId(channel.id)"
            :unread="channelsStore.unreadCount(channel.id)"
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
            <CreateChannel @created="createdHandler" />
        </Window>

        <Window
            v-if="isJoiningChannel"
            name="// Join channel"
            :window-id="JOIN_WINDOW_ID"
            @close="joinCloseHandler"
            :height="200"
        >
            <JoinChannel :channels="channels" @joined="joinedHandler" />
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
import { useChannelsStore } from 'stores/channels';

// Utils
import getChannelWindowId from 'utils/getChannelWindowId';

const CREATE_WINDOW_ID = 'create-channel';
const JOIN_WINDOW_ID = 'join-channel';

/**
 * Stores
 */
const windowsStore = useWindowsStore();
const channelsStore = useChannelsStore();

/**
 * Refs
 */
const { channels } = storeToRefs(channelsStore);
const openedChannels = ref([]);
const isCreatingChannel = ref(false);
const isJoiningChannel = ref(false);

/**
 * Private
 */
const openChannel = (channel) => {
    const isOpened = openedChannels.value.some((item) => item.id === channel.id);

    if (isOpened) windowsStore.bringToFront(getChannelWindowId(channel.id));
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

const createHandler = () => {
    if (isCreatingChannel.value) windowsStore.bringToFront(CREATE_WINDOW_ID);
    else isCreatingChannel.value = true;
};

const createdHandler = (channel) => {
    channelsStore.addChannel(channel);
    openChannel(channel);
};

const joinCloseHandler = () => {
    isJoiningChannel.value = false;
};

const joinHandler = () => {
    if (isJoiningChannel.value) windowsStore.bringToFront(JOIN_WINDOW_ID);
    else isJoiningChannel.value = true;
};

const joinedHandler = (channel) => {
    channelsStore.addChannel(channel);
    openChannel(channel);
};
</script>

<style src="./style.scss" lang="scss" scoped></style>
