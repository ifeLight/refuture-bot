import axios from 'axios';

export default (page = 1, limit = 30) => {
    return axios.get(`/api/hyper?page=${page}&limit=${limit}`);
}