<template>
    <div class="message" :class="{ 'is-own-message': message.user === user.user.username }">
        <div class="container">
            <div class="content">
                {{ message.content }}
            </div>

            <div class="infos">
                <div class="author">@{{ message.user }}</div>
                &nbsp;-&nbsp;
                <div class="time">{{ postedDateString }}</div>
            </div>
        </div>
    </div>
</template>

<script setup>
// Vue
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

// Stores
import { useUserStore } from '@/stores/user';

/**
 * Props
 */
const props = defineProps({
    message: {
        type: Object,
        required: true,
    },
});

/**
 * Stores
 */
const userStore = useUserStore();

/**
 * Refs
 */
const { user } = storeToRefs(userStore);

/**
 * Computed
 */
// Later than the creation date for a scheduled message
const postedDateString = computed(() => {
    const date = new Date(props.message.posted_at);
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `${date.toLocaleDateString()} ${time}`;
});
</script>

<style src="./style.scss" lang="scss" scoped></style>
