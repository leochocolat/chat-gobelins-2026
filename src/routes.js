// Views
import Home from 'views/home/index.vue';
import Login from 'views/login/index.vue';
import SignUp from 'views/sign-up/index.vue';
import Logout from 'views/logout/index.vue';

// Stores
import { useUserStore } from './stores/user';

// Utils
import authentification from './authentification';

const navigationGuard = (to) => {
    authentification.checkExistingSession();

    const userStore = useUserStore();

    if (!userStore.isLoggedIn && to.path !== '/login') return '/login';
    if (userStore.isLoggedIn && to.path === '/login') return '/';
    if (userStore.isLoggedIn && to.path === '/sign-up') return '/';
};

export default [
    {
        path: '/',
        meta: {},
        component: Home,
        beforeEnter: navigationGuard,
    },
    {
        path: '/login',
        meta: {},
        component: Login,
        beforeEnter: navigationGuard,
    },
    {
        path: '/logout',
        meta: {},
        component: Logout,
        beforeEnter: async () => {
            authentification.logout();
            return '/login';
        },
    },
    {
        path: '/sign-up',
        meta: {},
        component: SignUp,
        beforeEnter: navigationGuard,
    },
];
