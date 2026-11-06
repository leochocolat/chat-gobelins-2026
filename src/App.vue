<template>
    <div class="root">
        <router-link class="button-logout" v-if="isLoggedIn" to="/logout">Logout</router-link>
        <RouterView />
    </div>
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
const { isLoggedIn } = storeToRefs(userStore);
</script>

<style scoped lang="scss">
.root {
    width: 100%;
    height: 100%;
}

.button-logout {
    position: fixed;
    right: 0;
    top: 0;
}
</style>
