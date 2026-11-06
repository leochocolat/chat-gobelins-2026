<template>
    <div class="page home">
        <h1>Home</h1>

        <ListChannels :channels="channels" />

        <Channel v-if="channels[0]" :name="channels[0].name" :id="channels[0].id" />
    </div>
</template>

<script setup>
// Vue
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

// Components
import ListChannels from '@/components/ListChannels/index.vue';
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
