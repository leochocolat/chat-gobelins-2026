<template>
    <button class="button-channel">
        <div class="name">#{{ channel.name }}</div>
    </button>
</template>

<script setup>
// Vue
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

/**
 * Props
 */
const props = defineProps({
    channel: {
        type: Object,
        required: true,
    },
});
</script>

<style src="./style.scss" lang="scss" scoped></style>
