import { defineStore } from 'pinia';

/**
 * Private
 */
// Unique visible characters, uppercased like the app text, null when there are none
const getCharset = (text) => {
    const characters = new Set(text.toUpperCase().replace(/\s/g, ''));
    return characters.size ? [...characters].join('') : null;
};

export const useAsciiStore = defineStore('ascii', {
    state: () => ({
        _charset: null, // Characters used by the ASCII background instead of its settings, null to use the settings
    }),

    getters: {
        charset() {
            return this._charset;
        },
    },

    actions: {
        setText(text) {
            const charset = getCharset(text);

            // Avoids rebuilding the atlas when typing characters that are already in it
            if (charset !== this._charset) this._charset = charset;
        },
    },
});
