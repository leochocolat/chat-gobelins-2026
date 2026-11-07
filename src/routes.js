// Views
import Home from 'views/home/index.vue';
import Login from 'views/login/index.vue';
import SignUp from 'views/sign-up/index.vue';
import Logout from 'views/logout/index.vue';

// Stores
import { useUserStore } from './stores/user';

// Utils
import authentification from './authentification';

const PUBLIC_PATHS = ['/login', '/sign-up'];

const navigationGuard = (to) => {
    authentification.checkExistingSession();

    const userStore = useUserStore();
    const isPublicPath = PUBLIC_PATHS.includes(to.path);

    if (!userStore.isLoggedIn && !isPublicPath) return '/login';
    if (userStore.isLoggedIn && isPublicPath) return '/';
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
