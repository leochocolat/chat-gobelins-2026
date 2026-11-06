<template>
    <div class="channels">
        <ul class="list">
            <li v-for="(item, index) in channels" :key="`channel-${index}`" class="list-item">
                <ButtonChannel :channel="item" />
            </li>
        </ul>
    </div>
</template>

<script setup>
// Vue
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

// Components
import ButtonChannel from '@/components/ButtonChannel/index.vue';

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
