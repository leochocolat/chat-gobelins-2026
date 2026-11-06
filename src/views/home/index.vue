<template>
    <div class="page home">
        <Window name="All channels">
            <Channels :channels="channels" />
        </Window>

        <Window v-if="channels[0]" :name="`#${channels[0].name}`">
            <Channel :name="channels[0].name" :id="channels[0].id" />
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

// Utils
import axiosClient from '@/axios.js';

/**
 * Refs
 */
const channels = ref([]);

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
    channels.value = data.channels;
};
</script>

<style src="./style.scss" lang="scss" scoped></style>
