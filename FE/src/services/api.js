import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const register = (userData) => api.post('/auth/register', userData);
export const login = (userData) => api.post('/auth/login', userData);
export const getProfile = () => api.get('/auth/profile');
export const getUsers = () => api.get('/auth/users');

// Transaction APIs
export const getTransactions = (params) => api.get('/transactions', { params });
export const createTransaction = (data) => api.post('/transactions', data);
export const updateTransaction = (id, data) => api.put(`/transactions/${id}`, data);
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`);

// Category APIs
export const getCategories = () => api.get('/categories');
export const createCategory = (data) => api.post('/categories', data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);

// Budget APIs
export const getBudgets = (month, year) => api.get('/budgets', { params: { month, year } });
export const createBudget = (data) => api.post('/budgets', data);
export const updateBudget = (id, data) => api.put(`/budgets/${id}`, data);
export const deleteBudget = (id) => api.delete(`/budgets/${id}`);

// Report APIs
export const getReports = (params) => api.get('/reports', { params });
export const exportReport = (format, params) => api.get(`/reports/export/${format}`, { params, responseType: 'blob' });

// AI APIs
export const getAIPredictions = (month) => api.get('/ai/predict', { params: { month } });
export const getAIRecommendations = () => api.get('/ai/recommendations');
export const getAIInsights = () => api.get('/ai/insights');
export const askAIChat = (message) => api.post('/ai/chat', { message });

// Dashboard API
export const getDashboardData = () => api.get('/reports/dashboard');

export default api;