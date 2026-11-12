import axios from 'axios';
import cookies from './cookies';
import { API_NAMESPACE } from './config';

const axiosClient = axios.create({
    // baseURL: 'http://localhost:4000/',
    baseURL: 'https://gobelins-chat-api.leomouraire.com:4000',
    // baseURL: 'http://37.27.91.240:4000/', // Production
});

axiosClient.interceptors.request.use((config) => {
    const session = cookies.get('session');
    if (session) config.headers.set('Authorization', `Bearer ${session}`);

    // Sent as a query param, the Namespace header is blocked by the server CORS
    config.params = { namespace: API_NAMESPACE, ...config.params };

    return config;
});

export default axiosClient;
