import { defineStore } from 'pinia';

export const useWindowsStore = defineStore('windows', {
    state: () => ({
        _order: [], // From back to front
    }),

    getters: {
        zIndex(state) {
            return (id) => state._order.indexOf(id) + 1;
        },
    },

    actions: {
        register(id) {
            this._order.push(id);
        },

        unregister(id) {
            this._order = this._order.filter((item) => item !== id);
        },

        bringToFront(id) {
            if (this._order.at(-1) === id) return;

            this.unregister(id);
            this.register(id);
        },
    },
});
