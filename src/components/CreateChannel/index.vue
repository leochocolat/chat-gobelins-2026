<template>
    <form class="create-channel" @submit="submitHandler">
        <div class="input-row">
            <label for="channel-name">Channel name:</label>
            <input
                id="channel-name"
                autocomplete="off"
                required
                type="text"
                name="channel-name"
                v-model="name"
                placeholder="Channel name"
                :disabled="loading"
            />
        </div>

        <div v-if="hasError" class="error">Could not create this channel, the name may already be taken.</div>

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
const emit = defineEmits(['created', 'cancel']);

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

    loading.value = true;
    hasError.value = false;

    try {
        const { data } = await axiosClient.post('/channel', { name: name.value.trim() });
        emit('created', data);
    } catch {
        hasError.value = true;
    }

    loading.value = false;
};
</script>

<style src="./style.scss" lang="scss" scoped></style>
