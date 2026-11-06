import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
    state: () => ({
        _user: null,
        _isLoggedIn: false,
    }),

    getters: {
        user() {
            return this._user;
        },

        isLoggedIn() {
            return this._user !== null;
        },
    },

    actions: {
        setUser(userData) {
            this._user = userData;
        },
    },
});
