<template>
    <nav class="navigation">
        <div class="status">// Logged in as @{{ user ? user.user.username : 'JohnDoe' }}</div>
        <div class="actions">
            <button class="button-theme" type="button" @click="clickHandler">
                {{ isDark ? 'Light mode' : 'Dark mode' }}
            </button>
            <router-link class="button-logout" v-if="isLoggedIn" to="/logout">Logout</router-link>
        </div>
    </nav>
</template>

<script setup>
// Vue
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

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
const { isDark } = storeToRefs(themeStore);

/**
 * Events
 */
function clickHandler() {
    themeStore.toggleTheme();
}
</script>

<style src="./style.scss" lang="scss" scoped></style>
