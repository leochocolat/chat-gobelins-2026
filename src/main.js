// Style
import '@/style/app.scss';

// Vue
import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia } from 'pinia';

// Vue Template
import App from './App.vue';

// Config
import routes from './routes.js';

const app = createApp(App);
app.use(createPinia());
app.use(
    createRouter({
        history: createWebHistory(),
        routes,
    }),
);

app.mount('#app');
