<template>
    <div class="root">
        <TheWebGLBackground />
        <Navigation v-if="isLoggedIn" />
        <RouterView v-slot="{ Component }">
            <Transition mode="out-in" :css="false" @leave="leaveHandler">
                <component :is="Component" />
            </Transition>
        </RouterView>
    </div>
</template>

<script setup>
// Vue
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

// Components
import Navigation from '@/components/Navigation/index.vue';
import TheWebGLBackground from '@/components/TheWebGLBackground/index.vue';

// Animations
import { leave } from '@/components/Window/animations';

// Windows
import WindowManager from 'windows';
import DesktopGestures from 'windows/DesktopGestures';

// Stores
import { useUserStore } from 'stores/user';
import { useThemeStore } from 'stores/theme';

/**
 * Stores
 */
const userStore = useUserStore();
const themeStore = useThemeStore();

/**
 * Router
 */
const router = useRouter();

/**
 * Refs
 */
const { isLoggedIn, user } = storeToRefs(userStore);

/**
 * Setup
 */
themeStore.setTheme(themeStore.theme);

const desktopGestures = new DesktopGestures();

let removeAfterEachGuard = null;

/**
 * Lifecycle
 */
onMounted(() => {
    desktopGestures.start();
    removeAfterEachGuard = router.afterEach(afterEachHandler);
});

onBeforeUnmount(() => {
    desktopGestures.destroy();
    removeAfterEachGuard?.();
});

/**
 * Events
 */
// Windows of a new page open at their own position
const afterEachHandler = () => {
    WindowManager.reset();
};

// Windows of the leaving page hide before the route changes
const leaveHandler = (el, done) => {
    const windows = el.querySelectorAll('.window');

    if (windows.length) leave(windows, done);
    else done();
};
</script>

<style scoped lang="scss">
.root {
    width: 100%;
    height: 100%;
}
</style>
