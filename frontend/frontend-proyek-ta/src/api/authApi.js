import axiosClient from './axiosClient';

export const loginApi = (email, password) =>
  axiosClient.post('/auth/login', { email, password });

export const getMeApi = () => axiosClient.get('/auth/me');

