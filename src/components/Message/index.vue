<template>
    <div class="message" :class="{ 'is-own-message': message.user === user.user.username }">
        <div class="container">
            <div class="content">
                {{ message.content }}
            </div>

            <div class="infos">
                <div class="author">@{{ message.user }}</div>
                &nbsp;-&nbsp;
                <div class="time">{{ creationDateString }}</div>
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
const creationDateString = computed(() => {
    const date = new Date(props.message.creation_date);
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `${date.toLocaleDateString()} ${time}`;
});
</script>

<style src="./style.scss" lang="scss" scoped></style>
