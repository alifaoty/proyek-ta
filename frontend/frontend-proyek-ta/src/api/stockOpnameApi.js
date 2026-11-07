import axiosClient from './axiosClient';

export const createOpname = (payload) =>
  axiosClient.post('/stock-opnames', payload);

export const getOpnames = (params) =>
  axiosClient.get('/stock-opnames', { params });

export const approveOpname = (id, payload) =>
  axiosClient.patch(`/stock-opnames/${id}/approve`, payload);

export const rejectOpname = (id, payload) =>
  axiosClient.patch(`/stock-opnames/${id}/reject`, payload);