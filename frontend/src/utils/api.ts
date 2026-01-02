import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export const fetchFeeds = async () => {
    const response = await axios.get(`${API_URL}/feeds`);
    return response.data;
};
