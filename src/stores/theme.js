import { defineStore } from 'pinia';

// Config
import { DEFAULT_THEME } from '@/config';

// Utils
import cookies from '@/cookies';

const THEMES = ['light', 'dark'];
const THEME_COOKIE = 'theme';
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Falls back to DEFAULT_THEME until the user picks a theme
function getSavedTheme() {
    const theme = cookies.get(THEME_COOKIE);
    return THEMES.includes(theme) ? theme : DEFAULT_THEME;
}

export const useThemeStore = defineStore('theme', {
    state: () => ({
        _theme: getSavedTheme(),
    }),

    getters: {
        theme() {
            return this._theme;
        },

        isDark() {
            return this._theme === 'dark';
        },
    },

    actions: {
        setTheme(theme) {
            this._theme = theme;
            document.documentElement.dataset.theme = theme;
        },

        toggleTheme() {
            this.setTheme(this.isDark ? 'light' : 'dark');
            cookies.set(THEME_COOKIE, this._theme, { path: '/', maxAge: THEME_COOKIE_MAX_AGE, sameSite: 'lax' });
        },
    },
});
