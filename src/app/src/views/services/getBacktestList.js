import axios from 'axios';

export default (page = 1, limit = 30) => {
    return axios.get(`/api/backtest?page=${page}&limit=${limit}`);
}