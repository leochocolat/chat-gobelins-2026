<template>
    <div class="root">
        <Navigation />
        <RouterView />
    </div>
</template>

<script setup>
// Vue
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

// Components
import Navigation from '@/components/Navigation/index.vue';
</script>

<style scoped lang="scss">
.root {
    width: 100%;
    height: 100%;
}
</style>
