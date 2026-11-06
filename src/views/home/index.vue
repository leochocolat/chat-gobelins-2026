<template>
    <div class="page home">
        <h1>Home</h1>

        <ListChannels />
    </div>
</template>

<script setup>
// Vue
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

// Components
import ListChannels from '@/components/ListChannels/index.vue';
</script>

<style src="./style.scss" lang="scss" scoped></style>
