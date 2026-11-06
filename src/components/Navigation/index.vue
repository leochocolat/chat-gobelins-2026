<template>
    <nav class="navigation">
        <div class="status">Logged in as @{{ user ? user.user.username : 'JohnDoe' }}</div>
        <router-link class="button-logout" v-if="isLoggedIn" to="/logout">Logout</router-link>
    </nav>
</template>

<script setup>
// Vue
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

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

<style src="./style.scss" lang="scss" scoped></style>
