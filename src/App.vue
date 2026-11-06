<template>
    <div class="root">
        <Navigation v-if="isLoggedIn" />
        <RouterView />
    </div>
</template>

<script setup>
// Vue
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

// Components
import Navigation from '@/components/Navigation/index.vue';

// Stores
import { useUserStore } from 'stores/user';

/**
 * Stores
 */
const userStore = useUserStore();

/**
 * Refs
 */
const { isLoggedIn, user } = storeToRefs(userStore);
</script>

<style scoped lang="scss">
.root {
    width: 100%;
    height: 100%;
}
</style>
