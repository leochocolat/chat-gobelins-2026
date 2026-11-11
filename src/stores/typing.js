import { defineStore } from 'pinia';

/**
 * Private
 */
// Typing events are sent again while someone types, without one they stopped or left
const TYPING_TIMEOUT = 5000;

// Not state, they only clean it
const timeouts = {};

export const useTypingStore = defineStore('typing', {
    state: () => ({
        _usernames: {}, // Other users typing, by channel id
    }),

    getters: {
        usernames(state) {
            return (id) => state._usernames[id] ?? [];
        },
    },

    actions: {
        setTyping(id, username, isTyping) {
            const key = `${id}-${username}`;
            const usernames = this.usernames(id).filter((item) => item !== username);

            clearTimeout(timeouts[key]);

            if (isTyping) {
                usernames.push(username);
                timeouts[key] = setTimeout(() => this.setTyping(id, username, false), TYPING_TIMEOUT);
            }

            this._usernames[id] = usernames;
        },
    },
});
