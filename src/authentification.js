import axiosClient from './axios';
import { useUserStore } from '@/stores/user';
import cookies from './cookies';

const saveSession = (session, username) => {
    cookies.set('username', username);
    cookies.set('session', session);
};

const resetSession = () => {
    cookies.set('username', null);
    cookies.set('session', null);
};

const checkExistingSession = (username) => {
    const currentSession = cookies.get('session');
    const currentSessionUsername = cookies.get('username');

    if (!currentSession || !currentSessionUsername) return;
    if (username && currentSessionUsername !== username) return;

    const user = { session: currentSession, user: { username: username || currentSessionUsername } };

    useUserStore().setUser(user);

    return user;
};

const login = async (username, password) => {
    const existingSession = checkExistingSession(username);

    if (existingSession) {
        return existingSession;
    }

    try {
        const response = await axiosClient.post('/login', { username: username, password: password });
        saveSession(response.data, username);
        const user = { session: response.data, user: { username } };
        useUserStore().setUser(user);
        return user;
    } catch {
        return { session: null, user: null };
    }
};

const logout = () => {
    console.log('Logout');

    resetSession();
    useUserStore().setUser(null);
    console.log(useUserStore().isLoggedIn);

    return { session: null, user: null };
};

const signUp = async (username, password) => {
    try {
        const signUpResponse = await axiosClient.post('/user', { username: username, password: password });
        return login(username, password);
    } catch {
        return { session: null, user: null };
    }
};

export default {
    login,
    logout,
    signUp,
    checkExistingSession,
};
