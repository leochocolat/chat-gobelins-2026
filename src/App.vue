<template>
    <div class="root">
        <TheWebGLBackground />
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
import TheWebGLBackground from '@/components/TheWebGLBackground/index.vue';

// Stores
import { useUserStore } from 'stores/user';
import { useThemeStore } from 'stores/theme';

/**
 * Stores
 */
const userStore = useUserStore();
const themeStore = useThemeStore();

/**
 * Refs
 */
const { isLoggedIn, user } = storeToRefs(userStore);

/**
 * Setup
 */
themeStore.setTheme(themeStore.theme);
</script>

<style scoped lang="scss">
.root {
    width: 100%;
    height: 100%;
}
</style>
