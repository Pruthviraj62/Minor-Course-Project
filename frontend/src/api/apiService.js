import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const stationAPI = {
  getAll: () => api.get('/stations'),
  getNearby: (latitude, longitude, radius = 10) => 
    api.get(`/stations/nearby?latitude=${latitude}&longitude=${longitude}&radius_km=${radius}`),
  bookSlot: (stationId, data) => api.post(`/stations/${stationId}/book`, data),
};

export const predictAPI = {
  range: (data) => api.post('/predict/range', data),
  demand: (location, radius = 10) => api.post('/predict/demand', { location, radius }),
};

export const scheduleAPI = {
  getOptimal: (data) => api.post('/schedule/optimal', data),
};

export const gridAPI = {
  getLoad: () => api.get('/grid/load'),
};

export default api;
