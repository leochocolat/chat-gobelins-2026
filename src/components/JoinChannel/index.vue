<template>
    <form class="join-channel" @submit="submitHandler">
        <div class="input-row">
            <label for="join-channel-name">Channel name:</label>
            <input
                id="join-channel-name"
                autocomplete="off"
                required
                type="text"
                name="join-channel-name"
                v-model="name"
                placeholder="Channel name"
                :disabled="loading"
            />
        </div>

        <div v-if="hasError" class="error">Could not join this channel, please check its name.</div>

        <div class="buttons">
            <button :disabled="loading" class="button-cancel" type="button" @click="clickHandler">Cancel</button>
            <input :disabled="loading" class="button-submit" type="submit" value="Submit" />
        </div>
    </form>
</template>

<script setup>
// Vue
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

// Utils
import axiosClient from '@/axios.js';

/**
 * Emits
 */
const emit = defineEmits(['joined', 'cancel']);

/**
 * Props
 */
const props = defineProps({
    channels: {
        type: Array,
        required: true,
    },
});

/**
 * Refs
 */
const name = ref('');
const loading = ref(false);
const hasError = ref(false);

/**
 * Events
 */
const clickHandler = () => {
    emit('cancel');
};

const submitHandler = async (e) => {
    e.preventDefault();

    if (loading.value) return;

    const channelName = name.value.trim();

    // Entering a channel twice would add a duplicate membership on the server
    const existingChannel = props.channels.find((item) => item.name === channelName);

    if (existingChannel) {
        emit('joined', existingChannel);
        return;
    }

    loading.value = true;
    hasError.value = false;

    try {
        const { data } = await axiosClient.post('/channel/enter', { channel: channelName });
        emit('joined', data);
    } catch {
        hasError.value = true;
    }

    loading.value = false;
};
</script>

<style src="./style.scss" lang="scss" scoped></style>
