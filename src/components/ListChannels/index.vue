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

/**
 * Props
 */
const props = defineProps({
    channels: {
        type: Array,
        required: true,
    },
});
</script>

<style src="./style.scss" lang="scss" scoped></style>
