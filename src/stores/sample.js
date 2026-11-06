import { defineStore } from 'pinia';

export const useSampleStore = defineStore('sample', {
    state: () => ({
        _count: 0,
    }),

    getters: {
        count(state) {
            return state._count;
        },
    },

    actions: {
        increment() {
            this._count++;
        },
    },
});
