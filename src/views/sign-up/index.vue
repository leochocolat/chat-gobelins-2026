<template>
    <div class="page sign-up">
        <form @submit="submitHandler">
            <h1 class="form-title">Sign Up</h1>

            <div class="input-row">
                <label for="username">Username:</label>
                <input
                    id="username"
                    autocomplete="username"
                    required
                    type="text"
                    name="username"
                    v-model="username"
                    placeholder="Username"
                    :disabled="loading"
                />
            </div>

            <div class="input-row">
                <label for="password">Password:</label>
                <input
                    id="password"
                    autocomplete="new-password"
                    placeholder="Password"
                    required
                    name="password"
                    v-model="password"
                    type="password"
                    :disabled="loading"
                />
            </div>

            <input :disabled="loading" class="button-submit" type="submit" value="Submit" />
        </form>
    </div>
</template>

<script setup>
// Vue
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import authentification from '@/authentification';

/**
 * Global
 */
const router = useRouter();

/**
 * Refs
 */
const username = ref('');
const password = ref('');
const loading = ref(false);

/**
 * Events
 */
const submitHandler = async (e) => {
    e.preventDefault();

    if (loading.value) return;

    loading.value = true;

    const user = await authentification.signUp(username.value, password.value);

    loading.value = false;

    if (user.session) router.push('/');
};
</script>

<style src="./style.scss" lang="scss" scoped></style>
