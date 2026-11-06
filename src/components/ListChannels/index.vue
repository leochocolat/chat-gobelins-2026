<template>
    <ul class="list-channels">
        <li v-for="(item, index) in channels" :key="`channel-${index}`" class="list-item-channels">
            {{ item }}
        </li>
    </ul>
</template>

<script setup>
// Vue
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

// Stores
import { useUserStore } from 'stores/user';

// Utils
import axiosClient from '@/axios.js';

/**
 * Stores
 */
const userStore = useUserStore();

/**
 * Refs
 */
const channels = ref([]);

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
