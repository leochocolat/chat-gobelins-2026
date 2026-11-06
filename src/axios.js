import axios from 'axios';
import cookies from './cookies';

const axiosClient = axios.create({
    baseURL: 'http://localhost:4000/',
});

axiosClient.interceptors.request.use((config) => {
    const session = cookies.get('session');
    if (session) config.headers.set('Authorization', `Bearer ${session}`);
    return config;
});

export default axiosClient;
